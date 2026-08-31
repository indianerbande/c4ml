import { compareText } from "./ordering.js";
import {
  createArchitectureProjectInput,
  type ArchitectureProjectInput,
} from "./project.js";

export const sourceChangeSetVersion = 1 as const;
export const sourceRevisionAlgorithm = "c4ml-fnv1a64-utf16-v1" as const;
export const projectChangeSetVersion = 1 as const;
export const projectRevisionAlgorithm = "c4ml-project-fnv1a64-v1" as const;

export interface SourceRevision {
  readonly algorithm: typeof sourceRevisionAlgorithm;
  readonly hash: string;
  readonly length: number;
}

export type SourceChangeIntentKind =
  "architecture" | "layout" | "policy" | "route";

export interface SourceChangeIntent {
  readonly id: string;
  readonly kind: SourceChangeIntentKind;
  readonly summary: string;
}

export interface SourceTextEdit {
  readonly startOffset: number;
  readonly endOffset: number;
  readonly text: string;
}

export interface ProjectRevisionDocument {
  readonly uri: string;
  readonly revision: SourceRevision;
}

export interface ProjectRevision {
  readonly algorithm: typeof projectRevisionAlgorithm;
  readonly hash: string;
  readonly documents: readonly ProjectRevisionDocument[];
}

export interface ProjectSourceTextEdit extends SourceTextEdit {
  readonly documentUri: string;
}

export interface ProposedProjectSourceChangeSet {
  readonly version: typeof projectChangeSetVersion;
  readonly id: string;
  readonly baseRevision: ProjectRevision;
  readonly intent: SourceChangeIntent;
  readonly affectedIds: readonly string[];
  readonly edits: readonly ProjectSourceTextEdit[];
}

export interface ProposedProjectSourceChangeSetInput {
  readonly id: string;
  readonly intent: SourceChangeIntent;
  readonly affectedIds: readonly string[];
  readonly edits: readonly ProjectSourceTextEdit[];
}

export interface ProposedSourceChangeSet {
  readonly version: typeof sourceChangeSetVersion;
  readonly id: string;
  readonly baseRevision: SourceRevision;
  readonly intent: SourceChangeIntent;
  readonly affectedIds: readonly string[];
  readonly edits: readonly SourceTextEdit[];
}

export interface ProposedSourceChangeSetInput {
  readonly id: string;
  readonly intent: SourceChangeIntent;
  readonly affectedIds: readonly string[];
  readonly edits: readonly SourceTextEdit[];
}

export type SourceChangeIssueCode =
  | "C4ML-SOURCE-CHANGE-001"
  | "C4ML-SOURCE-CHANGE-002"
  | "C4ML-SOURCE-CHANGE-003"
  | "C4ML-SOURCE-CHANGE-004"
  | "C4ML-SOURCE-CHANGE-005";

export type ProjectSourceChangeIssueCode =
  | "C4ML-SOURCE-CHANGE-101"
  | "C4ML-SOURCE-CHANGE-102"
  | "C4ML-SOURCE-CHANGE-103"
  | "C4ML-SOURCE-CHANGE-104"
  | "C4ML-SOURCE-CHANGE-105"
  | "C4ML-SOURCE-CHANGE-106";

export interface SourceChangeIssue {
  readonly code: SourceChangeIssueCode;
  readonly message: string;
  readonly editIndex?: number;
}

export interface ProjectSourceChangeIssue {
  readonly code: ProjectSourceChangeIssueCode;
  readonly message: string;
  readonly documentUri?: string;
  readonly editIndex?: number;
}

export type SourceChangeApplication =
  | {
      readonly valid: true;
      readonly source: string;
      readonly revision: SourceRevision;
      readonly issues: readonly [];
    }
  | {
      readonly valid: false;
      readonly issues: readonly SourceChangeIssue[];
    };

export type SourceChangePreview<Evaluation> =
  | {
      readonly valid: true;
      readonly source: string;
      readonly revision: SourceRevision;
      readonly evaluation: Evaluation;
      readonly issues: readonly [];
    }
  | {
      readonly valid: false;
      readonly issues: readonly SourceChangeIssue[];
    };

