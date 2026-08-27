import type { DiagramEdge, PreparedDiagram } from "./diagram-preparation.js";
import {
  ContractError,
  type LayoutEdgeResult,
  type LayoutNodeResult,
  type LayoutResult,
  type Point,
} from "./layout.js";
import { compareText } from "./ordering.js";
import {
  type CardinalPortSide,
  type EffectivePort,
  type PortSelection,
} from "./ports.js";
import type { ShapeDefinition } from "./shapes.js";
import type { SourceBacked } from "./source.js";

export type RoutePolicy = "automatic" | "fixed" | "guided";
export type RouteStyle = "direct" | "orthogonal";

export interface RouteCorridor extends SourceBacked {
  readonly id: string;
  readonly orientation: "horizontal" | "vertical";
  readonly coordinate: number;
  readonly lanes: number;
  readonly laneSpacing: number;
}

export interface CorridorSelection {
  readonly corridorId: string;
  readonly lane: number;
}

export interface RouteControl extends SourceBacked {
  readonly relationshipId: string;
  readonly policy: RoutePolicy;
  readonly style?: RouteStyle;
  readonly sourcePort?: PortSelection;
  readonly targetPort?: PortSelection;
  readonly waypoints?: readonly Point[];
  readonly corridor?: CorridorSelection;
  readonly points?: readonly Point[];
  readonly labelSegment?: number;
  readonly labelOffset?: Point;
}

export interface DiagramRoutingOptions {
  readonly controls?: readonly RouteControl[];
  readonly corridors?: readonly RouteCorridor[];
}

const GUIDED_PORT_STUB_LENGTH = 18;

export interface EffectiveRoute {
  readonly edgeId: string;
  readonly relationshipId: string;
  readonly policy: RoutePolicy;
  readonly style: RouteStyle;
  readonly sourceNodeId: string;
  readonly targetNodeId: string;
  readonly sourcePort: EffectivePort;
  readonly targetPort: EffectivePort;
  readonly points: readonly Point[];
  readonly label: string;
  readonly technology?: string;
  readonly labelSegment: number;
  readonly labelPoint: Point;
  readonly corridor?: CorridorSelection;
}

export function routeDiagram(
  diagram: PreparedDiagram,
  layout: LayoutResult,
  options: DiagramRoutingOptions = {},
): readonly EffectiveRoute[] {
  if (layout.requestId !== diagram.layoutRequest.id) {
    throw new ContractError(
      "C4ML-ROUTE-001",
      `Layout result ${layout.requestId} does not match ${diagram.layoutRequest.id}.`,
    );
  }

  const nodeById = new Map(layout.nodes.map((node) => [node.id, node]));
  const diagramNodeById = new Map(diagram.nodes.map((node) => [node.id, node]));
  const edgeById = new Map(layout.edges.map((edge) => [edge.id, edge]));
  const controlByRelationshipId = indexControls(diagram, options.controls ?? []);
  const corridorById = indexCorridors(options.corridors ?? []);
  const obstacleNodeIds = new Set(
    diagram.nodes
      .filter(
        (node) =>
          node.kind === "element" || node.kind === "infrastructure-node",
      )
      .map((node) => node.id),
  );

  return [...diagram.edges]
    .sort((left, right) => compareText(left.id, right.id))
    .map((edge) => {
      const source = requiredNode(nodeById, edge.sourceNodeId, edge.id);
      const target = requiredNode(nodeById, edge.targetNodeId, edge.id);
      const sourceShape = requiredEndpointShape(
        diagram,
        diagramNodeById,
        edge.sourceNodeId,
        edge.id,
      );
      const targetShape = requiredEndpointShape(
        diagram,
        diagramNodeById,
        edge.targetNodeId,
        edge.id,
      );
      const control = controlByRelationshipId.get(edge.referenceId);
      return control === undefined || control.policy === "automatic"
        ? automaticRoute(
            edge,
            source,
            target,
            sourceShape,
            targetShape,
            edgeById.get(edge.id),
            control,
          )
        : controlledRoute(
            edge,
            source,
            target,
            sourceShape,
            targetShape,
            layout.nodes,
            obstacleNodeIds,
            control,
            corridorById,
          );
    });
}

