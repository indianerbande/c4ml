import type {
  ArchitectureSnapshot,
  SnapshotDeploymentRelationship,
  SnapshotRelationship,
} from "./architecture-snapshot.js";
import { compareText } from "./ordering.js";

export type ArchitectureGraphDirection = "downstream" | "upstream";
export type ArchitectureGraphItemKind =
  | "deployment-environment"
  | "deployment-instance"
  | "deployment-node"
  | "deployment-relationship"
  | "element"
  | "group"
  | "infrastructure-node"
  | "interaction"
  | "relationship"
  | "view";

export type ArchitectureGraphItemKey =
  `${ArchitectureGraphItemKind}:${string}`;

export interface ArchitectureGraphTraversal {
  readonly startKey: ArchitectureGraphItemKey;
  readonly direction: ArchitectureGraphDirection;
  readonly itemKeys: readonly ArchitectureGraphItemKey[];
  readonly relationshipKeys: readonly ArchitectureGraphItemKey[];
}

export interface ArchitectureGraphPath {
  readonly startKey: ArchitectureGraphItemKey;
  readonly endKey: ArchitectureGraphItemKey;
  readonly direction: ArchitectureGraphDirection;
  readonly itemKeys: readonly ArchitectureGraphItemKey[];
  readonly relationshipKeys: readonly ArchitectureGraphItemKey[];
}

export interface ArchitectureGraphRelationshipEndpoints {
  readonly sourceKey: ArchitectureGraphItemKey;
  readonly targetKey: ArchitectureGraphItemKey;
}

export interface ArchitectureGraphIndex {
  readonly itemKeys: readonly ArchitectureGraphItemKey[];
  parentOf(itemKey: ArchitectureGraphItemKey): ArchitectureGraphItemKey | undefined;
  childrenOf(itemKey: ArchitectureGraphItemKey): readonly ArchitectureGraphItemKey[];
  incomingRelationshipKeys(itemKey: ArchitectureGraphItemKey): readonly ArchitectureGraphItemKey[];
  outgoingRelationshipKeys(itemKey: ArchitectureGraphItemKey): readonly ArchitectureGraphItemKey[];
  relationshipEndpoints(
    relationshipKey: ArchitectureGraphItemKey,
  ): ArchitectureGraphRelationshipEndpoints | undefined;
  instancesOf(staticElementId: string): readonly ArchitectureGraphItemKey[];
  viewsContaining(itemKey: ArchitectureGraphItemKey): readonly ArchitectureGraphItemKey[];
  traverse(
    startKey: ArchitectureGraphItemKey,
    direction: ArchitectureGraphDirection,
  ): ArchitectureGraphTraversal;
  tracePaths(
    startKey: ArchitectureGraphItemKey,
    direction: ArchitectureGraphDirection,
  ): readonly ArchitectureGraphPath[];
}

export function architectureGraphItemKey(
  kind: ArchitectureGraphItemKind,
  id: string,
): ArchitectureGraphItemKey {
  return `${kind}:${id}`;
}

export function architectureGraphViewItemKey(
  kind: "group" | "interaction",
  viewId: string,
  localId: string,
): ArchitectureGraphItemKey {
  return architectureGraphItemKey(kind, `${viewId}/${localId}`);
}

