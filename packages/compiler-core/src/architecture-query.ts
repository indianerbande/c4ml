import {
  createArchitectureQueryResult,
  type AnalysisEvidence,
  type ArchitectureQueryResult,
} from "./analysis.js";
import {
  architectureGraphItemKey,
  createArchitectureGraphIndex,
  type ArchitectureGraphDirection,
  type ArchitectureGraphIndex,
  type ArchitectureGraphItemKey,
  type ArchitectureGraphPath,
} from "./architecture-graph.js";
import type { ArchitectureSnapshot } from "./architecture-snapshot.js";
import { compareText } from "./ordering.js";

export type ArchitectureQuery =
  | ArchitectureTraversalQuery
  | ArchitecturePathQuery
  | ArchitectureContainmentQuery
  | ArchitectureDeploymentQuery
  | ArchitectureViewCoverageQuery;

interface ArchitectureQueryBase {
  readonly id: string;
  readonly subjectKey: ArchitectureGraphItemKey;
}

export interface ArchitectureTraversalQuery extends ArchitectureQueryBase {
  readonly kind: "downstream" | "upstream";
}

export interface ArchitecturePathQuery extends ArchitectureQueryBase {
  readonly kind: "path";
  readonly targetKey: ArchitectureGraphItemKey;
  readonly direction?: ArchitectureGraphDirection;
}

export interface ArchitectureContainmentQuery extends ArchitectureQueryBase {
  readonly kind: "containment";
  readonly scope?: "ancestors" | "both" | "descendants";
}

export interface ArchitectureDeploymentQuery extends ArchitectureQueryBase {
  readonly kind: "deployment";
}

export interface ArchitectureViewCoverageQuery extends ArchitectureQueryBase {
  readonly kind: "view-coverage";
}

export const temporaryArchitectureViewVersion = 1 as const;

export interface TemporaryArchitectureViewExplanation {
  readonly subjectKey: ArchitectureGraphItemKey;
  readonly evidenceIds: readonly string[];
  readonly statements: readonly string[];
}

/**
 * A query-owned projection over canonical identities. It deliberately carries
 * no copied element, relationship, deployment, or View definitions.
 */
export interface TemporaryArchitectureView {
  readonly version: typeof temporaryArchitectureViewVersion;
  readonly id: string;
  readonly title: string;
  readonly queryId: string;
  readonly resultKind: ArchitectureQueryResult["resultKind"];
  readonly itemKeys: readonly ArchitectureGraphItemKey[];
  readonly relationshipKeys: readonly ArchitectureGraphItemKey[];
  readonly explanations: readonly TemporaryArchitectureViewExplanation[];
}

export class ArchitectureQueryError extends Error {
  constructor(
    readonly code:
      | "C4ML-QUERY-001"
      | "C4ML-QUERY-002"
      | "C4ML-QUERY-003",
    message: string,
  ) {
    super(message);
    this.name = "ArchitectureQueryError";
  }
}

export function executeArchitectureQuery(
  snapshot: ArchitectureSnapshot,
  query: ArchitectureQuery,
): ArchitectureQueryResult {
  if (query.id.trim().length === 0) {
    throw new ArchitectureQueryError(
      "C4ML-QUERY-001",
      "An architecture query requires a stable identity.",
    );
  }
  const graph = createArchitectureGraphIndex(snapshot);
  requireGraphItem(graph, query.subjectKey, "query subject");

  switch (query.kind) {
    case "downstream":
    case "upstream":
      return traversalResult(graph, query);
    case "path":
      requireGraphItem(graph, query.targetKey, "path target");
      return pathResult(graph, query);
    case "containment":
      return containmentResult(graph, query);
    case "deployment":
      return deploymentResult(graph, query);
    case "view-coverage":
      return viewCoverageResult(graph, query);
  }
}

export function createTemporaryArchitectureView(
  result: ArchitectureQueryResult,
  options: { readonly id: string; readonly title: string },
): TemporaryArchitectureView {
  if (options.id.trim().length === 0 || options.title.trim().length === 0) {
    throw new ArchitectureQueryError(
      "C4ML-QUERY-001",
      "A temporary architecture view requires a stable identity and title.",
    );
  }
  const included = [...result.itemKeys, ...result.relationshipKeys];
  const evidenceBySubject = new Map<
    ArchitectureGraphItemKey,
    AnalysisEvidence[]
  >();
  for (const evidence of result.evidence) {
    const values = evidenceBySubject.get(evidence.subjectKey) ?? [];
    values.push(evidence);
    evidenceBySubject.set(evidence.subjectKey, values);
  }
  const explanations = included
    .sort(compareText)
    .map((subjectKey) => {
      const evidence = evidenceBySubject.get(subjectKey) ?? [];
      if (evidence.length === 0) {
        throw new ArchitectureQueryError(
          "C4ML-QUERY-003",
          `Temporary view item ${subjectKey} has no inclusion explanation.`,
        );
      }
      return {
        subjectKey,
        evidenceIds: evidence.map(({ id }) => id),
        statements: evidence.map(({ statement }) => statement),
      };
    });
  return {
    version: temporaryArchitectureViewVersion,
    id: options.id,
    title: options.title,
    queryId: result.queryId,
    resultKind: result.resultKind,
    itemKeys: [...result.itemKeys],
    relationshipKeys: [...result.relationshipKeys],
    explanations,
  };
}