function automaticRoute(
  edge: DiagramEdge,
  source: LayoutNodeResult,
  target: LayoutNodeResult,
  sourceShape: ShapeDefinition,
  targetShape: ShapeDefinition,
  layoutEdge: LayoutEdgeResult | undefined,
  control: RouteControl | undefined,
): EffectiveRoute {
  if (
      control !== undefined &&
    (control.points !== undefined ||
      control.waypoints !== undefined ||
      control.corridor !== undefined ||
      control.sourcePort !== undefined ||
      control.targetPort !== undefined)
  ) {
    throw new ContractError(
      "C4ML-ROUTE-002",
      `Automatic route ${edge.referenceId} cannot contain hard route controls.`,
    );
  }
  const adapterPoints = pointsFromLayoutEdge(layoutEdge);
  const sourcePort = choosePort(source, target, "automatic");
  const targetPort = choosePort(target, source, "automatic");
  const sourcePoint = portPoint(source, sourceShape, sourcePort);
  const targetPoint = portPoint(target, targetShape, targetPort);
  const points =
    adapterPoints.length >= 2
      ? attachAdapterRoute(adapterPoints, sourcePoint, targetPoint)
      : [sourcePoint, targetPoint];
  const labelSegment = selectedLabelSegment(points, control?.labelSegment);
  return routeResult(
    edge,
    "automatic",
    inferStyle(points),
    sourcePort,
    targetPort,
    points,
    labelSegment,
    undefined,
    control?.labelOffset,
  );
}

function attachAdapterRoute(
  adapterPoints: readonly Point[],
  sourcePoint: Point,
  targetPoint: Point,
): readonly Point[] {
  const anchors = [sourcePoint, ...adapterPoints.slice(1, -1), targetPoint];
  return inferStyle(adapterPoints) === "orthogonal"
    ? orthogonalize(anchors)
    : deduplicatePoints(anchors);
}

function controlledRoute(
  edge: DiagramEdge,
  source: LayoutNodeResult,
  target: LayoutNodeResult,
  sourceShape: ShapeDefinition,
  targetShape: ShapeDefinition,
  allNodes: readonly LayoutNodeResult[],
  obstacleNodeIds: ReadonlySet<string>,
  control: RouteControl,
  corridorById: ReadonlyMap<string, RouteCorridor>,
): EffectiveRoute {
  const style = control.style ?? "orthogonal";
  let sourcePort = choosePort(source, target, control.sourcePort ?? "automatic");
  let targetPort = choosePort(target, source, control.targetPort ?? "automatic");
  let points: readonly Point[];

  if (control.policy === "fixed") {
    if (control.points === undefined || control.points.length < 2) {
      throw new ContractError(
        "C4ML-ROUTE-003",
        `Fixed route ${edge.referenceId} requires at least two complete points.`,
      );
    }
    if (
      control.waypoints !== undefined ||
      control.corridor !== undefined ||
      control.sourcePort !== undefined ||
      control.targetPort !== undefined
    ) {
      throw new ContractError(
        "C4ML-ROUTE-004",
        `Fixed route ${edge.referenceId} must use only its complete point list.`,
      );
    }
    points = deduplicatePoints(control.points);
    validateFinitePoints(edge, points);
    validateFixedEndpoints(edge, source, target, points);
    sourcePort = sideForBoundaryPoint(points[0]!, source);
    targetPort = sideForBoundaryPoint(points.at(-1)!, target);
  } else {
    if (control.points !== undefined) {
      throw new ContractError(
        "C4ML-ROUTE-005",
        `Guided route ${edge.referenceId} uses waypoints instead of fixed points.`,
      );
    }
    const start = portPoint(source, sourceShape, sourcePort);
    const end = portPoint(target, targetShape, targetPort);
    const guidedStart =
      style === "orthogonal"
        ? offsetFromPort(start, sourcePort, GUIDED_PORT_STUB_LENGTH)
        : start;
    const guidedEnd =
      style === "orthogonal"
        ? offsetFromPort(end, targetPort, GUIDED_PORT_STUB_LENGTH)
        : end;
    const anchors = guidedAnchors(
      edge,
      guidedStart,
      guidedEnd,
      control,
      corridorById,
    );
    points =
      style === "orthogonal"
        ? orthogonalize([start, ...anchors, end])
        : deduplicatePoints(anchors);
    validateFinitePoints(edge, points);
  }

  if (style === "orthogonal") {
    validateOrthogonal(edge, points);
  }
  validateNoInteriorCrossings(edge, points, allNodes, obstacleNodeIds);
  const labelSegment = selectedLabelSegment(points, control.labelSegment);
  return routeResult(
    edge,
    control.policy,
    style,
    sourcePort,
    targetPort,
    points,
    labelSegment,
    control.corridor,
    control.labelOffset,
  );
}

