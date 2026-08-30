export const desktopBridgeProtocolVersion = 12 as const;

export const desktopIpcChannels = {
  command: "c4ml:desktop:command",
  exportPng: "c4ml:desktop:export-png",
  openDocument: "c4ml:desktop:open-document",
  openProject: "c4ml:desktop:open-project",
  openPreviewWindow: "c4ml:desktop:open-preview-window",
  closePreviewWindow: "c4ml:desktop:close-preview-window",
  previewWindowState: "c4ml:desktop:preview-window-state",
  saveDocument: "c4ml:desktop:save-document",
  sourceControl: "c4ml:desktop:source-control",
  setDocumentState: "c4ml:desktop:set-document-state",
  setUiLanguage: "c4ml:desktop:set-ui-language",
} as const;

export const previewIpcChannels = {
  interaction: "c4ml:desktop:preview-interaction",
  projection: "c4ml:desktop:preview-projection",
  projectionChanged: "c4ml:desktop:preview-projection-changed",
} as const;

export const maxDesktopSourceBytes = 8 * 1024 * 1024;
export const maxDesktopSvgBytes = 16 * 1024 * 1024;
export const maxDesktopPreviewTargets = 100_000;

export type DesktopPlatform = "darwin" | "linux" | "win32";
export type DesktopUiLanguage = "en" | "de";
export type DesktopCommand =
  | "export-png"
  | "open-document"
  | "open-project"
  | "open-preview-window"
  | "open-settings"
  | "save-all-documents"
  | "save-as-document"
  | "save-document"
  | "toggle-preview-focus";
export type DesktopSaveMode = "save" | "save-as";

export interface DesktopSourceDocument {
  readonly handle: string;
  readonly displayName: string;
  readonly source: string;
}

export interface DesktopProjectDocument extends DesktopSourceDocument {
  readonly uri: string;
}

export interface DesktopProjectPolicyResource {
  readonly uri: string;
  readonly source: string;
}

export interface DesktopProjectObservationResource {
  readonly uri: string;
  readonly source: string;
}

export interface DesktopProjectGlossaryResource {
  readonly uri: string;
  readonly source: string;
}

export interface DesktopProjectNarrativeResource {
  readonly uri: string;
  readonly source: string;
}

export interface DesktopProjectPublicationResource {
  readonly uri: string;
  readonly source: string;
}

export interface DesktopSourceProject {
  readonly id: string;
  readonly name?: string;
  readonly description?: string;
  readonly documents: readonly DesktopProjectDocument[];
  readonly policy?: DesktopProjectPolicyResource;
  readonly observations?: DesktopProjectObservationResource;
  readonly glossary?: DesktopProjectGlossaryResource;
  readonly narratives?: readonly DesktopProjectNarrativeResource[];
  readonly publication?: DesktopProjectPublicationResource;
}

export interface DesktopSaveRequest {
  readonly handle?: string;
  readonly suggestedName: string;
  readonly source: string;
  readonly mode: DesktopSaveMode;
}

export interface DesktopDocumentState {
  readonly handle?: string;
  readonly displayName: string;
  readonly dirty: boolean;
}

export type DesktopSourceControlAction =
  | "commit"
  | "push"
  | "refresh"
  | "stage"
  | "stage-all"
  | "unstage"
  | "unstage-all";

export type DesktopSourceControlFileStatus =
  | "added"
  | "conflicted"
  | "copied"
  | "deleted"
  | "modified"
  | "renamed"
  | "type-changed"
  | "untracked";

export interface DesktopSourceControlChange {
  readonly path: string;
  readonly originalPath?: string;
  readonly indexStatus?: DesktopSourceControlFileStatus;
  readonly workingTreeStatus?: DesktopSourceControlFileStatus;
}

