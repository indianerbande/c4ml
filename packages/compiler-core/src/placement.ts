import type { PreparedDiagram } from "./diagram-preparation.js";
import {
  ContractError,
  type LayoutEdgeResult,
  type LayoutNodeResult,
  type LayoutResult,
  type Point,
} from "./layout.js";
import { compareText } from "./ordering.js";
import type { SourceBacked } from "./source.js";

export type PlacementStrength = "hard" | "soft";
export type RelativePlacementRelation =
  | "above"
  | "below"
  | "left-of"
  | "right-of";
export type PlacementAlignment = "center-x" | "center-y";

interface PlacementConstraintBase extends SourceBacked {
  readonly id: string;
  readonly strength: PlacementStrength;
}

export interface RelativePlacementConstraint extends PlacementConstraintBase {
  readonly kind: "relative";
  readonly relation: RelativePlacementRelation;
  readonly subjectId: string;
  readonly targetId: string;
  readonly gap: number;
}

export interface AlignmentPlacementConstraint extends PlacementConstraintBase {
  readonly kind: "alignment";
  readonly alignment: PlacementAlignment;
  readonly subjectId: string;
  readonly targetId: string;
}

export interface PinPlacementConstraint extends PlacementConstraintBase {
  readonly kind: "pin";
  readonly targetId: string;
  readonly x: number;
  readonly y: number;
}

export type PlacementConstraint =
  | AlignmentPlacementConstraint
  | PinPlacementConstraint
  | RelativePlacementConstraint;

export interface DiagramPlacementOptions {
  readonly constraints: readonly PlacementConstraint[];
}

export interface EffectivePlacementConstraint {
  readonly id: string;
  readonly kind: PlacementConstraint["kind"];
  readonly strength: PlacementStrength;
  readonly nodeIds: readonly string[];
  readonly satisfied: boolean;
  readonly relaxed: boolean;
}

export interface PlacementResult {
  readonly layout: LayoutResult;
  readonly constraints: readonly EffectivePlacementConstraint[];
}

export class PlacementConflictError extends ContractError {
  constructor(
    code: string,
    message: string,
    readonly constraintIds: readonly string[],
  ) {
    super(code, message);
    this.name = "PlacementConflictError";
  }
}

const epsilon = 0.001;

export function applyPlacementConstraints(
  diagram: PreparedDiagram,
  candidate: LayoutResult,
  options: DiagramPlacementOptions = { constraints: [] },
): PlacementResult {
  validateCandidate(diagram, candidate);
  const constraints = stableConstraints(options.constraints);
  validateConstraints(diagram, constraints);
  if (constraints.length === 0) {
    return { layout: candidate, constraints: [] };
  }

  const candidateById = new Map(candidate.nodes.map((node) => [node.id, node]));
  const referenceToNodeId = new Map(
    diagram.nodes
      .filter(isPlaceableNode)
      .map((node) => [node.referenceId, node.id]),
  );
  const state = new Map(
    candidate.nodes.map((node) => [node.id, { ...node }]),
  );
  const hard = constraints.filter(({ strength }) => strength === "hard");
  const soft = constraints.filter(({ strength }) => strength === "soft");
  const locks = applyHardPins(state, hard, referenceToNodeId);

  solveHardConstraints(state, hard, referenceToNodeId, locks);

  const effective: EffectivePlacementConstraint[] = hard.map((constraint) =>
    effectiveConstraint(constraint, referenceToNodeId, true),
  );
  for (const constraint of soft) {
    const before = cloneState(state);
    applyConstraint(state, constraint, referenceToNodeId, locks);
    const hardStillSatisfied = hard.every((hardConstraint) =>
      isSatisfied(state, hardConstraint, referenceToNodeId),
    );
    if (!hardStillSatisfied) {
      restoreState(state, before);
    }
    const satisfied =
      hardStillSatisfied && isSatisfied(state, constraint, referenceToNodeId);
    effective.push(
      effectiveConstraint(constraint, referenceToNodeId, satisfied),
    );
  }

  const nodes = resizeAffectedAncestors(
    [...state.values()].sort((left, right) => compareText(left.id, right.id)),
    candidateById,
  );
  const finalById = new Map(nodes.map((node) => [node.id, node]));
  const edges = candidate.edges.map((edge) =>
    moveEdgeWithEndpoints(edge, diagram, candidateById, finalById),
  );

  return {
    layout: {
      requestId: candidate.requestId,
      width: Math.max(
        candidate.width,
        ...nodes.map((node) => node.x + node.width),
      ),
      height: Math.max(
        candidate.height,
        ...nodes.map((node) => node.y + node.height),
      ),
      nodes,
      edges,
    },
    constraints: effective.sort((left, right) => compareText(left.id, right.id)),
  };
}

