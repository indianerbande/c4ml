import { describe, expect, it } from "vitest";

import { parseArchitectureShapeResource } from "../src/index.js";

const validShape = {
  id: "sensor",
  canvas: { width: 100, height: 100 },
  contentBox: { x: 10, y: 10, width: 80, height: 80 },
  ports: {
    north: { x: 50, y: 0 }, east: { x: 100, y: 50 },
    south: { x: 50, y: 100 }, west: { x: 0, y: 50 },
  },
  primitives: [{ kind: "rectangle", paint: "surface", x: 0, y: 0, width: 100, height: 100 }],
};

describe("portable project shape resource", () => {
  it("validates safe definitions and deterministic assignments", () => {
    expect(parseArchitectureShapeResource(JSON.stringify({
      version: 1, id: "garden", definitions: [validShape], assignments: { sensor: "sensor" },
    }))).toMatchObject({ valid: true, shapes: { options: { assignments: { sensor: "sensor" } } } });
  });

  it("accepts bounded presentation for the built-in box bar without custom definitions", () => {
    expect(parseArchitectureShapeResource(JSON.stringify({
      version: 1,
      id: "quiet-boxes",
      box: { bar: "on", color: "#3D7FA8", transparency: 20 },
    }))).toMatchObject({
      valid: true,
      shapes: {
        options: {
          box: { bar: "on", color: "#3D7FA8", transparency: 20 },
        },
      },
    });
  });

  it("rejects malformed built-in box bar presentation", () => {
    for (const box of [
      { bar: "sometimes" },
      { color: "blue" },
      { transparency: 101 },
      { thickness: 4 },
    ]) {
      expect(parseArchitectureShapeResource(JSON.stringify({
        version: 1,
        id: "bad-box",
        box,
      }))).toMatchObject({
        valid: false,
        error: { code: "C4ML-SHAPE-RESOURCE-001" },
      });
    }
  });

  it("rejects unsafe or malformed geometry through the shared shape contract", () => {
    expect(parseArchitectureShapeResource(JSON.stringify({
      version: 1, id: "bad", definitions: [{ ...validShape, primitives: [{ kind: "image", href: "https://example.com" }] }],
    }))).toMatchObject({ valid: false, error: { code: "C4ML-SHAPE-RESOURCE-001" } });
    expect(parseArchitectureShapeResource(JSON.stringify({
      version: 1,
      id: "fixed-custom-color",
      definitions: [{
        ...validShape,
        primitives: [{ ...validShape.primitives[0], color: "#3D7FA8" }],
      }],
    }))).toMatchObject({
      valid: false,
      error: { code: "C4ML-SHAPE-RESOURCE-001" },
    });
  });
});
