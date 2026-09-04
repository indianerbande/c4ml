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
  type PortRole,
  type PortSelection,
} from "./ports.js";
import { shapeFillsBoundary, type ShapeDefinition } from "./shapes.js";
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

export interface EffectiveCorridor extends CorridorSelection {
  readonly orientation: RouteCorridor["orientation"];
  readonly coordinate: number;
  readonly laneCoordinate: number;
  readonly lanes: number;
  readonly laneSpacing: number;
}

export interface RouteBounds extends Point {
  readonly width: number;
  readonly height: number;
}

export type RouteAnchor =
  | {
      readonly kind: "canvas";
      readonly point: Point;
    }
  | {
      readonly kind: "node";
      readonly referenceId: string;
      readonly side: CardinalPortSide;
      readonly offset?: Point;
    }
  | {
      readonly kind: "source-port";
      readonly offset?: Point;
    }
  | {
      readonly kind: "target-port";
      readonly offset?: Point;
    };

export type RouteGuidance =
  | {
      readonly kind: "waypoint";
      readonly anchor: RouteAnchor;
    }
  | {
      readonly kind: "locked-segment";
      readonly start: RouteAnchor;
      readonly end: RouteAnchor;
    };

export type RouteAvoidanceGeometry =
  | {
      readonly kind: "absolute";
      readonly bounds: RouteBounds;
    }
  | {
      readonly kind: "node";
      readonly referenceId: string;
      readonly padding: number;
    };

export interface RouteAvoidanceRegion extends SourceBacked {
  readonly id: string;
  readonly strength: "hard" | "soft";
  readonly geometry: RouteAvoidanceGeometry;
}

export interface EffectiveRouteWaypoint {
  readonly anchor: RouteAnchor;
  readonly point: Point;
}

export interface EffectiveLockedSegment {
  readonly start: Point;
  readonly end: Point;
  readonly segmentIndex: number;
}

export interface EffectiveAvoidanceRegion {
  readonly id: string;
  readonly strength: RouteAvoidanceRegion["strength"];
  readonly bounds: RouteBounds;
  readonly relaxed: boolean;
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
  readonly guidance?: readonly RouteGuidance[];
  readonly avoidanceRegionIds?: readonly string[];
}

export interface DiagramRoutingOptions {
  readonly controls?: readonly RouteControl[];
  readonly corridors?: readonly RouteCorridor[];
  readonly avoidanceRegions?: readonly RouteAvoidanceRegion[];
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
  readonly corridor?: EffectiveCorridor;
  readonly waypoints: readonly EffectiveRouteWaypoint[];
  readonly lockedSegments: readonly EffectiveLockedSegment[];
  readonly avoidanceRegions: readonly EffectiveAvoidanceRegion[];
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
  const avoidanceById = indexAvoidanceRegions(options.avoidanceRegions ?? []);
  validateExclusiveCorridorLanes(options.controls ?? [], corridorById);
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
            diagram,
            edge,
            source,
            target,
            sourceShape,
            targetShape,
            layout.nodes,
            obstacleNodeIds,
            control,
            corridorById,
            avoidanceById,
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
      control.targetPort !== undefined ||
      control.guidance !== undefined ||
      control.avoidanceRegionIds !== undefined)
  ) {
    throw new ContractError(
      "C4ML-ROUTE-002",
      `Automatic route ${edge.referenceId} cannot contain hard route controls.`,
    );
  }
  const adapterPoints = pointsFromLayoutEdge(layoutEdge);
  const adapterAttachment = adapterBoundaryAttachment(
    adapterPoints,
    source,
    target,
  );
  let sourcePort: CardinalPortSide;
  let targetPort: CardinalPortSide;
  let points: readonly Point[];
  if (adapterAttachment !== undefined) {
    // The layout engine attached the edge to both node boundaries and chose
    // the sides. A shape whose surface fills its canvas may keep the engine's
    // attachment point, which preserves the spreading of several edges along
    // one side. Snapping such points to the shape's single side anchor would
    // add a segment running along the boundary and let every arrowhead on
    // that side collide at one point. A shape with an open outline (diamond,
    // ellipse) must still use its declared Port anchor, entered perpendicular
    // to the side.
    sourcePort = adapterAttachment.sourceSide;
    targetPort = adapterAttachment.targetSide;
    let attached = adapterAttachment.points;
    if (!shapeFillsBoundary(sourceShape)) {
      attached = attachToAnchor(
        attached,
        portPoint(source, sourceShape, sourcePort),
        sourcePort,
        "source",
      );
    }
    if (!shapeFillsBoundary(targetShape)) {
      attached = attachToAnchor(
        attached,
        portPoint(target, targetShape, targetPort),
        targetPort,
        "target",
      );
    }
    points = attached;
  } else {
    sourcePort = choosePort(source, target, "automatic");
    targetPort = choosePort(target, source, "automatic");
    const sourcePoint = portPoint(source, sourceShape, sourcePort);
    const targetPoint = portPoint(target, targetShape, targetPort);
    points =
      adapterPoints.length >= 2
        ? attachAdapterRoute(adapterPoints, sourcePoint, targetPoint)
        : [sourcePoint, targetPoint];
  }
  // When the engine reserved room for the label, place the label there; it
  // is the one spot guaranteed to be clear of the connected elements.
  const engineLabel =
    adapterAttachment !== undefined && control?.labelSegment === undefined
      ? layoutEdge?.labelCenter
      : undefined;
  const labelSegment =
    engineLabel === undefined
      ? selectedLabelSegment(points, control?.labelSegment)
      : nearestSegment(points, engineLabel);
  // Keep the engine's label position as it is. The engine spreads the labels
  // of parallel edges to opposite sides of their lines so they cannot
  // overlap; pulling every label back onto its line would undo that.
  const labelAnchor = engineLabel;
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
    [],
    [],
    [],
    labelAnchor,
  );
}

