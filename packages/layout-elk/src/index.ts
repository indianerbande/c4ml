import type {
  ElkEdgeSection,
  ElkExtendedEdge,
  ElkNode,
} from "elkjs/lib/elk-api.js";

import {
  ContractError,
  type FlowDirection,
  type LayoutAdapter,
  type LayoutEdgeResult,
  type LayoutNodeRequest,
  type LayoutNodeResult,
  type LayoutRequest,
  type LayoutResult,
  validateLayoutRequest,
} from "@c4ml/compiler-core";

export interface ElkLayoutEngine {
  layout(graph: unknown): Promise<unknown>;
  terminateWorker(): void;
}

const directionMap: Readonly<Record<FlowDirection, string>> = {
  down: "DOWN",
  left: "LEFT",
  right: "RIGHT",
  up: "UP",
};

export class ElkLayoutAdapter implements LayoutAdapter {
  readonly adapterId = "elkjs-0.12";

  constructor(readonly engine: ElkLayoutEngine) {}

  async layout(request: LayoutRequest): Promise<LayoutResult> {
    validateLayoutRequest(request);
    const result = (await this.engine.layout(createElkGraph(request))) as ElkNode;
    return normalizeResult(request, result);
  }

  terminate(): void {
    this.engine.terminateWorker();
  }
}

// Layer spacing when edge labels take part in the layout. ELK adds the
// spacing on both sides of the reserved label footprint, so the effective
// gap becomes spacing + label + spacing.
const labelledLayerSpacing = { root: "60", compound: "40" } as const;
// Layer spacing for label-free graphs, where the gap itself must hold the
// visual distance between elements.
const unlabelledLayerSpacing = { root: "260", compound: "140" } as const;

function createElkGraph(request: LayoutRequest): ElkNode {
  const elkNodes = new Map<string, ElkNode>();
  const labelled = request.edges.some((edge) => edge.label !== undefined);
  const layerSpacing = labelled ? labelledLayerSpacing : unlabelledLayerSpacing;
  const parentIds = new Set(
    request.nodes.flatMap((node) =>
      node.parentId === undefined ? [] : [node.parentId],
    ),
  );
  for (const node of stableById(request.nodes)) {
    const compoundOptions = parentIds.has(node.id)
      ? {
          "elk.algorithm": "layered",
          "elk.direction": directionMap[request.direction],
          "elk.edgeRouting": "ORTHOGONAL",
          "elk.layered.spacing.nodeNodeBetweenLayers": layerSpacing.compound,
          "elk.spacing.nodeNode": "70",
        }
      : {};
    elkNodes.set(node.id, {
      id: node.id,
      width: node.width,
      height: node.height,
      children: [],
      ...(parentIds.has(node.id) || node.padding !== undefined
        ? {
            layoutOptions: {
              ...compoundOptions,
              ...(node.padding === undefined
                ? {}
                : {
                    "elk.padding": `[top=${node.padding},left=${node.padding},bottom=${node.padding},right=${node.padding}]`,
                  }),
            },
          }
        : {}),
    });
  }

  const rootChildren: ElkNode[] = [];
  for (const node of stableById(request.nodes)) {
    const elkNode = elkNodes.get(node.id)!;
    if (node.parentId === undefined) {
      rootChildren.push(elkNode);
      continue;
    }
    elkNodes.get(node.parentId)!.children!.push(elkNode);
  }

  const edges: ElkExtendedEdge[] = stableById(request.edges).map((edge) => ({
    id: edge.id,
    sources: [edge.sourceId],
    targets: [edge.targetId],
    ...(edge.label === undefined
      ? {}
      : {
          labels: [
            {
              id: `${edge.id}:label`,
              text: edge.id,
              width: edge.label.width,
              height: edge.label.height,
            },
          ],
        }),
  }));

  return {
    id: `c4ml-root-${request.id}`,
    children: rootChildren,
    edges,
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": directionMap[request.direction],
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
      "elk.layered.crossingMinimization.forceNodeModelOrder": "true",
      "elk.layered.spacing.nodeNodeBetweenLayers": layerSpacing.root,
      // Inline labels sit on their edge inside the reserved gap instead of
      // beside it, which keeps the layer distance predictable.
      "elk.edgeLabels.inline": "true",
      // ELK treats seed 0 as "choose a seed", which made the same request
      // alternate between layouts across calls on one engine instance.
      "elk.randomSeed": "1",
      "elk.spacing.nodeNode": "60",
    },
  };
}

function normalizeResult(request: LayoutRequest, graph: ElkNode): LayoutResult {
  const requestNodeById = new Map(request.nodes.map((node) => [node.id, node]));
  const nodes: LayoutNodeResult[] = [];
  const edges: LayoutEdgeResult[] = [];

  visitNodes(graph, requestNodeById, nodes, { x: 0, y: 0 });
  const layoutNodeById = new Map(nodes.map((node) => [node.id, node]));
  visitEdges(graph, request, layoutNodeById, edges);

  if (nodes.length !== request.nodes.length) {
    throw new ContractError(
      "C4ML-ELK-001",
      "ELK returned an incomplete node set.",
    );
  }

  return {
    requestId: request.id,
    width: requiredFinite(graph.width, "graph width"),
    height: requiredFinite(graph.height, "graph height"),
    nodes: stableById(nodes),
    edges: stableById(edges),
  };
}