export type ProjectSourceChangeApplication =
  | {
      readonly valid: true;
      readonly project: ArchitectureProjectInput;
      readonly revision: ProjectRevision;
      readonly issues: readonly [];
    }
  | {
      readonly valid: false;
      readonly issues: readonly ProjectSourceChangeIssue[];
    };

export type ProjectSourceChangePreview<Evaluation> =
  | {
      readonly valid: true;
      readonly project: ArchitectureProjectInput;
      readonly revision: ProjectRevision;
      readonly evaluation: Evaluation;
      readonly issues: readonly [];
    }
  | {
      readonly valid: false;
      readonly issues: readonly ProjectSourceChangeIssue[];
    };

export function createSourceRevision(source: string): SourceRevision {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= BigInt(source.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * prime);
  }
  return {
    algorithm: sourceRevisionAlgorithm,
    hash: hash.toString(16).padStart(16, "0"),
    length: source.length,
  };
}

export function createProjectRevision(
  project: ArchitectureProjectInput,
): ProjectRevision {
  const documents = [...project.documents]
    .sort((left, right) => compareText(left.uri, right.uri))
    .map((document) => ({
      uri: document.uri,
      revision: createSourceRevision(document.text),
    }));
  const canonical = [
    `${project.version}:${project.id.length}:${project.id}`,
    `${project.name?.length ?? -1}:${project.name ?? ""}`,
    `${project.description?.length ?? -1}:${project.description ?? ""}`,
    `${project.policy?.uri.length ?? -1}:${project.policy?.uri ?? ""}`,
    `${project.policy?.source.length ?? -1}:${
      project.policy === undefined
        ? ""
        : createSourceRevision(project.policy.source).hash
    }`,
    `${project.observations?.uri.length ?? -1}:${project.observations?.uri ?? ""}`,
    `${project.observations?.source.length ?? -1}:${
      project.observations === undefined
        ? ""
        : createSourceRevision(project.observations.source).hash
    }`,
    `${project.glossary?.uri.length ?? -1}:${project.glossary?.uri ?? ""}`,
    `${project.glossary?.source.length ?? -1}:${
      project.glossary === undefined
        ? ""
        : createSourceRevision(project.glossary.source).hash
    }`,
    ...(project.narratives ?? []).map((resource) =>
      `narrative:${resource.uri.length}:${resource.uri}:${resource.source.length}:${createSourceRevision(resource.source).hash}`
    ),
    ...documents.map(
      ({ uri, revision }) =>
        `${uri.length}:${uri}:${revision.length}:${revision.hash}`,
    ),
  ].join("\n");
  return {
    algorithm: projectRevisionAlgorithm,
    hash: createSourceRevision(canonical).hash,
    documents,
  };
}

export function createProposedSourceChangeSet(
  source: string,
  input: ProposedSourceChangeSetInput,
): ProposedSourceChangeSet {
  return {
    version: sourceChangeSetVersion,
    id: input.id,
    baseRevision: createSourceRevision(source),
    intent: { ...input.intent },
    affectedIds: stableUnique(input.affectedIds),
    edits: [...input.edits].map((edit) => ({ ...edit })).sort(compareEdits),
  };
}

export function createProposedProjectSourceChangeSet(
  project: ArchitectureProjectInput,
  input: ProposedProjectSourceChangeSetInput,
): ProposedProjectSourceChangeSet {
  return {
    version: projectChangeSetVersion,
    id: input.id,
    baseRevision: createProjectRevision(project),
    intent: { ...input.intent },
    affectedIds: stableUnique(input.affectedIds),
    edits: [...input.edits]
      .map((edit) => ({ ...edit }))
      .sort(compareProjectEdits),
  };
}

export function isProposedProjectSourceChangeSet(
  value: unknown,
): value is ProposedProjectSourceChangeSet {
  if (!isRecord(value)) {
    return false;
  }
  return (
    value["version"] === projectChangeSetVersion &&
    typeof value["id"] === "string" &&
    isProjectRevision(value["baseRevision"]) &&
    isSourceChangeIntent(value["intent"]) &&
    isStringArray(value["affectedIds"]) &&
    Array.isArray(value["edits"]) &&
    value["edits"].every(isProjectSourceTextEdit)
  );
}

