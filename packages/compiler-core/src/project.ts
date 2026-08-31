import { compareText } from "./ordering.js";

export const architectureProjectVersion = 1 as const;
export const architectureProjectManifestName = "c4ml.project.json" as const;
export const architecturePolicyResourceSuffix = ".c4ml-policy.json" as const;
export const architectureObservationResourceSuffix = ".c4ml-observations.json" as const;
export const architectureGlossaryResourceSuffix = ".c4ml-glossary.json" as const;
export const architectureNarrativeResourceSuffix = ".c4ml-narrative.md" as const;
export const architecturePublicationResourceSuffix = ".c4ml-publication.json" as const;
export const architectureThemeResourceSuffix = ".c4ml-theme.json" as const;
export const architectureShapeResourceSuffix = ".c4ml-shapes.json" as const;
export const architectureAssetResourceSuffix = ".c4ml-assets.json" as const;

export interface ArchitectureProjectDocument {
  readonly uri: string;
  readonly text: string;
}

export interface ArchitectureProjectPolicyResource {
  readonly uri: string;
  readonly source: string;
}

export interface ArchitectureProjectObservationResource {
  readonly uri: string;
  readonly source: string;
}

export interface ArchitectureProjectGlossaryResource {
  readonly uri: string;
  readonly source: string;
}

export interface ArchitectureProjectNarrativeResource {
  readonly uri: string;
  readonly source: string;
}

export interface ArchitectureProjectPublicationResource {
  readonly uri: string;
  readonly source: string;
}

export interface ArchitectureProjectThemeResource {
  readonly uri: string;
  readonly source: string;
}

export interface ArchitectureProjectShapeResource {
  readonly uri: string;
  readonly source: string;
}

export interface ArchitectureProjectAssetFile {
  readonly uri: string;
  readonly content: string;
}

export interface ArchitectureProjectAssetResource {
  readonly uri: string;
  readonly source: string;
  readonly files: readonly ArchitectureProjectAssetFile[];
}

export interface ArchitectureProjectInput {
  readonly version: typeof architectureProjectVersion;
  readonly id: string;
  readonly name?: string;
  readonly description?: string;
  readonly documents: readonly ArchitectureProjectDocument[];
  readonly policy?: ArchitectureProjectPolicyResource;
  readonly observations?: ArchitectureProjectObservationResource;
  readonly glossary?: ArchitectureProjectGlossaryResource;
  readonly narratives?: readonly ArchitectureProjectNarrativeResource[];
  readonly publication?: ArchitectureProjectPublicationResource;
  readonly theme?: ArchitectureProjectThemeResource;
  readonly shapes?: ArchitectureProjectShapeResource;
  readonly assets?: ArchitectureProjectAssetResource;
}

export interface ArchitectureProjectManifest {
  readonly version: typeof architectureProjectVersion;
  readonly id: string;
  readonly name?: string;
  readonly description?: string;
  readonly sources: readonly string[];
  readonly policy?: string;
  readonly observations?: string;
  readonly glossary?: string;
  readonly narratives?: readonly string[];
  readonly publication?: string;
  readonly theme?: string;
  readonly shapes?: string;
  readonly assets?: string;
}

export type ArchitectureProjectIssueCode =
  | "C4ML-PROJECT-001"
  | "C4ML-PROJECT-002"
  | "C4ML-PROJECT-003"
  | "C4ML-PROJECT-004"
  | "C4ML-PROJECT-005"
  | "C4ML-PROJECT-006"
  | "C4ML-PROJECT-007"
  | "C4ML-PROJECT-008"
  | "C4ML-PROJECT-009"
  | "C4ML-PROJECT-010"
  | "C4ML-PROJECT-011"
  | "C4ML-PROJECT-012"
  | "C4ML-PROJECT-013";

export interface ArchitectureProjectIssue {
  readonly code: ArchitectureProjectIssueCode;
  readonly message: string;
  readonly uri?: string;
}

export type ArchitectureProjectManifestResult =
  | {
      readonly valid: true;
      readonly manifest: ArchitectureProjectManifest;
      readonly issues: readonly [];
    }
  | {
      readonly valid: false;
      readonly issues: readonly ArchitectureProjectIssue[];
    };

