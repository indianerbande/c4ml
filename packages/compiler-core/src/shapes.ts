import { ContractError } from "./layout.js";
import {
  cardinalPortSides,
  type CardinalPortSide,
} from "./ports.js";

export const NORMALIZED_SHAPE_SIZE = 100;

export interface ShapePoint {
  readonly x: number;
  readonly y: number;
}

export interface ShapeBox extends ShapePoint {
  readonly width: number;
  readonly height: number;
}

export type ShapePaintRole = "accent" | "detail" | "surface";

export interface ShapeRectangle extends ShapeBox {
  readonly kind: "rectangle";
  readonly paint: ShapePaintRole;
  readonly cornerRadius?: number;
}

export interface ShapeEllipse {
  readonly kind: "ellipse";
  readonly paint: ShapePaintRole;
  readonly centerX: number;
  readonly centerY: number;
  readonly radiusX: number;
  readonly radiusY: number;
}

export interface ShapePolygon {
  readonly kind: "polygon";
  readonly paint: ShapePaintRole;
  readonly points: readonly ShapePoint[];
}

export interface ShapeLine {
  readonly kind: "line";
  readonly paint: "detail";
  readonly start: ShapePoint;
  readonly end: ShapePoint;
}

export type ShapePrimitive =
  | ShapeEllipse
  | ShapeLine
  | ShapePolygon
  | ShapeRectangle;

/**
 * Renderer-neutral, deliberately restricted vector shape definition.
 * Coordinates use a fixed 100 x 100 canvas so renderers can scale the shape
 * without interpreting SVG, CSS, scripts, fonts, filters, or external assets.
 */
export interface ShapeDefinition {
  readonly id: string;
  readonly canvas: {
    readonly width: typeof NORMALIZED_SHAPE_SIZE;
    readonly height: typeof NORMALIZED_SHAPE_SIZE;
  };
  readonly contentBox: ShapeBox;
  readonly ports: Readonly<Record<CardinalPortSide, ShapePoint>>;
  readonly primitives: readonly ShapePrimitive[];
}

export interface DiagramShapeOptions {
  readonly definitions?: readonly ShapeDefinition[];
  readonly assignments?: Readonly<Record<string, string>>;
}

const boxShape: ShapeDefinition = {
  id: "c4ml-box",
  canvas: { width: 100, height: 100 },
  contentBox: { x: 6.4, y: 8, width: 87.2, height: 84 },
  ports: {
    north: { x: 50, y: 0 },
    east: { x: 100, y: 50 },
    south: { x: 50, y: 100 },
    west: { x: 0, y: 50 },
  },
  primitives: [
    {
      kind: "rectangle",
      paint: "surface",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      cornerRadius: 8,
    },
    {
      kind: "rectangle",
      paint: "accent",
      x: 2.4,
      y: 4,
      width: 2.4,
      height: 92,
      cornerRadius: 1.2,
    },
  ],
};

// Original C4ML person card: a compact head-and-shoulders glyph establishes
// the semantic role without making the information surface itself figurative.
const personShape: ShapeDefinition = {
  id: "c4ml-person",
  canvas: { width: 100, height: 100 },
  contentBox: { x: 8, y: 5, width: 84, height: 90 },
  ports: {
    north: { x: 50, y: 0 },
    east: { x: 100, y: 50 },
    south: { x: 50, y: 100 },
    west: { x: 0, y: 50 },
  },
  primitives: [
    {
      kind: "rectangle",
      paint: "surface",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      cornerRadius: 8,
    },
    {
      kind: "ellipse",
      paint: "accent",
      centerX: 50,
      centerY: 27,
      radiusX: 7.2,
      radiusY: 8,
    },
    {
      kind: "rectangle",
      paint: "accent",
      x: 39,
      y: 36,
      width: 22,
      height: 12,
      cornerRadius: 5.5,
    },
  ],
};

export const builtInShapes = [boxShape, personShape] as const;

export function createShapeCatalog(
  definitions: readonly ShapeDefinition[] = [],
): ReadonlyMap<string, ShapeDefinition> {
  const catalog = new Map<string, ShapeDefinition>();
  for (const definition of [...builtInShapes, ...definitions]) {
    validateShapeDefinition(definition);
    if (catalog.has(definition.id)) {
      throw new ContractError(
        "C4ML-SHAPE-002",
        `Shape identifier ${definition.id} is duplicated.`,
      );
    }
    catalog.set(definition.id, definition);
  }
  return catalog;
}

export function defaultShapeId(role: string | undefined): string {
  return role === "person" ? personShape.id : boxShape.id;
}