export function isProposedSourceChangeSet(
  value: unknown,
): value is ProposedSourceChangeSet {
  if (!isRecord(value)) {
    return false;
  }
  return (
    value["version"] === sourceChangeSetVersion &&
    typeof value["id"] === "string" &&
    isSourceRevision(value["baseRevision"]) &&
    isSourceChangeIntent(value["intent"]) &&
    isStringArray(value["affectedIds"]) &&
    Array.isArray(value["edits"]) &&
    value["edits"].every(isSourceTextEdit)
  );
}

export function isProjectRevision(value: unknown): value is ProjectRevision {
  if (!isRecord(value)) {
    return false;
  }
  return (
    value["algorithm"] === projectRevisionAlgorithm &&
    typeof value["hash"] === "string" &&
    Array.isArray(value["documents"]) &&
    value["documents"].every(
      (document) =>
        isRecord(document) &&
        typeof document["uri"] === "string" &&
        isSourceRevision(document["revision"]),
    )
  );
}

export function isProjectSourceChangeIssue(
  value: unknown,
): value is ProjectSourceChangeIssue {
  if (!isRecord(value)) {
    return false;
  }
  return (
    (value["code"] === "C4ML-SOURCE-CHANGE-101" ||
      value["code"] === "C4ML-SOURCE-CHANGE-102" ||
      value["code"] === "C4ML-SOURCE-CHANGE-103" ||
      value["code"] === "C4ML-SOURCE-CHANGE-104" ||
      value["code"] === "C4ML-SOURCE-CHANGE-105" ||
      value["code"] === "C4ML-SOURCE-CHANGE-106") &&
    typeof value["message"] === "string" &&
    (value["documentUri"] === undefined ||
      typeof value["documentUri"] === "string") &&
    (value["editIndex"] === undefined ||
      Number.isSafeInteger(value["editIndex"]))
  );
}

export function applySourceChangeSet(
  source: string,
  changeSet: ProposedSourceChangeSet,
): SourceChangeApplication {
  const issues = validateSourceChangeSet(source, changeSet);
  if (issues.length > 0) {
    return { valid: false, issues };
  }

  let result = source;
  for (const edit of [...changeSet.edits].reverse()) {
    result =
      result.slice(0, edit.startOffset) +
      edit.text +
      result.slice(edit.endOffset);
  }
  return {
    valid: true,
    source: result,
    revision: createSourceRevision(result),
    issues: [],
  };
}

export function applyProjectSourceChangeSet(
  project: ArchitectureProjectInput,
  changeSet: ProposedProjectSourceChangeSet,
): ProjectSourceChangeApplication {
  const issues = validateProjectSourceChangeSet(project, changeSet);
  if (issues.length > 0) {
    return { valid: false, issues };
  }

  const documents = project.documents.map((document) => {
    let text = document.text;
    const edits = changeSet.edits.filter(
      ({ documentUri }) => documentUri === document.uri,
    );
    for (const edit of [...edits].reverse()) {
      text =
        text.slice(0, edit.startOffset) +
        edit.text +
        text.slice(edit.endOffset);
    }
    return { uri: document.uri, text };
  });
  const updated = createArchitectureProjectInput({
    id: project.id,
    ...(project.name === undefined ? {} : { name: project.name }),
    ...(project.description === undefined
      ? {}
      : { description: project.description }),
    documents,
    ...(project.policy === undefined ? {} : { policy: project.policy }),
    ...(project.observations === undefined
      ? {}
      : { observations: project.observations }),
    ...(project.glossary === undefined ? {} : { glossary: project.glossary }),
    ...(project.narratives === undefined ? {} : { narratives: project.narratives }),
  });
  return {
    valid: true,
    project: updated,
    revision: createProjectRevision(updated),
    issues: [],
  };
}

export async function previewSourceChangeSet<Evaluation>(
  source: string,
  changeSet: ProposedSourceChangeSet,
  evaluate: (candidateSource: string) => Evaluation | Promise<Evaluation>,
): Promise<SourceChangePreview<Evaluation>> {
  const application = applySourceChangeSet(source, changeSet);
  if (!application.valid) {
    return application;
  }
  return {
    valid: true,
    source: application.source,
    revision: application.revision,
    evaluation: await evaluate(application.source),
    issues: [],
  };
}

