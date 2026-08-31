import {
  c4mlSyntaxThemePresets,
  type C4mlSyntaxThemePreset,
} from "./syntax-theme.js";

export const workbenchPreferencesStorageKey = "c4ml.workbench.preferences.v1";

export const workbenchColorSchemes = ["system", "light", "dark"] as const;
export type WorkbenchColorScheme = (typeof workbenchColorSchemes)[number];
export type EffectiveColorScheme = Exclude<WorkbenchColorScheme, "system">;

export const workbenchColorPalettes = [
  "blue",
  "gray",
  "yellow",
  "green",
  "violet",
  "red",
  "orange",
  "turquoise",
] as const;
export type WorkbenchColorPalette = (typeof workbenchColorPalettes)[number];

export const workbenchUiLanguages = ["en", "de"] as const;
export type WorkbenchUiLanguage = (typeof workbenchUiLanguages)[number];

export const workbenchEditorFontFamilies = [
  "ibm-plex-mono",
  "fira-code",
  "hack",
  "source-code-pro",
  "intel-one-mono",
  "inconsolata",
  "cascadia-code",
  "system-monospace",
] as const;
export type WorkbenchEditorFontFamily =
  (typeof workbenchEditorFontFamilies)[number];

export const workbenchEditorFontFamilyOptions: readonly {
  readonly id: WorkbenchEditorFontFamily;
  readonly label: string;
}[] = [
  { id: "ibm-plex-mono", label: "IBM Plex Mono" },
  { id: "fira-code", label: "Fira Code" },
  { id: "hack", label: "Hack" },
  { id: "source-code-pro", label: "Source Code Pro" },
  { id: "intel-one-mono", label: "Intel One Mono" },
  { id: "inconsolata", label: "Inconsolata" },
  { id: "cascadia-code", label: "Cascadia Code" },
];

export const minimumEditorFontSize = 11;
export const maximumEditorFontSize = 24;
export const editorFontSizeStep = 0.5;
export const minimumInterfaceFontSize = 9;
export const maximumInterfaceFontSize = 16;
export const interfaceFontSizeStep = 0.5;

export interface WorkbenchPreferences {
  readonly version: 2;
  readonly uiLanguage: WorkbenchUiLanguage;
  readonly colorScheme: WorkbenchColorScheme;
  readonly colorPalette: WorkbenchColorPalette;
  readonly syntaxTheme: C4mlSyntaxThemePreset;
  readonly interfaceFontSize: number;
  readonly editorFontFamily: WorkbenchEditorFontFamily;
  readonly editorFontLigatures: boolean;
  readonly editorFontSize: number;
}

export interface WorkbenchPreferencesStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const defaultWorkbenchPreferences: WorkbenchPreferences = {
  version: 2,
  uiLanguage: "en",
  colorScheme: "system",
  colorPalette: "blue",
  syntaxTheme: "balanced",
  interfaceFontSize: 13,
  editorFontFamily: "ibm-plex-mono",
  editorFontLigatures: true,
  editorFontSize: 15,
};

export function parseWorkbenchPreferences(
  serialized: string | null,
): WorkbenchPreferences {
  if (serialized === null) {
    return defaultWorkbenchPreferences;
  }
  try {
    const value = JSON.parse(serialized) as unknown;
    if (
      !isRecord(value) ||
      (value["version"] !== 1 && value["version"] !== 2)
    ) {
      return defaultWorkbenchPreferences;
    }
    const legacyDefaults = value["version"] === 1;
    return {
      version: 2,
      uiLanguage: isUiLanguage(value["uiLanguage"])
        ? value["uiLanguage"]
        : defaultWorkbenchPreferences.uiLanguage,
      colorScheme: isColorScheme(value["colorScheme"])
        ? value["colorScheme"]
        : defaultWorkbenchPreferences.colorScheme,
      colorPalette: isColorPalette(value["colorPalette"])
        ? value["colorPalette"]
        : defaultWorkbenchPreferences.colorPalette,
      syntaxTheme: isSyntaxTheme(value["syntaxTheme"])
        ? value["syntaxTheme"]
        : defaultWorkbenchPreferences.syntaxTheme,
      interfaceFontSize:
        legacyDefaults && value["interfaceFontSize"] === 10
          ? defaultWorkbenchPreferences.interfaceFontSize
          : normalizeInterfaceFontSize(value["interfaceFontSize"]),
      editorFontFamily: isEditorFontFamily(value["editorFontFamily"])
        ? value["editorFontFamily"]
        : defaultWorkbenchPreferences.editorFontFamily,
      editorFontLigatures:
        typeof value["editorFontLigatures"] === "boolean"
          ? value["editorFontLigatures"]
          : defaultWorkbenchPreferences.editorFontLigatures,
      editorFontSize:
        legacyDefaults && value["editorFontSize"] === 12.5
          ? defaultWorkbenchPreferences.editorFontSize
          : normalizeEditorFontSize(value["editorFontSize"]),
    };
  } catch {
    return defaultWorkbenchPreferences;
  }
}

