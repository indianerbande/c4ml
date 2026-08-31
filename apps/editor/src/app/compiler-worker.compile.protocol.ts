import {
  compilerWorkerProtocolVersion,
  isPositiveFinite,
  isPositiveRequestId,
  isWorkerSource,
  type CompilerWorkerSource,
} from "./compiler-worker.shared.js";

export interface CompilerWorkerView {
  readonly id: string;
  readonly kind:
    | "code"
    | "component"
    | "container"
    | "deployment"
    | "dynamic"
    | "system-context"
    | "system-landscape";
  readonly title: string;
}

export interface CompilerWorkerNavigationPoint {
  readonly x: number;
  readonly y: number;
}

interface CompilerWorkerNavigationTargetBase {
  readonly sceneObjectId: string;
  readonly svgElementIds: readonly string[];
  readonly referenceId: string;
  readonly label: string;
  readonly source: CompilerWorkerSource;
  readonly relatedSources: readonly CompilerWorkerSource[];
}

export interface CompilerWorkerNodeNavigationTarget extends CompilerWorkerNavigationTargetBase {
  readonly kind: "node";
  readonly nodeRole: "boundary" | "element";
  readonly bounds: CompilerWorkerGeometryBounds;
  readonly geometry?: CompilerWorkerNodeGeometry;
}

export interface CompilerWorkerGeometryBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CompilerWorkerPlacementExplanation {
  readonly id: string;
  readonly kind:
    | "adjust"
    | "align"
    | "alignment"
    | "automatic"
    | "distribute"
    | "pin"
    | "relative";
  readonly strength: "automatic" | "hard" | "soft";
  readonly state: "applied" | "relaxed";
  readonly summary: string;
  readonly source: CompilerWorkerSource;
}

export interface CompilerWorkerNodeGeometry {
  readonly candidate: CompilerWorkerGeometryBounds;
  readonly final: CompilerWorkerGeometryBounds;
  readonly delta: {
    readonly x: number;
    readonly y: number;
  };
  readonly explanations: readonly CompilerWorkerPlacementExplanation[];
}

export interface CompilerWorkerRoutePort {
  readonly id: string;
  readonly role: "source" | "target";
  readonly side: "east" | "north" | "south" | "west";
  readonly point: CompilerWorkerNavigationPoint;
}

export interface CompilerWorkerRouteCorridor {
  readonly id: string;
  readonly orientation: "horizontal" | "vertical";
  readonly coordinate: number;
  readonly laneCoordinate: number;
  readonly lane: number;
  readonly lanes: number;
  readonly laneSpacing: number;
  readonly source: CompilerWorkerSource;
}

export interface CompilerWorkerRouteWaypoint {
  readonly anchorKind: "canvas" | "node" | "source-port" | "target-port";
  readonly referenceId: string | undefined;
  readonly side: "east" | "north" | "south" | "west" | undefined;
  readonly point: CompilerWorkerNavigationPoint;
}

export interface CompilerWorkerLockedSegment {
  readonly start: CompilerWorkerNavigationPoint;
  readonly end: CompilerWorkerNavigationPoint;
  readonly segmentIndex: number;
}

export interface CompilerWorkerAvoidanceRegion {
  readonly id: string;
  readonly strength: "hard" | "soft";
  readonly bounds: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly relaxed: boolean;
  readonly source: CompilerWorkerSource;
}

export interface CompilerWorkerRouteNavigationTarget extends CompilerWorkerNavigationTargetBase {
  readonly kind: "route";
  readonly policy: "automatic" | "fixed" | "guided";
  readonly style: "direct" | "orthogonal";
  readonly sourcePortSelection: "automatic" | "east" | "north" | "south" | "west";
  readonly targetPortSelection: "automatic" | "east" | "north" | "south" | "west";
  readonly points: readonly CompilerWorkerNavigationPoint[];
  readonly sourcePort: CompilerWorkerRoutePort;
  readonly targetPort: CompilerWorkerRoutePort;
  readonly labelPoint: CompilerWorkerNavigationPoint;
  readonly labelSegment: number;
  readonly corridor: CompilerWorkerRouteCorridor | undefined;
  readonly waypoints: readonly CompilerWorkerRouteWaypoint[];
  readonly lockedSegments: readonly CompilerWorkerLockedSegment[];
  readonly avoidanceRegions: readonly CompilerWorkerAvoidanceRegion[];
}

