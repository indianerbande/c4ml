export const desktopBridgeProtocolVersion = 4 as const;

export const desktopIpcChannels = {
  command: "c4ml:desktop:command",
  exportPng: "c4ml:desktop:export-png",
  openDocument: "c4ml:desktop:open-document",
  openProject: "c4ml:desktop:open-project",
  saveDocument: "c4ml:desktop:save-document",
  setDocumentState: "c4ml:desktop:set-document-state",
  setUiLanguage: "c4ml:desktop:set-ui-language",
} as const;

export const maxDesktopSourceBytes = 8 * 1024 * 1024;
export const maxDesktopSvgBytes = 16 * 1024 * 1024;

export type DesktopPlatform = "darwin" | "linux" | "win32";
export type DesktopUiLanguage = "en" | "de";
export type DesktopCommand =
  | "export-png"
  | "open-document"
  | "open-project"
  | "open-settings"
  | "save-as-document"
  | "save-document";
export type DesktopSaveMode = "save" | "save-as";

export interface DesktopSourceDocument {
  readonly handle: string;
  readonly displayName: string;
  readonly source: string;
}

export interface DesktopProjectDocument extends DesktopSourceDocument {
  readonly uri: string;
}

export interface DesktopSourceProject {
  readonly id: string;
  readonly name?: string;
  readonly description?: string;
  readonly documents: readonly DesktopProjectDocument[];
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

export interface DesktopPngExportRequest {
  readonly scale: number;
  readonly suggestedName: string;
  readonly svg: string;
}

export interface DesktopOperationFailure {
  readonly status: "failed";
  readonly code:
    | "C4ML-DESKTOP-FILE-001"
    | "C4ML-DESKTOP-FILE-002"
    | "C4ML-DESKTOP-EXPORT-001"
    | "C4ML-DESKTOP-EXPORT-002"
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
  saveDocument(request: DesktopSaveRequest): Promise<DesktopSaveResult>;
  setDocumentState(state: DesktopDocumentState): void;
  setUiLanguage(language: DesktopUiLanguage): void;
  onCommand(listener: (command: DesktopCommand) => void): () => void;
}

export function isDesktopCommand(value: unknown): value is DesktopCommand {
  return (
    value === "export-png" ||
    value === "open-document" ||
    value === "open-project" ||
    value === "open-settings" ||
    value === "save-document" ||
    value === "save-as-document"
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
    value.svg.trimStart().startsWith("<svg") &&
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
    typeof value.saveDocument === "function" &&
    typeof value.setDocumentState === "function" &&
    typeof value.setUiLanguage === "function" &&
    typeof value.onCommand === "function"
  );
}

function isDesktopPlatform(value: unknown): value is DesktopPlatform {
  return value === "darwin" || value === "linux" || value === "win32";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
