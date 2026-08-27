import {
  ContractError,
  type FlowDirection,
  type LayoutEdgeRequest,
  type LayoutNodeRequest,
  type LayoutRequest,
} from "./layout.js";
import type {
  DeploymentInstance,
  SemanticElementKind,
  StaticElement,
} from "./model.js";
import { compareText } from "./ordering.js";
import {
  createShapeCatalog,
  defaultShapeId,
  type DiagramShapeOptions,
  type ShapeDefinition,
} from "./shapes.js";
import type {
  ArchitectureView,
  ResolvedView,
  ResolvedVisualGroup,
  ResolvedVisualGroupMember,
} from "./views.js";

export type DiagramNodeKind =
  | "deployment-node"
  | "element"
  | "infrastructure-node"
  | "scope-boundary"
  | "visual-group";

export interface DiagramNode {
  readonly id: string;
  readonly referenceId: string;
  readonly kind: DiagramNodeKind;
  readonly elementRole?: SemanticElementKind;
  readonly shapeId?: string;
  readonly title: string;
  readonly typeLabel: string;
  readonly description: string;
  readonly technology?: string;
  readonly external?: boolean;
  readonly parentId?: string;
  readonly sourceId?: string;
}

export type DiagramEdgeKind =
  | "deployment-relationship"
  | "dynamic-interaction"
  | "relationship";

export interface DiagramEdge {
  readonly id: string;
  readonly referenceId: string;
  readonly kind: DiagramEdgeKind;
  readonly sourceNodeId: string;
  readonly targetNodeId: string;
  readonly label: string;
  readonly technology?: string;
  readonly sourceId?: string;
}

export interface PreparedDiagram {
  readonly view: ResolvedView;
  readonly nodes: readonly DiagramNode[];
  readonly edges: readonly DiagramEdge[];
  readonly shapes: ReadonlyMap<string, ShapeDefinition>;
  readonly layoutRequest: LayoutRequest;
}

const elementWidth = 250;
const elementHeight = 132;
const boundaryWidth = 420;
const boundaryHeight = 280;

export function prepareDiagram(
  authoredView: ArchitectureView,
  view: ResolvedView,
  shapeOptions: DiagramShapeOptions = {},
): PreparedDiagram {
  const shapes = createShapeCatalog(shapeOptions.definitions);
  const semanticNodes = createSemanticNodes(view);
  const semanticParentByNodeId = new Map(
    semanticNodes
      .filter(
        (node): node is DiagramNode & { readonly parentId: string } =>
          node.parentId !== undefined,
      )
      .map((node) => [node.id, node.parentId]),
  );
  const scopeNode = createScopeNode(authoredView, view);
  const groupState = createGroupState(
    authoredView,
    view,
    semanticNodes,
    semanticParentByNodeId,
    scopeNode,
  );

  const nodes = assignShapes(stableById([
    ...(scopeNode === undefined ? [] : [scopeNode]),
    ...groupState.groups,
    ...semanticNodes.map((node) => {
      const groupParentId = groupState.memberParentByNodeId.get(node.id);
      const scopeParentId =
        groupParentId === undefined &&
        scopeNode !== undefined &&
        belongsInsideScope(authoredView, node)
          ? scopeNode.id
          : undefined;
      const parentId = groupParentId ?? node.parentId ?? scopeParentId;
      return parentId === undefined ? withoutParent(node) : { ...node, parentId };
    }),
  ]), shapes, shapeOptions.assignments);
  const edges = createDiagramEdges(view, nodes);

  return {
    view,
    nodes,
    edges,
    shapes,
    layoutRequest: {
      id: `view:${view.id}`,
      direction: view.layout?.direction ?? defaultDirection(view.kind),
      nodes: nodes.map(toLayoutNode),
      edges: edges.map(toLayoutEdge),
    },
  };
}

function assignShapes(
  nodes: readonly DiagramNode[],
  shapes: ReadonlyMap<string, ShapeDefinition>,
  assignments: Readonly<Record<string, string>> | undefined,
): DiagramNode[] {
  const renderableReferences = new Set(
    nodes
      .filter(
        (node) =>
          node.kind === "element" || node.kind === "infrastructure-node",
      )
      .map((node) => node.referenceId),
  );
  for (const [referenceId, shapeId] of Object.entries(assignments ?? {})) {
    if (!renderableReferences.has(referenceId)) {
      throw new ContractError(
        "C4ML-SHAPE-009",
        `Shape assignment references unknown visible element ${referenceId}.`,
      );
    }
    if (!shapes.has(shapeId)) {
      throw new ContractError(
        "C4ML-SHAPE-010",
        `Shape assignment for ${referenceId} references unknown shape ${shapeId}.`,
      );
    }
  }
  return nodes.map((node) => {
    if (node.kind !== "element" && node.kind !== "infrastructure-node") {
      return node;
    }
    const shapeId = assignments?.[node.referenceId] ?? defaultShapeId(node.elementRole);
    if (!shapes.has(shapeId)) {
      throw new ContractError(
        "C4ML-SHAPE-010",
        `Element ${node.referenceId} references unknown shape ${shapeId}.`,
      );
    }
    return { ...node, shapeId };
  });
}

