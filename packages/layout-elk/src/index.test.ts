import { describe, expect, it } from "vitest";

import { ContractError, type LayoutRequest } from "@c4ml/compiler-core";

import { createBundledElkLayoutAdapter } from "./bundled.js";

const request: LayoutRequest = {
  id: "orchard-layout",
  direction: "right",
  nodes: [
    { id: "seed-index", width: 120, height: 60 },
    { id: "harvest-board", width: 140, height: 60 },
    { id: "weather-feed", width: 120, height: 60 },
  ],
  edges: [
    {
      id: "publishes-plan",
      sourceId: "seed-index",
      targetId: "harvest-board",
    },
    {
      id: "publishes-weather",
      sourceId: "weather-feed",
      targetId: "harvest-board",
    },
  ],
};

describe("production ELK layout adapter", () => {
  it("returns deterministic normalized geometry", async () => {
    const adapter = createBundledElkLayoutAdapter();

    const first = await adapter.layout(request);
    const second = await adapter.layout(request);

    expect(second).toEqual(first);
    expect(first.requestId).toBe(request.id);
    expect(first.nodes).toHaveLength(3);
    expect(first.edges[0]!.sections.length).toBeGreaterThan(0);
    expect(first.nodes.find(({ id }) => id === "harvest-board")!.x).toBeGreaterThan(
      first.nodes.find(({ id }) => id === "seed-index")!.x,
    );
  });

  it("normalizes nested compound geometry to absolute coordinates", async () => {
    const adapter = createBundledElkLayoutAdapter();
    const compound: LayoutRequest = {
      id: "nested-orchard",
      direction: "down",
      nodes: [
        { id: "orchard", width: 240, height: 180 },
        { id: "north-bed", width: 80, height: 40, parentId: "orchard" },
        { id: "south-bed", width: 80, height: 40, parentId: "orchard" },
      ],
      edges: [
        {
          id: "water-flow",
          sourceId: "north-bed",
          targetId: "south-bed",
        },
      ],
    };

    const result = await adapter.layout(compound);
    const orchard = result.nodes.find(({ id }) => id === "orchard")!;
    const children = result.nodes.filter(({ parentId }) => parentId === "orchard");

    expect(children).toHaveLength(2);
    for (const child of children) {
      expect(child.x).toBeGreaterThanOrEqual(orchard.x);
      expect(child.y).toBeGreaterThanOrEqual(orchard.y);
      expect(child.x + child.width).toBeLessThanOrEqual(
        orchard.x + orchard.width,
      );
      expect(child.y + child.height).toBeLessThanOrEqual(
        orchard.y + orchard.height,
      );
    }
  });

  it("rejects invalid engine-neutral input before invoking ELK", async () => {
    const adapter = createBundledElkLayoutAdapter();
    await expect(
      adapter.layout({
        ...request,
        nodes: [{ id: "broken", width: Number.NaN, height: 10 }],
        edges: [],
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ContractError>>({
        code: "C4ML-P0-LAYOUT-003",
      }),
    );
  });
});