function validateCandidate(
  diagram: PreparedDiagram,
  candidate: LayoutResult,
): void {
  if (candidate.requestId !== diagram.layoutRequest.id) {
    throw new ContractError(
      "C4ML-PLACEMENT-001",
      `Layout result ${candidate.requestId} does not match ${diagram.layoutRequest.id}.`,
    );
  }
}

function validateConstraints(
  diagram: PreparedDiagram,
  constraints: readonly PlacementConstraint[],
): void {
  const ids = new Set<string>();
  const referenceIds = new Set(
    diagram.nodes.filter(isPlaceableNode).map((node) => node.referenceId),
  );
  for (const constraint of constraints) {
    if (constraint.id.length === 0 || ids.has(constraint.id)) {
      throw new ContractError(
        "C4ML-PLACEMENT-002",
        constraint.id.length === 0
          ? "Placement constraint ID is empty."
          : `Duplicate placement constraint ID: ${constraint.id}`,
      );
    }
    ids.add(constraint.id);
    for (const referenceId of referencedIds(constraint)) {
      if (!referenceIds.has(referenceId)) {
        throw new ContractError(
          "C4ML-PLACEMENT-003",
          `Placement constraint ${constraint.id} references unknown or non-visible item ${referenceId}.`,
        );
      }
    }
    if (
      constraint.kind !== "pin" &&
      constraint.subjectId === constraint.targetId
    ) {
      throw new ContractError(
        "C4ML-PLACEMENT-004",
        `Placement constraint ${constraint.id} must reference two different items.`,
      );
    }
    if (
      constraint.kind === "relative" &&
      (!Number.isFinite(constraint.gap) || constraint.gap < 0)
    ) {
      throw new ContractError(
        "C4ML-PLACEMENT-005",
        `Placement constraint ${constraint.id} requires a finite non-negative gap.`,
      );
    }
    if (
      constraint.kind === "pin" &&
      (!Number.isFinite(constraint.x) ||
        !Number.isFinite(constraint.y) ||
        constraint.x < 0 ||
        constraint.y < 0)
    ) {
      throw new ContractError(
        "C4ML-PLACEMENT-006",
        `Pin ${constraint.id} requires finite non-negative coordinates.`,
      );
    }
  }
}

function applyHardPins(
  state: Map<string, MutableLayoutNode>,
  constraints: readonly PlacementConstraint[],
  referenceToNodeId: ReadonlyMap<string, string>,
): AxisLocks {
  const locks: AxisLocks = { x: new Map(), y: new Map() };
  for (const constraint of constraints) {
    if (constraint.kind !== "pin") {
      continue;
    }
    const nodeId = requiredNodeId(referenceToNodeId, constraint.targetId);
    const existingX = locks.x.get(nodeId);
    const existingY = locks.y.get(nodeId);
    if (
      (existingX !== undefined && Math.abs(existingX.value - constraint.x) > epsilon) ||
      (existingY !== undefined && Math.abs(existingY.value - constraint.y) > epsilon)
    ) {
      throw new PlacementConflictError(
        "C4ML-PLACEMENT-010",
        `Hard pins for ${constraint.targetId} require different positions.`,
        [existingX?.constraintId, existingY?.constraintId, constraint.id].filter(
          (id): id is string => id !== undefined,
        ),
      );
    }
    locks.x.set(nodeId, { value: constraint.x, constraintId: constraint.id });
    locks.y.set(nodeId, { value: constraint.y, constraintId: constraint.id });
    const node = requiredStateNode(state, nodeId);
    node.x = constraint.x;
    node.y = constraint.y;
  }
  return locks;
}