function guidedAnchors(
  edge: DiagramEdge,
  start: Point,
  end: Point,
  control: RouteControl,
  corridorById: ReadonlyMap<string, RouteCorridor>,
): readonly Point[] {
  const waypoints = control.waypoints ?? [];
  if (control.corridor === undefined) {
    return [start, ...waypoints, end];
  }
  if (waypoints.length > 0) {
    throw new ContractError(
      "C4ML-ROUTE-006",
      `Guided route ${edge.referenceId} cannot combine a corridor and free waypoints yet.`,
    );
  }
  const corridor = corridorById.get(control.corridor.corridorId);
  if (corridor === undefined) {
    throw new ContractError(
      "C4ML-ROUTE-007",
      `Guided route ${edge.referenceId} references unknown corridor ${control.corridor.corridorId}.`,
    );
  }
  if (
    !Number.isInteger(control.corridor.lane) ||
    control.corridor.lane < 0 ||
    control.corridor.lane >= corridor.lanes
  ) {
    throw new ContractError(
      "C4ML-ROUTE-008",
      `Guided route ${edge.referenceId} selects invalid lane ${control.corridor.lane}.`,
    );
  }
  const laneOffset =
    (control.corridor.lane - (corridor.lanes - 1) / 2) *
    corridor.laneSpacing;
  const coordinate = corridor.coordinate + laneOffset;
  return corridor.orientation === "vertical"
    ? [start, { x: coordinate, y: start.y }, { x: coordinate, y: end.y }, end]
    : [start, { x: start.x, y: coordinate }, { x: end.x, y: coordinate }, end];
}

function indexControls(
  diagram: PreparedDiagram,
  controls: readonly RouteControl[],
): ReadonlyMap<string, RouteControl> {
  const edgeIds = new Set(diagram.edges.map((edge) => edge.referenceId));
  const result = new Map<string, RouteControl>();
  for (const control of controls) {
    if (!edgeIds.has(control.relationshipId)) {
      throw new ContractError(
        "C4ML-ROUTE-009",
        `Route control references unknown visible relationship ${control.relationshipId}.`,
      );
    }
    if (result.has(control.relationshipId)) {
      throw new ContractError(
        "C4ML-ROUTE-010",
        `Relationship ${control.relationshipId} has more than one route control.`,
      );
    }
    result.set(control.relationshipId, control);
  }
  return result;
}

function indexCorridors(
  corridors: readonly RouteCorridor[],
): ReadonlyMap<string, RouteCorridor> {
  const result = new Map<string, RouteCorridor>();
  for (const corridor of corridors) {
    if (corridor.id.trim().length === 0 || result.has(corridor.id)) {
      throw new ContractError(
        "C4ML-ROUTE-011",
        `Route corridor identifier ${corridor.id || "<empty>"} is invalid or duplicated.`,
      );
    }
    if (
      !Number.isFinite(corridor.coordinate) ||
      !Number.isInteger(corridor.lanes) ||
      corridor.lanes <= 0 ||
      !Number.isFinite(corridor.laneSpacing) ||
      corridor.laneSpacing <= 0
    ) {
      throw new ContractError(
        "C4ML-ROUTE-012",
        `Route corridor ${corridor.id} has invalid geometry or lane settings.`,
      );
    }
    result.set(corridor.id, corridor);
  }
  return result;
}

function requiredNode(
  nodeById: ReadonlyMap<string, LayoutNodeResult>,
  nodeId: string,
  edgeId: string,
): LayoutNodeResult {
  const node = nodeById.get(nodeId);
  if (node === undefined) {
    throw new ContractError(
      "C4ML-ROUTE-013",
      `Layout edge ${edgeId} is missing node ${nodeId}.`,
    );
  }
  return node;
}

function requiredEndpointShape(
  diagram: PreparedDiagram,
  nodeById: ReadonlyMap<string, PreparedDiagram["nodes"][number]>,
  nodeId: string,
  edgeId: string,
): ShapeDefinition {
  const node = nodeById.get(nodeId);
  if (node?.shapeId === undefined) {
    throw new ContractError(
      "C4ML-ROUTE-021",
      `Layout edge ${edgeId} endpoint ${nodeId} has no resolved shape.`,
    );
  }
  const shape = diagram.shapes.get(node.shapeId);
  if (shape === undefined) {
    throw new ContractError(
      "C4ML-ROUTE-022",
      `Layout edge ${edgeId} endpoint ${nodeId} references unknown shape ${node.shapeId}.`,
    );
  }
  return shape;
}