export async function previewProjectSourceChangeSet<Evaluation>(
  project: ArchitectureProjectInput,
  changeSet: ProposedProjectSourceChangeSet,
  evaluate: (
    candidateProject: ArchitectureProjectInput,
  ) => Evaluation | Promise<Evaluation>,
): Promise<ProjectSourceChangePreview<Evaluation>> {
  const application = applyProjectSourceChangeSet(project, changeSet);
  if (!application.valid) {
    return application;
  }
  return {
    valid: true,
    project: application.project,
    revision: application.revision,
    evaluation: await evaluate(application.project),
    issues: [],
  };
}

export function validateSourceChangeSet(
  source: string,
  changeSet: ProposedSourceChangeSet,
): SourceChangeIssue[] {
  const issues: SourceChangeIssue[] = [];
  if (
    changeSet.version !== sourceChangeSetVersion ||
    changeSet.id.trim().length === 0 ||
    changeSet.intent.id.trim().length === 0 ||
    changeSet.intent.summary.trim().length === 0
  ) {
    issues.push({
      code: "C4ML-SOURCE-CHANGE-001",
      message:
        "A source change set requires the supported version and non-empty identity and intent.",
    });
  }
  if (!sameRevision(createSourceRevision(source), changeSet.baseRevision)) {
    issues.push({
      code: "C4ML-SOURCE-CHANGE-002",
      message:
        "The proposed source change was created for another source revision.",
    });
  }
  if (
    changeSet.affectedIds.length === 0 ||
    changeSet.affectedIds.some((id) => id.trim().length === 0) ||
    stableUnique(changeSet.affectedIds).length !== changeSet.affectedIds.length
  ) {
    issues.push({
      code: "C4ML-SOURCE-CHANGE-003",
      message:
        "A source change set requires unique non-empty affected stable identities.",
    });
  }
  if (changeSet.edits.length === 0) {
    issues.push({
      code: "C4ML-SOURCE-CHANGE-004",
      message: "A source change set requires at least one text edit.",
    });
    return issues;
  }

  let previous: SourceTextEdit | undefined;
  for (const [index, edit] of changeSet.edits.entries()) {
    if (
      !Number.isInteger(edit.startOffset) ||
      !Number.isInteger(edit.endOffset) ||
      edit.startOffset < 0 ||
      edit.endOffset < edit.startOffset ||
      edit.endOffset > source.length ||
      (previous !== undefined &&
        (edit.startOffset < previous.endOffset ||
          edit.startOffset === previous.startOffset))
    ) {
      issues.push({
        code: "C4ML-SOURCE-CHANGE-005",
        message: `Source edit ${index} has an invalid, overlapping, or non-canonical range.`,
        editIndex: index,
      });
    }
    previous = edit;
  }
  return issues;
}