function nearestSegment(points: readonly Point[], point: Point): number {
  let selected = 0;
  let nearest = Number.POSITIVE_INFINITY;
  for (let index = 0; index < points.length - 1; index += 1) {
    const distance = distanceToSegment(point, points[index]!, points[index + 1]!);
    if (distance < nearest) {
      nearest = distance;
      selected = index;
    }
  }
  return selected;
}

function projectOntoSegment(point: Point, start: Point, end: Point): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
          ),
        );
  return { x: start.x + t * dx, y: start.y + t * dy };
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const projected = projectOntoSegment(point, start, end);
  return Math.hypot(projected.x - point.x, projected.y - point.y);
}

const boundaryAttachmentTolerance = 0.5;

/**
 * Accepts an adapter polyline whose first and last points lie on the source
 * and target boundaries (within a small numeric tolerance) and reports the
 * cardinal sides they attach to. Returns `undefined` when the adapter did not
 * attach the edge to both boundaries, so the caller can fall back to the
 * shape's side anchors.
 */
function adapterBoundaryAttachment(
  adapterPoints: readonly Point[],
  source: LayoutNodeResult,
  target: LayoutNodeResult,
):
  | {
      readonly points: readonly Point[];
      readonly sourceSide: CardinalPortSide;
      readonly targetSide: CardinalPortSide;
    }
  | undefined {
  if (adapterPoints.length < 2) {
    return undefined;
  }
  const start = snapToBoundary(adapterPoints[0]!, source);
  const end = snapToBoundary(adapterPoints.at(-1)!, target);
  if (start === undefined || end === undefined) {
    return undefined;
  }
  const points = deduplicatePoints([
    start.point,
    ...adapterPoints.slice(1, -1),
    end.point,
  ]);
  return points.length < 2
    ? undefined
    : { points, sourceSide: start.side, targetSide: end.side };
}

/**
 * Moves one end of an orthogonal polyline onto the shape's Port anchor for
 * the attached side so the terminal segment enters the anchor perpendicular
 * to that side instead of sliding along the boundary.
 */
function attachToAnchor(
  points: readonly Point[],
  anchor: Point,
  side: CardinalPortSide,
  role: PortRole,
): readonly Point[] {
  const ordered = role === "source" ? [...points].reverse() : [...points];
  const neighbour = ordered.at(-2);
  if (neighbour === undefined) {
    return points;
  }
  const horizontalEntry = side === "east" || side === "west";
  const adjustedNeighbour = horizontalEntry
    ? { x: neighbour.x, y: anchor.y }
    : { x: anchor.x, y: neighbour.y };
  const attached = orthogonalize([
    ...ordered.slice(0, -2),
    adjustedNeighbour,
    anchor,
  ]);
  return role === "source" ? attached.reverse() : attached;
}