export function serializeWorkbenchPreferences(
  preferences: WorkbenchPreferences,
): string {
  return JSON.stringify(preferences);
}

export function loadWorkbenchPreferences(
  storage: WorkbenchPreferencesStorage | undefined,
): WorkbenchPreferences {
  try {
    return parseWorkbenchPreferences(
      storage?.getItem(workbenchPreferencesStorageKey) ?? null,
    );
  } catch {
    return defaultWorkbenchPreferences;
  }
}

export function storeWorkbenchPreferences(
  storage: WorkbenchPreferencesStorage | undefined,
  preferences: WorkbenchPreferences,
): boolean {
  try {
    storage?.setItem(
      workbenchPreferencesStorageKey,
      serializeWorkbenchPreferences(preferences),
    );
    return storage !== undefined;
  } catch {
    return false;
  }
}

export function normalizeEditorFontSize(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return defaultWorkbenchPreferences.editorFontSize;
  }
  const clamped = Math.min(
    maximumEditorFontSize,
    Math.max(minimumEditorFontSize, value),
  );
  return Math.round(clamped / editorFontSizeStep) * editorFontSizeStep;
}

export function normalizeInterfaceFontSize(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return defaultWorkbenchPreferences.interfaceFontSize;
  }
  const clamped = Math.min(
    maximumInterfaceFontSize,
    Math.max(minimumInterfaceFontSize, value),
  );
  return Math.round(clamped / interfaceFontSizeStep) * interfaceFontSizeStep;
}

export function resolveEffectiveColorScheme(
  preference: WorkbenchColorScheme,
  systemPrefersDark: boolean,
): EffectiveColorScheme {
  return preference === "system"
    ? systemPrefersDark
      ? "dark"
      : "light"
    : preference;
}

export function editorFontFamilyCss(family: WorkbenchEditorFontFamily): string {
  const bundledFamilies: Partial<
    Readonly<Record<WorkbenchEditorFontFamily, string>>
  > = {
    "ibm-plex-mono": "IBM Plex Mono",
    "fira-code": "Fira Code",
    hack: "Hack",
    "source-code-pro": "Source Code Pro",
    "intel-one-mono": "Intel One Mono",
    inconsolata: "Inconsolata",
    "cascadia-code": "Cascadia Code",
  };
  const bundled = bundledFamilies[family];
  return bundled === undefined
    ? 'ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace'
    : `"${bundled}", monospace`;
}

export function editorFontLigaturesOption(
  family: WorkbenchEditorFontFamily,
  enabled: boolean,
): boolean | string {
  if (!enabled) {
    return false;
  }
  if (family === "intel-one-mono") {
    return '"liga" 1, "calt" 1, "ss01" 1';
  }
  if (family === "inconsolata") {
    return '"liga" 1, "calt" 1, "dlig" 1';
  }
  return true;
}

export function editorFontFeatureSettingsCss(
  family: WorkbenchEditorFontFamily,
  enabled: boolean,
): string {
  const option = editorFontLigaturesOption(family, enabled);
  return option === false
    ? "normal"
    : option === true
      ? '"liga" 1, "calt" 1'
      : option;
}

function isColorScheme(value: unknown): value is WorkbenchColorScheme {
  return workbenchColorSchemes.some((candidate) => candidate === value);
}

function isColorPalette(value: unknown): value is WorkbenchColorPalette {
  return workbenchColorPalettes.some((candidate) => candidate === value);
}

function isSyntaxTheme(value: unknown): value is C4mlSyntaxThemePreset {
  return c4mlSyntaxThemePresets.some((candidate) => candidate === value);
}

function isUiLanguage(value: unknown): value is WorkbenchUiLanguage {
  return workbenchUiLanguages.some((candidate) => candidate === value);
}

function isEditorFontFamily(
  value: unknown,
): value is WorkbenchEditorFontFamily {
  return workbenchEditorFontFamilies.some((candidate) => candidate === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