export function elementNodeId(id: string): string {
  return `element:${id}`;
}

export function groupNodeId(id: string): string {
  return `group:${id}`;
}

function createSemanticNodes(view: ResolvedView): DiagramNode[] {
  if (view.kind !== "deployment") {
    return view.elements.map(nodeForElement);
  }

  const staticById = new Map(view.elements.map((element) => [element.id, element]));
  return [
    ...view.deploymentNodes.map((node) => ({
      id: `deployment-node:${node.id}`,
      referenceId: node.id,
      kind: "deployment-node" as const,
      title: node.name,
      typeLabel: "Deployment Node",
      description: node.description,
      technology: node.technology,
      ...(node.parentNodeId === undefined
        ? {}
        : { parentId: `deployment-node:${node.parentNodeId}` }),
      ...(node.source === undefined ? {} : { sourceId: node.source.file }),
    })),
    ...view.infrastructureNodes.map((node) => ({
      id: `infrastructure-node:${node.id}`,
      referenceId: node.id,
      kind: "infrastructure-node" as const,
      elementRole: "infrastructure-node" as const,
      title: node.name,
      typeLabel: "Infrastructure Node",
      description: node.description,
      technology: node.technology,
      parentId: `deployment-node:${node.nodeId}`,
      ...(node.source === undefined ? {} : { sourceId: node.source.file }),
    })),
    ...view.deploymentInstances.map((instance) =>
      nodeForDeploymentInstance(instance, staticById),
    ),
  ];
}

function nodeForElement(element: StaticElement): DiagramNode {
  return {
    id: elementNodeId(element.id),
    referenceId: element.id,
    kind: "element",
    elementRole: element.kind,
    title: element.name,
    typeLabel: typeLabelForElement(element),
    description: element.description,
    ...(element.technology === undefined
      ? technologyForCodeElement(element)
      : { technology: element.technology }),
    ...(element.classification === "external" ? { external: true } : {}),
    ...(element.source === undefined ? {} : { sourceId: element.source.file }),
  };
}

function nodeForDeploymentInstance(
  instance: DeploymentInstance,
  staticById: ReadonlyMap<string, StaticElement>,
): DiagramNode {
  const staticId =
    instance.kind === "container-instance"
      ? instance.containerId
      : instance.softwareSystemId;
  const staticElement = staticById.get(staticId);
  if (staticElement === undefined) {
    throw new ContractError(
      "C4ML-LAYOUT-201",
      `Deployment instance ${instance.id} has no resolved static element.`,
    );
  }
  return {
    id: `deployment-instance:${instance.id}`,
    referenceId: instance.id,
    kind: "element",
    elementRole: instance.kind,
    title: staticElement.name,
    typeLabel:
      instance.kind === "container-instance"
        ? "Container Instance"
        : "Software System Instance",
    description: staticElement.description,
    ...(staticElement.technology === undefined
      ? {}
      : { technology: staticElement.technology }),
    ...(staticElement.classification === "external" ? { external: true } : {}),
    parentId: `deployment-node:${instance.nodeId}`,
    ...(instance.source === undefined ? {} : { sourceId: instance.source.file }),
  };
}

function createScopeNode(
  authoredView: ArchitectureView,
  view: ResolvedView,
): DiagramNode | undefined {
  const typeLabel =
    authoredView.kind === "container"
      ? "Software System Boundary"
      : authoredView.kind === "component"
        ? "Container Boundary"
        : authoredView.kind === "code"
          ? "Component Boundary"
          : undefined;
  if (typeLabel === undefined) {
    return undefined;
  }
  return {
    id: `scope:${view.id}`,
    referenceId: view.id,
    kind: "scope-boundary",
    title: view.scope,
    typeLabel,
    description: view.purpose,
  };
}

