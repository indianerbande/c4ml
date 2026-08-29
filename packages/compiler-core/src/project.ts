import { compareText } from "./ordering.js";

export const architectureProjectVersion = 1 as const;
export const architectureProjectManifestName = "c4ml.project.json" as const;

export interface ArchitectureProjectDocument {
  readonly uri: string;
  readonly text: string;
}

export interface ArchitectureProjectInput {
  readonly version: typeof architectureProjectVersion;
  readonly id: string;
  readonly name?: string;
  readonly description?: string;
  readonly documents: readonly ArchitectureProjectDocument[];
}

export interface ArchitectureProjectManifest {
  readonly version: typeof architectureProjectVersion;
  readonly id: string;
  readonly name?: string;
  readonly description?: string;
  readonly sources: readonly string[];
}

export type ArchitectureProjectIssueCode =
  | "C4ML-PROJECT-001"
  | "C4ML-PROJECT-002"
  | "C4ML-PROJECT-003"
  | "C4ML-PROJECT-004"
  | "C4ML-PROJECT-005";

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
}): ArchitectureProjectInput {
  const project: ArchitectureProjectInput = {
    version: architectureProjectVersion,
    id: input.id,
    ...(input.name === undefined ? {} : { name: input.name }),
    ...(input.description === undefined ? {} : { description: input.description }),
    documents: [...input.documents]
      .map((document) => ({ ...document }))
      .sort((left, right) => compareText(left.uri, right.uri)),
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

  const { version, id, name, description, sources } = candidate;
  if (
    version !== architectureProjectVersion ||
    typeof id !== "string" ||
    id.trim().length === 0 ||
    (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) ||
    (description !== undefined &&
      (typeof description !== "string" || description.trim().length === 0)) ||
    !Array.isArray(sources) ||
    sources.length === 0 ||
    sources.some((value) => typeof value !== "string")
  ) {
    return invalidManifest(
      "The project manifest requires version 1, a stable id, and a non-empty sources array.",
    );
  }

  const normalizedSources = [...sources].sort(compareText);
  const projectIssues = validateArchitectureProjectInput({
    version: architectureProjectVersion,
    id,
    ...(typeof name === "string" ? { name } : {}),
    ...(typeof description === "string" ? { description } : {}),
    documents: normalizedSources.map((uri) => ({ uri, text: "" })),
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