export class ArchitectureProjectError extends Error {
  constructor(readonly issues: readonly ArchitectureProjectIssue[]) {
    super(issues.map(({ message }) => message).join("\n"));
    this.name = "ArchitectureProjectError";
  }
}

export function createArchitectureProjectInput(input: {
  readonly id: string;
  readonly name?: string;
  readonly description?: string;
  readonly documents: readonly ArchitectureProjectDocument[];
  readonly policy?: ArchitectureProjectPolicyResource;
  readonly observations?: ArchitectureProjectObservationResource;
  readonly glossary?: ArchitectureProjectGlossaryResource;
  readonly narratives?: readonly ArchitectureProjectNarrativeResource[];
  readonly publication?: ArchitectureProjectPublicationResource;
  readonly theme?: ArchitectureProjectThemeResource;
  readonly shapes?: ArchitectureProjectShapeResource;
  readonly assets?: ArchitectureProjectAssetResource;
}): ArchitectureProjectInput {
  const project: ArchitectureProjectInput = {
    version: architectureProjectVersion,
    id: input.id,
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.description === undefined ? {} : { description: input.description }),
    documents: [...input.documents]
      .map((document) => ({ ...document }))
      .sort((left, right) => compareText(left.uri, right.uri)),
    ...(input.policy === undefined
      ? {}
      : { policy: { uri: input.policy.uri, source: input.policy.source } }),
    ...(input.observations === undefined
      ? {}
      : {
          observations: {
            uri: input.observations.uri,
            source: input.observations.source,
          },
        }),
    ...(input.glossary === undefined
      ? {}
      : { glossary: { uri: input.glossary.uri, source: input.glossary.source } }),
    narratives: [...(input.narratives ?? [])]
      .map((resource) => ({ ...resource }))
      .sort((left, right) => compareText(left.uri, right.uri)),
    ...(input.publication === undefined
      ? {}
      : { publication: { uri: input.publication.uri, source: input.publication.source } }),
    ...(input.theme === undefined
      ? {}
      : { theme: { uri: input.theme.uri, source: input.theme.source } }),
    ...(input.shapes === undefined
      ? {}
      : { shapes: { uri: input.shapes.uri, source: input.shapes.source } }),
    ...(input.assets === undefined
      ? {}
      : {
          assets: {
            uri: input.assets.uri,
            source: input.assets.source,
            files: [...input.assets.files].map((file) => ({ ...file })).sort((left, right) => compareText(left.uri, right.uri)),
          },
        }),
  };
  const issues = validateArchitectureProjectInput(project);
  if (issues.length > 0) {
    throw new ArchitectureProjectError(issues);
  }
  return project;
}

export function createImplicitArchitectureProject(
  document: ArchitectureProjectDocument,
): ArchitectureProjectInput {
  return createArchitectureProjectInput({
    id: "implicit-project",
    documents: [document],
  });
}

