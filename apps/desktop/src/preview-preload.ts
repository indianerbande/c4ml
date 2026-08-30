import { contextBridge, ipcRenderer } from "electron";
import {
  desktopBridgeProtocolVersion,
  previewIpcChannels,
  isDesktopPreviewProjection,
  type C4mlPreviewApi,
  type DesktopPreviewInteraction,
  type DesktopPreviewProjection,
} from "@c4ml/desktop-contract";

const api: C4mlPreviewApi = Object.freeze({
  protocolVersion: desktopBridgeProtocolVersion,
  requestProjection: () =>
    ipcRenderer.invoke(previewIpcChannels.projection) as Promise<
      DesktopPreviewProjection | undefined
    >,
  sendInteraction: (interaction: DesktopPreviewInteraction) => {
    ipcRenderer.send(previewIpcChannels.interaction, interaction);
  },
  onProjection: (listener: (projection: DesktopPreviewProjection) => void) => {
    const handler = (_event: unknown, value: unknown): void => {
      if (isDesktopPreviewProjection(value)) {
        listener(value);
      }
    };
    ipcRenderer.on(previewIpcChannels.projectionChanged, handler);
    return () =>
      ipcRenderer.removeListener(
        previewIpcChannels.projectionChanged,
        handler,
      );
  },
});

contextBridge.exposeInMainWorld("c4mlPreview", api);
