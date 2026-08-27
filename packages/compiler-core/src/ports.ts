import type { Point } from "./layout.js";

export const cardinalPortSides = [
  "north",
  "east",
  "south",
  "west",
] as const;

export type CardinalPortSide = (typeof cardinalPortSides)[number];
export type PortSelection = "automatic" | CardinalPortSide;
export type PortRole = "source" | "target";

/**
 * A resolved attachment point for one end of one relationship appearance.
 * Ports are view geometry; they do not change relationship semantics.
 */
export interface EffectivePort {
  readonly id: string;
  readonly relationshipId: string;
  readonly role: PortRole;
  readonly nodeId: string;
  readonly side: CardinalPortSide;
  readonly point: Point;
}
