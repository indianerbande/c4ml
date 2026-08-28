import { describe, expect, it } from "vitest";

import {
  desktopBridgeProtocolVersion,
  isC4mlDesktopApi,
  isDesktopCommand,
  isDesktopDocumentState,
  isDesktopPngExportRequest,
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
      saveDocument: async () => ({ status: "canceled" as const }),
      setDocumentState: () => undefined,
      setUiLanguage: () => undefined,
      onCommand: () => () => undefined,
    };

    expect(isC4mlDesktopApi(api)).toBe(true);
    expect(isC4mlDesktopApi({ ...api, protocolVersion: 4 })).toBe(false);
    expect(isC4mlDesktopApi({ ...api, openDocument: undefined })).toBe(false);
  });

  it("accepts only supported desktop interface languages", () => {
    expect(isDesktopUiLanguage("en")).toBe(true);
    expect(isDesktopUiLanguage("de")).toBe(true);
    expect(isDesktopUiLanguage("fr")).toBe(false);
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

  it("accepts only the five owned desktop commands", () => {
    expect(isDesktopCommand("export-png")).toBe(true);
    expect(isDesktopCommand("open-document")).toBe(true);
    expect(isDesktopCommand("open-settings")).toBe(true);
    expect(isDesktopCommand("save-document")).toBe(true);
    expect(isDesktopCommand("save-as-document")).toBe(true);
    expect(isDesktopCommand("open-terminal")).toBe(false);
  });
});
