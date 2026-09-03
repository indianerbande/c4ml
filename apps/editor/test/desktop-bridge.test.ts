import { describe, expect, it } from "vitest";

import { desktopBridgeProtocolVersion } from "@c4ml/desktop-contract";

import {
  resolveC4mlDesktopApi,
  resolveC4mlPreviewApi,
} from "../src/app/desktop-bridge.js";

describe("editor desktop bridge", () => {
  it("uses only a complete, current preload bridge", () => {
    const api = {
      protocolVersion: desktopBridgeProtocolVersion,
      platform: "win32",
      exportPng: async () => ({ status: "canceled" as const }),
      exportSvg: async () => ({ status: "canceled" as const }),
      claimPendingDocument: async () => undefined,
      openDocument: async () => ({ status: "canceled" as const }),
      openProject: async () => ({ status: "canceled" as const }),
      openPreviewWindow: async () => ({ status: "opened" as const }),
      getPreviewWindowState: async () => ({ open: false, bounds: undefined }),
      closePreviewWindow: () => undefined,
      updatePreviewProjection: () => undefined,
      saveDocument: async () => ({ status: "canceled" as const }),
      sourceControl: async () => ({
        status: "ok" as const,
        snapshot: {
          repositoryName: "garden",
          branch: "main",
          detachedHead: undefined,
          upstream: undefined,
          ahead: 0,
          behind: 0,
          remotes: [],
          changes: [],
        },
      }),
      setDocumentState: () => undefined,
      setUiLanguage: () => undefined,
      onCommand: () => () => undefined,
      onPreviewInteraction: () => () => undefined,
      onPreviewWindowState: () => () => undefined,
    };

    expect(resolveC4mlDesktopApi({ c4mlDesktop: api })).toBe(api);
    expect(
      resolveC4mlDesktopApi({
        c4mlDesktop: { ...api, protocolVersion: 999 },
      }),
    ).toBeUndefined();
    expect(resolveC4mlDesktopApi({})).toBeUndefined();
  });

  it("resolves the separate projection-only preview bridge", () => {
    const api = {
      protocolVersion: desktopBridgeProtocolVersion,
      requestProjection: async () => undefined,
      sendInteraction: () => undefined,
      onProjection: () => () => undefined,
    };

    expect(resolveC4mlPreviewApi({ c4mlPreview: api })).toBe(api);
    expect(
      resolveC4mlPreviewApi({
        c4mlPreview: { ...api, updatePreviewProjection: () => undefined },
      }),
    ).toBeUndefined();
    expect(resolveC4mlPreviewApi({})).toBeUndefined();
  });
});
