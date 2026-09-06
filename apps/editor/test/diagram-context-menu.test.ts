import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import type { CompilerWorkerNavigationTarget } from "../src/app/compiler-worker.protocol.js";
import {
  diagramContextMenuCapabilities,
  diagramContextMenuPosition,
} from "../src/app/diagram-context-menu.js";

const source = {
  file: "model.c4ml",
  start: { offset: 0, line: 0, column: 0 },
  end: { offset: 1, line: 0, column: 1 },
};

function target(
  detail:
    | { readonly kind: "node"; readonly nodeRole: "boundary" | "element" }
    | { readonly kind: "route-label" }
    | { readonly kind: "route" },
): CompilerWorkerNavigationTarget {
  const base = {
    sceneObjectId: "scene:test",
    svgElementIds: ["svg:test"],
    referenceId: "test",
    label: "Test",
    source,
    relatedSources: [],
  };
  if (detail.kind === "node") {
    return {
      ...base,
      ...detail,
      bounds: { x: 0, y: 0, width: 100, height: 80 },
    };
  }
  if (detail.kind === "route-label") {
    return {
      ...base,
      kind: "route-label",
      routeSceneObjectId: "route:test",
      point: { x: 40, y: 20 },
      bounds: { x: 20, y: 10, width: 40, height: 20 },
    };
  }
  return {
    ...base,
    kind: "route",
    policy: "automatic",
    style: "orthogonal",
    sourcePortSelection: "automatic",
    targetPortSelection: "automatic",
    points: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
    sourcePort: { id: "source", role: "source", side: "east", point: { x: 0, y: 0 } },
    targetPort: { id: "target", role: "target", side: "west", point: { x: 100, y: 0 } },
    labelPoint: { x: 50, y: 0 },
    labelSegment: 0,
    labelOffset: { x: 0, y: 0 },
    corridor: undefined,
    waypoints: [],
    lockedSegments: [],
    avoidanceRegions: [],
  };
}

describe("diagram context menu", () => {
  it("derives actions from the object that was right-clicked", () => {
    expect(diagramContextMenuCapabilities(target({ kind: "node", nodeRole: "element" }), true)).toEqual({
      kind: "element",
      canConnect: true,
      primaryRouteOperation: undefined,
    });
    expect(diagramContextMenuCapabilities(target({ kind: "node", nodeRole: "boundary" }), true).kind).toBe("source-only");
    expect(diagramContextMenuCapabilities(target({ kind: "route-label" }), true).primaryRouteOperation).toBe("label-offset");
    expect(diagramContextMenuCapabilities(target({ kind: "route" }), false).primaryRouteOperation).toBe("ports");
  });

  it("keeps the menu and its submenu inside the current viewport side", () => {
    expect(diagramContextMenuPosition({ x: -20, y: -30 }, { width: 1200, height: 800 })).toEqual({
      x: 8,
      y: 8,
      submenuSide: "right",
    });
    expect(diagramContextMenuPosition({ x: 1190, y: 790 }, { width: 1200, height: 800 })).toEqual({
      x: 944,
      y: 402,
      submenuSide: "left",
    });
  });

  it("routes contextual actions through the existing authoring facades", async () => {
    const root = await readFile(new URL("../src/app/app.component.ts", import.meta.url), "utf8");
    expect(root).toContain("this.semanticEditor.beginConnectionPicking(");
    expect(root).toContain("this.placement.show({");
    expect(root).toContain("this.routeEditor.show(action.operation)");
    expect(root).not.toContain("proposeC4mlPlacementEdit");
    expect(root).not.toContain("proposeC4mlRouteEdit");
  });
});