function traversalResult(
  graph: ArchitectureGraphIndex,
  query: ArchitectureTraversalQuery,
): ArchitectureQueryResult {
  const traversal = graph.traverse(query.subjectKey, query.kind);
  const paths = graph.tracePaths(query.subjectKey, query.kind);
  const itemKeys = [query.subjectKey, ...traversal.itemKeys];
  const evidence = [
    evidenceFor(
      query.id,
      query.subjectKey,
      `The ${query.kind} query starts at ${query.subjectKey}.`,
      0,
    ),
    ...paths.map((path, index) =>
      evidenceFor(
        query.id,
        path.endKey,
        `${path.endKey} is ${query.kind} through ${path.relationshipKeys.join(" -> ")}.`,
        index + 1,
      ),
    ),
    ...traversal.relationshipKeys.map((relationshipKey, index) =>
      evidenceFor(
        query.id,
        relationshipKey,
        `${relationshipKey} participates in the ${query.kind} traversal from ${query.subjectKey}.`,
        paths.length + index + 1,
      ),
    ),
  ];
  return createArchitectureQueryResult({
    queryId: query.id,
    resultKind: query.kind,
    itemKeys,
    relationshipKeys: traversal.relationshipKeys,
    evidence,
  });
}

function pathResult(
  graph: ArchitectureGraphIndex,
  query: ArchitecturePathQuery,
): ArchitectureQueryResult {
  const direction = query.direction ?? "downstream";
  const path = graph
    .tracePaths(query.subjectKey, direction)
    .find(({ endKey }) => endKey === query.targetKey);
  if (path === undefined) {
    throw new ArchitectureQueryError(
      "C4ML-QUERY-002",
      `No ${direction} path exists from ${query.subjectKey} to ${query.targetKey}.`,
    );
  }
  return createArchitectureQueryResult({
    queryId: query.id,
    resultKind: "path",
    itemKeys: path.itemKeys,
    relationshipKeys: path.relationshipKeys,
    evidence: pathEvidence(query.id, path),
  });
}

function containmentResult(
  graph: ArchitectureGraphIndex,
  query: ArchitectureContainmentQuery,
): ArchitectureQueryResult {
  const scope = query.scope ?? "both";
  const items = new Set<ArchitectureGraphItemKey>([query.subjectKey]);
  const evidence: AnalysisEvidence[] = [
    evidenceFor(
      query.id,
      query.subjectKey,
      `The containment query starts at ${query.subjectKey}.`,
      0,
    ),
  ];
  let sequence = 1;
  if (scope === "ancestors" || scope === "both") {
    let child = query.subjectKey;
    let parent = graph.parentOf(child);
    while (parent !== undefined) {
      items.add(parent);
      evidence.push(
        evidenceFor(
          query.id,
          parent,
          `${parent} contains ${child}.`,
          sequence++,
        ),
      );
      child = parent;
      parent = graph.parentOf(child);
    }
  }
  if (scope === "descendants" || scope === "both") {
    const queue = [query.subjectKey];
    while (queue.length > 0) {
      const parent = queue.shift()!;
      for (const child of graph.childrenOf(parent)) {
        if (items.has(child)) continue;
        items.add(child);
        evidence.push(
          evidenceFor(
            query.id,
            child,
            `${child} is contained by ${parent}.`,
            sequence++,
          ),
        );
        queue.push(child);
      }
    }
  }
  return createArchitectureQueryResult({
    queryId: query.id,
    resultKind: "containment",
    itemKeys: [...items],
    relationshipKeys: [],
    evidence,
  });
}