export function createArchitectureGraphIndex(
  snapshot: ArchitectureSnapshot,
): ArchitectureGraphIndex {
  const itemKeys = new Set<ArchitectureGraphItemKey>();
  const parentByKey = new Map<ArchitectureGraphItemKey, ArchitectureGraphItemKey>();
  const childrenByKey = new Map<ArchitectureGraphItemKey, Set<ArchitectureGraphItemKey>>();
  const incomingByKey = new Map<ArchitectureGraphItemKey, Set<ArchitectureGraphItemKey>>();
  const outgoingByKey = new Map<ArchitectureGraphItemKey, Set<ArchitectureGraphItemKey>>();
  const instancesByStaticId = new Map<string, Set<ArchitectureGraphItemKey>>();
  const viewsByItemKey = new Map<ArchitectureGraphItemKey, Set<ArchitectureGraphItemKey>>();
  const relationshipByKey = new Map<
    ArchitectureGraphItemKey,
    GraphRelationship
  >();
  const environmentKeyById = new Map<string, ArchitectureGraphItemKey>();
  const nodeKeyById = new Map<string, ArchitectureGraphItemKey>();
  const placedItemKeyById = new Map<string, ArchitectureGraphItemKey>();

  const addParent = (
    childKey: ArchitectureGraphItemKey,
    parentKey: ArchitectureGraphItemKey,
  ): void => {
    parentByKey.set(childKey, parentKey);
    addToSet(childrenByKey, parentKey, childKey);
  };
  const addRelationship = (relationship: GraphRelationship): void => {
    relationshipByKey.set(relationship.key, relationship);
    itemKeys.add(relationship.key);
    itemKeys.add(relationship.sourceKey);
    itemKeys.add(relationship.targetKey);
    addToSet(outgoingByKey, relationship.sourceKey, relationship.key);
    addToSet(incomingByKey, relationship.targetKey, relationship.key);
  };

  for (const element of snapshot.elements) {
    const key = architectureGraphItemKey("element", element.id);
    itemKeys.add(key);
    if (element.parentId !== undefined) {
      addParent(key, architectureGraphItemKey("element", element.parentId));
    }
  }
  for (const relationship of snapshot.relationships) {
    addRelationship(staticGraphRelationship(relationship));
  }

  if (snapshot.deployment !== undefined) {
    for (const environment of snapshot.deployment.environments) {
      const key = architectureGraphItemKey("deployment-environment", environment.id);
      itemKeys.add(key);
      environmentKeyById.set(environment.id, key);
    }
    for (const node of snapshot.deployment.nodes) {
      const key = architectureGraphItemKey("deployment-node", node.id);
      itemKeys.add(key);
      nodeKeyById.set(node.id, key);
    }
    for (const node of snapshot.deployment.nodes) {
      const key = nodeKeyById.get(node.id)!;
      const parentKey = node.parentNodeId === undefined
        ? environmentKeyById.get(node.environmentId)!
        : nodeKeyById.get(node.parentNodeId)!;
      addParent(key, parentKey);
    }
    for (const node of snapshot.deployment.infrastructureNodes) {
      const key = architectureGraphItemKey("infrastructure-node", node.id);
      itemKeys.add(key);
      placedItemKeyById.set(node.id, key);
      addParent(key, nodeKeyById.get(node.nodeId)!);
    }
    for (const instance of snapshot.deployment.instances) {
      const key = architectureGraphItemKey("deployment-instance", instance.id);
      itemKeys.add(key);
      placedItemKeyById.set(instance.id, key);
      addParent(key, nodeKeyById.get(instance.nodeId)!);
      addToSet(instancesByStaticId, instance.staticElementId, key);
    }
    for (const relationship of snapshot.deployment.relationships) {
      const sourceKey = placedItemKeyById.get(relationship.sourceId);
      const targetKey = placedItemKeyById.get(relationship.targetId);
      if (sourceKey !== undefined && targetKey !== undefined) {
        addRelationship(deploymentGraphRelationship(relationship, sourceKey, targetKey));
      }
    }
  }

  for (const view of snapshot.views) {
    const viewKey = architectureGraphItemKey("view", view.id);
    itemKeys.add(viewKey);
    for (const id of view.elementIds) {
      addViewMembership(architectureGraphItemKey("element", id), viewKey);
    }
    for (const id of view.relationshipIds) {
      addViewMembership(architectureGraphItemKey("relationship", id), viewKey);
    }
    for (const interaction of view.interactions) {
      addViewMembership(
        architectureGraphViewItemKey("interaction", view.id, interaction.id),
        viewKey,
      );
      addViewMembership(
        architectureGraphItemKey("relationship", interaction.relationshipId),
        viewKey,
      );
    }
    for (const group of view.groups) {
      addViewMembership(
        architectureGraphViewItemKey("group", view.id, group.id),
        viewKey,
      );
      for (const member of group.members) {
        addViewMembership(groupMemberKey(member.kind, member.id, view.id), viewKey);
      }
    }
    for (const id of view.deploymentNodeIds) {
      addViewMembership(architectureGraphItemKey("deployment-node", id), viewKey);
    }
    for (const id of view.infrastructureNodeIds) {
      addViewMembership(architectureGraphItemKey("infrastructure-node", id), viewKey);
    }
    for (const id of view.deploymentInstanceIds) {
      addViewMembership(architectureGraphItemKey("deployment-instance", id), viewKey);
    }
    for (const id of view.deploymentRelationshipIds) {
      addViewMembership(architectureGraphItemKey("deployment-relationship", id), viewKey);
    }
  }

  const stable = (
    values: Iterable<ArchitectureGraphItemKey> | undefined,
  ): ArchitectureGraphItemKey[] =>
    values === undefined ? [] : [...values].sort(compareText);

  return {
    itemKeys: stable(itemKeys),
    parentOf: (itemKey) => parentByKey.get(itemKey),
    childrenOf: (itemKey) => stable(childrenByKey.get(itemKey)),
    incomingRelationshipKeys: (itemKey) => stable(incomingByKey.get(itemKey)),
    outgoingRelationshipKeys: (itemKey) => stable(outgoingByKey.get(itemKey)),
    relationshipEndpoints: (relationshipKey) => {
      const relationship = relationshipByKey.get(relationshipKey);
      return relationship === undefined
        ? undefined
        : {
            sourceKey: relationship.sourceKey,
            targetKey: relationship.targetKey,
          };
    },
    instancesOf: (staticElementId) => stable(instancesByStaticId.get(staticElementId)),
    viewsContaining: (itemKey) => stable(viewsByItemKey.get(itemKey)),
    traverse: (startKey, direction) =>
      traverse(startKey, direction, relationshipByKey, incomingByKey, outgoingByKey),
    tracePaths: (startKey, direction) =>
      tracePaths(startKey, direction, relationshipByKey, incomingByKey, outgoingByKey),
  };

  function addViewMembership(
    itemKey: ArchitectureGraphItemKey,
    viewKey: ArchitectureGraphItemKey,
  ): void {
    itemKeys.add(itemKey);
    addToSet(viewsByItemKey, itemKey, viewKey);
  }
}