function solveHardConstraints(
  state: Map<string, MutableLayoutNode>,
  constraints: readonly PlacementConstraint[],
  referenceToNodeId: ReadonlyMap<string, string>,
  locks: AxisLocks,
): void {
  const nonPins = constraints.filter(({ kind }) => kind !== "pin");
  const maxPasses = Math.max(1, nonPins.length * Math.max(4, state.size * 2));
  for (let pass = 0; pass < maxPasses; pass += 1) {
    let changed = false;
    for (const constraint of nonPins) {
      changed = applyConstraint(state, constraint, referenceToNodeId, locks) || changed;
    }
    if (!changed) {
      return;
    }
  }

  const unsatisfied = nonPins.filter(
    (constraint) => !isSatisfied(state, constraint, referenceToNodeId),
  );
  if (unsatisfied.length > 0) {
    const involved = new Set(unsatisfied.flatMap(referencedIds));
    const conflictIds = constraints
      .filter((constraint) => referencedIds(constraint).some((id) => involved.has(id)))
      .map(({ id }) => id);
    throw new PlacementConflictError(
      "C4ML-PLACEMENT-011",
      `Hard placement constraints conflict: ${conflictIds.join(", ")}.`,
      conflictIds,
    );
  }
}

function applyConstraint(
  state: Map<string, MutableLayoutNode>,
  constraint: PlacementConstraint,
  referenceToNodeId: ReadonlyMap<string, string>,
  locks: AxisLocks,
): boolean {
  if (constraint.kind === "pin") {
    const node = requiredStateNode(
      state,
      requiredNodeId(referenceToNodeId, constraint.targetId),
    );
    const changed =
      Math.abs(node.x - constraint.x) > epsilon ||
      Math.abs(node.y - constraint.y) > epsilon;
    node.x = constraint.x;
    node.y = constraint.y;
    return changed;
  }

  const subjectId = requiredNodeId(referenceToNodeId, constraint.subjectId);
  const targetId = requiredNodeId(referenceToNodeId, constraint.targetId);
  const subject = requiredStateNode(state, subjectId);
  const target = requiredStateNode(state, targetId);

  if (constraint.kind === "alignment") {
    const axis = constraint.alignment === "center-x" ? "x" : "y";
    const size = axis === "x" ? "width" : "height";
    const delta =
      target[axis] + target[size] / 2 -
      (subject[axis] + subject[size] / 2);
    if (Math.abs(delta) <= epsilon) {
      return false;
    }
    return movePair(state, subjectId, targetId, axis, delta, locks, constraint);
  }

  const axis =
    constraint.relation === "left-of" || constraint.relation === "right-of"
      ? "x"
      : "y";
  const size = axis === "x" ? "width" : "height";
  const subjectFirst =
    constraint.relation === "left-of" || constraint.relation === "above";
  const firstId = subjectFirst ? subjectId : targetId;
  const secondId = subjectFirst ? targetId : subjectId;
  const first = requiredStateNode(state, firstId);
  const second = requiredStateNode(state, secondId);
  const violation = first[axis] + first[size] + constraint.gap - second[axis];
  if (violation <= epsilon) {
    return false;
  }
  return movePair(state, secondId, firstId, axis, violation, locks, constraint);
}

function movePair(
  state: Map<string, MutableLayoutNode>,
  preferredNodeId: string,
  fallbackNodeId: string,
  axis: "x" | "y",
  delta: number,
  locks: AxisLocks,
  constraint: PlacementConstraint,
): boolean {
  if (!locks[axis].has(preferredNodeId)) {
    requiredStateNode(state, preferredNodeId)[axis] += delta;
    return Math.abs(delta) > epsilon;
  }
  if (!locks[axis].has(fallbackNodeId)) {
    requiredStateNode(state, fallbackNodeId)[axis] -= delta;
    return Math.abs(delta) > epsilon;
  }
  if (constraint.strength === "hard") {
    const ids = [
      constraint.id,
      locks[axis].get(preferredNodeId)?.constraintId,
      locks[axis].get(fallbackNodeId)?.constraintId,
    ].filter((id): id is string => id !== undefined);
    throw new PlacementConflictError(
      "C4ML-PLACEMENT-012",
      `Hard placement constraint ${constraint.id} conflicts with pinned ${axis}-positions.`,
      ids,
    );
  }
  return false;
}

