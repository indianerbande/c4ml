import type {
  C4mlCompletionCandidate,
  C4mlCompletionKind,
  C4mlHighlight,
  C4mlSystemContextWizardAnswers,
  C4mlWizardIssue,
} from "@c4ml/language-c4ml";

export const compilerWorkerProtocolVersion = 7 as const;

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

export interface CompilerWorkerPosition {
  readonly offset: number;
  readonly line: number;
  readonly column: number;
}

export interface CompilerWorkerSource {
  readonly file: string;
  readonly start: CompilerWorkerPosition;
  readonly end: CompilerWorkerPosition;
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

export interface CompilerWorkerNodeNavigationTarget
  extends CompilerWorkerNavigationTargetBase {
  readonly kind: "node";
  readonly nodeRole: "boundary" | "element";
  readonly bounds: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
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
}

export interface CompilerWorkerRouteNavigationTarget
  extends CompilerWorkerNavigationTargetBase {
  readonly kind: "route";
  readonly policy: "automatic" | "fixed" | "guided";
  readonly style: "direct" | "orthogonal";
  readonly points: readonly CompilerWorkerNavigationPoint[];
  readonly sourcePort: CompilerWorkerRoutePort;
  readonly targetPort: CompilerWorkerRoutePort;
  readonly labelPoint: CompilerWorkerNavigationPoint;
  readonly labelSegment: number;
  readonly corridor: CompilerWorkerRouteCorridor | undefined;
}

interface CompilerWorkerRouteDetailNavigationTargetBase
  extends CompilerWorkerNavigationTargetBase {
  readonly routeSceneObjectId: string;
}

export interface CompilerWorkerPortNavigationTarget
  extends CompilerWorkerRouteDetailNavigationTargetBase {
  readonly kind: "port";
  readonly portRole: "source" | "target";
  readonly side: "east" | "north" | "south" | "west";
  readonly point: CompilerWorkerNavigationPoint;
}

export interface CompilerWorkerRouteLabelNavigationTarget
  extends CompilerWorkerRouteDetailNavigationTargetBase {
  readonly kind: "route-label";
  readonly point: CompilerWorkerNavigationPoint;
  readonly bounds: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
}

export interface CompilerWorkerCorridorNavigationTarget
  extends CompilerWorkerRouteDetailNavigationTargetBase {
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

export interface CompilerWorkerRequest {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "compile";
  readonly requestId: number;
  readonly file: string;
  readonly source: string;
  readonly requestedViewId?: string;
}

export interface CompletionWorkerRequest {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "complete";
  readonly requestId: number;
  readonly file: string;
  readonly source: string;
  readonly offset: number;
}

export interface HighlightWorkerRequest {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "highlight";
  readonly requestId: number;
  readonly file: string;
  readonly source: string;
}

export interface WizardWorkerRequest {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "generate-system-context";
  readonly requestId: number;
  readonly answers: C4mlSystemContextWizardAnswers;
}

export type CompilerWorkerInbound =
  | CompilerWorkerRequest
  | CompletionWorkerRequest
  | HighlightWorkerRequest
  | WizardWorkerRequest;

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

export interface CompletionWorkerCandidate
  extends Omit<C4mlCompletionCandidate, "kind"> {
  readonly kind: C4mlCompletionKind;
}

export interface CompletionWorkerResponse {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "completion-result";
  readonly requestId: number;
  readonly status: "complete" | "failed";
  readonly candidates: readonly CompletionWorkerCandidate[];
  readonly message: string | undefined;
}

export type HighlightWorkerSpan = C4mlHighlight;

export interface HighlightWorkerResponse {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "highlight-result";
  readonly requestId: number;
  readonly status: "complete" | "failed";
  readonly highlights: readonly HighlightWorkerSpan[];
  readonly message: string | undefined;
}

export interface WizardWorkerResponse {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "generation-result";
  readonly requestId: number;
  readonly status: "failed" | "invalid" | "valid";
  readonly source: string | undefined;
  readonly issues: readonly C4mlWizardIssue[];
  readonly message: string | undefined;
}

export type CompilerWorkerOutbound =
  | CompilerWorkerResponse
  | CompletionWorkerResponse
  | HighlightWorkerResponse
  | WizardWorkerResponse;

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
    Number.isSafeInteger(candidate.requestId) &&
    (candidate.requestId ?? 0) > 0 &&
    typeof candidate.file === "string" &&
    typeof candidate.source === "string" &&
    (candidate.requestedViewId === undefined ||
      typeof candidate.requestedViewId === "string")
  );
}

