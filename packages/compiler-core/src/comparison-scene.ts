import type { ArchitectureDifference } from "./architecture-diff.js";
import type { ArchitectureGraphItemKey } from "./architecture-graph.js";
import type { ArchitectureImpactReport } from "./architecture-impact.js";
import { ContractError } from "./layout.js";
import { compareText } from "./ordering.js";
import type {
  DiagramScene,
  SceneArrowhead,
  SceneComparisonEncodingEntry,
  SceneComparisonMark,
  SceneComparisonMode,
  SceneComparisonState,
  SceneNode,
  ScenePort,
  SceneRoute,
} from "./scene.js";

export const comparisonEncoding: readonly SceneComparisonEncodingEntry[] = [
  {
    state: "added",
    label: "Added",
    description: "Present only in the later architecture state.",
    color: "#238636",
    lineStyle: "solid",
  },
  {
    state: "removed",
    label: "Removed",
    description: "Present only in the earlier architecture state.",
    color: "#cf222e",
    lineStyle: "dashed",
  },
  {
    state: "modified",
    label: "Changed",
    description: "The same stable architecture identity has changed properties.",
    color: "#bf8700",
    lineStyle: "solid",
  },
  {
    state: "impacted",
    label: "Affected path",
    description: "Upstream or downstream of a semantic change.",
    color: "#0969da",
    lineStyle: "solid",
  },
  {
    state: "moved",
    label: "Layout movement",
    description: "Geometry changed without an architecture change to this object.",
    color: "#8250df",
    lineStyle: "dashed",
  },
];

export function createArchitectureComparisonScene(
  before: DiagramScene,
  after: DiagramScene,
  difference: ArchitectureDifference,
  impacts: ArchitectureImpactReport,
  mode: SceneComparisonMode,
): DiagramScene {
  if (before.viewKind !== after.viewKind || before.id !== after.id) {
    throw new ContractError(
      "C4ML-COMPARISON-SCENE-001",
      "Visual comparison requires two scenes for the same stable view identity and kind.",
    );
  }
  const direct = new Map<ArchitectureGraphItemKey, ArchitectureDifference["changes"][number]>();
  for (const change of difference.changes) direct.set(change.subjectKey, change);
  const affected = new Set<ArchitectureGraphItemKey>();
  for (const impact of impacts.impacts) {
    impact.directlyAffectedItemKeys.forEach((key) => affected.add(key));
    for (const path of [...impact.upstreamPaths, ...impact.downstreamPaths]) {
      path.itemKeys.forEach((key) => affected.add(key));
      path.relationshipKeys.forEach((key) => affected.add(key));
    }
  }

  const beforeNodes = indexNodes(before);
  const afterNodes = indexNodes(after);
  const beforeRoutes = indexRoutes(before, direct, affected);
  const afterRoutes = indexRoutes(after, direct, affected);
  const nodeStates = statesForObjects(beforeNodes, afterNodes, direct, affected, nodeGeometryChanged);
  const routeStates = statesForObjects(beforeRoutes, afterRoutes, direct, affected, routeGeometryChanged);
  const projectedBefore = projectScene(before, "before", mode, nodeStates, routeStates);
  const projectedAfter = projectScene(after, "after", mode, nodeStates, routeStates);
  const includeBefore = mode === "before" || mode === "overlay" || mode === "change-only";
  const includeAfter = mode === "after" || mode === "overlay" || mode === "change-only";
  const nodes = [
    ...(includeBefore ? projectedBefore.nodes : []),
    ...(includeAfter ? projectedAfter.nodes : []),
  ];
  const routes = [
    ...(includeBefore ? projectedBefore.routes : []),
    ...(includeAfter ? projectedAfter.routes : []),
  ];
  const routeIds = new Set(routes.map(({ id }) => id));
  const ports = [
    ...(includeBefore ? projectedBefore.ports : []),
    ...(includeAfter ? projectedAfter.ports : []),
  ].filter((port) => routes.some((route) =>
    route.sourcePortId === port.id || route.targetPortId === port.id
  ));
  const arrowheads = [
    ...(includeBefore ? projectedBefore.arrowheads : []),
    ...(includeAfter ? projectedAfter.arrowheads : []),
  ].filter((arrowhead) => routeIds.has(arrowhead.routeId));
  const shapes = [...new Map([...before.shapes, ...after.shapes].map((shape) => [shape.id, shape])).values()]
    .sort((left, right) => compareText(left.id, right.id));
  const base = mode === "before" ? before : after;
  return {
    ...base,
    id: `comparison:${before.id}:${after.id}:${mode}`,
    width: Math.max(before.width, after.width),
    height: Math.max(before.height, after.height) + 54,
    title: `${base.title} — comparison`,
    description: `${base.description} Comparison mode: ${mode}. The visible legend explains architecture changes, impact paths, and layout-only movement.`,
    shapes,
    nodes: stableById(nodes),
    ports: stableById(ports),
    routes: stableById(routes),
    arrowheads: stableById(arrowheads),
    comparison: { mode, encoding: comparisonEncoding },
  };
}