function snapToBoundary(
  point: Point,
  node: LayoutNodeResult,
): { readonly point: Point; readonly side: CardinalPortSide } | undefined {
  const right = node.x + node.width;
  const bottom = node.y + node.height;
  const withinX =
    point.x >= node.x - boundaryAttachmentTolerance &&
    point.x <= right + boundaryAttachmentTolerance;
  const withinY =
    point.y >= node.y - boundaryAttachmentTolerance &&
    point.y <= bottom + boundaryAttachmentTolerance;
  if (withinY && Math.abs(point.x - node.x) <= boundaryAttachmentTolerance) {
    return { point: { x: node.x, y: point.y }, side: "west" };
  }
  if (withinY && Math.abs(point.x - right) <= boundaryAttachmentTolerance) {
    return { point: { x: right, y: point.y }, side: "east" };
  }
  if (withinX && Math.abs(point.y - node.y) <= boundaryAttachmentTolerance) {
    return { point: { x: point.x, y: node.y }, side: "north" };
  }
  if (withinX && Math.abs(point.y - bottom) <= boundaryAttachmentTolerance) {
    return { point: { x: point.x, y: bottom }, side: "south" };
  }
  return undefined;
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
  diagram: PreparedDiagram,
  edge: DiagramEdge,
  source: LayoutNodeResult,
  target: LayoutNodeResult,
  sourceShape: ShapeDefinition,
  targetShape: ShapeDefinition,
  allNodes: readonly LayoutNodeResult[],
  obstacleNodeIds: ReadonlySet<string>,
  control: RouteControl,
  corridorById: ReadonlyMap<string, RouteCorridor>,
  avoidanceById: ReadonlyMap<string, RouteAvoidanceRegion>,
): EffectiveRoute {
  const style = control.style ?? "orthogonal";
  const corridor =
    control.corridor === undefined
      ? undefined
      : resolveCorridor(edge, control.corridor, corridorById);
  let sourcePort = choosePort(source, target, control.sourcePort ?? "automatic");
  let targetPort = choosePort(target, source, control.targetPort ?? "automatic");
  let points: readonly Point[];
  let effectiveWaypoints: readonly EffectiveRouteWaypoint[] = [];
  let lockedPointPairs: readonly {
    readonly start: Point;
    readonly end: Point;
  }[] = [];
  const avoidanceRegions = resolveAvoidanceRegions(
    edge,
    control.avoidanceRegionIds ?? [],
    diagram,
    allNodes,
    avoidanceById,
  );

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
      control.targetPort !== undefined ||
      control.guidance !== undefined ||
      control.avoidanceRegionIds !== undefined
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
    const guidance = resolveGuidance(
      edge,
      control.guidance ?? [],
      diagram,
      allNodes,
      start,
      end,
    );
    effectiveWaypoints = guidance.waypoints;
    lockedPointPairs = guidance.lockedSegments;
    const anchors = guidedAnchors(
      edge,
      guidedStart,
      guidedEnd,
      control,
      corridor,
      guidance.points,
    );
    points =
      style === "orthogonal"
        ? orthogonalize([start, ...anchors, end])
        : deduplicatePoints(anchors);
    validateFinitePoints(edge, points);
  }

  const avoided = applyAvoidanceRegions(
    edge,
    points,
    style,
    lockedPointPairs,
    avoidanceRegions,
  );
  points = avoided.points;

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
    corridor,
    control.labelOffset,
    effectiveWaypoints,
    effectiveLockedSegments(edge, points, lockedPointPairs),
    avoided.regions,
  );
}