interface CompilerWorkerRouteDetailNavigationTargetBase extends CompilerWorkerNavigationTargetBase {
  readonly routeSceneObjectId: string;
}

export interface CompilerWorkerPortNavigationTarget extends CompilerWorkerRouteDetailNavigationTargetBase {
  readonly kind: "port";
  readonly portRole: "source" | "target";
  readonly side: "east" | "north" | "south" | "west";
  readonly point: CompilerWorkerNavigationPoint;
}

export interface CompilerWorkerRouteLabelNavigationTarget extends CompilerWorkerRouteDetailNavigationTargetBase {
  readonly kind: "route-label";
  readonly point: CompilerWorkerNavigationPoint;
  readonly bounds: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
}

export interface CompilerWorkerCorridorNavigationTarget extends CompilerWorkerRouteDetailNavigationTargetBase {
  readonly kind: "corridor";
  readonly orientation: "horizontal" | "vertical";
  readonly points: readonly [
    CompilerWorkerNavigationPoint,
    CompilerWorkerNavigationPoint,
  ];
  readonly lane: number;
  readonly lanes: number;
}

export type CompilerWorkerNavigationTarget =
  | CompilerWorkerNodeNavigationTarget
  | CompilerWorkerRouteNavigationTarget
  | CompilerWorkerPortNavigationTarget
  | CompilerWorkerRouteLabelNavigationTarget
  | CompilerWorkerCorridorNavigationTarget;

export interface CompilerWorkerNavigation {
  readonly width: number;
  readonly height: number;
  readonly targets: readonly CompilerWorkerNavigationTarget[];
}

export interface CompilerWorkerDiagnostic {
  readonly code: string;
  readonly severity: "error" | "information" | "warning";
  readonly message: string;
  readonly source: CompilerWorkerSource | undefined;
  readonly correction: string | undefined;
}

export interface CompilerWorkerProjectDocument {
  readonly uri: string;
  readonly source: string;
}

export interface CompilerWorkerPolicyResource {
  readonly uri: string;
  readonly source: string;
}

export interface CompilerWorkerObservationResource {
  readonly uri: string;
  readonly source: string;
}

export interface CompilerWorkerGlossaryResource {
  readonly uri: string;
  readonly source: string;
}

export interface CompilerWorkerProject {
  readonly version: 1;
  readonly id: string;
  readonly name?: string;
  readonly description?: string;
  readonly documents: readonly CompilerWorkerProjectDocument[];
  readonly policy?: CompilerWorkerPolicyResource;
  readonly observations?: CompilerWorkerObservationResource;
  readonly glossary?: CompilerWorkerGlossaryResource;
}

export interface CompilerWorkerRequest {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "compile";
  readonly requestId: number;
  readonly file: string;
  readonly source: string;
  readonly project?: CompilerWorkerProject;
  readonly requestedViewId?: string;
}

export interface CompilerWorkerResponse {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "compile-result";
  readonly requestId: number;
  readonly status: "failed" | "invalid" | "valid";
  readonly diagnostics: readonly CompilerWorkerDiagnostic[];
  readonly svg: string | undefined;
  readonly navigation: CompilerWorkerNavigation | undefined;
  readonly views: readonly CompilerWorkerView[];
  readonly activeViewId: string | undefined;
}

export function isCompilerWorkerRequest(
  value: unknown,
): value is CompilerWorkerRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<CompilerWorkerRequest>;
  return (
    candidate.protocolVersion === compilerWorkerProtocolVersion &&
    candidate.type === "compile" &&
    isPositiveRequestId(candidate.requestId) &&
    typeof candidate.file === "string" &&
    typeof candidate.source === "string" &&
    (candidate.project === undefined ||
      (isCompilerWorkerProject(candidate.project) &&
        candidate.project.documents.some(
          ({ uri, source }) =>
            uri === candidate.file && source === candidate.source,
        ))) &&
    (candidate.requestedViewId === undefined ||
      typeof candidate.requestedViewId === "string")
  );
}

