import { describe, expect, it } from "vitest";

import {
  defaultWorkbenchPreferences,
  editorFontFamilyCss,
  loadWorkbenchPreferences,
  normalizeEditorFontSize,
  parseWorkbenchPreferences,
  resolveEffectiveColorScheme,
  serializeWorkbenchPreferences,
  storeWorkbenchPreferences,
} from "../src/app/workbench-preferences.js";

describe("workbench preferences", () => {
  it("uses stable defaults when no saved settings exist", () => {
    expect(parseWorkbenchPreferences(null)).toEqual(
      defaultWorkbenchPreferences,
    );
  });

  it("round-trips a supported version without retaining unknown fields", () => {
    const serialized = JSON.stringify({
      version: 1,
      uiLanguage: "de",
      colorScheme: "dark",
      editorFontFamily: "system-monospace",
      editorFontSize: 15.5,
      futureSetting: true,
    });

    const parsed = parseWorkbenchPreferences(serialized);

    expect(parsed).toEqual({
      version: 1,
      uiLanguage: "de",
      colorScheme: "dark",
      editorFontFamily: "system-monospace",
      editorFontSize: 15.5,
    });
    expect(JSON.parse(serializeWorkbenchPreferences(parsed))).not.toHaveProperty(
      "futureSetting",
    );
  });

  it("falls back field by field for malformed version-one settings", () => {
    expect(
      parseWorkbenchPreferences(
        JSON.stringify({
          version: 1,
          uiLanguage: "fr",
          colorScheme: "blue",
          editorFontFamily: 42,
          editorFontSize: "large",
        }),
      ),
    ).toEqual(defaultWorkbenchPreferences);
  });

  it("defaults existing version-one records to English without losing valid fields", () => {
    expect(
      parseWorkbenchPreferences(
        JSON.stringify({
          version: 1,
          colorScheme: "dark",
          editorFontFamily: "system-monospace",
          editorFontSize: 14,
        }),
      ),
    ).toEqual({
      version: 1,
      uiLanguage: "en",
      colorScheme: "dark",
      editorFontFamily: "system-monospace",
      editorFontSize: 14,
    });
  });

  it("ignores malformed JSON and unsupported schema versions", () => {
    expect(parseWorkbenchPreferences("{")).toEqual(
      defaultWorkbenchPreferences,
    );
    expect(parseWorkbenchPreferences('{"version":2}')).toEqual(
      defaultWorkbenchPreferences,
    );
  });

  it("clamps and rounds editor font sizes to the supported half-pixel grid", () => {
    expect(normalizeEditorFontSize(8)).toBe(11);
    expect(normalizeEditorFontSize(13.24)).toBe(13);
    expect(normalizeEditorFontSize(13.26)).toBe(13.5);
    expect(normalizeEditorFontSize(30)).toBe(24);
  });

  it("resolves the system scheme without changing explicit choices", () => {
    expect(resolveEffectiveColorScheme("system", true)).toBe("dark");
    expect(resolveEffectiveColorScheme("system", false)).toBe("light");
    expect(resolveEffectiveColorScheme("light", true)).toBe("light");
    expect(resolveEffectiveColorScheme("dark", false)).toBe("dark");
  });

  it("maps stored font identifiers to controlled CSS stacks", () => {
    expect(editorFontFamilyCss("ibm-plex-mono")).toContain("IBM Plex Mono");
    expect(editorFontFamilyCss("system-monospace")).toContain("ui-monospace");
  });

  it("continues with session defaults when browser storage is unavailable", () => {
    const unavailableStorage = {
      getItem: () => {
        throw new Error("storage denied");
      },
      setItem: () => {
        throw new Error("storage denied");
      },
    };

    expect(loadWorkbenchPreferences(unavailableStorage)).toEqual(
      defaultWorkbenchPreferences,
    );
    expect(
      storeWorkbenchPreferences(
        unavailableStorage,
        defaultWorkbenchPreferences,
      ),
    ).toBe(false);
  });
});