export function validateArchitectureProjectInput(
  project: ArchitectureProjectInput,
): ArchitectureProjectIssue[] {
  const issues: ArchitectureProjectIssue[] = [];
  if (
    project.version !== architectureProjectVersion ||
    project.id.trim().length === 0 ||
    (project.name !== undefined && project.name.trim().length === 0) ||
    (project.description !== undefined && project.description.trim().length === 0)
  ) {
    issues.push({
      code: "C4ML-PROJECT-001",
      message: "A project requires the supported version, a stable identifier, and non-empty optional metadata.",
    });
  }
  if (project.documents.length === 0) {
    issues.push({
      code: "C4ML-PROJECT-002",
      message: "A C4ML project requires at least one architecture source document.",
    });
    return issues;
  }

  const seen = new Set<string>();
  const seenCaseFolded = new Set<string>();
  for (const document of project.documents) {
    if (!isPortableProjectUri(document.uri) || !document.uri.endsWith(".c4ml")) {
      issues.push({
        code: "C4ML-PROJECT-003",
        message: `Project source URI "${document.uri}" must be a normalized relative .c4ml path inside the project.`,
        uri: document.uri,
      });
      continue;
    }
    const caseFolded = document.uri.toLocaleLowerCase("en-US");
    if (seen.has(document.uri) || seenCaseFolded.has(caseFolded)) {
      issues.push({
        code: "C4ML-PROJECT-004",
        message: `Project source URI "${document.uri}" duplicates or case-collides with another source.`,
        uri: document.uri,
      });
    }
    seen.add(document.uri);
    seenCaseFolded.add(caseFolded);
  }
  if (project.policy !== undefined) {
    const policyCaseFolded = project.policy.uri.toLocaleLowerCase("en-US");
    if (
      !isPortableProjectUri(project.policy.uri) ||
      !project.policy.uri.endsWith(architecturePolicyResourceSuffix) ||
      project.policy.source.trim().length === 0 ||
      seenCaseFolded.has(policyCaseFolded)
    ) {
      issues.push({
        code: "C4ML-PROJECT-006",
        message:
          `Project policy URI "${project.policy.uri}" must be a unique normalized relative ` +
          `${architecturePolicyResourceSuffix} path with non-empty local content.`,
        uri: project.policy.uri,
      });
    }
  }
  if (project.observations !== undefined) {
    const observationCaseFolded = project.observations.uri.toLocaleLowerCase("en-US");
    if (
      !isPortableProjectUri(project.observations.uri) ||
      !project.observations.uri.endsWith(architectureObservationResourceSuffix) ||
      project.observations.source.trim().length === 0 ||
      seenCaseFolded.has(observationCaseFolded) ||
      project.policy?.uri.toLocaleLowerCase("en-US") === observationCaseFolded
    ) {
      issues.push({
        code: "C4ML-PROJECT-007",
        message:
          `Project observation URI "${project.observations.uri}" must be a unique normalized relative ` +
          `${architectureObservationResourceSuffix} path with non-empty local content.`,
        uri: project.observations.uri,
      });
    }
  }
  if (project.glossary !== undefined) {
    const glossaryCaseFolded = project.glossary.uri.toLocaleLowerCase("en-US");
    if (
      !isPortableProjectUri(project.glossary.uri) ||
      !project.glossary.uri.endsWith(architectureGlossaryResourceSuffix) ||
      project.glossary.source.trim().length === 0 ||
      seenCaseFolded.has(glossaryCaseFolded) ||
      project.policy?.uri.toLocaleLowerCase("en-US") === glossaryCaseFolded ||
      project.observations?.uri.toLocaleLowerCase("en-US") === glossaryCaseFolded
    ) {
      issues.push({
        code: "C4ML-PROJECT-008",
        message:
          `Project glossary URI "${project.glossary.uri}" must be a unique normalized relative ` +
          `${architectureGlossaryResourceSuffix} path with non-empty local content.`,
        uri: project.glossary.uri,
      });
    }
  }
  const supplementalUris = new Set([
    ...seenCaseFolded,
    ...(project.policy === undefined ? [] : [project.policy.uri.toLocaleLowerCase("en-US")]),
    ...(project.observations === undefined ? [] : [project.observations.uri.toLocaleLowerCase("en-US")]),
    ...(project.glossary === undefined ? [] : [project.glossary.uri.toLocaleLowerCase("en-US")]),
  ]);
  for (const narrative of project.narratives ?? []) {
    const caseFolded = narrative.uri.toLocaleLowerCase("en-US");
    if (
      !isPortableProjectUri(narrative.uri) ||
      !narrative.uri.endsWith(architectureNarrativeResourceSuffix) ||
      narrative.source.trim().length === 0 ||
      supplementalUris.has(caseFolded)
    ) {
      issues.push({
        code: "C4ML-PROJECT-009",
        message:
          `Project narrative URI "${narrative.uri}" must be a unique normalized relative ` +
          `${architectureNarrativeResourceSuffix} path with non-empty local content.`,
        uri: narrative.uri,
      });
    }
    supplementalUris.add(caseFolded);
  }
  if (project.publication !== undefined) {
    const caseFolded = project.publication.uri.toLocaleLowerCase("en-US");
    if (
      !isPortableProjectUri(project.publication.uri) ||
      !project.publication.uri.endsWith(architecturePublicationResourceSuffix) ||
      project.publication.source.trim().length === 0 ||
      supplementalUris.has(caseFolded)
    ) {
      issues.push({
        code: "C4ML-PROJECT-010",
        message:
          `Project publication URI "${project.publication.uri}" must be a unique normalized relative ` +
          `${architecturePublicationResourceSuffix} path with non-empty local content.`,
        uri: project.publication.uri,
      });
    }
  }
  if (project.theme !== undefined) {
    const caseFolded = project.theme.uri.toLocaleLowerCase("en-US");
    if (
      !isPortableProjectUri(project.theme.uri) ||
      !project.theme.uri.endsWith(architectureThemeResourceSuffix) ||
      project.theme.source.trim().length === 0 ||
      supplementalUris.has(caseFolded) ||
      project.publication?.uri.toLocaleLowerCase("en-US") === caseFolded
    ) {
      issues.push({
        code: "C4ML-PROJECT-011",
        message:
          `Project theme URI "${project.theme.uri}" must be a unique normalized relative ` +
          `${architectureThemeResourceSuffix} path with non-empty local content.`,
        uri: project.theme.uri,
      });
    }
  }
  if (project.shapes !== undefined) {
    const caseFolded = project.shapes.uri.toLocaleLowerCase("en-US");
    if (
      !isPortableProjectUri(project.shapes.uri) ||
      !project.shapes.uri.endsWith(architectureShapeResourceSuffix) ||
      project.shapes.source.trim().length === 0 ||
      supplementalUris.has(caseFolded) ||
      project.publication?.uri.toLocaleLowerCase("en-US") === caseFolded ||
      project.theme?.uri.toLocaleLowerCase("en-US") === caseFolded
    ) {
      issues.push({
        code: "C4ML-PROJECT-012",
        message: `Project shape URI "${project.shapes.uri}" must be a unique normalized relative ${architectureShapeResourceSuffix} path with non-empty local content.`,
        uri: project.shapes.uri,
      });
    }
  }
  if (project.assets !== undefined) {
    const caseFolded = project.assets.uri.toLocaleLowerCase("en-US");
    const assetUris = project.assets.files.map((file) => file.uri.toLocaleLowerCase("en-US"));
    const reservedUris = new Set([
      ...supplementalUris,
      ...(project.publication === undefined ? [] : [project.publication.uri.toLocaleLowerCase("en-US")]),
      ...(project.theme === undefined ? [] : [project.theme.uri.toLocaleLowerCase("en-US")]),
      ...(project.shapes === undefined ? [] : [project.shapes.uri.toLocaleLowerCase("en-US")]),
      caseFolded,
    ]);
    if (
      !isPortableProjectUri(project.assets.uri) ||
      !project.assets.uri.endsWith(architectureAssetResourceSuffix) ||
      project.assets.source.trim().length === 0 ||
      supplementalUris.has(caseFolded) ||
      project.publication?.uri.toLocaleLowerCase("en-US") === caseFolded ||
      project.theme?.uri.toLocaleLowerCase("en-US") === caseFolded ||
      project.shapes?.uri.toLocaleLowerCase("en-US") === caseFolded ||
      project.assets.files.some((file) =>
        !isPortableProjectUri(file.uri) || file.content.length === 0 ||
        reservedUris.has(file.uri.toLocaleLowerCase("en-US"))
      ) ||
      new Set(assetUris).size !== assetUris.length
    ) {
      issues.push({
        code: "C4ML-PROJECT-013",
        message: `Project asset manifest "${project.assets.uri}" and its passive files must use unique normalized local paths and non-empty content.`,
        uri: project.assets.uri,
      });
    }
  }
  return issues;
}

