export type FlowDirection = "down" | "left" | "right" | "up";

export interface LayoutNodeRequest {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly parentId?: string;
}

export interface LayoutEdgeRequest {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
}

export interface LayoutRequest {
  readonly id: string;
  readonly direction: FlowDirection;
  readonly nodes: readonly LayoutNodeRequest[];
  readonly edges: readonly LayoutEdgeRequest[];
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface LayoutNodeResult extends LayoutNodeRequest {
  readonly x: number;
  readonly y: number;
}

export interface LayoutEdgeSection {
  readonly start: Point;
  readonly bends: readonly Point[];
  readonly end: Point;
}

export interface LayoutEdgeResult {
  readonly id: string;
  readonly sections: readonly LayoutEdgeSection[];
}

export interface LayoutResult {
  readonly requestId: string;
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly LayoutNodeResult[];
  readonly edges: readonly LayoutEdgeResult[];
}

export interface LayoutAdapter {
  readonly adapterId: string;
  layout(request: LayoutRequest): Promise<LayoutResult>;
}

export interface PngRenderOptions {
  readonly scale?: number;
  readonly background?: string;
}

export interface PngRenderResult {
  readonly bytes: Uint8Array;
  readonly width: number;
  readonly height: number;
}

export interface PngRenderer {
  readonly rendererId: string;
  render(svg: string, options?: PngRenderOptions): Promise<PngRenderResult>;
}

export class ContractError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ContractError";
  }
}

export function validateLayoutRequest(request: LayoutRequest): void {
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();

  if (request.id.length === 0) {
    throw new ContractError("C4ML-P0-LAYOUT-001", "Layout request ID is empty.");
  }

  for (const node of request.nodes) {
    if (nodeIds.has(node.id)) {
      throw new ContractError(
        "C4ML-P0-LAYOUT-002",
        `Duplicate layout node ID: ${node.id}`,
      );
    }
    if (!isPositiveFinite(node.width) || !isPositiveFinite(node.height)) {
      throw new ContractError(
        "C4ML-P0-LAYOUT-003",
        `Node ${node.id} must have finite positive dimensions.`,
      );
    }
    nodeIds.add(node.id);
  }

  for (const node of request.nodes) {
    if (node.parentId !== undefined && !nodeIds.has(node.parentId)) {
      throw new ContractError(
        "C4ML-P0-LAYOUT-004",
        `Node ${node.id} references unknown parent ${node.parentId}.`,
      );
    }
    if (node.parentId === node.id) {
      throw new ContractError(
        "C4ML-P0-LAYOUT-005",
        `Node ${node.id} cannot contain itself.`,
      );
    }
  }

  assertNoParentCycles(request.nodes);

  for (const edge of request.edges) {
    if (edgeIds.has(edge.id)) {
      throw new ContractError(
        "C4ML-P0-LAYOUT-006",
        `Duplicate layout edge ID: ${edge.id}`,
      );
    }
    if (!nodeIds.has(edge.sourceId) || !nodeIds.has(edge.targetId)) {
      throw new ContractError(
        "C4ML-P0-LAYOUT-007",
        `Edge ${edge.id} has an unknown endpoint.`,
      );
    }
    edgeIds.add(edge.id);
  }
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function assertNoParentCycles(nodes: readonly LayoutNodeRequest[]): void {
  const parentById = new Map(
    nodes
      .filter(
        (node): node is LayoutNodeRequest & { readonly parentId: string } =>
          node.parentId !== undefined,
      )
      .map((node) => [node.id, node.parentId]),
  );

  for (const node of nodes) {
    const visited = new Set<string>([node.id]);
    let parentId = parentById.get(node.id);
    while (parentId !== undefined) {
      if (visited.has(parentId)) {
        throw new ContractError(
          "C4ML-P0-LAYOUT-008",
          `Layout containment cycle includes node ${parentId}.`,
        );
      }
      visited.add(parentId);
      parentId = parentById.get(parentId);
    }
  }
}
