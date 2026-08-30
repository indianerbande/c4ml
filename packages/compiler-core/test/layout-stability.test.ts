import { describe, expect, it } from "vitest";

import {
  stabilizeLayoutAgainstBaseline,
  type LayoutNodeResult,
  type LayoutResult,
  type PreparedDiagram,
} from "../src/index.js";

function diagram(nodeIds: readonly string[]): PreparedDiagram {
  const nodes = nodeIds.map((id) => ({
    id,
    referenceId: id.slice("element:".length),
    kind: "element" as const,
    title: id,
    typeLabel: "Container",
    description: "Test node",
  }));
  return {
    view: {} as PreparedDiagram["view"],
    nodes,
    edges: [],
    shapes: new Map(),
    layoutRequest: {
      id: "view:test",
      direction: "right",
      nodes: nodes.map(({ id }) => ({ id, width: 100, height: 60 })),
      edges: [],
    },
  };
}

function layout(nodes: readonly LayoutNodeResult[]): LayoutResult {
  return {
    requestId: "view:test",
    width: 800,
    height: 400,
    nodes,
    edges: [],
  };
}

function node(id: string, x: number, y = 40): LayoutNodeResult {
  return { id, x, y, width: 100, height: 60 };
}

describe("comparison layout stability", () => {
  it("retains compatible baseline geometry deterministically", () => {
    const prepared = diagram(["element:a", "element:b"]);
    const baseline = layout([node("element:a", 40), node("element:b", 240)]);
    const candidate = layout([node("element:a", 120), node("element:b", 420)]);

    const result = stabilizeLayoutAgainstBaseline(prepared, baseline, candidate);

    expect(result.layout.nodes).toEqual([
      node("element:a", 40),
      node("element:b", 240),
    ]);
    expect(result.decisions).toEqual([
      { nodeId: "element:a", status: "retained" },
      { nodeId: "element:b", status: "retained" },
    ]);
  });

  it("keeps hard-positioned nodes candidate-owned and rejects collisions", () => {
    const prepared = diagram(["element:a", "element:b", "element:new"]);
    const baseline = layout([node("element:a", 40), node("element:b", 240)]);
    const candidate = layout([
      node("element:a", 500),
      node("element:b", 420),
      node("element:new", 240),
    ]);

    const result = stabilizeLayoutAgainstBaseline(prepared, baseline, candidate, {
      fixedNodeIds: ["element:a"],
    });

    expect(result.decisions).toEqual([
      { nodeId: "element:a", status: "fixed-by-layout" },
      { nodeId: "element:b", status: "rejected-collision" },
      { nodeId: "element:new", status: "added" },
    ]);
    expect(result.layout.nodes.find(({ id }) => id === "element:a")?.x).toBe(500);
    expect(result.layout.nodes.find(({ id }) => id === "element:b")?.x).toBe(420);
  });

  it("rejects incompatible dimensions rather than disguising layout movement", () => {
    const prepared = diagram(["element:a"]);
    const baseline = layout([node("element:a", 40)]);
    const candidate = layout([{ ...node("element:a", 320), width: 140 }]);

    const result = stabilizeLayoutAgainstBaseline(prepared, baseline, candidate);

    expect(result.decisions).toEqual([
      { nodeId: "element:a", status: "incompatible-size" },
    ]);
    expect(result.layout.nodes[0]?.x).toBe(320);
  });
});
