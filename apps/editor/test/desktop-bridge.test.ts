import { describe, expect, it } from "vitest";

import { desktopBridgeProtocolVersion } from "@c4ml/desktop-contract";

import { resolveC4mlDesktopApi } from "../src/app/desktop-bridge.js";

describe("editor desktop bridge", () => {
  it("uses only a complete, current preload bridge", () => {
    const api = {
      protocolVersion: desktopBridgeProtocolVersion,
      platform: "win32",
      openDocument: async () => ({ status: "canceled" as const }),
      saveDocument: async () => ({ status: "canceled" as const }),
      setDocumentState: () => undefined,
      onCommand: () => () => undefined,
    };

    expect(resolveC4mlDesktopApi({ c4mlDesktop: api })).toBe(api);
    expect(
      resolveC4mlDesktopApi({
        c4mlDesktop: { ...api, protocolVersion: 2 },
      }),
    ).toBeUndefined();
    expect(resolveC4mlDesktopApi({})).toBeUndefined();
  });
});