function guidedAnchors(
  edge: DiagramEdge,
  start: Point,
  end: Point,
  control: RouteControl,
  corridor: EffectiveCorridor | undefined,
  guidancePoints: readonly Point[],
): readonly Point[] {
  const waypoints = control.waypoints ?? [];
  if (
    guidancePoints.length > 0 &&
    (waypoints.length > 0 || corridor !== undefined)
  ) {
    throw new ContractError(
      "C4ML-ROUTE-024",
      `Guided route ${edge.referenceId} cannot combine ordered guidance with absolute waypoints or a corridor.`,
    );
  }
  if (guidancePoints.length > 0) {
    return [start, ...guidancePoints, end];
  }
  if (corridor === undefined) {
    return [start, ...waypoints, end];
  }
  if (waypoints.length > 0) {
    throw new ContractError(
      "C4ML-ROUTE-006",
      `Guided route ${edge.referenceId} cannot combine a corridor and free waypoints yet.`,
    );
  }
  return corridor.orientation === "vertical"
    ? [
        start,
        { x: corridor.laneCoordinate, y: start.y },
        { x: corridor.laneCoordinate, y: end.y },
        end,
      ]
    : [
        start,
        { x: start.x, y: corridor.laneCoordinate },
        { x: end.x, y: corridor.laneCoordinate },
        end,
      ];
}

function resolveCorridor(
  edge: DiagramEdge,
  selection: CorridorSelection,
  corridorById: ReadonlyMap<string, RouteCorridor>,
): EffectiveCorridor {
  const corridor = corridorById.get(selection.corridorId);
  if (corridor === undefined) {
    throw new ContractError(
      "C4ML-ROUTE-007",
      `Guided route ${edge.referenceId} references unknown corridor ${selection.corridorId}.`,
    );
  }
  if (
    !Number.isInteger(selection.lane) ||
    selection.lane < 0 ||
    selection.lane >= corridor.lanes
  ) {
    throw new ContractError(
      "C4ML-ROUTE-008",
      `Guided route ${edge.referenceId} selects invalid lane ${selection.lane}.`,
    );
  }
  const laneOffset =
    (selection.lane - (corridor.lanes - 1) / 2) *
    corridor.laneSpacing;
  return {
    corridorId: corridor.id,
    lane: selection.lane,
    orientation: corridor.orientation,
    coordinate: corridor.coordinate,
    laneCoordinate: corridor.coordinate + laneOffset,
    lanes: corridor.lanes,
    laneSpacing: corridor.laneSpacing,
  };
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

function indexAvoidanceRegions(
  regions: readonly RouteAvoidanceRegion[],
): ReadonlyMap<string, RouteAvoidanceRegion> {
  const result = new Map<string, RouteAvoidanceRegion>();
  for (const region of regions) {
    if (region.id.trim().length === 0 || result.has(region.id)) {
      throw new ContractError(
        "C4ML-ROUTE-025",
        `Route avoidance region identifier ${region.id || "<empty>"} is invalid or duplicated.`,
      );
    }
    if (region.geometry.kind === "absolute") {
      validateRouteBounds(region.id, region.geometry.bounds);
    } else if (
      region.geometry.referenceId.trim().length === 0 ||
      !Number.isFinite(region.geometry.padding) ||
      region.geometry.padding < 0
    ) {
      throw new ContractError(
        "C4ML-ROUTE-026",
        `Route avoidance region ${region.id} has invalid node-relative geometry.`,
      );
    }
    result.set(region.id, region);
  }
  return result;
}

function validateRouteBounds(id: string, bounds: RouteBounds): void {
  if (
    !Number.isFinite(bounds.x) ||
    !Number.isFinite(bounds.y) ||
    !Number.isFinite(bounds.width) ||
    !Number.isFinite(bounds.height) ||
    bounds.width <= 0 ||
    bounds.height <= 0
  ) {
    throw new ContractError(
      "C4ML-ROUTE-026",
      `Route avoidance region ${id} has invalid absolute bounds.`,
    );
  }
}

function resolveGuidance(
  edge: DiagramEdge,
  guidance: readonly RouteGuidance[],
  diagram: PreparedDiagram,
  allNodes: readonly LayoutNodeResult[],
  sourcePort: Point,
  targetPort: Point,
): {
  readonly points: readonly Point[];
  readonly waypoints: readonly EffectiveRouteWaypoint[];
  readonly lockedSegments: readonly {
    readonly start: Point;
    readonly end: Point;
  }[];
} {
  const points: Point[] = [];
  const waypoints: EffectiveRouteWaypoint[] = [];
  const lockedSegments: { start: Point; end: Point }[] = [];
  for (const item of guidance) {
    if (item.kind === "waypoint") {
      const point = resolveRouteAnchor(
        edge,
        item.anchor,
        diagram,
        allNodes,
        sourcePort,
        targetPort,
      );
      points.push(point);
      waypoints.push({ anchor: item.anchor, point });
      continue;
    }
    const start = resolveRouteAnchor(
      edge,
      item.start,
      diagram,
      allNodes,
      sourcePort,
      targetPort,
    );
    const end = resolveRouteAnchor(
      edge,
      item.end,
      diagram,
      allNodes,
      sourcePort,
      targetPort,
    );
    if (start.x === end.x && start.y === end.y) {
      throw new ContractError(
        "C4ML-ROUTE-031",
        `Locked segment for route ${edge.referenceId} has identical endpoints.`,
      );
    }
    points.push(start, end);
    lockedSegments.push({ start, end });
  }
  return { points, waypoints, lockedSegments };
}

function resolveRouteAnchor(
  edge: DiagramEdge,
  anchor: RouteAnchor,
  diagram: PreparedDiagram,
  allNodes: readonly LayoutNodeResult[],
  sourcePort: Point,
  targetPort: Point,
): Point {
  let point: Point;
  if (anchor.kind === "canvas") {
    point = anchor.point;
  } else if (anchor.kind === "source-port" || anchor.kind === "target-port") {
    const port = anchor.kind === "source-port" ? sourcePort : targetPort;
    point = addPoints(port, anchor.offset);
  } else {
    const diagramNode = diagram.nodes.find(
      ({ referenceId }) => referenceId === anchor.referenceId,
    );
    const node = allNodes.find(({ id }) => id === diagramNode?.id);
    if (diagramNode === undefined || node === undefined) {
      throw new ContractError(
        "C4ML-ROUTE-028",
        `Route ${edge.referenceId} references unknown visible anchor ${anchor.referenceId}.`,
      );
    }
    const shape =
      diagramNode.shapeId === undefined
        ? undefined
        : diagram.shapes.get(diagramNode.shapeId);
    const boundary =
      shape === undefined
        ? rectangularBoundaryPoint(node, anchor.side)
        : portPoint(node, shape, anchor.side);
    point = addPoints(boundary, anchor.offset);
  }
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new ContractError(
      "C4ML-ROUTE-028",
      `Route ${edge.referenceId} contains a non-finite relative anchor.`,
    );
  }
  return point;
}

