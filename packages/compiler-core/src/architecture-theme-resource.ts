import {
  resolveSceneTheme,
  type SceneTheme,
  type SceneThemeOverrides,
} from "./theme.js";

export const architectureThemeResourceVersion = 1 as const;

export interface ArchitectureThemeResource {
  readonly version: typeof architectureThemeResourceVersion;
  readonly selection: SceneThemeOverrides;
  readonly resolved: SceneTheme;
}

export type ArchitectureThemeResourceParseResult =
  | { readonly valid: true; readonly theme: ArchitectureThemeResource; readonly error: undefined }
  | { readonly valid: false; readonly theme: undefined; readonly error: ArchitectureThemeResourceError };

export class ArchitectureThemeResourceError extends Error {
  constructor(readonly code: "C4ML-THEME-RESOURCE-001", message: string) {
    super(message);
    this.name = "ArchitectureThemeResourceError";
  }
}

export function parseArchitectureThemeResource(
  source: string,
): ArchitectureThemeResourceParseResult {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    return invalid("An architecture theme resource must contain valid JSON.");
  }
  try {
    if (!isRecord(value) || value["version"] !== architectureThemeResourceVersion) {
      malformed(`A theme resource must declare version ${architectureThemeResourceVersion}.`);
    }
    const allowed = new Set(["version", "id", "preset", "canvas", "elements", "boundaries", "routes"]);
    const unknown = Object.keys(value).find((key) => !allowed.has(key));
    if (unknown !== undefined) malformed(`Theme resource property "${unknown}" is unknown.`);
    const { version: _version, ...selection } = value;
    const resolved = resolveSceneTheme(selection as SceneThemeOverrides);
    return {
      valid: true,
      theme: {
        version: architectureThemeResourceVersion,
        selection: selection as SceneThemeOverrides,
        resolved,
      },
      error: undefined,
    };
  } catch (error: unknown) {
    return invalid(error instanceof Error ? error.message : "The theme resource is malformed.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(message: string): ArchitectureThemeResourceParseResult {
  return {
    valid: false,
    theme: undefined,
    error: new ArchitectureThemeResourceError("C4ML-THEME-RESOURCE-001", message),
  };
}

function malformed(message: string): never {
  throw new ArchitectureThemeResourceError("C4ML-THEME-RESOURCE-001", message);
}
