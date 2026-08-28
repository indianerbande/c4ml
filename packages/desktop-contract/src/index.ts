export const desktopBridgeProtocolVersion = 1 as const;

export const desktopIpcChannels = {
  command: "c4ml:desktop:command",
  openDocument: "c4ml:desktop:open-document",
  saveDocument: "c4ml:desktop:save-document",
  setDocumentState: "c4ml:desktop:set-document-state",
} as const;

export const maxDesktopSourceBytes = 8 * 1024 * 1024;

export type DesktopPlatform = "darwin" | "linux" | "win32";
export type DesktopCommand =
  | "open-document"
  | "open-settings"
  | "save-as-document"
  | "save-document";
export type DesktopSaveMode = "save" | "save-as";

export interface DesktopSourceDocument {
  readonly handle: string;
  readonly displayName: string;
  readonly source: string;
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

export interface DesktopOperationFailure {
  readonly status: "failed";
  readonly code:
    | "C4ML-DESKTOP-FILE-001"
    | "C4ML-DESKTOP-FILE-002"
    | "C4ML-DESKTOP-IPC-001";
  readonly message: string;
}

export type DesktopOpenResult =
  | { readonly status: "canceled" }
  | { readonly status: "opened"; readonly document: DesktopSourceDocument }
  | DesktopOperationFailure;

export type DesktopSaveResult =
  | { readonly status: "canceled" }
  | {
      readonly status: "saved";
      readonly handle: string;
      readonly displayName: string;
    }
  | DesktopOperationFailure;

export interface C4mlDesktopApi {
  readonly protocolVersion: typeof desktopBridgeProtocolVersion;
  readonly platform: DesktopPlatform;
  openDocument(): Promise<DesktopOpenResult>;
  saveDocument(request: DesktopSaveRequest): Promise<DesktopSaveResult>;
  setDocumentState(state: DesktopDocumentState): void;
  onCommand(listener: (command: DesktopCommand) => void): () => void;
}

export function isDesktopCommand(value: unknown): value is DesktopCommand {
  return (
    value === "open-document" ||
    value === "open-settings" ||
    value === "save-document" ||
    value === "save-as-document"
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
    typeof value.openDocument === "function" &&
    typeof value.saveDocument === "function" &&
    typeof value.setDocumentState === "function" &&
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
