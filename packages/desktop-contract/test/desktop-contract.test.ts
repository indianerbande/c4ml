import { describe, expect, it } from "vitest";

import {
  desktopBridgeProtocolVersion,
  isC4mlDesktopApi,
  isDesktopCommand,
  isDesktopDocumentState,
  isDesktopSaveRequest,
} from "../src/index.js";

describe("desktop bridge contract", () => {
  it("accepts only the versioned, callable preload surface", () => {
    const api = {
      protocolVersion: desktopBridgeProtocolVersion,
      platform: "darwin",
      openDocument: async () => ({ status: "canceled" as const }),
      saveDocument: async () => ({ status: "canceled" as const }),
      setDocumentState: () => undefined,
      onCommand: () => () => undefined,
    };

    expect(isC4mlDesktopApi(api)).toBe(true);
    expect(isC4mlDesktopApi({ ...api, protocolVersion: 2 })).toBe(false);
    expect(isC4mlDesktopApi({ ...api, openDocument: undefined })).toBe(false);
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

  it("accepts only the four owned desktop commands", () => {
    expect(isDesktopCommand("open-document")).toBe(true);
    expect(isDesktopCommand("open-settings")).toBe(true);
    expect(isDesktopCommand("save-document")).toBe(true);
    expect(isDesktopCommand("save-as-document")).toBe(true);
    expect(isDesktopCommand("open-terminal")).toBe(false);
  });
});