function isSatisfied(
  state: ReadonlyMap<string, MutableLayoutNode>,
  constraint: PlacementConstraint,
  referenceToNodeId: ReadonlyMap<string, string>,
): boolean {
  if (constraint.kind === "pin") {
    const node = requiredStateNode(
      state,
      requiredNodeId(referenceToNodeId, constraint.targetId),
    );
    return (
      Math.abs(node.x - constraint.x) <= epsilon &&
      Math.abs(node.y - constraint.y) <= epsilon
    );
  }
  const subject = requiredStateNode(
    state,
    requiredNodeId(referenceToNodeId, constraint.subjectId),
  );
  const target = requiredStateNode(
    state,
    requiredNodeId(referenceToNodeId, constraint.targetId),
  );
  if (constraint.kind === "alignment") {
    return constraint.alignment === "center-x"
      ? Math.abs(subject.x + subject.width / 2 - target.x - target.width / 2) <= epsilon
      : Math.abs(subject.y + subject.height / 2 - target.y - target.height / 2) <= epsilon;
  }
  switch (constraint.relation) {
    case "left-of":
      return subject.x + subject.width + constraint.gap <= target.x + epsilon;
    case "right-of":
      return target.x + target.width + constraint.gap <= subject.x + epsilon;
    case "above":
      return subject.y + subject.height + constraint.gap <= target.y + epsilon;
    case "below":
      return target.y + target.height + constraint.gap <= subject.y + epsilon;
  }
}

function resizeAffectedAncestors(
  nodes: readonly LayoutNodeResult[],
  candidateById: ReadonlyMap<string, LayoutNodeResult>,
): LayoutNodeResult[] {
  const byId = new Map(nodes.map((node) => [node.id, { ...node }]));
  const affectedParents = new Set<string>();
  for (const node of nodes) {
    const candidate = candidateById.get(node.id);
    if (
      candidate === undefined ||
      (Math.abs(candidate.x - node.x) <= epsilon &&
        Math.abs(candidate.y - node.y) <= epsilon &&
        Math.abs(candidate.width - node.width) <= epsilon &&
        Math.abs(candidate.height - node.height) <= epsilon)
    ) {
      continue;
    }
    let parentId = node.parentId;
    while (parentId !== undefined) {
      affectedParents.add(parentId);
      parentId = byId.get(parentId)?.parentId;
    }
  }
  const depth = (node: LayoutNodeResult): number => {
    let value = 0;
    let parentId = node.parentId;
    while (parentId !== undefined) {
      value += 1;
      parentId = byId.get(parentId)?.parentId;
    }
    return value;
  };
  const parents = nodes
    .filter((node) => affectedParents.has(node.id))
    .sort(
      (left, right) =>
        depth(right) - depth(left) || compareText(left.id, right.id),
    );
  for (const parent of parents) {
    const children = [...byId.values()].filter(
      ({ parentId }) => parentId === parent.id,
    );
    if (children.length === 0) {
      continue;
    }
    const padding = parent.padding ?? 0;
    const mutable = byId.get(parent.id)!;
    mutable.x = Math.min(...children.map(({ x }) => x)) - padding;
    mutable.y = Math.min(...children.map(({ y }) => y)) - padding;
    mutable.width =
      Math.max(...children.map(({ x, width }) => x + width)) - mutable.x + padding;
    mutable.height =
      Math.max(...children.map(({ y, height }) => y + height)) - mutable.y + padding;
  }
  return [...byId.values()].sort((left, right) => compareText(left.id, right.id));
}

function isPlaceableNode(
  node: PreparedDiagram["nodes"][number],
): boolean {
  return node.kind === "element" || node.kind === "infrastructure-node";
}