function visitNodes(
  graph: ElkNode,
  requestNodeById: ReadonlyMap<string, LayoutNodeRequest>,
  nodes: LayoutNodeResult[],
  offset: { readonly x: number; readonly y: number },
): void {
  for (const child of graph.children ?? []) {
    const requestNode = requestNodeById.get(child.id);
    if (requestNode === undefined) {
      throw new ContractError(
        "C4ML-ELK-002",
        `ELK returned unknown node ${child.id}.`,
      );
    }

    const childOffset = {
      x: offset.x + requiredFinite(child.x, `${child.id}.x`),
      y: offset.y + requiredFinite(child.y, `${child.id}.y`),
    };
    nodes.push({
      ...requestNode,
      x: childOffset.x,
      y: childOffset.y,
      width: requiredFinite(child.width, `${child.id}.width`),
      height: requiredFinite(child.height, `${child.id}.height`),
    });
    visitNodes(child, requestNodeById, nodes, childOffset);
  }
}

function visitEdges(
  graph: ElkNode,
  request: LayoutRequest,
  layoutNodeById: ReadonlyMap<string, LayoutNodeResult>,
  edges: LayoutEdgeResult[],
): void {
  const requestEdgeById = new Map(request.edges.map((edge) => [edge.id, edge]));
  const parentById = new Map(
    request.nodes.flatMap((node) =>
      node.parentId === undefined ? [] : [[node.id, node.parentId] as const],
    ),
  );
  for (const edge of graph.edges ?? []) {
    const requestEdge = requestEdgeById.get(edge.id);
    if (requestEdge === undefined) {
      throw new ContractError(
        "C4ML-ELK-004",
        `ELK returned unknown edge ${edge.id}.`,
      );
    }
    const commonAncestorId = lowestCommonAncestor(
      requestEdge.sourceId,
      requestEdge.targetId,
      parentById,
    );
    const commonAncestor =
      commonAncestorId === undefined
        ? undefined
        : layoutNodeById.get(commonAncestorId);
    const offset =
      commonAncestor === undefined
        ? { x: 0, y: 0 }
        : { x: commonAncestor.x, y: commonAncestor.y };
    const label = edge.labels?.[0];
    const labelCenter =
      label?.x === undefined ||
      label.y === undefined ||
      label.width === undefined ||
      label.height === undefined
        ? undefined
        : {
            x: offset.x + requiredFinite(label.x, `${edge.id}.label.x`) + label.width / 2,
            y: offset.y + requiredFinite(label.y, `${edge.id}.label.y`) + label.height / 2,
          };
    edges.push({
      id: edge.id,
      sections: stableById(edge.sections ?? []).map((section) =>
        normalizeSection(section, offset),
      ),
      ...(labelCenter === undefined ? {} : { labelCenter }),
    });
  }
  for (const child of graph.children ?? []) {
    visitEdges(child, request, layoutNodeById, edges);
  }
}

function lowestCommonAncestor(
  sourceId: string,
  targetId: string,
  parentById: ReadonlyMap<string, string>,
): string | undefined {
  const targetAncestors = new Set<string>();
  let target: string | undefined = targetId;
  while (target !== undefined) {
    targetAncestors.add(target);
    target = parentById.get(target);
  }
  let source: string | undefined = sourceId;
  while (source !== undefined) {
    if (targetAncestors.has(source)) {
      return source;
    }
    source = parentById.get(source);
  }
  return undefined;
}

function normalizeSection(
  section: ElkEdgeSection,
  offset: { readonly x: number; readonly y: number },
) {
  return {
    start: {
      x: offset.x + requiredFinite(section.startPoint.x, `${section.id}.start.x`),
      y: offset.y + requiredFinite(section.startPoint.y, `${section.id}.start.y`),
    },
    bends: (section.bendPoints ?? []).map((point, index) => ({
      x: offset.x + requiredFinite(point.x, `${section.id}.bend[${index}].x`),
      y: offset.y + requiredFinite(point.y, `${section.id}.bend[${index}].y`),
    })),
    end: {
      x: offset.x + requiredFinite(section.endPoint.x, `${section.id}.end.x`),
      y: offset.y + requiredFinite(section.endPoint.y, `${section.id}.end.y`),
    },
  };
}

function requiredFinite(value: number | undefined, field: string): number {
  if (value === undefined || !Number.isFinite(value)) {
    throw new ContractError(
      "C4ML-ELK-003",
      `ELK returned a non-finite or missing ${field}.`,
    );
  }
  return value;
}

function stableById<T extends { readonly id: string }>(
  values: readonly T[],
): T[] {
  return [...values].sort((left, right) => left.id.localeCompare(right.id));
}