function indexNodes(scene: DiagramScene): Map<ArchitectureGraphItemKey, SceneNode> {
  return new Map(scene.nodes.map((node) => [nodeKey(scene, node), node]));
}

function indexRoutes(
  scene: DiagramScene,
  direct: ReadonlyMap<ArchitectureGraphItemKey, unknown>,
  affected: ReadonlySet<ArchitectureGraphItemKey>,
): Map<ArchitectureGraphItemKey, SceneRoute> {
  return new Map(scene.routes.map((route) => {
    const deploymentKey = `deployment-relationship:${route.relationshipId}` as ArchitectureGraphItemKey;
    const relationshipKey = `relationship:${route.relationshipId}` as ArchitectureGraphItemKey;
    const key = direct.has(deploymentKey) || affected.has(deploymentKey)
      ? deploymentKey
      : relationshipKey;
    return [key, route];
  }));
}

function nodeKey(scene: DiagramScene, node: SceneNode): ArchitectureGraphItemKey {
  if (node.kind === "deployment-node") return `deployment-node:${node.referenceId}`;
  if (node.kind === "infrastructure-node") return `infrastructure-node:${node.referenceId}`;
  if (node.kind === "visual-group") {
    return `group:${scene.id.replace(/^scene:/u, "")}/${node.referenceId}`;
  }
  if (
    node.elementRole === "container-instance" ||
    node.elementRole === "software-system-instance"
  ) {
    return `deployment-instance:${node.referenceId}`;
  }
  return `element:${node.referenceId}`;
}

function statesForObjects<T>(
  before: ReadonlyMap<ArchitectureGraphItemKey, T>,
  after: ReadonlyMap<ArchitectureGraphItemKey, T>,
  direct: ReadonlyMap<ArchitectureGraphItemKey, ArchitectureDifference["changes"][number]>,
  affected: ReadonlySet<ArchitectureGraphItemKey>,
  geometryChanged: (before: T, after: T) => boolean,
): Map<ArchitectureGraphItemKey, SceneComparisonState> {
  const result = new Map<ArchitectureGraphItemKey, SceneComparisonState>();
  for (const key of [...new Set([...before.keys(), ...after.keys()])].sort(compareText)) {
    const left = before.get(key);
    const right = after.get(key);
    const change = direct.get(key);
    const state: SceneComparisonState = left === undefined
      ? "added"
      : right === undefined
        ? "removed"
        : change !== undefined
          ? change.kind === "added"
            ? "added"
            : change.kind === "removed"
              ? "removed"
              : "modified"
          : geometryChanged(left, right)
            ? "moved"
            : affected.has(key)
              ? "impacted"
              : "unchanged";
    result.set(key, state);
  }
  return result;
}