export interface DesktopSourceControlSnapshot {
  readonly repositoryName: string;
  readonly branch: string | undefined;
  readonly detachedHead: string | undefined;
  readonly upstream: string | undefined;
  readonly ahead: number;
  readonly behind: number;
  readonly remotes: readonly string[];
  readonly changes: readonly DesktopSourceControlChange[];
}

export interface DesktopSourceControlRequest {
  readonly handle: string;
  readonly action: DesktopSourceControlAction;
  readonly paths?: readonly string[];
  readonly message?: string;
}

export type DesktopSourceControlResult =
  | {
      readonly status: "ok";
      readonly snapshot: DesktopSourceControlSnapshot;
    }
  | DesktopOperationFailure;

export interface DesktopPngExportRequest {
  readonly scale: number;
  readonly suggestedName: string;
  readonly svg: string;
}

export interface DesktopPreviewPoint {
  readonly x: number;
  readonly y: number;
}

export interface DesktopPreviewBounds extends DesktopPreviewPoint {
  readonly width: number;
  readonly height: number;
}

export type DesktopPreviewNavigationTarget =
  | {
      readonly kind: "node";
      readonly sceneObjectId: string;
      readonly label: string;
      readonly nodeRole: "boundary" | "element";
      readonly bounds: DesktopPreviewBounds;
    }
  | {
      readonly kind: "route";
      readonly sceneObjectId: string;
      readonly label: string;
      readonly points: readonly DesktopPreviewPoint[];
    }
  | {
      readonly kind: "port";
      readonly sceneObjectId: string;
      readonly label: string;
      readonly point: DesktopPreviewPoint;
    }
  | {
      readonly kind: "route-label";
      readonly sceneObjectId: string;
      readonly label: string;
      readonly bounds: DesktopPreviewBounds;
    }
  | {
      readonly kind: "corridor";
      readonly sceneObjectId: string;
      readonly label: string;
      readonly points: readonly [DesktopPreviewPoint, DesktopPreviewPoint];
    };

export interface DesktopPreviewProjection {
  readonly version: 1;
  readonly revision: number;
  readonly compilerPhase:
    | "compiling"
    | "failed"
    | "idle"
    | "invalid"
    | "valid";
  readonly statusLabel: string;
  readonly view: { readonly id: string; readonly title: string } | undefined;
  readonly svg: string | undefined;
  readonly navigation:
    | {
        readonly width: number;
        readonly height: number;
        readonly targets: readonly DesktopPreviewNavigationTarget[];
      }
    | undefined;
  readonly selectedSceneObjectId: string | undefined;
  readonly selectionLabel: string | undefined;
  readonly zoom: number;
  readonly routeDebugEnabled: boolean;
  readonly stale: boolean;
  readonly presentation: {
    readonly language: DesktopUiLanguage;
    readonly colorScheme: "dark" | "light";
    readonly colorPalette:
      | "blue"
      | "gray"
      | "green"
      | "orange"
      | "red"
      | "turquoise"
      | "violet"
      | "yellow";
    readonly interfaceFontSize: number;
  };
}

export interface DesktopPreviewWindowBounds {
  readonly x?: number;
  readonly y?: number;
  readonly width: number;
  readonly height: number;
}

export interface DesktopOpenPreviewRequest {
  readonly projection: DesktopPreviewProjection;
  readonly bounds?: DesktopPreviewWindowBounds;
}

export type DesktopOpenPreviewResult =
  | { readonly status: "opened" }
  | DesktopOperationFailure;

export interface DesktopPreviewWindowState {
  readonly open: boolean;
  readonly bounds: DesktopPreviewWindowBounds | undefined;
}

export type DesktopPreviewInteraction =
  | {
      readonly version: 1;
      readonly type: "select";
      readonly sceneObjectId: string | undefined;
    }
  | {
      readonly version: 1;
      readonly type:
        | "fit"
        | "redock"
        | "toggle-route-debug"
        | "zoom-in"
        | "zoom-out";
    };

