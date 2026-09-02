import { describe, expect, it } from "vitest";

import {
  desktopBridgeProtocolVersion,
  isC4mlDesktopApi,
  isC4mlPreviewApi,
  isDesktopCommand,
  isDesktopDocumentState,
  isDesktopOpenPreviewRequest,
  isDesktopPngExportRequest,
  isDesktopSvgExportRequest,
  isDesktopPreviewInteraction,
  isDesktopPreviewProjection,
  isDesktopPreviewWindowState,
  isDesktopSaveRequest,
  isDesktopSourceControlRequest,
  isDesktopSourceControlSnapshot,
  isDesktopUiLanguage,
} from "../src/index.js";

describe("desktop bridge contract", () => {
  it("accepts only the versioned, callable preload surface", () => {
    const api = {
      protocolVersion: desktopBridgeProtocolVersion,
      platform: "darwin",
      exportPng: async () => ({ status: "canceled" as const }),
      exportSvg: async () => ({ status: "canceled" as const }),
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
          upstream: "origin/main",
          ahead: 0,
          behind: 0,
          remotes: ["origin"],
          changes: [],
        },
      }),
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
        hasOpenDocument: true,
        projectMode: false,
      }),
    ).toBe(true);
    expect(
      isDesktopDocumentState({
        displayName: "",
        dirty: true,
        hasOpenDocument: true,
        projectMode: false,
      }),
    ).toBe(false);
    expect(
      isDesktopDocumentState({
        displayName: "architecture.c4ml",
        dirty: true,
      }),
    ).toBe(false);
  });

  it("accepts only bounded source-control actions and repository snapshots", () => {
    expect(
      isDesktopSourceControlRequest({ handle: "opaque", action: "refresh" }),
    ).toBe(true);
    expect(
      isDesktopSourceControlRequest({
        handle: "opaque",
        action: "stage",
        paths: ["architecture/model.c4ml"],
      }),
    ).toBe(true);
    expect(
      isDesktopSourceControlRequest({
        handle: "opaque",
        action: "commit",
        message: "Describe architecture",
      }),
    ).toBe(true);
    expect(
      isDesktopSourceControlRequest({
        handle: "opaque",
        action: "stage",
        paths: ["../outside"],
      }),
    ).toBe(false);
    expect(
      isDesktopSourceControlRequest({
        handle: "opaque",
        action: "commit",
        message: "   ",
      }),
    ).toBe(false);
    expect(
      isDesktopSourceControlSnapshot({
        repositoryName: "garden",
        branch: "main",
        detachedHead: undefined,
        upstream: "origin/main",
        ahead: 2,
        behind: 1,
        remotes: ["origin"],
        changes: [
          {
            path: "architecture.c4ml",
            indexStatus: "modified",
            workingTreeStatus: "modified",
          },
        ],
      }),
    ).toBe(true);
  });

  it("accepts only bounded SVG export payloads and reviewed scales", () => {
    expect(
      isDesktopSvgExportRequest({
        suggestedName: "context.svg",
        svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
      }),
    ).toBe(true);
    expect(
      isDesktopSvgExportRequest({
        suggestedName: "context.svg",
        svg: "<html></html>",
      }),
    ).toBe(false);
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
    expect(isDesktopCommand("close-workspace")).toBe(true);
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
