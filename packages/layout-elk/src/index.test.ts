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

  it("keeps compound layouts identical across repeated and interleaved calls", async () => {
    // Regression: with ELK's seed 0 ("pick a seed") the Signal Garden
    // Container View alternated between two layouts on one engine instance,
    // so the editor preview moved on every recompile and `--all` rendered a
    // different diagram than `--view`.
    const containerView: LayoutRequest = {
      id: "view:signal-containers",
      direction: "right",
      nodes: [
        { id: "element:cultivation-api", width: 250, height: 132, parentId: "scope:signal-containers" },
        { id: "element:grower", width: 210, height: 190 },
        { id: "element:ledger-store", width: 250, height: 132, parentId: "scope:signal-containers" },
        { id: "element:notify-worker", width: 250, height: 132, parentId: "scope:signal-containers" },
        { id: "element:studio-ui", width: 250, height: 132, parentId: "scope:signal-containers" },
        { id: "element:weather-beacon", width: 250, height: 132 },
        { id: "scope:signal-containers", width: 420, height: 280, padding: 64 },
      ],
      edges: [
        { id: "relationship:api-enqueues-notice", sourceId: "element:cultivation-api", targetId: "element:notify-worker" },
        { id: "relationship:api-writes-ledger", sourceId: "element:cultivation-api", targetId: "element:ledger-store" },
        { id: "relationship:grower-edits-ui", sourceId: "element:grower", targetId: "element:studio-ui" },
        { id: "relationship:ui-calls-api", sourceId: "element:studio-ui", targetId: "element:cultivation-api" },
        { id: "relationship:weather-feeds-api", sourceId: "element:weather-beacon", targetId: "element:cultivation-api" },
      ],
    };

    const fresh = await createBundledElkLayoutAdapter().layout(containerView);
    expect(fresh.edges.every((edge) => edge.labelCenter === undefined)).toBe(true);
    const shared = createBundledElkLayoutAdapter();
    const repeated = [];
    for (let index = 0; index < 4; index += 1) {
      await shared.layout(request);
      repeated.push(await shared.layout(containerView));
    }

    for (const result of repeated) {
      expect(result).toEqual(fresh);
    }
  });

  it("reserves the requested label footprint between the connected nodes", async () => {
    const labelled: LayoutRequest = {
      ...request,
      edges: request.edges.map((edge) => ({
        ...edge,
        label: { width: 150, height: 40 },
      })),
    };

    const result = await createBundledElkLayoutAdapter().layout(labelled);
    const nodeById = new Map(result.nodes.map((node) => [node.id, node]));
    const seed = nodeById.get("seed-index")!;
    const board = nodeById.get("harvest-board")!;
    const edge = result.edges.find(({ id }) => id === "publishes-plan")!;

    // The gap between the layers holds the label plus spacing on both sides.
    expect(board.x - (seed.x + seed.width)).toBeGreaterThanOrEqual(150 + 2 * 60);
    expect(edge.labelCenter).toBeDefined();
    expect(edge.labelCenter!.x - 75).toBeGreaterThanOrEqual(seed.x + seed.width);
    expect(edge.labelCenter!.x + 75).toBeLessThanOrEqual(board.x);
    // The label centre is reported in the same absolute frame as the route.
    const [section] = edge.sections;
    expect(edge.labelCenter!.x).toBeGreaterThan(section!.start.x);
    expect(edge.labelCenter!.x).toBeLessThan(section!.end.x);
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