export interface DesktopOperationFailure {
  readonly status: "failed";
  readonly code:
    | "C4ML-DESKTOP-FILE-001"
    | "C4ML-DESKTOP-FILE-002"
    | "C4ML-DESKTOP-EXPORT-001"
    | "C4ML-DESKTOP-EXPORT-002"
    | "C4ML-DESKTOP-GIT-001"
    | "C4ML-DESKTOP-GIT-002"
    | "C4ML-DESKTOP-IPC-001";
  readonly message: string;
}

export type DesktopOpenResult =
  | { readonly status: "canceled" }
  | { readonly status: "opened"; readonly document: DesktopSourceDocument }
  | DesktopOperationFailure;

export type DesktopOpenProjectResult =
  | { readonly status: "canceled" }
  | { readonly status: "opened"; readonly project: DesktopSourceProject }
  | DesktopOperationFailure;

export type DesktopSaveResult =
  | { readonly status: "canceled" }
  | {
      readonly status: "saved";
      readonly handle: string;
      readonly displayName: string;
    }
  | DesktopOperationFailure;

export type DesktopPngExportResult =
  | { readonly status: "canceled" }
  | {
      readonly status: "exported";
      readonly displayName: string;
      readonly width: number;
      readonly height: number;
    }
  | DesktopOperationFailure;

export interface C4mlDesktopApi {
  readonly protocolVersion: typeof desktopBridgeProtocolVersion;
  readonly platform: DesktopPlatform;
  exportPng(request: DesktopPngExportRequest): Promise<DesktopPngExportResult>;
  openDocument(): Promise<DesktopOpenResult>;
  openProject(): Promise<DesktopOpenProjectResult>;
  openPreviewWindow(
    request: DesktopOpenPreviewRequest,
  ): Promise<DesktopOpenPreviewResult>;
  getPreviewWindowState(): Promise<DesktopPreviewWindowState>;
  closePreviewWindow(): void;
  updatePreviewProjection(projection: DesktopPreviewProjection): void;
  saveDocument(request: DesktopSaveRequest): Promise<DesktopSaveResult>;
  sourceControl(
    request: DesktopSourceControlRequest,
  ): Promise<DesktopSourceControlResult>;
  setDocumentState(state: DesktopDocumentState): void;
  setUiLanguage(language: DesktopUiLanguage): void;
  onCommand(listener: (command: DesktopCommand) => void): () => void;
  onPreviewInteraction(
    listener: (interaction: DesktopPreviewInteraction) => void,
  ): () => void;
  onPreviewWindowState(
    listener: (state: DesktopPreviewWindowState) => void,
  ): () => void;
}

export interface C4mlPreviewApi {
  readonly protocolVersion: typeof desktopBridgeProtocolVersion;
  requestProjection(): Promise<DesktopPreviewProjection | undefined>;
  sendInteraction(interaction: DesktopPreviewInteraction): void;
  onProjection(
    listener: (projection: DesktopPreviewProjection) => void,
  ): () => void;
}

export function isDesktopCommand(value: unknown): value is DesktopCommand {
  return (
    value === "export-png" ||
    value === "open-document" ||
    value === "open-project" ||
    value === "open-preview-window" ||
    value === "open-settings" ||
    value === "save-all-documents" ||
    value === "save-document" ||
    value === "save-as-document" ||
    value === "toggle-preview-focus"
  );
}

export function isDesktopPreviewProjection(
  value: unknown,
): value is DesktopPreviewProjection {
  if (!isRecord(value)) {
    return false;
  }
  const navigation = value.navigation;
  return (
    value.version === 1 &&
    isPositiveInteger(value.revision) &&
    isPreviewCompilerPhase(value.compilerPhase) &&
    isBoundedText(value.statusLabel) &&
    (value.view === undefined || isPreviewView(value.view)) &&
    (value.svg === undefined || isBoundedSvg(value.svg)) &&
    (navigation === undefined || isPreviewNavigation(navigation)) &&
    (value.selectedSceneObjectId === undefined ||
      isBoundedText(value.selectedSceneObjectId)) &&
    (value.selectionLabel === undefined || isBoundedText(value.selectionLabel)) &&
    isPreviewZoom(value.zoom) &&
    typeof value.routeDebugEnabled === "boolean" &&
    typeof value.stale === "boolean" &&
    isPreviewPresentation(value.presentation)
  );
}

