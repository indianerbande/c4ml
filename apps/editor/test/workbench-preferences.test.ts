import { describe, expect, it } from "vitest";

import {
  defaultWorkbenchPreferences,
  editorFontFamilyCss,
  editorFontFeatureSettingsCss,
  editorFontLigaturesOption,
  loadWorkbenchPreferences,
  normalizeEditorFontSize,
  normalizeInterfaceFontSize,
  parseWorkbenchPreferences,
  resolveEffectiveColorScheme,
  serializeWorkbenchPreferences,
  storeWorkbenchPreferences,
  workbenchEditorFontFamilies,
  workbenchEditorFontFamilyOptions,
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
      interfaceFontSize: 12.5,
      editorFontFamily: "system-monospace",
      editorFontLigatures: false,
      editorFontSize: 15.5,
      futureSetting: true,
    });

    const parsed = parseWorkbenchPreferences(serialized);

    expect(parsed).toEqual({
      version: 1,
      uiLanguage: "de",
      colorScheme: "dark",
      interfaceFontSize: 12.5,
      editorFontFamily: "system-monospace",
      editorFontLigatures: false,
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
          interfaceFontSize: "huge",
          editorFontFamily: 42,
          editorFontLigatures: "sometimes",
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
      interfaceFontSize: 10,
      editorFontFamily: "system-monospace",
      editorFontLigatures: true,
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

  it("clamps and rounds interface font sizes to the supported half-pixel grid", () => {
    expect(normalizeInterfaceFontSize(7)).toBe(9);
    expect(normalizeInterfaceFontSize(11.24)).toBe(11);
    expect(normalizeInterfaceFontSize(11.26)).toBe(11.5);
    expect(normalizeInterfaceFontSize(20)).toBe(16);
  });

  it("resolves the system scheme without changing explicit choices", () => {
    expect(resolveEffectiveColorScheme("system", true)).toBe("dark");
    expect(resolveEffectiveColorScheme("system", false)).toBe("light");
    expect(resolveEffectiveColorScheme("light", true)).toBe("light");
    expect(resolveEffectiveColorScheme("dark", false)).toBe("dark");
  });

  it("maps stored font identifiers to controlled CSS stacks", () => {
    expect(editorFontFamilyCss("ibm-plex-mono")).toContain("IBM Plex Mono");
    expect(editorFontFamilyCss("fira-code")).toContain("Fira Code");
    expect(editorFontFamilyCss("hack")).toContain("Hack");
    expect(editorFontFamilyCss("source-code-pro")).toContain("Source Code Pro");
    expect(editorFontFamilyCss("intel-one-mono")).toContain("Intel One Mono");
    expect(editorFontFamilyCss("inconsolata")).toContain("Inconsolata");
    expect(editorFontFamilyCss("cascadia-code")).toContain("Cascadia Code");
    expect(editorFontFamilyCss("system-monospace")).toContain("ui-monospace");
  });

  it("accepts every packaged editor font and exposes one stable option", () => {
    const packagedFamilies = workbenchEditorFontFamilies.filter(
      (family) => family !== "system-monospace",
    );
    expect(workbenchEditorFontFamilyOptions.map(({ id }) => id)).toEqual(
      packagedFamilies,
    );

    for (const editorFontFamily of packagedFamilies) {
      expect(
        parseWorkbenchPreferences(
          JSON.stringify({
            ...defaultWorkbenchPreferences,
            editorFontFamily,
          }),
        ).editorFontFamily,
      ).toBe(editorFontFamily);
    }
  });

  it("maps the ligature preference to family-specific OpenType features", () => {
    expect(editorFontLigaturesOption("fira-code", true)).toBe(true);
    expect(editorFontLigaturesOption("cascadia-code", true)).toBe(true);
    expect(editorFontLigaturesOption("intel-one-mono", true)).toContain(
      '"ss01" 1',
    );
    expect(editorFontLigaturesOption("inconsolata", true)).toContain(
      '"dlig" 1',
    );
    expect(editorFontLigaturesOption("fira-code", false)).toBe(false);
    expect(editorFontFeatureSettingsCss("fira-code", true)).toContain(
      '"calt" 1',
    );
    expect(editorFontFeatureSettingsCss("fira-code", false)).toBe("normal");
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