export function isCompletionWorkerRequest(
  value: unknown,
): value is CompletionWorkerRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<CompletionWorkerRequest>;
  return (
    candidate.protocolVersion === compilerWorkerProtocolVersion &&
    candidate.type === "complete" &&
    isPositiveRequestId(candidate.requestId) &&
    typeof candidate.file === "string" &&
    typeof candidate.source === "string" &&
    Number.isSafeInteger(candidate.offset) &&
    (candidate.offset ?? -1) >= 0 &&
    (candidate.offset ?? Number.POSITIVE_INFINITY) <= candidate.source.length
  );
}

export function isHighlightWorkerRequest(
  value: unknown,
): value is HighlightWorkerRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<HighlightWorkerRequest>;
  return (
    candidate.protocolVersion === compilerWorkerProtocolVersion &&
    candidate.type === "highlight" &&
    isPositiveRequestId(candidate.requestId) &&
    typeof candidate.file === "string" &&
    typeof candidate.source === "string"
  );
}

export function isCompilerWorkerInbound(
  value: unknown,
): value is CompilerWorkerInbound {
  return (
    isCompilerWorkerRequest(value) ||
    isCompletionWorkerRequest(value) ||
    isHighlightWorkerRequest(value) ||
    isWizardWorkerRequest(value)
  );
}

export function isWizardWorkerRequest(
  value: unknown,
): value is WizardWorkerRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<WizardWorkerRequest>;
  return (
    candidate.protocolVersion === compilerWorkerProtocolVersion &&
    candidate.type === "generate-system-context" &&
    isPositiveRequestId(candidate.requestId) &&
    isWizardAnswers(candidate.answers)
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
    Number.isSafeInteger(candidate.requestId) &&
    (candidate.requestId ?? 0) > 0 &&
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

export function isCompletionWorkerResponse(
  value: unknown,
): value is CompletionWorkerResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<CompletionWorkerResponse>;
  return (
    candidate.protocolVersion === compilerWorkerProtocolVersion &&
    candidate.type === "completion-result" &&
    isPositiveRequestId(candidate.requestId) &&
    (candidate.status === "complete" || candidate.status === "failed") &&
    Array.isArray(candidate.candidates) &&
    candidate.candidates.every(isCompletionCandidate) &&
    (candidate.message === undefined || typeof candidate.message === "string") &&
    (candidate.status === "complete"
      ? candidate.message === undefined
      : typeof candidate.message === "string")
  );
}

export function isHighlightWorkerResponse(
  value: unknown,
): value is HighlightWorkerResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<HighlightWorkerResponse>;
  return (
    candidate.protocolVersion === compilerWorkerProtocolVersion &&
    candidate.type === "highlight-result" &&
    isPositiveRequestId(candidate.requestId) &&
    (candidate.status === "complete" || candidate.status === "failed") &&
    Array.isArray(candidate.highlights) &&
    candidate.highlights.every(isHighlightSpan) &&
    (candidate.message === undefined || typeof candidate.message === "string") &&
    (candidate.status === "complete"
      ? candidate.message === undefined
      : typeof candidate.message === "string")
  );
}

export function isCompilerWorkerOutbound(
  value: unknown,
): value is CompilerWorkerOutbound {
  return (
    isCompilerWorkerResponse(value) ||
    isCompletionWorkerResponse(value) ||
    isHighlightWorkerResponse(value) ||
    isWizardWorkerResponse(value)
  );
}

