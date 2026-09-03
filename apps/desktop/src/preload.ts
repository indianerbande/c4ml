import { contextBridge, ipcRenderer } from "electron";
import {
  desktopBridgeProtocolVersion,
  desktopIpcChannels,
  previewIpcChannels,
  isDesktopCommand,
  type C4mlDesktopApi,
  type DesktopCommand,
  type DesktopDocumentState,
  type DesktopPngExportRequest,
  type DesktopPngExportResult,
  type DesktopSvgExportRequest,
  type DesktopSvgExportResult,
  type DesktopOpenResult,
  type DesktopOpenProjectResult,
  type DesktopOpenPreviewRequest,
  type DesktopOpenPreviewResult,
  type DesktopPlatform,
  type DesktopPreviewInteraction,
  type DesktopPreviewProjection,
  type DesktopPreviewWindowState,
  type DesktopSaveRequest,
  type DesktopSaveResult,
  type DesktopSourceControlRequest,
  type DesktopSourceControlResult,
  type DesktopUiLanguage,
} from "@c4ml/desktop-contract";

const api: C4mlDesktopApi = Object.freeze({
  protocolVersion: desktopBridgeProtocolVersion,
  platform: toDesktopPlatform(process.platform),
  exportPng: (request: DesktopPngExportRequest) =>
    ipcRenderer.invoke(
      desktopIpcChannels.exportPng,
      request,
    ) as Promise<DesktopPngExportResult>,
  exportSvg: (request: DesktopSvgExportRequest) =>
    ipcRenderer.invoke(
      desktopIpcChannels.exportSvg,
      request,
    ) as Promise<DesktopSvgExportResult>,
  claimPendingDocument: () =>
    ipcRenderer.invoke(
      desktopIpcChannels.claimPendingDocument,
    ) as Promise<DesktopOpenResult | undefined>,
  openDocument: () =>
    ipcRenderer.invoke(desktopIpcChannels.openDocument) as Promise<DesktopOpenResult>,
  openProject: () =>
    ipcRenderer.invoke(desktopIpcChannels.openProject) as Promise<DesktopOpenProjectResult>,
  openPreviewWindow: (request: DesktopOpenPreviewRequest) =>
    ipcRenderer.invoke(
      desktopIpcChannels.openPreviewWindow,
      request,
    ) as Promise<DesktopOpenPreviewResult>,
  getPreviewWindowState: () =>
    ipcRenderer.invoke(
      desktopIpcChannels.previewWindowState,
    ) as Promise<DesktopPreviewWindowState>,
  closePreviewWindow: () => {
    ipcRenderer.send(desktopIpcChannels.closePreviewWindow);
  },
  updatePreviewProjection: (projection: DesktopPreviewProjection) => {
    ipcRenderer.send(previewIpcChannels.projectionChanged, projection);
  },
  saveDocument: (request: DesktopSaveRequest) =>
    ipcRenderer.invoke(
      desktopIpcChannels.saveDocument,
      request,
    ) as Promise<DesktopSaveResult>,
  sourceControl: (request: DesktopSourceControlRequest) =>
    ipcRenderer.invoke(
      desktopIpcChannels.sourceControl,
      request,
    ) as Promise<DesktopSourceControlResult>,
  setDocumentState: (state: DesktopDocumentState) => {
    ipcRenderer.send(desktopIpcChannels.setDocumentState, state);
  },
  setUiLanguage: (language: DesktopUiLanguage) => {
    ipcRenderer.send(desktopIpcChannels.setUiLanguage, language);
  },
  onCommand: (listener: (command: DesktopCommand) => void) => {
    const handler = (_event: unknown, value: unknown): void => {
      if (isDesktopCommand(value)) {
        listener(value);
      }
    };
    ipcRenderer.on(desktopIpcChannels.command, handler);
    return () => ipcRenderer.removeListener(desktopIpcChannels.command, handler);
  },
  onPreviewInteraction: (
    listener: (interaction: DesktopPreviewInteraction) => void,
  ) => {
    const handler = (_event: unknown, value: unknown): void => {
      listener(value as DesktopPreviewInteraction);
    };
    ipcRenderer.on(previewIpcChannels.interaction, handler);
    return () =>
      ipcRenderer.removeListener(previewIpcChannels.interaction, handler);
  },
  onPreviewWindowState: (
    listener: (state: DesktopPreviewWindowState) => void,
  ) => {
    const handler = (_event: unknown, value: unknown): void => {
      listener(value as DesktopPreviewWindowState);
    };
    ipcRenderer.on(desktopIpcChannels.previewWindowState, handler);
    return () =>
      ipcRenderer.removeListener(desktopIpcChannels.previewWindowState, handler);
  },
});

function toDesktopPlatform(platform: NodeJS.Platform): DesktopPlatform {
  if (platform === "darwin" || platform === "win32") {
    return platform;
  }
  return "linux";
}

contextBridge.exposeInMainWorld("c4mlDesktop", api);
