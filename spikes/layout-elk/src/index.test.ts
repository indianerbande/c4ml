import { describe, expect, it } from "vitest";

import { ContractError, type LayoutRequest } from "@c4ml/compiler-core";

import { ElkLayoutAdapter } from "./index.js";

const request: LayoutRequest = {
  id: "signal-garden-phase-zero",
  direction: "right",
  nodes: [
    { id: "seed-bank", width: 120, height: 60 },
    { id: "signal-bloom", width: 140, height: 60 },
  ],
  edges: [
    {
      id: "germination-signal",
      sourceId: "seed-bank",
      targetId: "signal-bloom",
    },
  ],
};

describe("ElkLayoutAdapter", () => {
  it("returns deterministic normalized geometry", async () => {
    const adapter = new ElkLayoutAdapter();

    const first = await adapter.layout(request);
    const second = await adapter.layout(request);

    expect(second).toEqual(first);
    expect(first.requestId).toBe(request.id);
    expect(first.nodes).toHaveLength(2);
    expect(first.edges).toHaveLength(1);
    expect(first.edges[0]!.sections.length).toBeGreaterThan(0);

    const seed = first.nodes.find((node) => node.id === "seed-bank")!;
    const bloom = first.nodes.find((node) => node.id === "signal-bloom")!;
    expect(bloom.x).toBeGreaterThan(seed.x);
  });

  it("keeps compound-node identity and returns absolute geometry", async () => {
    const adapter = new ElkLayoutAdapter();
    const compound: LayoutRequest = {
      id: "nested-garden",
      direction: "down",
      nodes: [
        { id: "garden-bed", width: 240, height: 180 },
        {
          id: "bed-section",
          width: 180,
          height: 100,
          parentId: "garden-bed",
          padding: 20,
        },
        {
          id: "north-plot",
          width: 80,
          height: 40,
          parentId: "bed-section",
        },
        {
          id: "south-plot",
          width: 80,
          height: 40,
          parentId: "garden-bed",
        },
      ],
      edges: [
        {
          id: "water-flow",
          sourceId: "north-plot",
          targetId: "south-plot",
        },
      ],
    };

    const result = await adapter.layout(compound);

    expect(result.nodes).toHaveLength(4);
    expect(
      result.nodes.filter((node) => node.parentId === "garden-bed"),
    ).toHaveLength(2);
    expect(result.nodes.every((node) => Number.isFinite(node.x))).toBe(true);
    const garden = result.nodes.find((node) => node.id === "garden-bed")!;
    const sectionNode = result.nodes.find((node) => node.id === "bed-section")!;
    const north = result.nodes.find((node) => node.id === "north-plot")!;
    const south = result.nodes.find((node) => node.id === "south-plot")!;
    expect(north.x).toBeGreaterThanOrEqual(garden.x);
    expect(north.y).toBeGreaterThanOrEqual(garden.y);
    expect(north.x).toBeGreaterThanOrEqual(sectionNode.x);
    expect(north.y).toBeGreaterThanOrEqual(sectionNode.y);
    expect(south.x + south.width).toBeLessThanOrEqual(garden.x + garden.width);
    expect(south.y + south.height).toBeLessThanOrEqual(
      garden.y + garden.height,
    );
    const section = result.edges[0]!.sections[0]!;
    expect(onBoundary(section.start, north)).toBe(true);
    expect(onBoundary(section.end, south)).toBe(true);
  });

  it("rejects invalid input before invoking ELK", async () => {
    const adapter = new ElkLayoutAdapter();
    const invalid: LayoutRequest = {
      ...request,
      nodes: [{ id: "broken", width: Number.NaN, height: 10 }],
      edges: [],
    };

    await expect(adapter.layout(invalid)).rejects.toEqual(
      expect.objectContaining<Partial<ContractError>>({
        code: "C4ML-P0-LAYOUT-003",
      }),
    );
  });
});

function onBoundary(
  point: { readonly x: number; readonly y: number },
  node: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): boolean {
  const insideX = point.x >= node.x && point.x <= node.x + node.width;
  const insideY = point.y >= node.y && point.y <= node.y + node.height;
  return (
    (insideY && (point.x === node.x || point.x === node.x + node.width)) ||
    (insideX && (point.y === node.y || point.y === node.y + node.height))
  );
}