function deploymentResult(
  graph: ArchitectureGraphIndex,
  query: ArchitectureDeploymentQuery,
): ArchitectureQueryResult {
  const items = new Set<ArchitectureGraphItemKey>([query.subjectKey]);
  const evidence: AnalysisEvidence[] = [
    evidenceFor(
      query.id,
      query.subjectKey,
      `The deployment query starts at ${query.subjectKey}.`,
      0,
    ),
  ];
  let sequence = 1;
  const subjectId = graphKeyId(query.subjectKey);
  const seeds = query.subjectKey.startsWith("element:")
    ? graph.instancesOf(subjectId)
    : [query.subjectKey];
  for (const seed of seeds) {
    if (!items.has(seed)) {
      items.add(seed);
      evidence.push(
        evidenceFor(
          query.id,
          seed,
          `${seed} deploys the static architecture identity ${query.subjectKey}.`,
          sequence++,
        ),
      );
    }
    let child = seed;
    let parent = graph.parentOf(child);
    while (parent !== undefined) {
      if (!items.has(parent)) {
        items.add(parent);
        evidence.push(
          evidenceFor(
            query.id,
            parent,
            `${parent} contains deployed item ${child}.`,
            sequence++,
          ),
        );
      }
      child = parent;
      parent = graph.parentOf(child);
    }
  }
  if (seeds.length === 1 && seeds[0] === query.subjectKey) {
    const queue = [query.subjectKey];
    while (queue.length > 0) {
      const parent = queue.shift()!;
      for (const child of graph.childrenOf(parent)) {
        if (!isDeploymentKey(child) || items.has(child)) continue;
        items.add(child);
        evidence.push(
          evidenceFor(
            query.id,
            child,
            `${child} is deployed inside ${parent}.`,
            sequence++,
          ),
        );
        queue.push(child);
      }
    }
  }
  return createArchitectureQueryResult({
    queryId: query.id,
    resultKind: "deployment",
    itemKeys: [...items],
    relationshipKeys: [],
    evidence,
  });
}

function viewCoverageResult(
  graph: ArchitectureGraphIndex,
  query: ArchitectureViewCoverageQuery,
): ArchitectureQueryResult {
  const views = graph.viewsContaining(query.subjectKey);
  return createArchitectureQueryResult({
    queryId: query.id,
    resultKind: "view-coverage",
    itemKeys: [query.subjectKey, ...views],
    relationshipKeys: [],
    evidence: [
      evidenceFor(
        query.id,
        query.subjectKey,
        `The View-coverage query starts at ${query.subjectKey}.`,
        0,
      ),
      ...views.map((viewKey, index) =>
        evidenceFor(
          query.id,
          viewKey,
          `${viewKey} includes ${query.subjectKey}.`,
          index + 1,
        ),
      ),
    ],
  });
}

function pathEvidence(
  queryId: string,
  path: ArchitectureGraphPath,
): AnalysisEvidence[] {
  const evidence: AnalysisEvidence[] = [];
  for (let index = 0; index < path.itemKeys.length; index += 1) {
    const itemKey = path.itemKeys[index]!;
    evidence.push(
      evidenceFor(
        queryId,
        itemKey,
        index === 0
          ? `The path starts at ${itemKey}.`
          : `${itemKey} is path step ${index} after ${path.relationshipKeys[index - 1]}.`,
        evidence.length,
      ),
    );
    const relationshipKey = path.relationshipKeys[index];
    if (relationshipKey !== undefined) {
      evidence.push(
        evidenceFor(
          queryId,
          relationshipKey,
          `${relationshipKey} connects path step ${index} to ${index + 1}.`,
          evidence.length,
        ),
      );
    }
  }
  return evidence;
}

function evidenceFor(
  queryId: string,
  subjectKey: ArchitectureGraphItemKey,
  statement: string,
  sequence: number,
): AnalysisEvidence {
  return {
    id: `query-evidence:${queryId}:${String(sequence).padStart(4, "0")}:${subjectKey}`,
    origin: "derived",
    subjectKey,
    statement,
  };
}

function requireGraphItem(
  graph: ArchitectureGraphIndex,
  itemKey: ArchitectureGraphItemKey,
  label: string,
): void {
  if (!graph.itemKeys.includes(itemKey)) {
    throw new ArchitectureQueryError(
      "C4ML-QUERY-002",
      `Unknown ${label} ${itemKey}.`,
    );
  }
}

function graphKeyId(itemKey: ArchitectureGraphItemKey): string {
  return itemKey.slice(itemKey.indexOf(":") + 1);
}

function isDeploymentKey(itemKey: ArchitectureGraphItemKey): boolean {
  return (
    itemKey.startsWith("deployment-environment:") ||
    itemKey.startsWith("deployment-instance:") ||
    itemKey.startsWith("deployment-node:") ||
    itemKey.startsWith("infrastructure-node:")
  );
}

export function architectureElementQueryKey(id: string): ArchitectureGraphItemKey {
  return architectureGraphItemKey("element", id);
}
