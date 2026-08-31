import type { ArchitectureView } from "./views.js";

export const architecturePublicationVersion = 1 as const;

export interface ArchitecturePublicationView {
  readonly viewId: string;
  readonly caption?: string;
}

export interface ArchitecturePublicationProfile {
  readonly id: string;
  readonly formats: readonly ("png" | "svg")[];
  readonly scale: 1 | 2 | 3;
  readonly background: "theme" | "transparent";
}

export interface ArchitecturePublication {
  readonly version: typeof architecturePublicationVersion;
  readonly id: string;
  readonly title?: string;
  readonly views: readonly ArchitecturePublicationView[];
  readonly profiles: readonly ArchitecturePublicationProfile[];
}

export type ArchitecturePublicationParseResult =
  | { readonly valid: true; readonly publication: ArchitecturePublication; readonly error: undefined }
  | { readonly valid: false; readonly publication: undefined; readonly error: ArchitecturePublicationError };

export class ArchitecturePublicationError extends Error {
  constructor(
    readonly code: "C4ML-PUBLICATION-001" | "C4ML-PUBLICATION-002",
    message: string,
  ) {
    super(message);
    this.name = "ArchitecturePublicationError";
  }
}

export function parseArchitecturePublication(source: string): ArchitecturePublicationParseResult {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    return invalid("An architecture publication resource must contain valid JSON.");
  }
  try {
    if (!isRecord(value) || value["version"] !== architecturePublicationVersion) {
      malformed(`A publication resource must declare version ${architecturePublicationVersion}.`);
    }
    const id = text(value["id"], "publication identity");
    const title = value["title"] === undefined ? undefined : text(value["title"], "publication title");
    if (!Array.isArray(value["views"]) || value["views"].length === 0) {
      malformed("A publication requires at least one ordered View entry.");
    }
    const views = value["views"].map((entry, index): ArchitecturePublicationView => {
      if (!isRecord(entry)) malformed(`Publication View ${index + 1} must be an object.`);
      const viewId = text(entry["viewId"], `publication View ${index + 1} identity`);
      const caption = entry["caption"] === undefined
        ? undefined
        : text(entry["caption"], `caption for View "${viewId}"`);
      return { viewId, ...(caption === undefined ? {} : { caption }) };
    });
    unique(views.map(({ viewId }) => viewId), "View identities");
    if (!Array.isArray(value["profiles"]) || value["profiles"].length === 0) {
      malformed("A publication requires at least one render profile.");
    }
    const profiles = value["profiles"].map(parseProfile).sort((left, right) =>
      left.id.localeCompare(right.id, "en-US")
    );
    unique(profiles.map(({ id: profileId }) => profileId), "profile identities");
    return {
      valid: true,
      publication: {
        version: architecturePublicationVersion,
        id,
        ...(title === undefined ? {} : { title }),
        views,
        profiles,
      },
      error: undefined,
    };
  } catch (error: unknown) {
    return {
      valid: false,
      publication: undefined,
      error: error instanceof ArchitecturePublicationError
        ? error
        : new ArchitecturePublicationError("C4ML-PUBLICATION-001", "The publication resource is malformed."),
    };
  }
}

export function validateArchitecturePublicationViews(
  publication: ArchitecturePublication,
  views: readonly ArchitectureView[],
): void {
  const declared = new Set(views.map(({ id }) => id));
  const unknown = publication.views.find(({ viewId }) => !declared.has(viewId));
  if (unknown !== undefined) {
    throw new ArchitecturePublicationError(
      "C4ML-PUBLICATION-002",
      `Publication View "${unknown.viewId}" does not exist in the compiled project.`,
    );
  }
}

function parseProfile(value: unknown, index: number): ArchitecturePublicationProfile {
  if (!isRecord(value)) malformed(`Publication profile ${index + 1} must be an object.`);
  const id = text(value["id"], `publication profile ${index + 1} identity`);
  const formats = value["formats"];
  if (!Array.isArray(formats) || formats.length === 0 ||
      formats.some((format) => format !== "svg" && format !== "png")) {
    malformed(`Publication profile "${id}" requires svg and/or png formats.`);
  }
  unique(formats, `formats for profile "${id}"`);
  const scale = value["scale"];
  if (scale !== 1 && scale !== 2 && scale !== 3) {
    malformed(`Publication profile "${id}" scale must be 1, 2, or 3.`);
  }
  const background = value["background"];
  if (background !== "theme" && background !== "transparent") {
    malformed(`Publication profile "${id}" has an unknown background mode.`);
  }
  return { id, formats: [...formats].sort(), scale, background };
}

function unique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) malformed(`Publication ${label} must be unique.`);
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    malformed(`Architecture ${label} must not be empty.`);
  }
  return value.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(message: string): ArchitecturePublicationParseResult {
  return {
    valid: false,
    publication: undefined,
    error: new ArchitecturePublicationError("C4ML-PUBLICATION-001", message),
  };
}

function malformed(message: string): never {
  throw new ArchitecturePublicationError("C4ML-PUBLICATION-001", message);
}
