import {
  createShapeCatalog,
  validateBoxShapePresentation,
  type BoxShapePresentation,
  type DiagramShapeOptions,
  type ShapeDefinition,
} from "./shapes.js";

export const architectureShapeResourceVersion = 1 as const;

export interface ArchitectureShapeResource {
  readonly version: typeof architectureShapeResourceVersion;
  readonly id: string;
  readonly options: DiagramShapeOptions;
}

export type ArchitectureShapeResourceParseResult =
  | { readonly valid: true; readonly shapes: ArchitectureShapeResource; readonly error: undefined }
  | { readonly valid: false; readonly shapes: undefined; readonly error: ArchitectureShapeResourceError };

export class ArchitectureShapeResourceError extends Error {
  constructor(readonly code: "C4ML-SHAPE-RESOURCE-001", message: string) {
    super(message);
    this.name = "ArchitectureShapeResourceError";
  }
}

export function parseArchitectureShapeResource(source: string): ArchitectureShapeResourceParseResult {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    return invalid("An architecture shape resource must contain valid JSON.");
  }
  try {
    if (!isRecord(value) || value["version"] !== architectureShapeResourceVersion) {
      malformed(`A shape resource must declare version ${architectureShapeResourceVersion}.`);
    }
    const id = value["id"];
    if (typeof id !== "string" || id.trim().length === 0) malformed("A shape resource requires an identity.");
    const definitions = value["definitions"];
    if (definitions !== undefined && !Array.isArray(definitions)) {
      malformed("Shape definitions must be an array of safe shape definitions.");
    }
    const box = value["box"];
    if (box !== undefined && (!isRecord(box) ||
        Object.keys(box).some((key) => !["bar", "color", "transparency"].includes(key)))) {
      malformed("Built-in box presentation accepts only bar, color, and transparency.");
    }
    if ((definitions === undefined || definitions.length === 0) && box === undefined) {
      malformed("A shape resource requires a safe shape definition or built-in box presentation.");
    }
    if (box !== undefined) validateBoxShapePresentation(box as BoxShapePresentation);
    createShapeCatalog((definitions ?? []) as ShapeDefinition[], box as BoxShapePresentation | undefined);
    const assignments = value["assignments"];
    if (assignments !== undefined && (!isRecord(assignments) ||
        Object.entries(assignments).some(([key, shapeId]) =>
          key.trim().length === 0 || typeof shapeId !== "string" || shapeId.trim().length === 0
        ))) {
      malformed("Shape assignments must map non-empty architecture identities to shape identities.");
    }
    return {
      valid: true,
      shapes: {
        version: architectureShapeResourceVersion,
        id: id.trim(),
        options: {
          ...(definitions === undefined
            ? {}
            : { definitions: definitions as ShapeDefinition[] }),
          ...(box === undefined ? {} : { box: box as BoxShapePresentation }),
          ...(assignments === undefined
            ? {}
            : { assignments: Object.fromEntries(Object.entries(assignments).sort()) as Record<string, string> }),
        },
      },
      error: undefined,
    };
  } catch (error: unknown) {
    return invalid(error instanceof Error ? error.message : "The shape resource is malformed.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(message: string): ArchitectureShapeResourceParseResult {
  return {
    valid: false,
    shapes: undefined,
    error: new ArchitectureShapeResourceError("C4ML-SHAPE-RESOURCE-001", message),
  };
}

function malformed(message: string): never {
  throw new ArchitectureShapeResourceError("C4ML-SHAPE-RESOURCE-001", message);
}
