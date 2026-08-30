import type { PreparedDiagram } from "./diagram-preparation.js";
import {
  ContractError,
  type LayoutEdgeResult,
  type LayoutNodeResult,
  type LayoutResult,
  type Point,
} from "./layout.js";
import { compareText } from "./ordering.js";

export type LayoutStabilityStatus =
  | "added"
  | "fixed-by-layout"
  | "incompatible-parent"
  | "incompatible-size"
  | "rejected-collision"
  | "rejected-containment"
  | "removed"
  | "retained";

export interface LayoutStabilityDecision {
  readonly nodeId: string;
  readonly status: LayoutStabilityStatus;
}

export interface LayoutStabilityOptions {
  readonly fixedNodeIds?: readonly string[];
  readonly minimumGap?: number;
}

export interface LayoutStabilityResult {
  readonly layout: LayoutResult;
  readonly decisions: readonly LayoutStabilityDecision[];
}

/**
 * Conservatively reuses baseline positions for unchanged leaf nodes. Compound
 * nodes remain layout-engine owned so retaining a child cannot silently resize
 * or invalidate its containing boundary. Hard-positioned nodes are explicitly
 * excluded by the caller and therefore remain owned by the placement stage.
 */
export function stabilizeLayoutAgainstBaseline(
  diagram: PreparedDiagram,
  baseline: LayoutResult,
  candidate: LayoutResult,
  options: LayoutStabilityOptions = {},
): LayoutStabilityResult {
  if (
    baseline.requestId !== diagram.layoutRequest.id ||
    candidate.requestId !== diagram.layoutRequest.id
  ) {
    throw new ContractError(
      "C4ML-STABILITY-001",
      "Baseline and candidate layout must belong to the prepared diagram.",
    );
  }
  const minimumGap = options.minimumGap ?? 8;
  if (!Number.isFinite(minimumGap) || minimumGap < 0) {
    throw new ContractError(
      "C4ML-STABILITY-002",
      "Layout stability minimum gap must be finite and non-negative.",
    );
  }

  const baselineById = new Map(baseline.nodes.map((node) => [node.id, node]));
  const candidateById = new Map(candidate.nodes.map((node) => [node.id, node]));
  const currentById = new Map(candidate.nodes.map((node) => [node.id, { ...node }]));
  const parentIds = new Set(
    diagram.nodes.flatMap((node) => node.parentId === undefined ? [] : [node.parentId]),
  );
  const fixedNodeIds = new Set(options.fixedNodeIds ?? []);
  const decisions: LayoutStabilityDecision[] = [];

  for (const nodeId of [...new Set([...baselineById.keys(), ...candidateById.keys()])].sort(compareText)) {
    const before = baselineById.get(nodeId);
    const after = candidateById.get(nodeId);
    if (before === undefined) {
      decisions.push({ nodeId, status: "added" });
      continue;
    }
    if (after === undefined) {
      decisions.push({ nodeId, status: "removed" });
      continue;
    }
    if (fixedNodeIds.has(nodeId) || parentIds.has(nodeId)) {
      decisions.push({ nodeId, status: "fixed-by-layout" });
      continue;
    }
    if (before.parentId !== after.parentId) {
      decisions.push({ nodeId, status: "incompatible-parent" });
      continue;
    }
    if (before.width !== after.width || before.height !== after.height) {
      decisions.push({ nodeId, status: "incompatible-size" });
      continue;
    }
    const proposed = { ...after, x: before.x, y: before.y };
    if (!insideParent(proposed, currentById)) {
      decisions.push({ nodeId, status: "rejected-containment" });
      continue;
    }
    if (collidesWithSibling(proposed, currentById, minimumGap)) {
      decisions.push({ nodeId, status: "rejected-collision" });
      continue;
    }
    currentById.set(nodeId, proposed);
    decisions.push({ nodeId, status: "retained" });
  }

  const nodes = [...currentById.values()].sort((left, right) => compareText(left.id, right.id));
  const finalById = new Map(nodes.map((node) => [node.id, node]));
  return {
    layout: {
      requestId: candidate.requestId,
      width: Math.max(candidate.width, ...nodes.map((node) => node.x + node.width)),
      height: Math.max(candidate.height, ...nodes.map((node) => node.y + node.height)),
      nodes,
      edges: candidate.edges.map((edge) =>
        reconcileEdge(edge, diagram, candidateById, finalById),
      ),
    },
    decisions,
  };
}

