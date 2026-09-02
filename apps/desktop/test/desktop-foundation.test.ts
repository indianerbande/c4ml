import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  DesktopDocumentRegistry,
  ensureC4mlExtension,
  safeSuggestedSourceName,
} from "../src/document-registry.js";
import {
  ensurePngExtension,
  ensureSvgExtension,
  resolveDesktopPngFontFiles,
  safeSuggestedPngName,
  safeSuggestedSvgName,
} from "../src/diagram-export.js";
import {
  editorEntryUrl,
  resolveEditorAssetPath,
} from "../src/editor-protocol.js";
import { createDesktopWebPreferences } from "../src/window-options.js";
import { desktopMessage } from "../src/desktop-localization.js";
import {
  DesktopPreviewProjectionSequence,
  normalizePreviewWindowBounds,
} from "../src/preview-window.js";

describe("desktop foundation", () => {
  it("labels the context-sensitive close action in both interface languages", () => {
    expect(desktopMessage("en", "menu.closeDocument")).toBe("Close File");
    expect(desktopMessage("en", "menu.closeProject")).toBe("Close Project");
    expect(desktopMessage("de", "menu.closeDocument")).toBe("Datei schließen");
    expect(desktopMessage("de", "menu.closeProject")).toBe("Projekt schließen");
  });

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

    const workspaceRoot = resolve("test-workspace");
    const developmentAppPath = join(workspaceRoot, "apps", "desktop");
    const packagedResourcesPath = join(
      workspaceRoot,
      "C4thedral",
      "resources",
    );

    expect(
      resolveDesktopPngFontFiles({
        appPath: developmentAppPath,
        packaged: false,
        resourcesPath: join(workspaceRoot, "unused"),
      }),
    ).toEqual([
      join(
        workspaceRoot,
        "packages/font-ibm-plex/fonts/sans/IBMPlexSans-Regular.ttf",
      ),
      join(
        workspaceRoot,
        "packages/font-ibm-plex/fonts/sans/IBMPlexSans-Bold.ttf",
      ),
      join(
        workspaceRoot,
        "packages/font-ibm-plex/fonts/sans/IBMPlexSans-Italic.ttf",
      ),
    ]);
    expect(
      resolveDesktopPngFontFiles({
        appPath: join(workspaceRoot, "unused"),
        packaged: true,
        resourcesPath: packagedResourcesPath,
      })[0],
    ).toBe(join(packagedResourcesPath, "sans/IBMPlexSans-Regular.ttf"));
  });

  it("normalizes native SVG export suggestions without accepting a path", () => {
    expect(safeSuggestedSvgName("../System Context")).toBe(
      "System Context.svg",
    );
    expect(safeSuggestedSvgName("bad:name.SVG")).toBe("bad-name.SVG");
    expect(safeSuggestedSvgName("... ")).toBe("architecture.svg");
    expect(ensureSvgExtension("VIEW.SVG")).toBe("VIEW.SVG");
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
        `${editorEntryUrl}?mode=preview`,
      ),
    ).toBe(resolve(editorRoot, "index.html"));
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

  it("restores only visible, bounded preview-window geometry", () => {
    const workArea = { x: 100, y: 50, width: 1440, height: 900 };
    expect(
      normalizePreviewWindowBounds(
        { x: -900, y: 2000, width: 1200, height: 700 },
        workArea,
      ),
    ).toEqual({ x: 100, y: 250, width: 1200, height: 700 });
    expect(normalizePreviewWindowBounds(undefined, workArea)).toEqual({
      x: 148,
      y: 98,
      width: 1100,
      height: 760,
    });
  });

  it("keeps preview revisions monotonic across renderer reloads", () => {
    const sequence = new DesktopPreviewProjectionSequence();
    const projection = {
      version: 1 as const,
      revision: 40,
      compilerPhase: "valid" as const,
      statusLabel: "Preview current",
      view: undefined,
      svg: undefined,
      navigation: undefined,
      selectedSceneObjectId: undefined,
      selectionLabel: undefined,
      zoom: 1,
      routeDebugEnabled: false,
      stale: false,
      presentation: {
        language: "en" as const,
        colorScheme: "light" as const,
        colorPalette: "blue" as const,
        interfaceFontSize: 10,
      },
    };

    expect(sequence.accept(projection).revision).toBe(1);
    expect(sequence.accept({ ...projection, revision: 1 }).revision).toBe(2);
  });
});
