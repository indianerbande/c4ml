import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  compileArchitectureDiagram,
  parseArchitectureShapeResource,
  type DiagramScene,
  type DiagramShapeOptions,
  type SceneNode,
  type SceneRoute,
} from "@c4ml/compiler-core";
import { parseC4mlProjectDraft } from "@c4ml/language-c4ml";
import { createBundledElkLayoutAdapter } from "@c4ml/layout-elk/bundled";
import { loadArchitectureProject } from "@c4ml/project-node";

/**
 * Renders every executable example through the same pipeline the CLI and the
 * editor worker use and checks geometric invariants on the resulting scenes.
 *
 * These checks exist because unit tests of single stages passed while the
 * rendered diagrams had empty legends, clipped elements, labels on top of
 * elements, and arrowheads sliding along node boundaries. Anything that must
 * hold for every diagram belongs here, not in a golden image.
 */

const examplesRoot = fileURLToPath(new URL("../../../examples/", import.meta.url));
const scenePadding = 40;

interface RenderedView {
  readonly example: string;
  readonly viewId: string;
  readonly scene: DiagramScene;
  readonly svg: string;
}

async function executableExamples(): Promise<readonly string[]> {
  const draft = (await readdir(join(examplesRoot, "draft")))
    .filter((name) => name.endsWith(".c4ml"))
    // shape-marker.c4ml previews planned syntax and is documented as not
    // executable in draft-1.
    .filter((name) => name !== "shape-marker.c4ml")
    .map((name) => join("draft", name));
  const projects = (await readdir(join(examplesRoot, "projects"))).map((name) =>
    join("projects", name),
  );
  return [...draft, ...projects].sort();
}

async function renderExample(example: string): Promise<readonly RenderedView[]> {
  const loaded = await loadArchitectureProject(join(examplesRoot, example));
  if (!loaded.valid) {
    throw new Error(`${example}: ${loaded.code} ${loaded.message}`);
  }
  const parsed = await parseC4mlProjectDraft(loaded.project);
  if (!parsed.valid || parsed.model === undefined || parsed.views === undefined) {
    throw new Error(
      `${example}: ${parsed.diagnostics.map(({ code, message }) => `${code} ${message}`).join("; ")}`,
    );
  }
  let shapes: DiagramShapeOptions | undefined;
  if (loaded.project.shapes !== undefined) {
    const resource = parseArchitectureShapeResource(loaded.project.shapes.source);
    if (!resource.valid) {
      throw new Error(`${example}: ${resource.error.message}`);
    }
    shapes = resource.shapes.options;
  }
  const layoutAdapter = createBundledElkLayoutAdapter();
  const rendered: RenderedView[] = [];
  for (const view of parsed.views) {
    const result = await compileArchitectureDiagram({
      model: parsed.model,
      view,
      layoutAdapter,
      ...(shapes === undefined ? {} : { shapes }),
      ...(parsed.placementByViewId?.[view.id] === undefined
        ? {}
        : { placement: parsed.placementByViewId[view.id] }),
      ...(parsed.routingByViewId?.[view.id] === undefined
        ? {}
        : { routing: parsed.routingByViewId[view.id] }),
    });
    if (!result.valid || result.scene === undefined || result.svg === undefined) {
      throw new Error(
        `${example} ${view.id}: ${result.diagnostics.map(({ code, message }) => `${code} ${message}`).join("; ")}`,
      );
    }
    rendered.push({ example, viewId: view.id, scene: result.scene, svg: result.svg });
  }
  return rendered;
}

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function overlaps(left: Box, right: Box, tolerance = 0): boolean {
  return (
    left.x + left.width > right.x + tolerance &&
    right.x + right.width > left.x + tolerance &&
    left.y + left.height > right.y + tolerance &&
    right.y + right.height > left.y + tolerance
  );
}

function elementNodes(scene: DiagramScene): readonly SceneNode[] {
  // Boundaries and groups contain other geometry by design; only the
  // elements drawn as solid boxes must stay clear of labels.
  return scene.nodes.filter(
    ({ kind }) => kind === "element" || kind === "infrastructure-node",
  );
}

function label(view: RenderedView, route: SceneRoute): string {
  return `${view.example} › ${view.viewId} › ${route.relationshipId}`;
}

