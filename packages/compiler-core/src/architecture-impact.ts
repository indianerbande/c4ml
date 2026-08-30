import type { ArchitectureDifference, ArchitectureChange } from "./architecture-diff.js";
import {
  createArchitectureGraphIndex,
  type ArchitectureGraphIndex,
  type ArchitectureGraphItemKey,
  type ArchitectureGraphPath,
} from "./architecture-graph.js";
import type { ArchitectureSnapshot } from "./architecture-snapshot.js";
import { compareText } from "./ordering.js";

export const architectureImpactVersion = 1 as const;

export interface ArchitectureChangeImpact {
  readonly changeId: string;
  readonly subjectKey: ArchitectureGraphItemKey;
  readonly directlyAffectedItemKeys: readonly ArchitectureGraphItemKey[];
  readonly upstreamPaths: readonly ArchitectureGraphPath[];
  readonly downstreamPaths: readonly ArchitectureGraphPath[];
  readonly affectedViewKeys: readonly ArchitectureGraphItemKey[];
}

export interface ArchitectureImpactReport {
  readonly version: typeof architectureImpactVersion;
  readonly differenceVersion: ArchitectureDifference["version"];
  readonly impacts: readonly ArchitectureChangeImpact[];
}

export function deriveArchitectureImpacts(
  before: ArchitectureSnapshot,
  after: ArchitectureSnapshot,
  difference: ArchitectureDifference,
): ArchitectureImpactReport {
  const beforeGraph = createArchitectureGraphIndex(before);
  const afterGraph = createArchitectureGraphIndex(after);
  return {
    version: architectureImpactVersion,
    differenceVersion: difference.version,
    impacts: difference.changes.map((change) =>
      impactForChange(change, beforeGraph, afterGraph),
    ),
  };
}

export function serializeArchitectureImpactReport(
  report: ArchitectureImpactReport,
): string {
  return JSON.stringify(report);
}

export function isArchitectureImpactReport(
  value: unknown,
): value is ArchitectureImpactReport {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<ArchitectureImpactReport>;
  return candidate.version === architectureImpactVersion &&
    candidate.differenceVersion === 1 &&
    Array.isArray(candidate.impacts) &&
    candidate.impacts.every((impact) => {
      if (typeof impact !== "object" || impact === null) return false;
      const item = impact as Partial<ArchitectureChangeImpact>;
      return typeof item.changeId === "string" &&
        typeof item.subjectKey === "string" &&
        Array.isArray(item.directlyAffectedItemKeys) &&
        item.directlyAffectedItemKeys.every((key) => typeof key === "string") &&
        Array.isArray(item.upstreamPaths) && item.upstreamPaths.every(isGraphPath) &&
        Array.isArray(item.downstreamPaths) && item.downstreamPaths.every(isGraphPath) &&
        Array.isArray(item.affectedViewKeys) &&
        item.affectedViewKeys.every((key) => typeof key === "string");
    });
}

function isGraphPath(value: unknown): value is ArchitectureGraphPath {
  if (typeof value !== "object" || value === null) return false;
  const path = value as Partial<ArchitectureGraphPath>;
  return typeof path.startKey === "string" &&
    typeof path.endKey === "string" &&
    (path.direction === "upstream" || path.direction === "downstream") &&
    Array.isArray(path.itemKeys) && path.itemKeys.every((key) => typeof key === "string") &&
    Array.isArray(path.relationshipKeys) &&
    path.relationshipKeys.every((key) => typeof key === "string");
}

function impactForChange(
  change: ArchitectureChange,
  beforeGraph: ArchitectureGraphIndex,
  afterGraph: ArchitectureGraphIndex,
): ArchitectureChangeImpact {
  const graphs = change.kind === "added"
    ? [afterGraph]
    : change.kind === "removed"
      ? [beforeGraph]
      : [beforeGraph, afterGraph];
  const direct = new Set<ArchitectureGraphItemKey>([change.subjectKey]);
  const upstreamStarts = new Set<ArchitectureGraphItemKey>();
  const downstreamStarts = new Set<ArchitectureGraphItemKey>();

  for (const graph of graphs) {
    const endpoints = graph.relationshipEndpoints(change.subjectKey);
    if (endpoints === undefined) {
      if (graph.itemKeys.includes(change.subjectKey)) {
        upstreamStarts.add(change.subjectKey);
        downstreamStarts.add(change.subjectKey);
      }
      continue;
    }
    direct.add(endpoints.sourceKey);
    direct.add(endpoints.targetKey);
    upstreamStarts.add(endpoints.sourceKey);
    downstreamStarts.add(endpoints.targetKey);
  }

  const upstreamPaths = stablePaths(
    graphs.flatMap((graph) =>
      [...upstreamStarts].flatMap((startKey) => graph.tracePaths(startKey, "upstream")),
    ),
  );
  const downstreamPaths = stablePaths(
    graphs.flatMap((graph) =>
      [...downstreamStarts].flatMap((startKey) => graph.tracePaths(startKey, "downstream")),
    ),
  );
  const affectedItems = new Set<ArchitectureGraphItemKey>(direct);
  for (const path of [...upstreamPaths, ...downstreamPaths]) {
    path.itemKeys.forEach((key) => affectedItems.add(key));
    path.relationshipKeys.forEach((key) => affectedItems.add(key));
  }
  const affectedViews = new Set<ArchitectureGraphItemKey>();
  for (const graph of graphs) {
    for (const itemKey of affectedItems) {
      graph.viewsContaining(itemKey).forEach((key) => affectedViews.add(key));
    }
  }

  return {
    changeId: change.id,
    subjectKey: change.subjectKey,
    directlyAffectedItemKeys: [...direct].sort(compareText),
    upstreamPaths,
    downstreamPaths,
    affectedViewKeys: [...affectedViews].sort(compareText),
  };
}

function stablePaths(paths: readonly ArchitectureGraphPath[]): ArchitectureGraphPath[] {
  const byIdentity = new Map<string, ArchitectureGraphPath>();
  for (const path of paths) {
    const identity = [
      path.direction,
      path.startKey,
      path.endKey,
      path.itemKeys.join("\u0000"),
      path.relationshipKeys.join("\u0000"),
    ].join("\u0001");
    byIdentity.set(identity, path);
  }
  return [...byIdentity.values()].sort(
    (left, right) =>
      compareText(left.direction, right.direction) ||
      compareText(left.startKey, right.startKey) ||
      compareText(left.endKey, right.endKey) ||
      compareText(left.relationshipKeys.join("\u0000"), right.relationshipKeys.join("\u0000")),
  );
}
