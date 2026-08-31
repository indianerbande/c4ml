import { compareText } from "./ordering.js";

export const architectureGlossaryVersion = 1 as const;

export type ArchitectureGlossaryEntryKind = "acronym" | "term";

export interface ArchitectureGlossaryEntry {
  readonly id: string;
  readonly term: string;
  readonly kind: ArchitectureGlossaryEntryKind;
  readonly definition: string;
  readonly expansion?: string;
  readonly aliases: readonly string[];
}

export interface ArchitectureGlossary {
  readonly version: typeof architectureGlossaryVersion;
  readonly id: string;
  readonly name?: string;
  readonly entries: readonly ArchitectureGlossaryEntry[];
}

export type ArchitectureGlossaryParseResult =
  | { readonly valid: true; readonly glossary: ArchitectureGlossary; readonly error: undefined }
  | { readonly valid: false; readonly glossary: undefined; readonly error: ArchitectureGlossaryError };

export class ArchitectureGlossaryError extends Error {
  constructor(
    readonly code: "C4ML-GLOSSARY-001" | "C4ML-GLOSSARY-002",
    message: string,
  ) {
    super(message);
    this.name = "ArchitectureGlossaryError";
  }
}

export function parseArchitectureGlossary(source: string): ArchitectureGlossaryParseResult {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    return invalid("An architecture glossary must contain valid JSON.");
  }
  try {
    if (!isRecord(value) || value["version"] !== architectureGlossaryVersion) {
      malformed(`An architecture glossary must declare version ${architectureGlossaryVersion}.`);
    }
    const id = requiredText(value["id"], "glossary identity");
    const name = optionalText(value["name"], "glossary name");
    if (!Array.isArray(value["entries"]) || value["entries"].length === 0) {
      malformed("An architecture glossary requires at least one entry.");
    }
    const entries = value["entries"].map(parseEntry).sort((left, right) =>
      compareText(left.id, right.id)
    );
    ensureUnique(entries.map(({ id: entryId }) => entryId), "entry identities");
    ensureUnique(
      entries.flatMap(({ term, aliases }) => [term, ...aliases]).map(caseFold),
      "terms and aliases",
    );
    return {
      valid: true,
      glossary: {
        version: architectureGlossaryVersion,
        id,
        ...(name === undefined ? {} : { name }),
        entries,
      },
      error: undefined,
    };
  } catch (error: unknown) {
    return {
      valid: false,
      glossary: undefined,
      error: error instanceof ArchitectureGlossaryError
        ? error
        : new ArchitectureGlossaryError(
            "C4ML-GLOSSARY-001",
            "The architecture glossary is malformed.",
          ),
    };
  }
}

export function findArchitectureGlossaryEntry(
  glossary: ArchitectureGlossary,
  term: string,
): ArchitectureGlossaryEntry | undefined {
  const key = caseFold(term);
  return glossary.entries.find((entry) =>
    [entry.term, ...entry.aliases].some((candidate) => caseFold(candidate) === key)
  );
}

function parseEntry(value: unknown, index: number): ArchitectureGlossaryEntry {
  if (!isRecord(value)) malformed(`Glossary entry ${index + 1} must be an object.`);
  const id = requiredText(value["id"], `entry ${index + 1} identity`);
  const term = requiredText(value["term"], `entry "${id}" term`);
  const definition = requiredText(value["definition"], `entry "${id}" definition`);
  const kind = value["kind"];
  if (kind !== "term" && kind !== "acronym") {
    malformed(`Glossary entry "${id}" has an unknown kind.`);
  }
  const expansion = optionalText(value["expansion"], `entry "${id}" expansion`);
  if (kind === "acronym" && expansion === undefined) {
    malformed(`Acronym entry "${id}" requires an expansion.`);
  }
  if (kind === "term" && expansion !== undefined) {
    malformed(`Term entry "${id}" cannot declare an acronym expansion.`);
  }
  const aliasesValue = value["aliases"];
  if (aliasesValue !== undefined &&
      (!Array.isArray(aliasesValue) || aliasesValue.some((alias) =>
        typeof alias !== "string" || alias.trim().length === 0
      ))) {
    malformed(`Glossary entry "${id}" aliases must be non-empty strings.`);
  }
  const aliases = [...(aliasesValue as string[] | undefined ?? [])]
    .map((alias) => alias.trim())
    .sort(compareText);
  ensureUnique([term, ...aliases].map(caseFold), `labels for entry "${id}"`);
  return {
    id,
    term,
    kind,
    definition,
    ...(expansion === undefined ? {} : { expansion }),
    aliases,
  };
}

function ensureUnique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new ArchitectureGlossaryError(
      "C4ML-GLOSSARY-002",
      `Architecture glossary ${label} must be unique without case distinctions.`,
    );
  }
}

function requiredText(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    malformed(`Architecture ${label} must not be empty.`);
  }
  return value.trim();
}

function optionalText(value: unknown, label: string): string | undefined {
  if (value === undefined) return undefined;
  return requiredText(value, label);
}

function caseFold(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(message: string): ArchitectureGlossaryParseResult {
  return {
    valid: false,
    glossary: undefined,
    error: new ArchitectureGlossaryError("C4ML-GLOSSARY-001", message),
  };
}

function malformed(message: string): never {
  throw new ArchitectureGlossaryError("C4ML-GLOSSARY-001", message);
}
