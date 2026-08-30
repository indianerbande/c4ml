import { describe, expect, it } from "vitest";

import {
  compareArchitectureSnapshots,
  compileArchitectureDiagram,
  createArchitectureComparisonScene,
  deriveArchitectureImpacts,
  renderDiagramSvg,
  resolveArchitectureSnapshot,
  type ArchitectureModel,
  type ArchitectureView,
  type LayoutAdapter,
  type LayoutRequest,
  type LayoutResult,
} from "../src/index.js";
import { signalGardenModel, signalGardenViews } from "./signal-garden.fixture.js";

const containerView = signalGardenViews.find(
  (view): view is Extract<ArchitectureView, { kind: "container" }> =>
    view.kind === "container",
)!;

class ComparisonLayoutAdapter implements LayoutAdapter {
  readonly adapterId = "test.comparison-layout";

  constructor(private readonly studioShift: number) {}

  async layout(request: LayoutRequest): Promise<LayoutResult> {
    const nodes = request.nodes.map((node, index) => ({
      ...node,
      x: 40 + index * 290 + (node.id === "element:studio-ui" ? this.studioShift : 0),
      y: node.parentId === undefined ? 50 : 120,
    }));
    const byId = new Map(nodes.map((node) => [node.id, node]));
    return {
      requestId: request.id,
      width: 40 + nodes.length * 300 + this.studioShift,
      height: 500,
      nodes,
      edges: request.edges.map((edge) => {
        const source = byId.get(edge.sourceId)!;
        const target = byId.get(edge.targetId)!;
        return {
          id: edge.id,
          sections: [{
            start: { x: source.x + source.width, y: source.y + source.height / 2 },
            bends: [],
            end: { x: target.x, y: target.y + target.height / 2 },
          }],
        };
      }),
    };
  }
}

function renamedModel(): ArchitectureModel {
  return {
    ...signalGardenModel,
    elements: signalGardenModel.elements.map((element) =>
      element.id === "cultivation-api"
        ? { ...element, name: "Cultivation Coordination API" }
        : element,
    ),
  };
}

describe("architecture comparison scenes", () => {
  it("provides all four modes and explains semantic and layout encoding", async () => {
    const afterModel = renamedModel();
    const beforeCompile = await compileArchitectureDiagram({
      model: signalGardenModel,
      view: containerView,
      layoutAdapter: new ComparisonLayoutAdapter(0),
    });
    const afterCompile = await compileArchitectureDiagram({
      model: afterModel,
      view: containerView,
      layoutAdapter: new ComparisonLayoutAdapter(70),
    });
    const beforeSnapshot = resolveArchitectureSnapshot(signalGardenModel, signalGardenViews).snapshot!;
    const afterSnapshot = resolveArchitectureSnapshot(afterModel, signalGardenViews).snapshot!;
    const difference = compareArchitectureSnapshots(beforeSnapshot, afterSnapshot);
    const impacts = deriveArchitectureImpacts(beforeSnapshot, afterSnapshot, difference);

    for (const mode of ["before", "after", "overlay", "change-only"] as const) {
      const scene = createArchitectureComparisonScene(
        beforeCompile.scene!,
        afterCompile.scene!,
        difference,
        impacts,
        mode,
      );
      const svg = renderDiagramSvg(scene);

      expect(scene.comparison?.mode).toBe(mode);
      expect(svg).toContain(`data-c4ml-comparison-mode="${mode}"`);
      expect(svg).toContain("Comparison");
      expect(svg).toContain("Layout movement");
      expect(svg).toContain("The same stable architecture identity has changed properties.");
    }
  });

  it("separates a semantic modification from geometry-only movement in overlay mode", async () => {
    const afterModel = renamedModel();
    const beforeCompile = await compileArchitectureDiagram({
      model: signalGardenModel,
      view: containerView,
      layoutAdapter: new ComparisonLayoutAdapter(0),
    });
    const afterCompile = await compileArchitectureDiagram({
      model: afterModel,
      view: containerView,
      layoutAdapter: new ComparisonLayoutAdapter(70),
    });
    const beforeSnapshot = resolveArchitectureSnapshot(signalGardenModel, signalGardenViews).snapshot!;
    const afterSnapshot = resolveArchitectureSnapshot(afterModel, signalGardenViews).snapshot!;
    const difference = compareArchitectureSnapshots(beforeSnapshot, afterSnapshot);
    const scene = createArchitectureComparisonScene(
      beforeCompile.scene!,
      afterCompile.scene!,
      difference,
      deriveArchitectureImpacts(beforeSnapshot, afterSnapshot, difference),
      "overlay",
    );

    const apiNodes = scene.nodes.filter(({ referenceId }) => referenceId === "cultivation-api");
    const studioNodes = scene.nodes.filter(({ referenceId }) => referenceId === "studio-ui");
    expect(apiNodes).toHaveLength(2);
    expect(apiNodes.every(({ comparison }) => comparison?.state === "modified")).toBe(true);
    expect(studioNodes).toHaveLength(2);
    expect(studioNodes.every(({ comparison }) => comparison?.state === "moved")).toBe(true);
    expect(new Set(scene.nodes.map(({ id }) => id)).size).toBe(scene.nodes.length);
  });
});