function tracePaths(
  startKey: ArchitectureGraphItemKey,
  direction: ArchitectureGraphDirection,
  relationshipByKey: ReadonlyMap<ArchitectureGraphItemKey, GraphRelationship>,
  incomingByKey: ReadonlyMap<ArchitectureGraphItemKey, ReadonlySet<ArchitectureGraphItemKey>>,
  outgoingByKey: ReadonlyMap<ArchitectureGraphItemKey, ReadonlySet<ArchitectureGraphItemKey>>,
): ArchitectureGraphPath[] {
  const result: ArchitectureGraphPath[] = [];
  const visited = new Set<ArchitectureGraphItemKey>([startKey]);
  const queue: Array<{
    readonly current: ArchitectureGraphItemKey;
    readonly itemKeys: readonly ArchitectureGraphItemKey[];
    readonly relationshipKeys: readonly ArchitectureGraphItemKey[];
  }> = [{ current: startKey, itemKeys: [startKey], relationshipKeys: [] }];

  while (queue.length > 0) {
    const path = queue.shift()!;
    const adjacent = direction === "downstream"
      ? outgoingByKey.get(path.current)
      : incomingByKey.get(path.current);
    for (const relationshipKey of [...(adjacent ?? [])].sort(compareText)) {
      const relationship = relationshipByKey.get(relationshipKey);
      if (relationship === undefined) continue;
      const next = direction === "downstream"
        ? relationship.targetKey
        : relationship.sourceKey;
      if (visited.has(next)) continue;
      visited.add(next);
      const nextPath = {
        current: next,
        itemKeys: [...path.itemKeys, next],
        relationshipKeys: [...path.relationshipKeys, relationshipKey],
      };
      result.push({
        startKey,
        endKey: next,
        direction,
        itemKeys: nextPath.itemKeys,
        relationshipKeys: nextPath.relationshipKeys,
      });
      queue.push(nextPath);
    }
  }

  return result.sort(
    (left, right) =>
      compareText(left.endKey, right.endKey) ||
      compareText(left.relationshipKeys.join("\u0000"), right.relationshipKeys.join("\u0000")),
  );
}

interface GraphRelationship {
  readonly key: ArchitectureGraphItemKey;
  readonly sourceKey: ArchitectureGraphItemKey;
  readonly targetKey: ArchitectureGraphItemKey;
}

function staticGraphRelationship(
  relationship: SnapshotRelationship,
): GraphRelationship {
  return {
    key: architectureGraphItemKey("relationship", relationship.id),
    sourceKey: architectureGraphItemKey("element", relationship.sourceId),
    targetKey: architectureGraphItemKey("element", relationship.targetId),
  };
}

function deploymentGraphRelationship(
  relationship: SnapshotDeploymentRelationship,
  sourceKey: ArchitectureGraphItemKey,
  targetKey: ArchitectureGraphItemKey,
): GraphRelationship {
  return {
    key: architectureGraphItemKey("deployment-relationship", relationship.id),
    sourceKey,
    targetKey,
  };
}

function groupMemberKey(
  kind:
    | "deployment-instance"
    | "deployment-node"
    | "element"
    | "group"
    | "infrastructure-node",
  id: string,
  viewId: string,
): ArchitectureGraphItemKey {
  return kind === "group"
    ? architectureGraphViewItemKey("group", viewId, id)
    : architectureGraphItemKey(kind, id);
}

function traverse(
  startKey: ArchitectureGraphItemKey,
  direction: ArchitectureGraphDirection,
  relationshipByKey: ReadonlyMap<ArchitectureGraphItemKey, GraphRelationship>,
  incomingByKey: ReadonlyMap<ArchitectureGraphItemKey, ReadonlySet<ArchitectureGraphItemKey>>,
  outgoingByKey: ReadonlyMap<ArchitectureGraphItemKey, ReadonlySet<ArchitectureGraphItemKey>>,
): ArchitectureGraphTraversal {
  const visited = new Set<ArchitectureGraphItemKey>([startKey]);
  const relationshipKeys = new Set<ArchitectureGraphItemKey>();
  const queue = [startKey];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const adjacent = direction === "downstream"
      ? outgoingByKey.get(current)
      : incomingByKey.get(current);
    for (const relationshipKey of [...(adjacent ?? [])].sort(compareText)) {
      const relationship = relationshipByKey.get(relationshipKey);
      if (relationship === undefined) continue;
      relationshipKeys.add(relationshipKey);
      const next = direction === "downstream"
        ? relationship.targetKey
        : relationship.sourceKey;
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  visited.delete(startKey);
  return {
    startKey,
    direction,
    itemKeys: [...visited].sort(compareText),
    relationshipKeys: [...relationshipKeys].sort(compareText),
  };
}

function addToSet<Key, Value>(
  map: Map<Key, Set<Value>>,
  key: Key,
  value: Value,
): void {
  const values = map.get(key) ?? new Set<Value>();
  values.add(value);
  map.set(key, values);
}