function pointsFromLayoutEdge(edge: LayoutEdgeResult | undefined): Point[] {
  if (edge === undefined) {
    return [];
  }
  return deduplicatePoints(
    edge.sections.flatMap((section) => [
      section.start,
      ...section.bends,
      section.end,
    ]),
  );
}

function choosePort(
  node: LayoutNodeResult,
  other: LayoutNodeResult,
  requested: PortSelection,
): CardinalPortSide {
  if (requested !== "automatic") {
    return requested;
  }
  const dx = center(other).x - center(node).x;
  const dy = center(other).y - center(node).y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? "east" : "west";
  }
  return dy >= 0 ? "south" : "north";
}

function portPoint(
  node: LayoutNodeResult,
  shape: ShapeDefinition,
  side: CardinalPortSide,
): Point {
  const point = shape.ports[side];
  return {
    x: node.x + (point.x / shape.canvas.width) * node.width,
    y: node.y + (point.y / shape.canvas.height) * node.height,
  };
}

function center(node: LayoutNodeResult): Point {
  return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
}

function offsetFromPort(
  point: Point,
  side: CardinalPortSide,
  distance: number,
): Point {
  switch (side) {
    case "west":
      return { x: point.x - distance, y: point.y };
    case "east":
      return { x: point.x + distance, y: point.y };
    case "north":
      return { x: point.x, y: point.y - distance };
    case "south":
      return { x: point.x, y: point.y + distance };
  }
}

function orthogonalize(anchors: readonly Point[]): Point[] {
  const result: Point[] = [];
  for (const anchor of anchors) {
    const previous = result.at(-1);
    if (previous === undefined) {
      result.push(anchor);
      continue;
    }
    if (previous.x !== anchor.x && previous.y !== anchor.y) {
      result.push({ x: anchor.x, y: previous.y });
    }
    result.push(anchor);
  }
  return deduplicatePoints(result);
}

function deduplicatePoints(points: readonly Point[]): Point[] {
  const result: Point[] = [];
  for (const point of points) {
    const previous = result.at(-1);
    if (previous?.x !== point.x || previous.y !== point.y) {
      result.push({ x: point.x, y: point.y });
    }
  }
  return result;
}

function validateFinitePoints(edge: DiagramEdge, points: readonly Point[]): void {
  if (
    points.length < 2 ||
    points.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))
  ) {
    throw new ContractError(
      "C4ML-ROUTE-014",
      `Route ${edge.referenceId} contains missing or non-finite points.`,
    );
  }
}

function validateFixedEndpoints(
  edge: DiagramEdge,
  source: LayoutNodeResult,
  target: LayoutNodeResult,
  points: readonly Point[],
): void {
  if (!onBoundary(points[0]!, source) || !onBoundary(points.at(-1)!, target)) {
    throw new ContractError(
      "C4ML-ROUTE-015",
      `Fixed route ${edge.referenceId} does not attach to both endpoint boundaries.`,
    );
  }
}

function onBoundary(point: Point, node: LayoutNodeResult): boolean {
  const insideX = point.x >= node.x && point.x <= node.x + node.width;
  const insideY = point.y >= node.y && point.y <= node.y + node.height;
  const onVertical =
    insideY && (point.x === node.x || point.x === node.x + node.width);
  const onHorizontal =
    insideX && (point.y === node.y || point.y === node.y + node.height);
  return onVertical || onHorizontal;
}

function sideForBoundaryPoint(
  point: Point,
  node: LayoutNodeResult,
): CardinalPortSide {
  if (point.x === node.x) {
    return "west";
  }
  if (point.x === node.x + node.width) {
    return "east";
  }
  if (point.y === node.y) {
    return "north";
  }
  if (point.y === node.y + node.height) {
    return "south";
  }
  throw new ContractError(
    "C4ML-ROUTE-020",
    "A fixed-route endpoint is not attached to a node boundary.",
  );
}

function validateOrthogonal(edge: DiagramEdge, points: readonly Point[]): void {
  for (let index = 1; index < points.length; index += 1) {
    const before = points[index - 1]!;
    const after = points[index]!;
    if (before.x !== after.x && before.y !== after.y) {
      throw new ContractError(
        "C4ML-ROUTE-016",
        `Orthogonal route ${edge.referenceId} contains a diagonal segment.`,
      );
    }
  }
}