function moveEdgeWithEndpoints(
  edge: LayoutEdgeResult,
  diagram: PreparedDiagram,
  candidateById: ReadonlyMap<string, LayoutNodeResult>,
  finalById: ReadonlyMap<string, LayoutNodeResult>,
): LayoutEdgeResult {
  const requestEdge = diagram.layoutRequest.edges.find(({ id }) => id === edge.id);
  if (requestEdge === undefined) {
    return edge;
  }
  const sourceDelta = nodeDelta(requestEdge.sourceId, candidateById, finalById);
  const targetDelta = nodeDelta(requestEdge.targetId, candidateById, finalById);
  if (
    Math.abs(sourceDelta.x - targetDelta.x) <= epsilon &&
    Math.abs(sourceDelta.y - targetDelta.y) <= epsilon
  ) {
    return {
      ...edge,
      sections: edge.sections.map((section) => ({
        start: add(section.start, sourceDelta),
        bends: section.bends.map((point) => add(point, sourceDelta)),
        end: add(section.end, sourceDelta),
      })),
    };
  }
  const source = requiredStateNode(finalById, requestEdge.sourceId);
  const target = requiredStateNode(finalById, requestEdge.targetId);
  const sourceCenter = {
    x: source.x + source.width / 2,
    y: source.y + source.height / 2,
  };
  const targetCenter = {
    x: target.x + target.width / 2,
    y: target.y + target.height / 2,
  };
  if (
    Math.abs(targetCenter.x - sourceCenter.x) >=
    Math.abs(targetCenter.y - sourceCenter.y)
  ) {
    const sourceOnLeft = sourceCenter.x <= targetCenter.x;
    const start = {
      x: sourceOnLeft ? source.x + source.width : source.x,
      y: sourceCenter.y,
    };
    const end = {
      x: sourceOnLeft ? target.x : target.x + target.width,
      y: targetCenter.y,
    };
    const middle = (start.x + end.x) / 2;
    return {
      id: edge.id,
      sections: [
        {
          start,
          bends: [
            { x: middle, y: start.y },
            { x: middle, y: end.y },
          ],
          end,
        },
      ],
    };
  }
  const sourceAbove = sourceCenter.y <= targetCenter.y;
  const start = {
    x: sourceCenter.x,
    y: sourceAbove ? source.y + source.height : source.y,
  };
  const end = {
    x: targetCenter.x,
    y: sourceAbove ? target.y : target.y + target.height,
  };
  const middle = (start.y + end.y) / 2;
  return {
    id: edge.id,
    sections: [
      {
        start,
        bends: [
          { x: start.x, y: middle },
          { x: end.x, y: middle },
        ],
        end,
      },
    ],
  };
}

function nodeDelta(
  id: string,
  candidateById: ReadonlyMap<string, LayoutNodeResult>,
  finalById: ReadonlyMap<string, LayoutNodeResult>,
): Point {
  const before = requiredStateNode(candidateById, id);
  const after = requiredStateNode(finalById, id);
  return { x: after.x - before.x, y: after.y - before.y };
}

function add(point: Point, delta: Point): Point {
  return { x: point.x + delta.x, y: point.y + delta.y };
}

function effectiveConstraint(
  constraint: PlacementConstraint,
  referenceToNodeId: ReadonlyMap<string, string>,
  satisfied: boolean,
): EffectivePlacementConstraint {
  return {
    id: constraint.id,
    kind: constraint.kind,
    strength: constraint.strength,
    nodeIds: referencedIds(constraint).map((id) =>
      requiredNodeId(referenceToNodeId, id),
    ),
    satisfied,
    relaxed: constraint.strength === "soft" && !satisfied,
  };
}

function referencedIds(constraint: PlacementConstraint): string[] {
  return constraint.kind === "pin"
    ? [constraint.targetId]
    : [constraint.subjectId, constraint.targetId];
}

function stableConstraints(
  constraints: readonly PlacementConstraint[],
): PlacementConstraint[] {
  return [...constraints].sort((left, right) => compareText(left.id, right.id));
}

function requiredNodeId(
  referenceToNodeId: ReadonlyMap<string, string>,
  referenceId: string,
): string {
  const id = referenceToNodeId.get(referenceId);
  if (id === undefined) {
    throw new ContractError(
      "C4ML-PLACEMENT-003",
      `Unknown or non-visible placement item ${referenceId}.`,
    );
  }
  return id;
}

type MutableLayoutNode = {
  -readonly [Key in keyof LayoutNodeResult]: LayoutNodeResult[Key];
};

interface AxisLock {
  readonly value: number;
  readonly constraintId: string;
}

interface AxisLocks {
  readonly x: Map<string, AxisLock>;
  readonly y: Map<string, AxisLock>;
}

function requiredStateNode<T extends LayoutNodeResult>(
  state: ReadonlyMap<string, T>,
  id: string,
): T {
  const node = state.get(id);
  if (node === undefined) {
    throw new ContractError(
      "C4ML-PLACEMENT-007",
      `Placement state has no node ${id}.`,
    );
  }
  return node;
}

function cloneState(
  state: ReadonlyMap<string, MutableLayoutNode>,
): Map<string, MutableLayoutNode> {
  return new Map([...state].map(([id, node]) => [id, { ...node }]));
}

function restoreState(
  state: Map<string, MutableLayoutNode>,
  snapshot: ReadonlyMap<string, MutableLayoutNode>,
): void {
  state.clear();
  for (const [id, node] of snapshot) {
    state.set(id, { ...node });
  }
}