function insideParent(
  node: LayoutNodeResult,
  nodes: ReadonlyMap<string, LayoutNodeResult>,
): boolean {
  if (node.parentId === undefined) return true;
  const parent = nodes.get(node.parentId);
  return parent !== undefined &&
    node.x >= parent.x &&
    node.y >= parent.y &&
    node.x + node.width <= parent.x + parent.width &&
    node.y + node.height <= parent.y + parent.height;
}

function collidesWithSibling(
  proposed: LayoutNodeResult,
  nodes: ReadonlyMap<string, LayoutNodeResult>,
  gap: number,
): boolean {
  return [...nodes.values()].some((other) =>
    other.id !== proposed.id &&
    other.parentId === proposed.parentId &&
    overlaps(proposed, other, gap)
  );
}

function overlaps(left: LayoutNodeResult, right: LayoutNodeResult, gap: number): boolean {
  return !(
    left.x + left.width + gap <= right.x ||
    right.x + right.width + gap <= left.x ||
    left.y + left.height + gap <= right.y ||
    right.y + right.height + gap <= left.y
  );
}

function reconcileEdge(
  edge: LayoutEdgeResult,
  diagram: PreparedDiagram,
  candidateById: ReadonlyMap<string, LayoutNodeResult>,
  finalById: ReadonlyMap<string, LayoutNodeResult>,
): LayoutEdgeResult {
  const request = diagram.layoutRequest.edges.find(({ id }) => id === edge.id);
  if (request === undefined) return edge;
  const sourceDelta = delta(candidateById.get(request.sourceId), finalById.get(request.sourceId));
  const targetDelta = delta(candidateById.get(request.targetId), finalById.get(request.targetId));
  if (sourceDelta.x === targetDelta.x && sourceDelta.y === targetDelta.y) {
    return {
      ...edge,
      sections: edge.sections.map((section) => ({
        start: add(section.start, sourceDelta),
        bends: section.bends.map((point) => add(point, sourceDelta)),
        end: add(section.end, sourceDelta),
      })),
    };
  }
  const source = finalById.get(request.sourceId);
  const target = finalById.get(request.targetId);
  if (source === undefined || target === undefined) return edge;
  const sourceCenter = center(source);
  const targetCenter = center(target);
  const horizontal = Math.abs(targetCenter.x - sourceCenter.x) >= Math.abs(targetCenter.y - sourceCenter.y);
  const start = horizontal
    ? { x: sourceCenter.x <= targetCenter.x ? source.x + source.width : source.x, y: sourceCenter.y }
    : { x: sourceCenter.x, y: sourceCenter.y <= targetCenter.y ? source.y + source.height : source.y };
  const end = horizontal
    ? { x: sourceCenter.x <= targetCenter.x ? target.x : target.x + target.width, y: targetCenter.y }
    : { x: targetCenter.x, y: sourceCenter.y <= targetCenter.y ? target.y : target.y + target.height };
  const bends = horizontal
    ? [{ x: (start.x + end.x) / 2, y: start.y }, { x: (start.x + end.x) / 2, y: end.y }]
    : [{ x: start.x, y: (start.y + end.y) / 2 }, { x: end.x, y: (start.y + end.y) / 2 }];
  return { id: edge.id, sections: [{ start, bends, end }] };
}

function delta(before: LayoutNodeResult | undefined, after: LayoutNodeResult | undefined): Point {
  return before === undefined || after === undefined
    ? { x: 0, y: 0 }
    : { x: after.x - before.x, y: after.y - before.y };
}

function add(point: Point, offset: Point): Point {
  return { x: point.x + offset.x, y: point.y + offset.y };
}

function center(node: LayoutNodeResult): Point {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}