function projectScene(
  scene: DiagramScene,
  revision: "before" | "after",
  mode: SceneComparisonMode,
  nodeStates: ReadonlyMap<ArchitectureGraphItemKey, SceneComparisonState>,
  routeStates: ReadonlyMap<ArchitectureGraphItemKey, SceneComparisonState>,
): Pick<DiagramScene, "arrowheads" | "nodes" | "ports" | "routes"> {
  const projectedNodeId = (nodeId: string): string => {
    const node = scene.nodes.find(({ id }) => id === nodeId);
    if (node === undefined) return revisionId(nodeId, revision);
    const state = nodeStates.get(nodeKey(scene, node)) ?? "unchanged";
    return revisionId(nodeId, comparisonMark(state, revision, mode).revision);
  };
  const projectedNodes = new Map<string, SceneNode>();
  for (const node of scene.nodes) {
    const state = nodeStates.get(nodeKey(scene, node)) ?? "unchanged";
    if (!includeState(state, revision, mode)) continue;
    const mark = comparisonMark(state, revision, mode);
    projectedNodes.set(node.id, {
      ...node,
      id: revisionId(node.id, mark.revision),
      ...(node.parentId === undefined ? {} : { parentId: projectedNodeId(node.parentId) }),
      comparison: mark,
    });
  }
  const projectedRoutes = new Map<string, SceneRoute>();
  const projectedPorts = new Map<string, ScenePort>();
  const projectedArrowheads: SceneArrowhead[] = [];
  const routeKeyById = new Map(
    [...routeStates.keys()].map((key) => [key.slice(key.indexOf(":") + 1), key]),
  );
  for (const route of scene.routes) {
    const key = routeKeyById.get(route.relationshipId);
    const state = key === undefined ? "unchanged" : routeStates.get(key) ?? "unchanged";
    if (!includeState(state, revision, mode)) continue;
    const mark = comparisonMark(state, revision, mode);
    const projected: SceneRoute = {
      ...route,
      id: revisionId(route.id, mark.revision),
      sourceNodeId: projectedNodeId(route.sourceNodeId),
      targetNodeId: projectedNodeId(route.targetNodeId),
      sourcePortId: revisionId(route.sourcePortId, mark.revision),
      targetPortId: revisionId(route.targetPortId, mark.revision),
      comparison: mark,
    };
    projectedRoutes.set(route.id, projected);
  }
  for (const port of scene.ports) {
    const route = scene.routes.find(({ relationshipId }) => relationshipId === port.relationshipId);
    if (route === undefined) continue;
    const projectedRoute = projectedRoutes.get(route.id);
    if (projectedRoute === undefined) continue;
    const mark = projectedRoute.comparison!;
    projectedPorts.set(port.id, {
      ...port,
      id: revisionId(port.id, mark.revision),
      nodeId: projectedNodeId(port.nodeId),
      comparison: mark,
    });
  }
  for (const arrowhead of scene.arrowheads) {
    const route = projectedRoutes.get(arrowhead.routeId);
    if (route === undefined) continue;
    projectedArrowheads.push({
      ...arrowhead,
      id: revisionId(arrowhead.id, route.comparison!.revision),
      routeId: route.id,
      comparison: route.comparison!,
    });
  }
  return {
    nodes: [...projectedNodes.values()],
    routes: [...projectedRoutes.values()],
    ports: [...projectedPorts.values()],
    arrowheads: projectedArrowheads,
  };
}

function includeState(
  state: SceneComparisonState,
  revision: "before" | "after",
  mode: SceneComparisonMode,
): boolean {
  if (mode === "before") return revision === "before" && state !== "added";
  if (mode === "after") return revision === "after" && state !== "removed";
  if (mode === "change-only") {
    if (state === "unchanged") return false;
    if (state === "added") return revision === "after";
    if (state === "removed") return revision === "before";
    return revision === "after";
  }
  if (state === "removed") return revision === "before";
  if (state === "added") return revision === "after";
  if (state === "modified" || state === "moved") return true;
  return revision === "after";
}

function comparisonMark(
  state: SceneComparisonState,
  revision: "before" | "after",
  mode: SceneComparisonMode,
): SceneComparisonMark {
  return {
    state,
    revision: mode === "overlay" && state !== "modified" && state !== "moved"
      ? "shared"
      : revision,
  };
}

function revisionId(id: string, revision: SceneComparisonMark["revision"]): string {
  return `${id}:comparison-${revision}`;
}

function nodeGeometryChanged(left: SceneNode, right: SceneNode): boolean {
  return left.x !== right.x || left.y !== right.y || left.width !== right.width || left.height !== right.height;
}

function routeGeometryChanged(left: SceneRoute, right: SceneRoute): boolean {
  return JSON.stringify(left.points) !== JSON.stringify(right.points) ||
    JSON.stringify(left.labelPoint) !== JSON.stringify(right.labelPoint);
}

function stableById<T extends { readonly id: string }>(values: readonly T[]): T[] {
  return [...values].sort((left, right) => compareText(left.id, right.id));
}