function rectangularBoundaryPoint(
  node: LayoutNodeResult,
  side: CardinalPortSide,
): Point {
  switch (side) {
    case "north":
      return { x: node.x + node.width / 2, y: node.y };
    case "east":
      return { x: node.x + node.width, y: node.y + node.height / 2 };
    case "south":
      return { x: node.x + node.width / 2, y: node.y + node.height };
    case "west":
      return { x: node.x, y: node.y + node.height / 2 };
  }
}

function addPoints(point: Point, offset: Point | undefined): Point {
  return offset === undefined
    ? { ...point }
    : { x: point.x + offset.x, y: point.y + offset.y };
}

function resolveAvoidanceRegions(
  edge: DiagramEdge,
  ids: readonly string[],
  diagram: PreparedDiagram,
  allNodes: readonly LayoutNodeResult[],
  regions: ReadonlyMap<string, RouteAvoidanceRegion>,
): EffectiveAvoidanceRegion[] {
  const seen = new Set<string>();
  return ids.map((id) => {
    if (seen.has(id)) {
      throw new ContractError(
        "C4ML-ROUTE-027",
        `Route ${edge.referenceId} selects avoidance region ${id} more than once.`,
      );
    }
    seen.add(id);
    const region = regions.get(id);
    if (region === undefined) {
      throw new ContractError(
        "C4ML-ROUTE-027",
        `Route ${edge.referenceId} references unknown avoidance region ${id}.`,
      );
    }
    let bounds: RouteBounds;
    if (region.geometry.kind === "absolute") {
      bounds = region.geometry.bounds;
    } else {
      const geometry = region.geometry;
      const diagramNode = diagram.nodes.find(
        ({ referenceId }) => referenceId === geometry.referenceId,
      );
      const node = allNodes.find(({ id: nodeId }) => nodeId === diagramNode?.id);
      if (node === undefined) {
        throw new ContractError(
          "C4ML-ROUTE-027",
          `Avoidance region ${id} references unknown visible node ${geometry.referenceId}.`,
        );
      }
      const padding = geometry.padding;
      bounds = {
        x: node.x - padding,
        y: node.y - padding,
        width: node.width + padding * 2,
        height: node.height + padding * 2,
      };
    }
    return { id, strength: region.strength, bounds, relaxed: false };
  });
}