export function isCompilerWorkerProject(
  value: unknown,
): value is CompilerWorkerProject {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<CompilerWorkerProject>;
  return (
    candidate.version === 1 &&
    typeof candidate.id === "string" &&
    candidate.id.length > 0 &&
    (candidate.name === undefined || typeof candidate.name === "string") &&
    (candidate.description === undefined ||
      typeof candidate.description === "string") &&
    (candidate.policy === undefined ||
      (typeof candidate.policy === "object" &&
        candidate.policy !== null &&
        typeof (candidate.policy as Partial<CompilerWorkerPolicyResource>).uri ===
          "string" &&
        (candidate.policy as Partial<CompilerWorkerPolicyResource>).uri!.length > 0 &&
        typeof (candidate.policy as Partial<CompilerWorkerPolicyResource>).source ===
          "string" &&
        (candidate.policy as Partial<CompilerWorkerPolicyResource>).source!.length > 0)) &&
    (candidate.observations === undefined ||
      (typeof candidate.observations === "object" &&
        candidate.observations !== null &&
        typeof (candidate.observations as Partial<CompilerWorkerObservationResource>).uri ===
          "string" &&
        (candidate.observations as Partial<CompilerWorkerObservationResource>).uri!.length > 0 &&
        typeof (candidate.observations as Partial<CompilerWorkerObservationResource>).source ===
          "string" &&
        (candidate.observations as Partial<CompilerWorkerObservationResource>).source!.length > 0)) &&
    (candidate.glossary === undefined ||
      (typeof candidate.glossary === "object" &&
        candidate.glossary !== null &&
        typeof (candidate.glossary as Partial<CompilerWorkerGlossaryResource>).uri === "string" &&
        (candidate.glossary as Partial<CompilerWorkerGlossaryResource>).uri!.length > 0 &&
        typeof (candidate.glossary as Partial<CompilerWorkerGlossaryResource>).source === "string" &&
        (candidate.glossary as Partial<CompilerWorkerGlossaryResource>).source!.length > 0)) &&
    Array.isArray(candidate.documents) &&
    candidate.documents.length > 0 &&
    candidate.documents.every(
      (document) =>
        typeof document === "object" &&
        document !== null &&
        typeof (document as Partial<CompilerWorkerProjectDocument>).uri ===
          "string" &&
        typeof (document as Partial<CompilerWorkerProjectDocument>).source ===
          "string",
    )
  );
}

export function isCompilerWorkerResponse(
  value: unknown,
): value is CompilerWorkerResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<CompilerWorkerResponse>;
  return (
    candidate.protocolVersion === compilerWorkerProtocolVersion &&
    candidate.type === "compile-result" &&
    isPositiveRequestId(candidate.requestId) &&
    (candidate.status === "failed" ||
      candidate.status === "invalid" ||
      candidate.status === "valid") &&
    Array.isArray(candidate.diagnostics) &&
    Array.isArray(candidate.views) &&
    candidate.views.every(isCompilerWorkerView) &&
    (candidate.activeViewId === undefined ||
      typeof candidate.activeViewId === "string") &&
    (candidate.status === "valid"
      ? typeof candidate.svg === "string" &&
        isCompilerWorkerNavigation(candidate.navigation) &&
        typeof candidate.activeViewId === "string" &&
        candidate.views.some(({ id }) => id === candidate.activeViewId)
      : candidate.svg === undefined && candidate.navigation === undefined)
  );
}

function isCompilerWorkerView(value: unknown): value is CompilerWorkerView {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<CompilerWorkerView>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    (candidate.kind === "code" ||
      candidate.kind === "component" ||
      candidate.kind === "container" ||
      candidate.kind === "deployment" ||
      candidate.kind === "dynamic" ||
      candidate.kind === "system-context" ||
      candidate.kind === "system-landscape")
  );
}

function isCompilerWorkerNavigation(
  value: unknown,
): value is CompilerWorkerNavigation {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<CompilerWorkerNavigation>;
  return (
    isPositiveFinite(candidate.width) &&
    isPositiveFinite(candidate.height) &&
    Array.isArray(candidate.targets) &&
    candidate.targets.every(isCompilerWorkerNavigationTarget)
  );
}