export function parseArchitectureProjectManifest(
  source: string,
): ArchitectureProjectManifestResult {
  let candidate: unknown;
  try {
    candidate = JSON.parse(source);
  } catch {
    return {
      valid: false,
      issues: [{
        code: "C4ML-PROJECT-005",
        message: `${architectureProjectManifestName} must contain valid JSON.`,
      }],
    };
  }
  if (!isRecord(candidate)) {
    return invalidManifest("The project manifest must contain one JSON object.");
  }

  const { version, id, name, description, sources, policy, observations, glossary, narratives, publication, theme, shapes, assets } = candidate;
  if (
    version !== architectureProjectVersion ||
    typeof id !== "string" ||
    id.trim().length === 0 ||
    (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) ||
    (description !== undefined &&
      (typeof description !== "string" || description.trim().length === 0)) ||
    !Array.isArray(sources) ||
    sources.length === 0 ||
    sources.some((value) => typeof value !== "string") ||
    (policy !== undefined &&
      (typeof policy !== "string" || policy.trim().length === 0)) ||
    (observations !== undefined &&
      (typeof observations !== "string" || observations.trim().length === 0)) ||
    (glossary !== undefined &&
      (typeof glossary !== "string" || glossary.trim().length === 0)) ||
    (narratives !== undefined &&
      (!Array.isArray(narratives) || narratives.length === 0 ||
        narratives.some((value) => typeof value !== "string"))) ||
    (publication !== undefined &&
      (typeof publication !== "string" || publication.trim().length === 0)) ||
    (theme !== undefined && (typeof theme !== "string" || theme.trim().length === 0)) ||
    (shapes !== undefined && (typeof shapes !== "string" || shapes.trim().length === 0)) ||
    (assets !== undefined && (typeof assets !== "string" || assets.trim().length === 0))
  ) {
    return invalidManifest(
      "The project manifest requires version 1, a stable id, a non-empty sources array, " +
        "optional policy, observation, glossary, and non-empty narrative resource paths.",
    );
  }

  const normalizedSources = [...sources].sort(compareText);
  const projectIssues = validateArchitectureProjectInput({
    version: architectureProjectVersion,
    id,
    ...(typeof name === "string" ? { name } : {}),
    ...(typeof description === "string" ? { description } : {}),
    documents: normalizedSources.map((uri) => ({ uri, text: "" })),
    ...(typeof policy === "string"
      ? { policy: { uri: policy, source: "{}" } }
      : {}),
    ...(typeof observations === "string"
      ? { observations: { uri: observations, source: "{}" } }
      : {}),
    ...(typeof glossary === "string"
      ? { glossary: { uri: glossary, source: "{}" } }
      : {}),
    narratives: Array.isArray(narratives)
      ? narratives.map((uri) => ({ uri: uri as string, source: "#" }))
      : [],
    ...(typeof publication === "string"
      ? { publication: { uri: publication, source: "{}" } }
      : {}),
    ...(typeof theme === "string" ? { theme: { uri: theme, source: "{}" } } : {}),
    ...(typeof shapes === "string" ? { shapes: { uri: shapes, source: "{}" } } : {}),
    ...(typeof assets === "string" ? { assets: { uri: assets, source: "{}", files: [] } } : {}),
  });
  if (projectIssues.length > 0) {
    return { valid: false, issues: projectIssues };
  }
  return {
    valid: true,
    manifest: {
      version: architectureProjectVersion,
      id,
      ...(typeof name === "string" ? { name } : {}),
      ...(typeof description === "string" ? { description } : {}),
      sources: normalizedSources,
      ...(typeof policy === "string" ? { policy } : {}),
      ...(typeof observations === "string" ? { observations } : {}),
      ...(typeof glossary === "string" ? { glossary } : {}),
      ...(Array.isArray(narratives)
        ? { narratives: [...narratives].sort(compareText) as string[] }
        : {}),
      ...(typeof publication === "string" ? { publication } : {}),
      ...(typeof theme === "string" ? { theme } : {}),
      ...(typeof shapes === "string" ? { shapes } : {}),
      ...(typeof assets === "string" ? { assets } : {}),
    },
    issues: [],
  };
}

export function isPortableProjectUri(uri: string): boolean {
  if (
    uri.length === 0 ||
    uri.startsWith("/") ||
    uri.endsWith("/") ||
    uri.includes("\\") ||
    uri.includes(":") ||
    /[\u0000-\u001f?*"<>|]/u.test(uri)
  ) {
    return false;
  }
  const segments = uri.split("/");
  return segments.every(
    (segment) => segment.length > 0 && segment !== "." && segment !== "..",
  );
}

function invalidManifest(message: string): ArchitectureProjectManifestResult {
  return {
    valid: false,
    issues: [{ code: "C4ML-PROJECT-005", message }],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