function createGroupState(
  authoredView: ArchitectureView,
  view: ResolvedView,
  semanticNodes: readonly DiagramNode[],
  semanticParentByNodeId: ReadonlyMap<string, string>,
  scopeNode: DiagramNode | undefined,
): {
  readonly groups: readonly DiagramNode[];
  readonly memberParentByNodeId: ReadonlyMap<string, string>;
} {
  const memberParentByNodeId = new Map<string, string>();
  const groupParentById = new Map<string, string>();
  const nodeById = new Map(semanticNodes.map((node) => [node.id, node]));
  const groupById = new Map(view.groups.map((group) => [group.id, group]));

  for (const group of view.groups) {
    for (const member of group.members) {
      const memberId = nodeIdForGroupMember(member);
      if (member.kind === "group") {
        groupParentById.set(member.groupId, groupNodeId(group.id));
      } else if (memberId !== undefined) {
        if (semanticParentByNodeId.has(memberId)) {
          throw new ContractError(
            "C4ML-LAYOUT-202",
            `Visual group ${group.id} cannot replace deployment containment for ${memberId}.`,
          );
        }
        memberParentByNodeId.set(memberId, groupNodeId(group.id));
      }
    }
  }

  const groups = view.groups.map((group) => {
    const nestedParentId = groupParentById.get(group.id);
    const topLevelParentId =
      nestedParentId === undefined && scopeNode !== undefined
        ? scopeParentForGroup(
            authoredView,
            group,
            groupById,
            nodeById,
            scopeNode.id,
          )
        : undefined;
    const parentId = nestedParentId ?? topLevelParentId;
    return {
      id: groupNodeId(group.id),
      referenceId: group.id,
      kind: "visual-group" as const,
      title: group.title,
      typeLabel: "Visual Group",
      description:
        group.description ?? "View-local visual grouping boundary.",
      ...(parentId === undefined ? {} : { parentId }),
      ...(group.source === undefined ? {} : { sourceId: group.source.file }),
    };
  });

  return { groups, memberParentByNodeId };
}

function scopeParentForGroup(
  authoredView: ArchitectureView,
  group: ResolvedVisualGroup,
  groupById: ReadonlyMap<string, ResolvedVisualGroup>,
  nodeById: ReadonlyMap<string, DiagramNode>,
  scopeNodeId: string,
): string | undefined {
  const leafIds = leafNodeIds(group, groupById, new Set());
  const scoped = leafIds.map((id) => {
    const node = nodeById.get(id);
    if (node === undefined) {
      throw new ContractError(
        "C4ML-LAYOUT-203",
        `Visual group ${group.id} references unsupported layout item ${id}.`,
      );
    }
    return belongsInsideScope(authoredView, node);
  });
  if (scoped.some(Boolean) && !scoped.every(Boolean)) {
    throw new ContractError(
      "C4ML-LAYOUT-204",
      `Visual group ${group.id} crosses the semantic scope boundary.`,
    );
  }
  return scoped.length > 0 && scoped.every(Boolean) ? scopeNodeId : undefined;
}

function leafNodeIds(
  group: ResolvedVisualGroup,
  groupById: ReadonlyMap<string, ResolvedVisualGroup>,
  visited: Set<string>,
): string[] {
  if (visited.has(group.id)) {
    throw new ContractError(
      "C4ML-LAYOUT-205",
      `Visual group cycle reached layout preparation at ${group.id}.`,
    );
  }
  const nextVisited = new Set(visited).add(group.id);
  return group.members.flatMap((member) => {
    if (member.kind !== "group") {
      const id = nodeIdForGroupMember(member);
      return id === undefined ? [] : [id];
    }
    const nested = groupById.get(member.groupId);
    if (nested === undefined) {
      throw new ContractError(
        "C4ML-LAYOUT-206",
        `Visual group ${group.id} has unresolved nested group ${member.groupId}.`,
      );
    }
    return leafNodeIds(nested, groupById, nextVisited);
  });
}

function nodeIdForGroupMember(
  member: ResolvedVisualGroupMember,
): string | undefined {
  if (member.kind === "element") {
    return elementNodeId(member.element.id);
  }
  if (member.kind === "deployment-node") {
    return `deployment-node:${member.node.id}`;
  }
  if (member.kind === "infrastructure-node") {
    return `infrastructure-node:${member.infrastructureNode.id}`;
  }
  if (member.kind === "deployment-instance") {
    return `deployment-instance:${member.instance.id}`;
  }
  return undefined;
}

