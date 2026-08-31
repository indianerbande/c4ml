import { isPortableProjectUri } from "./project.js";

export const architectureNarrativeVersion = 1 as const;

export interface ArchitectureNarrative {
  readonly version: typeof architectureNarrativeVersion;
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly localLinks: readonly string[];
}

export type ArchitectureNarrativeParseResult =
  | { readonly valid: true; readonly narrative: ArchitectureNarrative; readonly error: undefined }
  | { readonly valid: false; readonly narrative: undefined; readonly error: ArchitectureNarrativeError };

export class ArchitectureNarrativeError extends Error {
  constructor(
    readonly code: "C4ML-NARRATIVE-001" | "C4ML-NARRATIVE-002",
    message: string,
  ) {
    super(message);
    this.name = "ArchitectureNarrativeError";
  }
}

export function parseArchitectureNarrative(source: string): ArchitectureNarrativeParseResult {
  try {
    const normalized = source.replace(/\r\n?/gu, "\n");
    const lines = normalized.split("\n");
    if (lines[0] !== "---" || lines[4] !== "---") {
      malformed("A narrative requires the five-line C4ML metadata header.");
    }
    const version = metadata(lines[1], "c4ml-narrative");
    const id = metadata(lines[2], "id");
    const title = metadata(lines[3], "title");
    if (version !== String(architectureNarrativeVersion)) {
      malformed(`A narrative must declare c4ml-narrative: ${architectureNarrativeVersion}.`);
    }
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u.test(id)) {
      malformed("A narrative identity must use lowercase kebab case.");
    }
    const body = lines.slice(5).join("\n").trim();
    if (body.length === 0) malformed(`Narrative "${id}" requires Markdown body content.`);
    if (/<\/?[a-z][^>]*>/iu.test(body) || /!\[[^\]]*\]\([^)]*\)/u.test(body)) {
      unsafe(`Narrative "${id}" cannot contain raw HTML or embedded images.`);
    }
    const links = [...body.matchAll(/(?<!!)\[[^\]]+\]\(([^)]+)\)/gu)]
      .map((match) => match[1]!.trim());
    for (const link of links) {
      const path = link.split("#", 1)[0]!;
      if (path.length > 0 && !isPortableProjectUri(path)) {
        unsafe(`Narrative "${id}" contains a non-local link "${link}".`);
      }
    }
    return {
      valid: true,
      narrative: {
        version: architectureNarrativeVersion,
        id,
        title,
        body,
        localLinks: [...new Set(links)].sort(),
      },
      error: undefined,
    };
  } catch (error: unknown) {
    return {
      valid: false,
      narrative: undefined,
      error: error instanceof ArchitectureNarrativeError
        ? error
        : new ArchitectureNarrativeError(
            "C4ML-NARRATIVE-001",
            "The architecture narrative is malformed.",
          ),
    };
  }
}

function metadata(line: string | undefined, key: string): string {
  const prefix = `${key}: `;
  if (line === undefined || !line.startsWith(prefix) || line.slice(prefix.length).trim().length === 0) {
    malformed(`Narrative metadata requires a non-empty ${key} field.`);
  }
  return line.slice(prefix.length).trim();
}

function malformed(message: string): never {
  throw new ArchitectureNarrativeError("C4ML-NARRATIVE-001", message);
}

function unsafe(message: string): never {
  throw new ArchitectureNarrativeError("C4ML-NARRATIVE-002", message);
}