describe("rendered examples", async () => {
  const examples = await executableExamples();
  const views = (await Promise.all(examples.map(renderExample))).flat();

  it("covers every executable example and every declared view", () => {
    expect(examples.length).toBeGreaterThanOrEqual(7);
    expect(views.length).toBeGreaterThanOrEqual(15);
  });

  it("gives every diagram a populated legend", () => {
    for (const view of views) {
      expect(view.scene.legend.length, `${view.example} › ${view.viewId}`).toBeGreaterThan(0);
      expect(view.svg).toContain('data-c4ml-legend="');
    }
  });

  it("keeps every node, route point, and label inside the canvas", () => {
    for (const view of views) {
      const { scene } = view;
      const inside = (box: Box, what: string): void => {
        expect(box.x, `${what} left`).toBeGreaterThanOrEqual(scenePadding);
        expect(box.y, `${what} top`).toBeGreaterThanOrEqual(scenePadding);
        expect(box.x + box.width, `${what} right`).toBeLessThanOrEqual(scene.width - scenePadding);
        expect(box.y + box.height, `${what} bottom`).toBeLessThanOrEqual(scene.height);
      };
      for (const node of scene.nodes) {
        inside(node, `${view.example} › ${view.viewId} › ${node.referenceId}`);
      }
      for (const route of scene.routes) {
        for (const point of route.points) {
          inside({ ...point, width: 0, height: 0 }, label(view, route));
        }
        inside(route.labelBounds, `${label(view, route)} label`);
      }
    }
  });

  it("never draws an automatic route's label on top of an element", () => {
    for (const view of views) {
      const elements = elementNodes(view.scene);
      for (const route of view.scene.routes) {
        // Authored label offsets and guided geometry are the author's call.
        if (route.policy !== "automatic") continue;
        for (const node of elements) {
          expect(
            overlaps(route.labelBounds, node, 2),
            `${label(view, route)} label overlaps ${node.referenceId}`,
          ).toBe(false);
        }
      }
    }
  });

  it("keeps automatic route labels apart from each other", () => {
    for (const view of views) {
      const automatic = view.scene.routes.filter(({ policy }) => policy === "automatic");
      for (const [index, route] of automatic.entries()) {
        for (const other of automatic.slice(index + 1)) {
          expect(
            overlaps(route.labelBounds, other.labelBounds, 2),
            `${label(view, route)} label overlaps ${other.relationshipId}`,
          ).toBe(false);
        }
      }
    }
  });

  it("enters and leaves every element perpendicular to the attached side", () => {
    const nodeById = (scene: DiagramScene) =>
      new Map(scene.nodes.map((node) => [node.id, node]));
    for (const view of views) {
      const nodes = nodeById(view.scene);
      const ports = new Map(view.scene.ports.map((port) => [port.id, port]));
      for (const route of view.scene.routes) {
        if (route.style !== "orthogonal" || route.points.length < 2) continue;
        const target = nodes.get(route.targetNodeId)!;
        const targetPort = ports.get(route.targetPortId)!;
        const [beforeLast, last] = route.points.slice(-2);
        const horizontalEntry = targetPort.side === "east" || targetPort.side === "west";
        // The terminal segment must not run along the boundary: a west/east
        // attachment ends with a horizontal segment, north/south with a
        // vertical one, and the endpoint lies on that side.
        if (horizontalEntry) {
          expect(last!.y, `${label(view, route)} terminal segment`).toBe(beforeLast!.y);
          expect(
            last!.x,
            `${label(view, route)} endpoint on ${targetPort.side}`,
          ).toBe(targetPort.side === "west" ? target.x : target.x + target.width);
        } else {
          expect(last!.x, `${label(view, route)} terminal segment`).toBe(beforeLast!.x);
          expect(
            last!.y,
            `${label(view, route)} endpoint on ${targetPort.side}`,
          ).toBe(targetPort.side === "north" ? target.y : target.y + target.height);
        }
      }
    }
  });

  it("attaches every route to its own point on the node boundary", () => {
    // Before the routing fix every automatic edge entering one side was
    // snapped onto the side's centre anchor, so their arrowheads collided.
    for (const view of views) {
      const endpoints = new Map<string, string>();
      for (const route of view.scene.routes) {
        const end = route.points.at(-1)!;
        const key = `${route.targetNodeId}@${end.x},${end.y}`;
        expect(
          endpoints.get(key),
          `${label(view, route)} shares its endpoint with ${endpoints.get(key)}`,
        ).toBeUndefined();
        endpoints.set(key, route.relationshipId);
      }
    }
  });

  it("renders identically on a second run of the same engine", async () => {
    for (const example of examples) {
      const again = await renderExample(example);
      const first = views.filter((view) => view.example === example);
      expect(again.map(({ svg }) => svg)).toEqual(first.map(({ svg }) => svg));
    }
  });
});
