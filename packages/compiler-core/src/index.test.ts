import { describe, expect, it } from "vitest";

import {
  ContractError,
  type LayoutRequest,
  validateLayoutRequest,
} from "./index.js";

const validRequest: LayoutRequest = {
  id: "phase-zero",
  direction: "right",
  nodes: [
    { id: "seed", width: 80, height: 40 },
    { id: "bloom", width: 80, height: 40 },
  ],
  edges: [{ id: "growth", sourceId: "seed", targetId: "bloom" }],
};

describe("validateLayoutRequest", () => {
  it("accepts an engine-neutral request", () => {
    expect(() => validateLayoutRequest(validRequest)).not.toThrow();
  });

  it("rejects a duplicate stable node ID with a stable code", () => {
    const duplicate: LayoutRequest = {
      ...validRequest,
      nodes: [...validRequest.nodes, validRequest.nodes[0]!],
    };

    expect(() => validateLayoutRequest(duplicate)).toThrowError(
      expect.objectContaining<Partial<ContractError>>({
        code: "C4ML-P0-LAYOUT-002",
      }),
    );
  });

  it("rejects an edge with an unresolved endpoint", () => {
    const dangling: LayoutRequest = {
      ...validRequest,
      edges: [{ id: "lost", sourceId: "seed", targetId: "missing" }],
    };

    expect(() => validateLayoutRequest(dangling)).toThrowError(
      expect.objectContaining<Partial<ContractError>>({
        code: "C4ML-P0-LAYOUT-007",
      }),
    );
  });

  it("rejects indirect containment cycles", () => {
    const cyclic: LayoutRequest = {
      id: "cycle",
      direction: "down",
      nodes: [
        { id: "one", width: 10, height: 10, parentId: "two" },
        { id: "two", width: 10, height: 10, parentId: "one" },
      ],
      edges: [],
    };

    expect(() => validateLayoutRequest(cyclic)).toThrowError(
      expect.objectContaining<Partial<ContractError>>({
        code: "C4ML-P0-LAYOUT-008",
      }),
    );
  });
});
