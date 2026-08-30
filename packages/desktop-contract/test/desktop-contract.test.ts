import { describe, expect, it } from "vitest";

import {
  desktopBridgeProtocolVersion,
  isC4mlDesktopApi,
  isC4mlPreviewApi,
  isDesktopCommand,
  isDesktopDocumentState,
  isDesktopOpenPreviewRequest,
  isDesktopPngExportRequest,
  isDesktopPreviewInteraction,
  isDesktopPreviewProjection,
  isDesktopPreviewWindowState,
  isDesktopSaveRequest,
  isDesktopUiLanguage,
} from "../src/index.js";

describe("desktop bridge contract", () => {
  it("accepts only the versioned, callable preload surface", () => {
    const api = {
      protocolVersion: desktopBridgeProtocolVersion,
      platform: "darwin",
      exportPng: async () => ({ status: "canceled" as const }),
      openDocument: async () => ({ status: "canceled" as const }),
      openProject: async () => ({ status: "canceled" as const }),
      openPreviewWindow: async () => ({ status: "opened" as const }),
      getPreviewWindowState: async () => ({ open: false, bounds: undefined }),
      closePreviewWindow: () => undefined,
      updatePreviewProjection: () => undefined,
      saveDocument: async () => ({ status: "canceled" as const }),
      setDocumentState: () => undefined,
      setUiLanguage: () => undefined,
      onCommand: () => () => undefined,
      onPreviewInteraction: () => () => undefined,
      onPreviewWindowState: () => () => undefined,
    };

    expect(isC4mlDesktopApi(api)).toBe(true);
    expect(isC4mlDesktopApi({ ...api, protocolVersion: 999 })).toBe(false);
    expect(isC4mlDesktopApi({ ...api, openDocument: undefined })).toBe(false);
  });

  it("accepts only supported desktop interface languages", () => {
    expect(isDesktopUiLanguage("en")).toBe(true);
    expect(isDesktopUiLanguage("de")).toBe(true);
    expect(isDesktopUiLanguage("fr")).toBe(false);
  });

  it("keeps the detached preview bridge read-only and versioned", () => {
    const api = {
      protocolVersion: desktopBridgeProtocolVersion,
      requestProjection: async () => undefined,
      sendInteraction: () => undefined,
      onProjection: () => () => undefined,
    };
    expect(isC4mlPreviewApi(api)).toBe(true);
    expect(
      isC4mlPreviewApi({ ...api, updatePreviewProjection: () => undefined }),
    ).toBe(false);
    expect(isC4mlPreviewApi({ ...api, requestProjection: undefined })).toBe(
      false,
    );
  });

  it("rejects malformed save and document-state payloads", () => {
    expect(
      isDesktopSaveRequest({
        suggestedName: "architecture.c4ml",
        source: "model {}",
        mode: "save",
      }),
    ).toBe(true);
    expect(
      isDesktopSaveRequest({
        suggestedName: "architecture.c4ml",
        source: "model {}",
        mode: "overwrite-any-path",
      }),
    ).toBe(false);
    expect(
      isDesktopDocumentState({
        displayName: "architecture.c4ml",
        dirty: true,
      }),
    ).toBe(true);
    expect(
      isDesktopDocumentState({ displayName: "", dirty: true }),
    ).toBe(false);
  });

  it("accepts only bounded SVG export payloads and reviewed scales", () => {
    expect(
      isDesktopPngExportRequest({
        suggestedName: "context.png",
        svg: '<?xml version="1.0" encoding="UTF-8"?>\n<svg></svg>',
        scale: 2,
      }),
    ).toBe(true);
    expect(
      isDesktopPngExportRequest({
        suggestedName: "context.png",
        svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
        scale: 2,
      }),
    ).toBe(true);
    expect(
      isDesktopPngExportRequest({
        suggestedName: "context.png",
        svg: "<html></html>",
        scale: 2,
      }),
    ).toBe(false);
    expect(
      isDesktopPngExportRequest({
        suggestedName: "context.png",
        svg: "<svg></svg>",
        scale: 9,
      }),
    ).toBe(false);
  });

  it("accepts only the owned desktop commands", () => {
    expect(isDesktopCommand("export-png")).toBe(true);
    expect(isDesktopCommand("open-document")).toBe(true);
    expect(isDesktopCommand("open-project")).toBe(true);
    expect(isDesktopCommand("open-preview-window")).toBe(true);
    expect(isDesktopCommand("open-settings")).toBe(true);
    expect(isDesktopCommand("save-all-documents")).toBe(true);
    expect(isDesktopCommand("save-document")).toBe(true);
    expect(isDesktopCommand("save-as-document")).toBe(true);
    expect(isDesktopCommand("toggle-preview-focus")).toBe(true);
    expect(isDesktopCommand("open-terminal")).toBe(false);
  });

  it("validates bounded read-only preview projections and interactions", () => {
    const projection = {
      version: 1,
      revision: 3,
      compilerPhase: "valid",
      statusLabel: "Preview current",
      view: { id: "garden-context", title: "Garden Context" },
      svg: '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg"></svg>',
      navigation: {
        width: 800,
        height: 600,
        targets: [
          {
            kind: "node",
            sceneObjectId: "c4ml-node-garden",
            label: "Garden",
            nodeRole: "element",
            bounds: { x: 20, y: 30, width: 180, height: 120 },
          },
          {
            kind: "route",
            sceneObjectId: "c4ml-route-observe",
            label: "Observes",
            points: [
              { x: 200, y: 90 },
              { x: 420, y: 90 },
            ],
          },
        ],
      },
      selectedSceneObjectId: "c4ml-node-garden",
      selectionLabel: "Garden",
      zoom: 1.4,
      routeDebugEnabled: true,
      stale: false,
      presentation: {
        language: "en",
        colorScheme: "light",
        colorPalette: "blue",
        interfaceFontSize: 10,
      },
    };

    expect(isDesktopPreviewProjection(projection)).toBe(true);
    expect(
      isDesktopOpenPreviewRequest({
        projection,
        bounds: { x: 40, y: 50, width: 1100, height: 760 },
      }),
    ).toBe(true);
    expect(
      isDesktopPreviewProjection({ ...projection, zoom: 8 }),
    ).toBe(false);
    expect(
      isDesktopPreviewProjection({
        ...projection,
        navigation: {
          ...projection.navigation,
          targets: [{ kind: "route", sceneObjectId: "x", label: "x", points: [] }],
        },
      }),
    ).toBe(false);
    expect(
      isDesktopPreviewInteraction({
        version: 1,
        type: "select",
        sceneObjectId: "c4ml-node-garden",
      }),
    ).toBe(true);
    expect(
      isDesktopPreviewInteraction({ version: 1, type: "write-source" }),
    ).toBe(false);
    expect(
      isDesktopPreviewWindowState({
        open: false,
        bounds: { width: 1100, height: 760 },
      }),
    ).toBe(true);
  });
});