export function isDesktopOpenPreviewRequest(
  value: unknown,
): value is DesktopOpenPreviewRequest {
  return (
    isRecord(value) &&
    isDesktopPreviewProjection(value.projection) &&
    (value.bounds === undefined || isDesktopPreviewWindowBounds(value.bounds))
  );
}

export function isDesktopPreviewInteraction(
  value: unknown,
): value is DesktopPreviewInteraction {
  if (!isRecord(value) || value.version !== 1) {
    return false;
  }
  if (value.type === "select") {
    return (
      value.sceneObjectId === undefined ||
      isBoundedText(value.sceneObjectId)
    );
  }
  return (
    value.type === "fit" ||
    value.type === "redock" ||
    value.type === "toggle-route-debug" ||
    value.type === "zoom-in" ||
    value.type === "zoom-out"
  );
}

export function isDesktopPreviewWindowBounds(
  value: unknown,
): value is DesktopPreviewWindowBounds {
  return (
    isRecord(value) &&
    (value.x === undefined || isFiniteNumber(value.x)) &&
    (value.y === undefined || isFiniteNumber(value.y)) &&
    isFiniteNumber(value.width) &&
    value.width >= 640 &&
    value.width <= 10_000 &&
    isFiniteNumber(value.height) &&
    value.height >= 480 &&
    value.height <= 10_000
  );
}

export function isDesktopPreviewWindowState(
  value: unknown,
): value is DesktopPreviewWindowState {
  return (
    isRecord(value) &&
    typeof value.open === "boolean" &&
    (value.bounds === undefined || isDesktopPreviewWindowBounds(value.bounds))
  );
}

export function isDesktopUiLanguage(
  value: unknown,
): value is DesktopUiLanguage {
  return value === "en" || value === "de";
}

export function isDesktopPngExportRequest(
  value: unknown,
): value is DesktopPngExportRequest {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isNonEmptyString(value.suggestedName) &&
    typeof value.svg === "string" &&
    startsWithSvgDocument(value.svg) &&
    value.svg.length <= maxDesktopSvgBytes &&
    typeof value.scale === "number" &&
    Number.isFinite(value.scale) &&
    value.scale >= 0.25 &&
    value.scale <= 8
  );
}

export function isDesktopSaveRequest(
  value: unknown,
): value is DesktopSaveRequest {
  if (!isRecord(value)) {
    return false;
  }
  return (
    (value.handle === undefined || isNonEmptyString(value.handle)) &&
    isNonEmptyString(value.suggestedName) &&
    typeof value.source === "string" &&
    (value.mode === "save" || value.mode === "save-as")
  );
}

export function isDesktopSourceControlRequest(
  value: unknown,
): value is DesktopSourceControlRequest {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.handle) ||
    !isSourceControlAction(value.action)
  ) {
    return false;
  }
  const pathsValid =
    value.paths === undefined ||
    (Array.isArray(value.paths) &&
      value.paths.length > 0 &&
      value.paths.length <= 5_000 &&
      value.paths.every(isSafeRepositoryRelativePath));
  const messageValid =
    value.message === undefined ||
    (typeof value.message === "string" && value.message.length <= 4096);
  if (!pathsValid || !messageValid) return false;
  if (value.action === "stage" || value.action === "unstage") {
    return value.paths !== undefined && value.message === undefined;
  }
  if (value.action === "commit") {
    return (
      value.paths === undefined &&
      typeof value.message === "string" &&
      value.message.trim().length > 0
    );
  }
  return value.paths === undefined && value.message === undefined;
}