export function validateProjectSourceChangeSet(
  project: ArchitectureProjectInput,
  changeSet: ProposedProjectSourceChangeSet,
): ProjectSourceChangeIssue[] {
  const issues: ProjectSourceChangeIssue[] = [];
  if (
    changeSet.version !== projectChangeSetVersion ||
    changeSet.id.trim().length === 0 ||
    changeSet.intent.id.trim().length === 0 ||
    changeSet.intent.summary.trim().length === 0
  ) {
    issues.push({
      code: "C4ML-SOURCE-CHANGE-101",
      message:
        "A project source change set requires the supported version and non-empty identity and intent.",
    });
  }
  if (
    !sameProjectRevision(createProjectRevision(project), changeSet.baseRevision)
  ) {
    issues.push({
      code: "C4ML-SOURCE-CHANGE-102",
      message:
        "The proposed project source change was created for another project revision.",
    });
  }
  if (
    changeSet.affectedIds.length === 0 ||
    changeSet.affectedIds.some((id) => id.trim().length === 0) ||
    stableUnique(changeSet.affectedIds).length !== changeSet.affectedIds.length
  ) {
    issues.push({
      code: "C4ML-SOURCE-CHANGE-103",
      message:
        "A project source change set requires unique non-empty affected stable identities.",
    });
  }
  if (changeSet.edits.length === 0) {
    issues.push({
      code: "C4ML-SOURCE-CHANGE-104",
      message: "A project source change set requires at least one text edit.",
    });
    return issues;
  }

  const documentByUri = new Map(
    project.documents.map((document) => [document.uri, document] as const),
  );
  const previousByUri = new Map<string, ProjectSourceTextEdit>();
  for (const [index, edit] of changeSet.edits.entries()) {
    const document = documentByUri.get(edit.documentUri);
    if (document === undefined) {
      issues.push({
        code: "C4ML-SOURCE-CHANGE-105",
        message: `Source edit ${index} targets unknown project document "${edit.documentUri}".`,
        documentUri: edit.documentUri,
        editIndex: index,
      });
      continue;
    }
    const previous = previousByUri.get(edit.documentUri);
    if (
      !Number.isInteger(edit.startOffset) ||
      !Number.isInteger(edit.endOffset) ||
      edit.startOffset < 0 ||
      edit.endOffset < edit.startOffset ||
      edit.endOffset > document.text.length ||
      (previous !== undefined &&
        (edit.startOffset < previous.endOffset ||
          edit.startOffset === previous.startOffset))
    ) {
      issues.push({
        code: "C4ML-SOURCE-CHANGE-106",
        message: `Source edit ${index} has an invalid, overlapping, or non-canonical range in "${edit.documentUri}".`,
        documentUri: edit.documentUri,
        editIndex: index,
      });
    }
    previousByUri.set(edit.documentUri, edit);
  }
  return issues;
}

function sameRevision(left: SourceRevision, right: SourceRevision): boolean {
  return (
    left.algorithm === right.algorithm &&
    left.hash === right.hash &&
    left.length === right.length
  );
}

function sameProjectRevision(
  left: ProjectRevision,
  right: ProjectRevision,
): boolean {
  return (
    left.algorithm === right.algorithm &&
    left.hash === right.hash &&
    left.documents.length === right.documents.length &&
    left.documents.every((document, index) => {
      const candidate = right.documents[index];
      return (
        candidate !== undefined &&
        document.uri === candidate.uri &&
        sameRevision(document.revision, candidate.revision)
      );
    })
  );
}

function stableUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareText);
}

function compareEdits(left: SourceTextEdit, right: SourceTextEdit): number {
  return (
    left.startOffset - right.startOffset ||
    left.endOffset - right.endOffset ||
    compareText(left.text, right.text)
  );
}

function compareProjectEdits(
  left: ProjectSourceTextEdit,
  right: ProjectSourceTextEdit,
): number {
  return (
    compareText(left.documentUri, right.documentUri) ||
    compareEdits(left, right)
  );
}

function isSourceRevision(value: unknown): value is SourceRevision {
  return (
    isRecord(value) &&
    value["algorithm"] === sourceRevisionAlgorithm &&
    typeof value["hash"] === "string" &&
    Number.isSafeInteger(value["length"]) &&
    (value["length"] as number) >= 0
  );
}

function isSourceChangeIntent(value: unknown): value is SourceChangeIntent {
  return (
    isRecord(value) &&
    typeof value["id"] === "string" &&
    (value["kind"] === "architecture" ||
      value["kind"] === "layout" ||
      value["kind"] === "policy" ||
      value["kind"] === "route") &&
    typeof value["summary"] === "string"
  );
}

function isProjectSourceTextEdit(
  value: unknown,
): value is ProjectSourceTextEdit {
  return (
    isRecord(value) &&
    typeof value["documentUri"] === "string" &&
    Number.isSafeInteger(value["startOffset"]) &&
    Number.isSafeInteger(value["endOffset"]) &&
    typeof value["text"] === "string"
  );
}

function isSourceTextEdit(value: unknown): value is SourceTextEdit {
  return (
    isRecord(value) &&
    Number.isSafeInteger(value["startOffset"]) &&
    Number.isSafeInteger(value["endOffset"]) &&
    typeof value["text"] === "string"
  );
}

function isStringArray(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
