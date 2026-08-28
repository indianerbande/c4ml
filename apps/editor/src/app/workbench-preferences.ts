export const workbenchPreferencesStorageKey =
  "c4ml.workbench.preferences.v1";

export const workbenchColorSchemes = ["system", "light", "dark"] as const;
export type WorkbenchColorScheme = (typeof workbenchColorSchemes)[number];
export type EffectiveColorScheme = Exclude<WorkbenchColorScheme, "system">;

export const workbenchUiLanguages = ["en", "de"] as const;
export type WorkbenchUiLanguage = (typeof workbenchUiLanguages)[number];

export const workbenchEditorFontFamilies = [
  "ibm-plex-mono",
  "system-monospace",
] as const;
export type WorkbenchEditorFontFamily =
  (typeof workbenchEditorFontFamilies)[number];

export const minimumEditorFontSize = 11;
export const maximumEditorFontSize = 24;
export const editorFontSizeStep = 0.5;

export interface WorkbenchPreferences {
  readonly version: 1;
  readonly uiLanguage: WorkbenchUiLanguage;
  readonly colorScheme: WorkbenchColorScheme;
  readonly editorFontFamily: WorkbenchEditorFontFamily;
  readonly editorFontSize: number;
}

export interface WorkbenchPreferencesStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const defaultWorkbenchPreferences: WorkbenchPreferences = {
  version: 1,
  uiLanguage: "en",
  colorScheme: "system",
  editorFontFamily: "ibm-plex-mono",
  editorFontSize: 12.5,
};

export function parseWorkbenchPreferences(
  serialized: string | null,
): WorkbenchPreferences {
  if (serialized === null) {
    return defaultWorkbenchPreferences;
  }
  try {
    const value = JSON.parse(serialized) as unknown;
    if (!isRecord(value) || value["version"] !== 1) {
      return defaultWorkbenchPreferences;
    }
    return {
      version: 1,
      uiLanguage: isUiLanguage(value["uiLanguage"])
        ? value["uiLanguage"]
        : defaultWorkbenchPreferences.uiLanguage,
      colorScheme: isColorScheme(value["colorScheme"])
        ? value["colorScheme"]
        : defaultWorkbenchPreferences.colorScheme,
      editorFontFamily: isEditorFontFamily(value["editorFontFamily"])
        ? value["editorFontFamily"]
        : defaultWorkbenchPreferences.editorFontFamily,
      editorFontSize: normalizeEditorFontSize(value["editorFontSize"]),
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

export function editorFontFamilyCss(
  family: WorkbenchEditorFontFamily,
): string {
  return family === "ibm-plex-mono"
    ? '"IBM Plex Mono", monospace'
    : 'ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", monospace';
}

function isColorScheme(value: unknown): value is WorkbenchColorScheme {
  return workbenchColorSchemes.some((candidate) => candidate === value);
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
