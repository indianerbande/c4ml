import { contextBridge, ipcRenderer } from "electron";
import {
  desktopBridgeProtocolVersion,
  desktopIpcChannels,
  isDesktopCommand,
  type C4mlDesktopApi,
  type DesktopCommand,
  type DesktopDocumentState,
  type DesktopOpenResult,
  type DesktopPlatform,
  type DesktopSaveRequest,
  type DesktopSaveResult,
} from "@c4ml/desktop-contract";

const api: C4mlDesktopApi = Object.freeze({
  protocolVersion: desktopBridgeProtocolVersion,
  platform: toDesktopPlatform(process.platform),
  openDocument: () =>
    ipcRenderer.invoke(desktopIpcChannels.openDocument) as Promise<DesktopOpenResult>,
  saveDocument: (request: DesktopSaveRequest) =>
    ipcRenderer.invoke(
      desktopIpcChannels.saveDocument,
      request,
    ) as Promise<DesktopSaveResult>,
  setDocumentState: (state: DesktopDocumentState) => {
    ipcRenderer.send(desktopIpcChannels.setDocumentState, state);
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
