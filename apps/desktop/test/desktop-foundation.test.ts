import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  DesktopDocumentRegistry,
  ensureC4mlExtension,
  safeSuggestedSourceName,
} from "../src/document-registry.js";
import {
  ensurePngExtension,
  resolveDesktopPngFontFiles,
  safeSuggestedPngName,
} from "../src/diagram-export.js";
import {
  editorEntryUrl,
  resolveEditorAssetPath,
} from "../src/editor-protocol.js";
import { createDesktopWebPreferences } from "../src/window-options.js";

describe("desktop foundation", () => {
  it("keeps privileged Electron capabilities out of the renderer", () => {
    expect(createDesktopWebPreferences("/trusted/preload.cjs")).toEqual({
      preload: "/trusted/preload.cjs",
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
    });
  });

  it("resolves only opaque handles created by the main process", () => {
    const registry = new DesktopDocumentRegistry();
    const handle = registry.register("/private/model.c4ml");

    expect(registry.resolve(handle)).toBe("/private/model.c4ml");
    expect(registry.resolve("/private/model.c4ml")).toBeUndefined();
    expect(registry.resolve(undefined)).toBeUndefined();
  });

  it("normalizes save suggestions without accepting a path", () => {
    expect(safeSuggestedSourceName("../Signal Garden")).toBe(
      "Signal Garden.c4ml",
    );
    expect(safeSuggestedSourceName("bad:name.c4ml")).toBe("bad-name.c4ml");
    expect(safeSuggestedSourceName("notes.txt")).toBe("notes.txt.c4ml");
    expect(safeSuggestedSourceName("... ")).toBe("architecture.c4ml");
    expect(ensureC4mlExtension("SYSTEM.C4ML")).toBe("SYSTEM.C4ML");
  });

  it("normalizes PNG suggestions and resolves controlled font locations", () => {
    expect(safeSuggestedPngName("../System Context")).toBe(
      "System Context.png",
    );
    expect(safeSuggestedPngName("bad:name.PNG")).toBe("bad-name.PNG");
    expect(safeSuggestedPngName("... ")).toBe("architecture.png");
    expect(ensurePngExtension("VIEW.PNG")).toBe("VIEW.PNG");

    expect(
      resolveDesktopPngFontFiles({
        appPath: "/workspace/apps/desktop",
        packaged: false,
        resourcesPath: "/unused",
      }),
    ).toEqual([
      "/workspace/packages/font-ibm-plex/fonts/sans/IBMPlexSans-Regular.ttf",
      "/workspace/packages/font-ibm-plex/fonts/sans/IBMPlexSans-Bold.ttf",
      "/workspace/packages/font-ibm-plex/fonts/sans/IBMPlexSans-Italic.ttf",
    ]);
    expect(
      resolveDesktopPngFontFiles({
        appPath: "/unused",
        packaged: true,
        resourcesPath: "/Applications/C4ML.app/Contents/Resources",
      })[0],
    ).toBe(
      "/Applications/C4ML.app/Contents/Resources/sans/IBMPlexSans-Regular.ttf",
    );
  });

  it("maps only owned application URLs into the packaged editor root", () => {
    const editorRoot = resolve("editor-root");

    expect(resolveEditorAssetPath(editorRoot, editorEntryUrl)).toBe(
      resolve(editorRoot, "index.html"),
    );
    expect(
      resolveEditorAssetPath(
        editorRoot,
        "c4ml://app/fonts/ibm-plex/sans/font.woff2",
      ),
    ).toBe(resolve(editorRoot, "fonts/ibm-plex/sans/font.woff2"));
    expect(
      resolveEditorAssetPath(
        editorRoot,
        "c4ml://other/index.html",
      ),
    ).toBeUndefined();
    expect(
      resolveEditorAssetPath(
        editorRoot,
        "c4ml://app/%2e%2e/%2e%2e/private/model.c4ml",
      ),
    ).toBeUndefined();
  });
});