function isCompilerWorkerNavigationTarget(
  value: unknown,
): value is CompilerWorkerNavigationTarget {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<CompilerWorkerNavigationTarget>;
  const baseValid =
    typeof candidate.sceneObjectId === "string" &&
    Array.isArray(candidate.svgElementIds) &&
    candidate.svgElementIds.length > 0 &&
    candidate.svgElementIds.every((id) => typeof id === "string") &&
    typeof candidate.referenceId === "string" &&
    typeof candidate.label === "string" &&
    isWorkerSource(candidate.source) &&
    Array.isArray(candidate.relatedSources) &&
    candidate.relatedSources.every(isWorkerSource);
  if (!baseValid) {
    return false;
  }
  if (candidate.kind === "node") {
    const node = candidate as Partial<CompilerWorkerNodeNavigationTarget>;
    const bounds = node.bounds;
    return (
      (node.nodeRole === "boundary" || node.nodeRole === "element") &&
      typeof bounds === "object" &&
      bounds !== null &&
      Number.isFinite(bounds.x) &&
      Number.isFinite(bounds.y) &&
      isPositiveFinite(bounds.width) &&
      isPositiveFinite(bounds.height) &&
      (node.geometry === undefined || isNodeGeometry(node.geometry))
    );
  }
  if (candidate.kind === "port") {
    const port = candidate as Partial<CompilerWorkerPortNavigationTarget>;
    return (
      typeof port.routeSceneObjectId === "string" &&
      (port.portRole === "source" || port.portRole === "target") &&
      isCardinalSide(port.side) &&
      isNavigationPoint(port.point)
    );
  }
  if (candidate.kind === "route-label") {
    const label =
      candidate as Partial<CompilerWorkerRouteLabelNavigationTarget>;
    return (
      typeof label.routeSceneObjectId === "string" &&
      isNavigationPoint(label.point) &&
      isNavigationBounds(label.bounds)
    );
  }
  if (candidate.kind === "corridor") {
    const corridor =
      candidate as Partial<CompilerWorkerCorridorNavigationTarget>;
    return (
      typeof corridor.routeSceneObjectId === "string" &&
      (corridor.orientation === "horizontal" ||
        corridor.orientation === "vertical") &&
      Array.isArray(corridor.points) &&
      corridor.points.length === 2 &&
      corridor.points.every(isNavigationPoint) &&
      Number.isSafeInteger(corridor.lane) &&
      (corridor.lane ?? -1) >= 0 &&
      Number.isSafeInteger(corridor.lanes) &&
      (corridor.lanes ?? 0) > (corridor.lane ?? Number.POSITIVE_INFINITY)
    );
  }
  if (candidate.kind !== "route") {
    return false;
  }
  const route = candidate as Partial<CompilerWorkerRouteNavigationTarget>;
  return (
    route.svgElementIds?.length === 2 &&
    (route.policy === "automatic" ||
      route.policy === "fixed" ||
      route.policy === "guided") &&
    (route.style === "direct" || route.style === "orthogonal") &&
    isPortSelection(route.sourcePortSelection) &&
    isPortSelection(route.targetPortSelection) &&
    Array.isArray(route.points) &&
    route.points.length >= 2 &&
    route.points.every(isNavigationPoint) &&
    isRoutePort(route.sourcePort, "source") &&
    isRoutePort(route.targetPort, "target") &&
    isNavigationPoint(route.labelPoint) &&
    Number.isSafeInteger(route.labelSegment) &&
    (route.labelSegment ?? -1) >= 0 &&
    (route.labelSegment ?? Number.POSITIVE_INFINITY) <
      route.points.length - 1 &&
    (route.corridor === undefined || isRouteCorridor(route.corridor)) &&
    Array.isArray(route.waypoints) &&
    route.waypoints.every(isRouteWaypoint) &&
    Array.isArray(route.lockedSegments) &&
    route.lockedSegments.every(isLockedSegment) &&
    Array.isArray(route.avoidanceRegions) &&
    route.avoidanceRegions.every(isAvoidanceRegion)
  );
}

function isPortSelection(value: unknown): boolean {
  return (
    value === "automatic" ||
    value === "east" ||
    value === "north" ||
    value === "south" ||
    value === "west"
  );
}