export function isWizardWorkerResponse(
  value: unknown,
): value is WizardWorkerResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<WizardWorkerResponse>;
  return (
    candidate.protocolVersion === compilerWorkerProtocolVersion &&
    candidate.type === "generation-result" &&
    isPositiveRequestId(candidate.requestId) &&
    (candidate.status === "failed" ||
      candidate.status === "invalid" ||
      candidate.status === "valid") &&
    (candidate.source === undefined || typeof candidate.source === "string") &&
    Array.isArray(candidate.issues) &&
    candidate.issues.every(isWizardIssue) &&
    (candidate.message === undefined || typeof candidate.message === "string") &&
    (candidate.status === "valid"
      ? typeof candidate.source === "string" &&
        candidate.issues.length === 0 &&
        candidate.message === undefined
      : candidate.source === undefined)
  );
}

function isPositiveRequestId(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
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
    isCompilerWorkerSource(candidate.source) &&
    Array.isArray(candidate.relatedSources) &&
    candidate.relatedSources.every(isCompilerWorkerSource);
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
      isPositiveFinite(bounds.height)
    );
  }
  if (candidate.kind === "port") {
    const port = candidate as Partial<CompilerWorkerPortNavigationTarget>;
    return (
      typeof port.routeSceneObjectId === "string" &&
      (port.portRole === "source" || port.portRole === "target") &&
      (port.side === "east" ||
        port.side === "north" ||
        port.side === "south" ||
        port.side === "west") &&
      isNavigationPoint(port.point)
    );
  }
  if (candidate.kind === "route-label") {
    const label = candidate as Partial<CompilerWorkerRouteLabelNavigationTarget>;
    return (
      typeof label.routeSceneObjectId === "string" &&
      isNavigationPoint(label.point) &&
      isNavigationBounds(label.bounds)
    );
  }
  if (candidate.kind === "corridor") {
    const corridor = candidate as Partial<CompilerWorkerCorridorNavigationTarget>;
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
    Array.isArray(route.points) &&
    route.points.length >= 2 &&
    route.points.every(isNavigationPoint) &&
    isRoutePort(route.sourcePort, "source") &&
    isRoutePort(route.targetPort, "target") &&
    isNavigationPoint(route.labelPoint) &&
    Number.isSafeInteger(route.labelSegment) &&
    (route.labelSegment ?? -1) >= 0 &&
    (route.labelSegment ?? Number.POSITIVE_INFINITY) < route.points.length - 1 &&
    (route.corridor === undefined || isRouteCorridor(route.corridor))
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
    (port.side === "east" ||
      port.side === "north" ||
      port.side === "south" ||
      port.side === "west") &&
    isNavigationPoint(port.point)
  );
}

function isRouteCorridor(
  value: unknown,
): value is CompilerWorkerRouteCorridor {
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
    isPositiveFinite(corridor.laneSpacing)
  );
}

function isCompilerWorkerSource(
  value: unknown,
): value is CompilerWorkerSource {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<CompilerWorkerSource>;
  return (
    typeof candidate.file === "string" &&
    isPosition(candidate.start) &&
    isPosition(candidate.end) &&
    candidate.start.offset <= candidate.end.offset
  );
}

function isPositiveFinite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isCompletionCandidate(
  value: unknown,
): value is CompletionWorkerCandidate {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<CompletionWorkerCandidate>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.label === "string" &&
    (candidate.kind === "keyword" ||
      candidate.kind === "property" ||
      candidate.kind === "reference" ||
      candidate.kind === "value") &&
    typeof candidate.detail === "string" &&
    (candidate.documentation === undefined ||
      typeof candidate.documentation === "string") &&
    isCompletionEdit(candidate.edit)
  );
}

function isCompletionEdit(
  value: unknown,
): value is CompletionWorkerCandidate["edit"] {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const edit = value as Partial<CompletionWorkerCandidate["edit"]>;
  return (
    typeof edit.text === "string" &&
    typeof edit.range === "object" &&
    edit.range !== null &&
    isPosition(edit.range.start) &&
    isPosition(edit.range.end)
  );
}

