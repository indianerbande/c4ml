import { compareText } from "./ordering.js";

export const sourceChangeSetVersion = 1 as const;
export const sourceRevisionAlgorithm = "c4ml-fnv1a64-utf16-v1" as const;

export interface SourceRevision {
  readonly algorithm: typeof sourceRevisionAlgorithm;
  readonly hash: string;
  readonly length: number;
}

export type SourceChangeIntentKind =
  | "architecture"
  | "layout"
  | "policy"
  | "route";

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

export interface SourceChangeIssue {
  readonly code: SourceChangeIssueCode;
  readonly message: string;
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
    edits: [...input.edits]
      .map((edit) => ({ ...edit }))
      .sort(compareEdits),
  };
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
    result = result.slice(0, edit.startOffset) + edit.text + result.slice(edit.endOffset);
  }
  return {
    valid: true,
    source: result,
    revision: createSourceRevision(result),
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
      message: "A source change set requires the supported version and non-empty identity and intent.",
    });
  }
  if (!sameRevision(createSourceRevision(source), changeSet.baseRevision)) {
    issues.push({
      code: "C4ML-SOURCE-CHANGE-002",
      message: "The proposed source change was created for another source revision.",
    });
  }
  if (
    changeSet.affectedIds.length === 0 ||
    changeSet.affectedIds.some((id) => id.trim().length === 0) ||
    stableUnique(changeSet.affectedIds).length !== changeSet.affectedIds.length
  ) {
    issues.push({
      code: "C4ML-SOURCE-CHANGE-003",
      message: "A source change set requires unique non-empty affected stable identities.",
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

function sameRevision(left: SourceRevision, right: SourceRevision): boolean {
  return (
    left.algorithm === right.algorithm &&
    left.hash === right.hash &&
    left.length === right.length
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