function isNodeGeometry(value: unknown): value is CompilerWorkerNodeGeometry {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const geometry = value as Partial<CompilerWorkerNodeGeometry>;
  return (
    isNavigationBounds(geometry.candidate) &&
    isNavigationBounds(geometry.final) &&
    isNavigationPoint(geometry.delta) &&
    Array.isArray(geometry.explanations) &&
    geometry.explanations.length > 0 &&
    geometry.explanations.every((explanation) => {
      if (typeof explanation !== "object" || explanation === null) {
        return false;
      }
      const item = explanation as Partial<CompilerWorkerPlacementExplanation>;
      return (
        typeof item.id === "string" &&
        (item.kind === "adjust" ||
          item.kind === "align" ||
          item.kind === "alignment" ||
          item.kind === "automatic" ||
          item.kind === "distribute" ||
          item.kind === "pin" ||
          item.kind === "relative") &&
        (item.strength === "automatic" ||
          item.strength === "hard" ||
          item.strength === "soft") &&
        (item.state === "applied" || item.state === "relaxed") &&
        typeof item.summary === "string" &&
        item.summary.length > 0 &&
        isWorkerSource(item.source)
      );
    })
  );
}

function isNavigationBounds(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const bounds = value as {
    readonly x?: unknown;
    readonly y?: unknown;
    readonly width?: unknown;
    readonly height?: unknown;
  };
  return (
    Number.isFinite(bounds.x) &&
    Number.isFinite(bounds.y) &&
    isPositiveFinite(bounds.width) &&
    isPositiveFinite(bounds.height)
  );
}

function isNavigationPoint(
  value: unknown,
): value is CompilerWorkerNavigationPoint {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const point = value as Partial<CompilerWorkerNavigationPoint>;
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function isCardinalSide(value: unknown): boolean {
  return (
    value === "east" ||
    value === "north" ||
    value === "south" ||
    value === "west"
  );
}

function isRoutePort(
  value: unknown,
  role: CompilerWorkerRoutePort["role"],
): value is CompilerWorkerRoutePort {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const port = value as Partial<CompilerWorkerRoutePort>;
  return (
    typeof port.id === "string" &&
    port.role === role &&
    isCardinalSide(port.side) &&
    isNavigationPoint(port.point)
  );
}

function isRouteCorridor(value: unknown): value is CompilerWorkerRouteCorridor {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const corridor = value as Partial<CompilerWorkerRouteCorridor>;
  return (
    typeof corridor.id === "string" &&
    (corridor.orientation === "horizontal" ||
      corridor.orientation === "vertical") &&
    Number.isFinite(corridor.coordinate) &&
    Number.isFinite(corridor.laneCoordinate) &&
    Number.isSafeInteger(corridor.lane) &&
    (corridor.lane ?? -1) >= 0 &&
    Number.isSafeInteger(corridor.lanes) &&
    (corridor.lanes ?? 0) > 0 &&
    (corridor.lane ?? Number.POSITIVE_INFINITY) <
      (corridor.lanes ?? Number.NEGATIVE_INFINITY) &&
    isPositiveFinite(corridor.laneSpacing) &&
    isWorkerSource(corridor.source)
  );
}

function isRouteWaypoint(value: unknown): value is CompilerWorkerRouteWaypoint {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const waypoint = value as Partial<CompilerWorkerRouteWaypoint>;
  const kindValid =
    waypoint.anchorKind === "canvas" ||
    waypoint.anchorKind === "node" ||
    waypoint.anchorKind === "source-port" ||
    waypoint.anchorKind === "target-port";
  return (
    kindValid &&
    isNavigationPoint(waypoint.point) &&
    (waypoint.anchorKind === "node"
      ? typeof waypoint.referenceId === "string" &&
        isCardinalSide(waypoint.side)
      : waypoint.referenceId === undefined && waypoint.side === undefined)
  );
}

function isLockedSegment(value: unknown): value is CompilerWorkerLockedSegment {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const segment = value as Partial<CompilerWorkerLockedSegment>;
  return (
    isNavigationPoint(segment.start) &&
    isNavigationPoint(segment.end) &&
    Number.isSafeInteger(segment.segmentIndex) &&
    (segment.segmentIndex ?? -1) >= 0
  );
}

function isAvoidanceRegion(
  value: unknown,
): value is CompilerWorkerAvoidanceRegion {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const region = value as Partial<CompilerWorkerAvoidanceRegion>;
  return (
    typeof region.id === "string" &&
    (region.strength === "hard" || region.strength === "soft") &&
    isNavigationBounds(region.bounds) &&
    typeof region.relaxed === "boolean" &&
    isWorkerSource(region.source)
  );
}
