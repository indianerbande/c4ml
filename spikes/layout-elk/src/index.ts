import type {
  ELK,
  ElkEdgeSection,
  ElkExtendedEdge,
  ElkNode,
} from "elkjs/lib/elk-api.js";
import ElkModule from "elkjs/lib/elk.bundled.js";

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

const directionMap: Readonly<Record<FlowDirection, string>> = {
  down: "DOWN",
  left: "LEFT",
  right: "RIGHT",
  up: "UP",
};

type ElkConstructor = new () => ELK;
const Elk = ElkModule as unknown as ElkConstructor;

export class ElkLayoutAdapter implements LayoutAdapter {
  readonly adapterId = "phase-zero.elkjs-0.12";

  readonly #elk = new Elk();

  async layout(request: LayoutRequest): Promise<LayoutResult> {
    validateLayoutRequest(request);

    const graph = createElkGraph(request);
    const result = await this.#elk.layout(graph);

    return normalizeResult(request, result);
  }
}

function createElkGraph(request: LayoutRequest): ElkNode {
  const elkNodes = new Map<string, ElkNode>();
  for (const node of stableById(request.nodes)) {
    elkNodes.set(node.id, {
      id: node.id,
      width: node.width,
      height: node.height,
      children: [],
    });
  }

  const rootChildren: ElkNode[] = [];
  for (const node of stableById(request.nodes)) {
    const elkNode = elkNodes.get(node.id)!;
    if (node.parentId === undefined) {
      rootChildren.push(elkNode);
      continue;
    }

    const parent = elkNodes.get(node.parentId)!;
    parent.children!.push(elkNode);
  }

  const edges: ElkExtendedEdge[] = stableById(request.edges).map((edge) => ({
    id: edge.id,
    sources: [edge.sourceId],
    targets: [edge.targetId],
  }));

  return {
    id: `phase-zero-root-${request.id}`,
    children: rootChildren,
    edges,
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": directionMap[request.direction],
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.layered.spacing.nodeNodeBetweenLayers": "60",
      "elk.randomSeed": "0",
      "elk.spacing.nodeNode": "40",
    },
  };
}

function normalizeResult(request: LayoutRequest, graph: ElkNode): LayoutResult {
  const requestNodeById = new Map(request.nodes.map((node) => [node.id, node]));
  const nodes: LayoutNodeResult[] = [];
  const edges: LayoutEdgeResult[] = [];

  visitGraph(graph, requestNodeById, nodes, edges);

  if (nodes.length !== request.nodes.length) {
    throw new ContractError(
      "C4ML-P0-ELK-001",
      "ELK returned an incomplete node set.",
    );
  }

  const width = requiredFinite(graph.width, "graph width");
  const height = requiredFinite(graph.height, "graph height");

  return {
    requestId: request.id,
    width,
    height,
    nodes: stableById(nodes),
    edges: stableById(edges),
  };
}

function visitGraph(
  graph: ElkNode,
  requestNodeById: ReadonlyMap<string, LayoutNodeRequest>,
  nodes: LayoutNodeResult[],
  edges: LayoutEdgeResult[],
): void {
  for (const child of graph.children ?? []) {
    const requestNode = requestNodeById.get(child.id);
    if (requestNode === undefined) {
      throw new ContractError(
        "C4ML-P0-ELK-002",
        `ELK returned unknown node ${child.id}.`,
      );
    }

    nodes.push({
      ...requestNode,
      x: requiredFinite(child.x, `${child.id}.x`),
      y: requiredFinite(child.y, `${child.id}.y`),
      width: requiredFinite(child.width, `${child.id}.width`),
      height: requiredFinite(child.height, `${child.id}.height`),
    });
    visitGraph(child, requestNodeById, nodes, edges);
  }

  for (const edge of graph.edges ?? []) {
    edges.push({
      id: edge.id,
      sections: stableById(edge.sections ?? []).map(normalizeSection),
    });
  }
}

function normalizeSection(section: ElkEdgeSection) {
  return {
    start: {
      x: requiredFinite(section.startPoint.x, `${section.id}.start.x`),
      y: requiredFinite(section.startPoint.y, `${section.id}.start.y`),
    },
    bends: (section.bendPoints ?? []).map((point, index) => ({
      x: requiredFinite(point.x, `${section.id}.bend[${index}].x`),
      y: requiredFinite(point.y, `${section.id}.bend[${index}].y`),
    })),
    end: {
      x: requiredFinite(section.endPoint.x, `${section.id}.end.x`),
      y: requiredFinite(section.endPoint.y, `${section.id}.end.y`),
    },
  };
}

function requiredFinite(value: number | undefined, field: string): number {
  if (value === undefined || !Number.isFinite(value)) {
    throw new ContractError(
      "C4ML-P0-ELK-003",
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
