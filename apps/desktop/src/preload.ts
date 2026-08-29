import { contextBridge, ipcRenderer } from "electron";
import {
  desktopBridgeProtocolVersion,
  desktopIpcChannels,
  isDesktopCommand,
  type C4mlDesktopApi,
  type DesktopCommand,
  type DesktopDocumentState,
  type DesktopPngExportRequest,
  type DesktopPngExportResult,
  type DesktopOpenResult,
  type DesktopOpenProjectResult,
  type DesktopPlatform,
  type DesktopSaveRequest,
  type DesktopSaveResult,
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
  openDocument: () =>
    ipcRenderer.invoke(desktopIpcChannels.openDocument) as Promise<DesktopOpenResult>,
  openProject: () =>
    ipcRenderer.invoke(desktopIpcChannels.openProject) as Promise<DesktopOpenProjectResult>,
  saveDocument: (request: DesktopSaveRequest) =>
    ipcRenderer.invoke(
      desktopIpcChannels.saveDocument,
      request,
    ) as Promise<DesktopSaveResult>,
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
});

function toDesktopPlatform(platform: NodeJS.Platform): DesktopPlatform {
  if (platform === "darwin" || platform === "win32") {
    return platform;
  }
  return "linux";
}

contextBridge.exposeInMainWorld("c4mlDesktop", api);