function createDiagramEdges(
  view: ResolvedView,
  nodes: readonly DiagramNode[],
): DiagramEdge[] {
  const nodeIdByReferenceId = new Map(
    nodes
      .filter((node) => node.kind !== "scope-boundary" && node.kind !== "visual-group")
      .map((node) => [node.referenceId, node.id]),
  );

  if (view.kind === "dynamic") {
    return stableById(
      view.interactions.map((interaction) => ({
        id: `interaction:${interaction.id}`,
        referenceId: interaction.id,
        kind: "dynamic-interaction" as const,
        sourceNodeId: requiredEndpoint(nodeIdByReferenceId, interaction.sourceId),
        targetNodeId: requiredEndpoint(nodeIdByReferenceId, interaction.targetId),
        label: `${interaction.order}. ${interaction.description}`,
        ...(interaction.relationship.technology === undefined &&
        interaction.relationship.protocol === undefined
          ? {}
          : {
              technology:
                interaction.relationship.technology ??
                interaction.relationship.protocol,
            }),
        ...(interaction.source === undefined
          ? {}
          : { sourceId: interaction.source.file }),
      })),
    );
  }

  if (view.kind === "deployment") {
    return stableById(
      view.deploymentRelationships.map((relationship) => ({
        id: `deployment-relationship:${relationship.id}`,
        referenceId: relationship.id,
        kind: "deployment-relationship" as const,
        sourceNodeId: requiredEndpoint(
          nodeIdByReferenceId,
          relationship.sourceId,
        ),
        targetNodeId: requiredEndpoint(
          nodeIdByReferenceId,
          relationship.targetId,
        ),
        label: relationship.description,
        ...(relationship.technology === undefined
          ? {}
          : { technology: relationship.technology }),
        ...(relationship.source === undefined
          ? {}
          : { sourceId: relationship.source.file }),
      })),
    );
  }

  return stableById(
    view.relationships.map((relationship) => ({
      id: `relationship:${relationship.id}`,
      referenceId: relationship.id,
      kind: "relationship" as const,
      sourceNodeId: requiredEndpoint(nodeIdByReferenceId, relationship.sourceId),
      targetNodeId: requiredEndpoint(nodeIdByReferenceId, relationship.targetId),
      label: relationship.description,
      ...(relationship.technology === undefined &&
      relationship.protocol === undefined
        ? {}
        : { technology: relationship.technology ?? relationship.protocol }),
      ...(relationship.source === undefined
        ? {}
        : { sourceId: relationship.source.file }),
    })),
  );
}

function requiredEndpoint(
  nodeIdByReferenceId: ReadonlyMap<string, string>,
  referenceId: string,
): string {
  const nodeId = nodeIdByReferenceId.get(referenceId);
  if (nodeId === undefined) {
    throw new ContractError(
      "C4ML-LAYOUT-207",
      `Diagram relationship endpoint ${referenceId} has no layout node.`,
    );
  }
  return nodeId;
}

function toLayoutNode(node: DiagramNode): LayoutNodeRequest {
  const boundary =
    node.kind === "scope-boundary" ||
    node.kind === "visual-group" ||
    node.kind === "deployment-node";
  return {
    id: node.id,
    width: boundary ? boundaryWidth : elementWidth,
    height: boundary ? boundaryHeight : elementHeight,
    ...(node.parentId === undefined ? {} : { parentId: node.parentId }),
    ...(boundary ? { padding: node.kind === "visual-group" ? 34 : 42 } : {}),
  };
}

function toLayoutEdge(edge: DiagramEdge): LayoutEdgeRequest {
  return {
    id: edge.id,
    sourceId: edge.sourceNodeId,
    targetId: edge.targetNodeId,
  };
}

function belongsInsideScope(
  view: ArchitectureView,
  node: DiagramNode,
): boolean {
  if (node.kind !== "element") {
    return false;
  }
  if (view.kind === "container") {
    return node.elementRole === "container";
  }
  if (view.kind === "component") {
    return node.elementRole === "component";
  }
  if (view.kind === "code") {
    return node.elementRole === "code-element";
  }
  return false;
}

function typeLabelForElement(element: StaticElement): string {
  switch (element.kind) {
    case "person":
      return "Person";
    case "software-system":
      return "Software System";
    case "container":
      return "Container";
    case "component":
      return "Component";
    case "code-element":
      return `Code Element · ${element.codeKind}`;
  }
}

function technologyForCodeElement(
  element: StaticElement,
): { readonly technology: string } | Record<string, never> {
  return element.kind === "code-element" && element.language !== undefined
    ? { technology: element.language }
    : {};
}

function defaultDirection(kind: ResolvedView["kind"]): FlowDirection {
  return kind === "dynamic" || kind === "deployment" ? "down" : "right";
}

function withoutParent(node: DiagramNode): DiagramNode {
  const { parentId: _parentId, ...rest } = node;
  return rest;
}

function stableById<T extends { readonly id: string }>(
  values: readonly T[],
): T[] {
  return [...values].sort((left, right) => compareText(left.id, right.id));
}