function validateNoInteriorCrossings(
  edge: DiagramEdge,
  points: readonly Point[],
  nodes: readonly LayoutNodeResult[],
  obstacleNodeIds: ReadonlySet<string>,
): void {
  for (const node of nodes) {
    if (
      !obstacleNodeIds.has(node.id) ||
      node.id === edge.sourceNodeId ||
      node.id === edge.targetNodeId
    ) {
      continue;
    }
    for (let index = 1; index < points.length; index += 1) {
      if (segmentCrossesInterior(points[index - 1]!, points[index]!, node)) {
        throw new ContractError(
          "C4ML-ROUTE-017",
          `Controlled route ${edge.referenceId} crosses node ${node.id}.`,
        );
      }
    }
  }
}

function segmentCrossesInterior(
  start: Point,
  end: Point,
  node: LayoutNodeResult,
): boolean {
  const left = node.x;
  const right = node.x + node.width;
  const top = node.y;
  const bottom = node.y + node.height;
  if (start.x === end.x) {
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);
    return start.x > left && start.x < right && maxY > top && minY < bottom;
  }
  if (start.y === end.y) {
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    return start.y > top && start.y < bottom && maxX > left && minX < right;
  }
  return false;
}

function selectedLabelSegment(
  points: readonly Point[],
  requested: number | undefined,
): number {
  const segmentCount = points.length - 1;
  if (requested !== undefined) {
    if (!Number.isInteger(requested) || requested < 0 || requested >= segmentCount) {
      throw new ContractError(
        "C4ML-ROUTE-018",
        `Label segment ${requested} is outside the effective route.`,
      );
    }
    return requested;
  }
  let selected = 0;
  let longest = -1;
  for (let index = 0; index < segmentCount; index += 1) {
    const before = points[index]!;
    const after = points[index + 1]!;
    const length = Math.hypot(after.x - before.x, after.y - before.y);
    if (length > longest) {
      longest = length;
      selected = index;
    }
  }
  return selected;
}

function labelPoint(points: readonly Point[], segment: number): Point {
  const start = points[segment]!;
  const end = points[segment + 1]!;
  return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
}

function inferStyle(points: readonly Point[]): RouteStyle {
  return points.every((point, index) => {
    const previous = points[index - 1];
    return previous === undefined || previous.x === point.x || previous.y === point.y;
  })
    ? "orthogonal"
    : "direct";
}

function routeResult(
  edge: DiagramEdge,
  policy: RoutePolicy,
  style: RouteStyle,
  sourcePortSide: CardinalPortSide,
  targetPortSide: CardinalPortSide,
  points: readonly Point[],
  labelSegment: number,
  corridor?: CorridorSelection,
  labelOffset?: Point,
): EffectiveRoute {
  if (
    labelOffset !== undefined &&
    (!Number.isFinite(labelOffset.x) || !Number.isFinite(labelOffset.y))
  ) {
    throw new ContractError(
      "C4ML-ROUTE-019",
      `Route ${edge.referenceId} has a non-finite label offset.`,
    );
  }
  const baseLabelPoint = labelPoint(points, labelSegment);
  const sourcePort: EffectivePort = {
    id: `${edge.id}:source-port`,
    relationshipId: edge.referenceId,
    role: "source",
    nodeId: edge.sourceNodeId,
    side: sourcePortSide,
    point: points[0]!,
  };
  const targetPort: EffectivePort = {
    id: `${edge.id}:target-port`,
    relationshipId: edge.referenceId,
    role: "target",
    nodeId: edge.targetNodeId,
    side: targetPortSide,
    point: points.at(-1)!,
  };
  return {
    edgeId: edge.id,
    relationshipId: edge.referenceId,
    policy,
    style,
    sourceNodeId: edge.sourceNodeId,
    targetNodeId: edge.targetNodeId,
    sourcePort,
    targetPort,
    points,
    label: edge.label,
    ...(edge.technology === undefined ? {} : { technology: edge.technology }),
    labelSegment,
    labelPoint:
      labelOffset === undefined
        ? baseLabelPoint
        : {
            x: baseLabelPoint.x + labelOffset.x,
            y: baseLabelPoint.y + labelOffset.y,
          },
    ...(corridor === undefined ? {} : { corridor }),
  };
}