export function validateShapeDefinition(definition: ShapeDefinition): void {
  if (definition.id.trim().length === 0) {
    throw new ContractError("C4ML-SHAPE-001", "Shape identifier is empty.");
  }
  if (
    definition.canvas.width !== NORMALIZED_SHAPE_SIZE ||
    definition.canvas.height !== NORMALIZED_SHAPE_SIZE
  ) {
    throw new ContractError(
      "C4ML-SHAPE-003",
      `Shape ${definition.id} must use the normalized 100 x 100 canvas.`,
    );
  }
  validateBox(definition.id, "content box", definition.contentBox);
  if (definition.primitives.length === 0 || definition.primitives.length > 128) {
    throw new ContractError(
      "C4ML-SHAPE-004",
      `Shape ${definition.id} must contain between 1 and 128 primitives.`,
    );
  }
  for (const side of cardinalPortSides) {
    const point = definition.ports[side];
    validatePoint(definition.id, `${side} port`, point);
    if (!pointOnExpectedCanvasSide(point, side)) {
      throw new ContractError(
        "C4ML-SHAPE-005",
        `Shape ${definition.id} ${side} port must lie on the matching canvas side.`,
      );
    }
  }
  definition.primitives.forEach((primitive, index) =>
    validatePrimitive(definition.id, primitive, index),
  );
}

function validatePrimitive(
  shapeId: string,
  primitive: ShapePrimitive,
  index: number,
): void {
  const label = `primitive ${index}`;
  const candidate = primitive as unknown as { readonly kind?: unknown; readonly paint?: unknown };
  if (
    (candidate.kind === "line" && candidate.paint !== "detail") ||
    (candidate.kind !== "line" &&
      candidate.paint !== "surface" &&
      candidate.paint !== "accent" &&
      candidate.paint !== "detail")
  ) {
    throw invalidPrimitive(shapeId, label);
  }
  switch (primitive.kind) {
    case "rectangle":
      validateBox(shapeId, label, primitive);
      if (
        primitive.cornerRadius !== undefined &&
        (!Number.isFinite(primitive.cornerRadius) ||
          primitive.cornerRadius < 0 ||
          primitive.cornerRadius > Math.min(primitive.width, primitive.height) / 2)
      ) {
        throw invalidPrimitive(shapeId, label);
      }
      return;
    case "ellipse":
      if (
        !allFinite([
          primitive.centerX,
          primitive.centerY,
          primitive.radiusX,
          primitive.radiusY,
        ]) ||
        primitive.radiusX <= 0 ||
        primitive.radiusY <= 0 ||
        primitive.centerX - primitive.radiusX < 0 ||
        primitive.centerX + primitive.radiusX > NORMALIZED_SHAPE_SIZE ||
        primitive.centerY - primitive.radiusY < 0 ||
        primitive.centerY + primitive.radiusY > NORMALIZED_SHAPE_SIZE
      ) {
        throw invalidPrimitive(shapeId, label);
      }
      return;
    case "polygon":
      if (primitive.points.length < 3) {
        throw invalidPrimitive(shapeId, label);
      }
      primitive.points.forEach((point) => validatePoint(shapeId, label, point));
      return;
    case "line":
      validatePoint(shapeId, `${label} start`, primitive.start);
      validatePoint(shapeId, `${label} end`, primitive.end);
      return;
    default:
      throw invalidPrimitive(shapeId, label);
  }
}

function validateBox(shapeId: string, label: string, box: ShapeBox): void {
  if (
    !allFinite([box.x, box.y, box.width, box.height]) ||
    box.x < 0 ||
    box.y < 0 ||
    box.width <= 0 ||
    box.height <= 0 ||
    box.x + box.width > NORMALIZED_SHAPE_SIZE ||
    box.y + box.height > NORMALIZED_SHAPE_SIZE
  ) {
    throw new ContractError(
      "C4ML-SHAPE-006",
      `Shape ${shapeId} ${label} must be finite, positive, and inside its canvas.`,
    );
  }
}

function validatePoint(shapeId: string, label: string, point: ShapePoint): void {
  if (
    !allFinite([point.x, point.y]) ||
    point.x < 0 ||
    point.x > NORMALIZED_SHAPE_SIZE ||
    point.y < 0 ||
    point.y > NORMALIZED_SHAPE_SIZE
  ) {
    throw new ContractError(
      "C4ML-SHAPE-007",
      `Shape ${shapeId} ${label} must lie inside its normalized canvas.`,
    );
  }
}

function pointOnExpectedCanvasSide(
  point: ShapePoint,
  side: CardinalPortSide,
): boolean {
  switch (side) {
    case "north":
      return point.y === 0;
    case "east":
      return point.x === NORMALIZED_SHAPE_SIZE;
    case "south":
      return point.y === NORMALIZED_SHAPE_SIZE;
    case "west":
      return point.x === 0;
  }
}

function allFinite(values: readonly number[]): boolean {
  return values.every(Number.isFinite);
}

function invalidPrimitive(shapeId: string, label: string): ContractError {
  return new ContractError(
    "C4ML-SHAPE-008",
    `Shape ${shapeId} ${label} has invalid geometry.`,
  );
}