export function isDesktopSourceControlSnapshot(
  value: unknown,
): value is DesktopSourceControlSnapshot {
  return (
    isRecord(value) &&
    isBoundedText(value.repositoryName) &&
    (value.branch === undefined || isBoundedText(value.branch)) &&
    (value.detachedHead === undefined || isBoundedText(value.detachedHead)) &&
    (value.upstream === undefined || isBoundedText(value.upstream)) &&
    isNonNegativeInteger(value.ahead) &&
    isNonNegativeInteger(value.behind) &&
    Array.isArray(value.remotes) &&
    value.remotes.length <= 100 &&
    value.remotes.every(isBoundedText) &&
    Array.isArray(value.changes) &&
    value.changes.length <= 5_000 &&
    value.changes.every(isDesktopSourceControlChange)
  );
}

export function isDesktopDocumentState(
  value: unknown,
): value is DesktopDocumentState {
  if (!isRecord(value)) {
    return false;
  }
  return (
    (value.handle === undefined || isNonEmptyString(value.handle)) &&
    isNonEmptyString(value.displayName) &&
    typeof value.dirty === "boolean"
  );
}

export function isC4mlDesktopApi(value: unknown): value is C4mlDesktopApi {
  if (!isRecord(value)) {
    return false;
  }
  return (
    value.protocolVersion === desktopBridgeProtocolVersion &&
    isDesktopPlatform(value.platform) &&
    typeof value.exportPng === "function" &&
    typeof value.openDocument === "function" &&
    typeof value.openProject === "function" &&
    typeof value.openPreviewWindow === "function" &&
    typeof value.getPreviewWindowState === "function" &&
    typeof value.closePreviewWindow === "function" &&
    typeof value.updatePreviewProjection === "function" &&
    typeof value.saveDocument === "function" &&
    typeof value.sourceControl === "function" &&
    typeof value.setDocumentState === "function" &&
    typeof value.setUiLanguage === "function" &&
    typeof value.onCommand === "function" &&
    typeof value.onPreviewInteraction === "function" &&
    typeof value.onPreviewWindowState === "function"
  );
}

export function isC4mlPreviewApi(value: unknown): value is C4mlPreviewApi {
  return (
    isRecord(value) &&
    value.protocolVersion === desktopBridgeProtocolVersion &&
    typeof value.requestProjection === "function" &&
    typeof value.sendInteraction === "function" &&
    typeof value.onProjection === "function" &&
    value.closePreviewWindow === undefined &&
    value.getPreviewWindowState === undefined &&
    value.openDocument === undefined &&
    value.openPreviewWindow === undefined &&
    value.openProject === undefined &&
    value.saveDocument === undefined &&
    value.sourceControl === undefined &&
    value.exportPng === undefined &&
    value.setDocumentState === undefined &&
    value.setUiLanguage === undefined &&
    value.updatePreviewProjection === undefined
  );
}

function isDesktopPlatform(value: unknown): value is DesktopPlatform {
  return value === "darwin" || value === "linux" || value === "win32";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isBoundedText(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 4096;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isSourceControlAction(value: unknown): value is DesktopSourceControlAction {
  return (
    value === "commit" ||
    value === "push" ||
    value === "refresh" ||
    value === "stage" ||
    value === "stage-all" ||
    value === "unstage" ||
    value === "unstage-all"
  );
}

function isSafeRepositoryRelativePath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 4096 &&
    !value.includes("\0") &&
    !value.startsWith("/") &&
    !value.split("/").includes("..")
  );
}

function isDesktopSourceControlChange(value: unknown): boolean {
  return (
    isRecord(value) &&
    isSafeRepositoryRelativePath(value.path) &&
    (value.originalPath === undefined ||
      isSafeRepositoryRelativePath(value.originalPath)) &&
    (value.indexStatus === undefined || isSourceControlFileStatus(value.indexStatus)) &&
    (value.workingTreeStatus === undefined ||
      isSourceControlFileStatus(value.workingTreeStatus)) &&
    (value.indexStatus !== undefined || value.workingTreeStatus !== undefined)
  );
}