function applyAvoidanceRegions(
  edge: DiagramEdge,
  initialPoints: readonly Point[],
  style: RouteStyle,
  lockedSegments: readonly { readonly start: Point; readonly end: Point }[],
  regions: readonly EffectiveAvoidanceRegion[],
): {
  readonly points: readonly Point[];
  readonly regions: readonly EffectiveAvoidanceRegion[];
} {
  let points = [...initialPoints];
  const effectiveRegions: EffectiveAvoidanceRegion[] = [];
  for (const region of regions) {
    const pointsBeforeRegion = points;
    const crossingSegments = crossingSegmentIndexes(points, region.bounds);
    if (crossingSegments.length === 0) {
      effectiveRegions.push(region);
      continue;
    }
    const crossesLockedSegment = crossingSegments.some((index) =>
      lockedSegments.some((locked) =>
        sameSegment(
          points[index]!,
          points[index + 1]!,
          locked.start,
          locked.end,
        ),
      ),
    );
    if (style !== "orthogonal" || crossesLockedSegment) {
      if (region.strength === "hard") {
        throw new ContractError(
          "C4ML-ROUTE-029",
          `Route ${edge.referenceId} cannot satisfy hard avoidance region ${region.id} without changing a locked or non-orthogonal segment.`,
        );
      }
      effectiveRegions.push({ ...region, relaxed: true });
      continue;
    }
    points = detourAroundBounds(points, region.bounds);
    if (crossingSegmentIndexes(points, region.bounds).length > 0) {
      if (region.strength === "hard") {
        throw new ContractError(
          "C4ML-ROUTE-029",
          `Route ${edge.referenceId} cannot satisfy hard avoidance region ${region.id}.`,
        );
      }
      points = pointsBeforeRegion;
      effectiveRegions.push({ ...region, relaxed: true });
      continue;
    }
    effectiveRegions.push(region);
  }
  return { points: deduplicatePoints(points), regions: effectiveRegions };
}

function crossingSegmentIndexes(
  points: readonly Point[],
  bounds: RouteBounds,
): number[] {
  const result: number[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    if (segmentCrossesBoundsInterior(points[index]!, points[index + 1]!, bounds)) {
      result.push(index);
    }
  }
  return result;
}

function segmentCrossesBoundsInterior(
  start: Point,
  end: Point,
  bounds: RouteBounds,
): boolean {
  const epsilon = 1e-9;
  const minimum = { x: bounds.x + epsilon, y: bounds.y + epsilon };
  const maximum = {
    x: bounds.x + bounds.width - epsilon,
    y: bounds.y + bounds.height - epsilon,
  };
  let enter = 0;
  let leave = 1;
  for (const axis of ["x", "y"] as const) {
    const delta = end[axis] - start[axis];
    if (delta === 0) {
      if (start[axis] < minimum[axis] || start[axis] > maximum[axis]) {
        return false;
      }
      continue;
    }
    const first = (minimum[axis] - start[axis]) / delta;
    const second = (maximum[axis] - start[axis]) / delta;
    enter = Math.max(enter, Math.min(first, second));
    leave = Math.min(leave, Math.max(first, second));
    if (enter > leave) {
      return false;
    }
  }
  return enter <= 1 && leave >= 0;
}

const AVOIDANCE_CLEARANCE = 12;