function isHighlightSpan(value: unknown): value is HighlightWorkerSpan {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const span = value as Partial<HighlightWorkerSpan>;
  return (
    (span.kind === "comment" ||
      span.kind === "identifier" ||
      span.kind === "keyword" ||
      span.kind === "number" ||
      span.kind === "operator" ||
      span.kind === "string") &&
    typeof span.range === "object" &&
    span.range !== null &&
    isPosition(span.range.start) &&
    isPosition(span.range.end) &&
    span.range.start.offset < span.range.end.offset &&
    span.range.start.line === span.range.end.line
  );
}

function isPosition(value: unknown): value is CompilerWorkerPosition {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const position = value as Partial<CompilerWorkerPosition>;
  return (
    Number.isSafeInteger(position.offset) &&
    (position.offset ?? -1) >= 0 &&
    Number.isSafeInteger(position.line) &&
    (position.line ?? -1) >= 0 &&
    Number.isSafeInteger(position.column) &&
    (position.column ?? -1) >= 0
  );
}

function isWizardAnswers(
  value: unknown,
): value is C4mlSystemContextWizardAnswers {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const answers = value as Partial<C4mlSystemContextWizardAnswers>;
  return (
    (answers.viewKind === "system-context" ||
      answers.viewKind === "container") &&
    typeof answers.personId === "string" &&
    typeof answers.personName === "string" &&
    typeof answers.personResponsibility === "string" &&
    (answers.personClassification === "external" ||
      answers.personClassification === "internal") &&
    typeof answers.systemId === "string" &&
    typeof answers.systemName === "string" &&
    typeof answers.systemResponsibility === "string" &&
    (answers.systemClassification === "external" ||
      answers.systemClassification === "internal") &&
    typeof answers.relationshipId === "string" &&
    typeof answers.relationshipIntent === "string" &&
    typeof answers.entryPartId === "string" &&
    Array.isArray(answers.parts) &&
    answers.parts.every(isWizardPart) &&
    Array.isArray(answers.connections) &&
    answers.connections.every(isWizardConnection) &&
    typeof answers.viewId === "string" &&
    typeof answers.viewTitle === "string" &&
    typeof answers.viewPurpose === "string" &&
    (answers.flow === "down" ||
      answers.flow === "left" ||
      answers.flow === "right" ||
      answers.flow === "up")
  );
}

function isWizardIssue(value: unknown): value is C4mlWizardIssue {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const issue = value as Partial<C4mlWizardIssue>;
  return (
    isWizardField(issue.field) &&
    (issue.code === "C4ML-WIZARD-001" ||
      issue.code === "C4ML-WIZARD-002" ||
      issue.code === "C4ML-WIZARD-003") &&
    typeof issue.message === "string"
  );
}

function isWizardField(
  value: unknown,
): value is C4mlWizardIssue["field"] {
  return (
    value === "viewKind" ||
    value === "personId" ||
    value === "personName" ||
    value === "personResponsibility" ||
    value === "personClassification" ||
    value === "systemId" ||
    value === "systemName" ||
    value === "systemResponsibility" ||
    value === "systemClassification" ||
    value === "relationshipId" ||
    value === "relationshipIntent" ||
    value === "entryPartId" ||
    value === "viewId" ||
    value === "viewTitle" ||
    value === "viewPurpose" ||
    value === "flow" ||
    (typeof value === "string" &&
      /^(?:parts|connections)\.\d+\.[A-Za-z][A-Za-z0-9]*$/u.test(value))
  );
}

function isWizardPart(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const part = value as Record<string, unknown>;
  return (
    typeof part["id"] === "string" &&
    typeof part["name"] === "string" &&
    typeof part["responsibility"] === "string" &&
    typeof part["technology"] === "string"
  );
}

function isWizardConnection(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const connection = value as Record<string, unknown>;
  return (
    typeof connection["id"] === "string" &&
    typeof connection["fromId"] === "string" &&
    typeof connection["toId"] === "string" &&
    typeof connection["intent"] === "string" &&
    typeof connection["protocol"] === "string"
  );
}