function isSourceControlFileStatus(value: unknown): boolean {
  return (
    value === "added" ||
    value === "conflicted" ||
    value === "copied" ||
    value === "deleted" ||
    value === "modified" ||
    value === "renamed" ||
    value === "type-changed" ||
    value === "untracked"
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPreviewZoom(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0.4 && value <= 2.5;
}

function isBoundedSvg(value: unknown): value is string {
  return (
    typeof value === "string" &&
    startsWithSvgDocument(value) &&
    value.length <= maxDesktopSvgBytes
  );
}

function isPreviewCompilerPhase(value: unknown): boolean {
  return (
    value === "compiling" ||
    value === "failed" ||
    value === "idle" ||
    value === "invalid" ||
    value === "valid"
  );
}

function startsWithSvgDocument(value: string): boolean {
  const trimmed = value.trimStart();
  if (trimmed.startsWith("<svg")) {
    return true;
  }
  if (!trimmed.startsWith("<?xml")) {
    return false;
  }
  const declarationEnd = trimmed.indexOf("?>");
  return (
    declarationEnd >= 0 &&
    trimmed.slice(declarationEnd + 2).trimStart().startsWith("<svg")
  );
}

function isPreviewView(value: unknown): boolean {
  return (
    isRecord(value) &&
    isBoundedText(value.id) &&
    isBoundedText(value.title)
  );
}

function isPreviewPresentation(value: unknown): boolean {
  return (
    isRecord(value) &&
    isDesktopUiLanguage(value.language) &&
    (value.colorScheme === "dark" || value.colorScheme === "light") &&
    (value.colorPalette === "blue" ||
      value.colorPalette === "gray" ||
      value.colorPalette === "green" ||
      value.colorPalette === "orange" ||
      value.colorPalette === "red" ||
      value.colorPalette === "turquoise" ||
      value.colorPalette === "violet" ||
      value.colorPalette === "yellow") &&
    isFiniteNumber(value.interfaceFontSize) &&
    value.interfaceFontSize >= 9 &&
    value.interfaceFontSize <= 16
  );
}

function isPreviewNavigation(value: unknown): boolean {
  return (
    isRecord(value) &&
    isFiniteNumber(value.width) &&
    value.width > 0 &&
    isFiniteNumber(value.height) &&
    value.height > 0 &&
    Array.isArray(value.targets) &&
    value.targets.length <= maxDesktopPreviewTargets &&
    value.targets.every(isDesktopPreviewNavigationTarget)
  );
}

export function isDesktopPreviewNavigationTarget(
  value: unknown,
): value is DesktopPreviewNavigationTarget {
  if (
    !isRecord(value) ||
    !isBoundedText(value.sceneObjectId) ||
    !isBoundedText(value.label)
  ) {
    return false;
  }
  switch (value.kind) {
    case "node":
      return (
        (value.nodeRole === "boundary" || value.nodeRole === "element") &&
        isPreviewBounds(value.bounds)
      );
    case "route":
      return (
        Array.isArray(value.points) &&
        value.points.length >= 2 &&
        value.points.every(isPreviewPoint)
      );
    case "port":
      return isPreviewPoint(value.point);
    case "route-label":
      return isPreviewBounds(value.bounds);
    case "corridor":
      return (
        Array.isArray(value.points) &&
        value.points.length === 2 &&
        value.points.every(isPreviewPoint)
      );
    default:
      return false;
  }
}

function isPreviewPoint(value: unknown): boolean {
  return (
    isRecord(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y)
  );
}

function isPreviewBounds(value: unknown): boolean {
  return (
    isPreviewPoint(value) &&
    isRecord(value) &&
    isFiniteNumber(value.width) &&
    value.width >= 0 &&
    isFiniteNumber(value.height) &&
    value.height >= 0
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