function detourAroundBounds(
  points: readonly Point[],
  bounds: RouteBounds,
): Point[] {
  const result: Point[] = [points[0]!];
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index]!;
    const end = points[index + 1]!;
    if (!segmentCrossesBoundsInterior(start, end, bounds)) {
      result.push(end);
      continue;
    }
    result.push(...detourSegment(start, end, bounds).slice(1));
  }
  return deduplicatePoints(result);
}

function detourSegment(
  start: Point,
  end: Point,
  bounds: RouteBounds,
): readonly Point[] {
  const left = bounds.x - AVOIDANCE_CLEARANCE;
  const right = bounds.x + bounds.width + AVOIDANCE_CLEARANCE;
  const top = bounds.y - AVOIDANCE_CLEARANCE;
  const bottom = bounds.y + bounds.height + AVOIDANCE_CLEARANCE;
  if (start.y === end.y) {
    const detourY =
      Math.abs(start.y - top) <= Math.abs(start.y - bottom) ? top : bottom;
    const forward = start.x <= end.x;
    const entryX = forward ? left : right;
    const exitX = forward ? right : left;
    return [
      start,
      { x: entryX, y: start.y },
      { x: entryX, y: detourY },
      { x: exitX, y: detourY },
      { x: exitX, y: end.y },
      end,
    ];
  }
  const detourX =
    Math.abs(start.x - left) <= Math.abs(start.x - right) ? left : right;
  const forward = start.y <= end.y;
  const entryY = forward ? top : bottom;
  const exitY = forward ? bottom : top;
  return [
    start,
    { x: start.x, y: entryY },
    { x: detourX, y: entryY },
    { x: detourX, y: exitY },
    { x: end.x, y: exitY },
    end,
  ];
}

function effectiveLockedSegments(
  edge: DiagramEdge,
  points: readonly Point[],
  lockedSegments: readonly { readonly start: Point; readonly end: Point }[],
): EffectiveLockedSegment[] {
  return lockedSegments.map((locked) => {
    const segmentIndex = points.findIndex(
      (point, index) =>
        index < points.length - 1 &&
        sameSegment(point, points[index + 1]!, locked.start, locked.end),
    );
    if (segmentIndex < 0) {
      throw new ContractError(
        "C4ML-ROUTE-031",
        `Route ${edge.referenceId} cannot preserve a declared locked segment.`,
      );
    }
    return { ...locked, segmentIndex };
  });
}

function sameSegment(
  start: Point,
  end: Point,
  expectedStart: Point,
  expectedEnd: Point,
): boolean {
  return (
    start.x === expectedStart.x &&
    start.y === expectedStart.y &&
    end.x === expectedEnd.x &&
    end.y === expectedEnd.y
  );
}

function validateExclusiveCorridorLanes(
  controls: readonly RouteControl[],
  corridorById: ReadonlyMap<string, RouteCorridor>,
): void {
  const relationshipByLane = new Map<string, string>();
  for (const control of controls) {
    if (control.corridor === undefined) {
      continue;
    }
    const corridor = corridorById.get(control.corridor.corridorId);
    if (
      corridor === undefined ||
      !Number.isInteger(control.corridor.lane) ||
      control.corridor.lane < 0 ||
      control.corridor.lane >= corridor.lanes
    ) {
      continue;
    }
    const key = `${control.corridor.corridorId}:${control.corridor.lane}`;
    const firstRelationshipId = relationshipByLane.get(key);
    if (firstRelationshipId !== undefined) {
      throw new ContractError(
        "C4ML-ROUTE-023",
        `Relationships ${firstRelationshipId} and ${control.relationshipId} select the same exclusive lane ${control.corridor.lane} in corridor ${control.corridor.corridorId}.`,
      );
    }
    relationshipByLane.set(key, control.relationshipId);
  }
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
  corridor?: EffectiveCorridor,
  labelOffset?: Point,
  waypoints: readonly EffectiveRouteWaypoint[] = [],
  lockedSegments: readonly EffectiveLockedSegment[] = [],
  avoidanceRegions: readonly EffectiveAvoidanceRegion[] = [],
  baseLabelAnchor?: Point,
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
  const baseLabelPoint = baseLabelAnchor ?? labelPoint(points, labelSegment);
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
    waypoints,
    lockedSegments,
    avoidanceRegions,
  };
}
