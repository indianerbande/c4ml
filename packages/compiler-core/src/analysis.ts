import type { ArchitectureGraphItemKey } from "./architecture-graph.js";
import type { DiagnosticSeverity } from "./diagnostics.js";
import { compareText } from "./ordering.js";
import type { SourceReference } from "./source.js";
import type { ProposedSourceChangeSet } from "./source-changes.js";

export type AnalysisEvidenceOrigin = "authored" | "derived" | "observed";

export interface AnalysisEvidence {
  readonly id: string;
  readonly origin: AnalysisEvidenceOrigin;
  readonly subjectKey: ArchitectureGraphItemKey;
  readonly statement: string;
  readonly source?: SourceReference;
  readonly adapterId?: string;
  readonly observedAt?: string;
}

export interface AnalysisFinding {
  readonly id: string;
  readonly ruleId: string;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly subjectKeys: readonly ArchitectureGraphItemKey[];
  readonly evidence: readonly AnalysisEvidence[];
  readonly sourceLocations: readonly SourceReference[];
  readonly correction?: ProposedSourceChangeSet;
}

export interface AnalysisFindingInput {
  readonly id: string;
  readonly ruleId: string;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly subjectKeys: readonly ArchitectureGraphItemKey[];
  readonly evidence: readonly AnalysisEvidence[];
  readonly sourceLocations?: readonly SourceReference[];
  readonly correction?: ProposedSourceChangeSet;
}

export type ArchitectureQueryResultKind =
  | "containment"
  | "deployment"
  | "downstream"
  | "path"
  | "upstream"
  | "view-coverage";

export interface ArchitectureQueryResult {
  readonly queryId: string;
  readonly resultKind: ArchitectureQueryResultKind;
  readonly itemKeys: readonly ArchitectureGraphItemKey[];
  readonly relationshipKeys: readonly ArchitectureGraphItemKey[];
  readonly evidence: readonly AnalysisEvidence[];
}

export class AnalysisContractError extends Error {
  constructor(
    readonly code:
      | "C4ML-ANALYSIS-001"
      | "C4ML-ANALYSIS-002"
      | "C4ML-ANALYSIS-003",
    message: string,
  ) {
    super(message);
    this.name = "AnalysisContractError";
  }
}

export function createAnalysisFinding(
  input: AnalysisFindingInput,
): AnalysisFinding {
  requireText(input.id, "finding identity");
  requireText(input.ruleId, "rule identity");
  requireText(input.message, "finding message");
  const subjectKeys = stableUnique(input.subjectKeys);
  if (subjectKeys.length === 0 || subjectKeys.length !== input.subjectKeys.length) {
    throw new AnalysisContractError(
      "C4ML-ANALYSIS-002",
      "An analysis finding requires unique affected architecture identities.",
    );
  }
  const evidence = input.evidence.map(validateEvidence);
  if (
    evidence.length === 0 ||
    new Set(evidence.map(({ id }) => id)).size !== evidence.length
  ) {
    throw new AnalysisContractError(
      "C4ML-ANALYSIS-003",
      "An analysis finding requires a non-empty evidence path with unique identities.",
    );
  }
  return {
    id: input.id,
    ruleId: input.ruleId,
    severity: input.severity,
    message: input.message,
    subjectKeys,
    evidence,
    sourceLocations: stableSources(input.sourceLocations ?? []),
    ...(input.correction === undefined ? {} : { correction: input.correction }),
  };
}

export function createArchitectureQueryResult(
  input: ArchitectureQueryResult,
): ArchitectureQueryResult {
  requireText(input.queryId, "query identity");
  const evidence = input.evidence.map(validateEvidence);
  if (new Set(evidence.map(({ id }) => id)).size !== evidence.length) {
    throw new AnalysisContractError(
      "C4ML-ANALYSIS-003",
      "Architecture query evidence identities must be unique.",
    );
  }
  return {
    queryId: input.queryId,
    resultKind: input.resultKind,
    itemKeys: stableUnique(input.itemKeys),
    relationshipKeys: stableUnique(input.relationshipKeys),
    evidence,
  };
}

function validateEvidence(evidence: AnalysisEvidence): AnalysisEvidence {
  requireText(evidence.id, "evidence identity");
  requireText(evidence.statement, "evidence statement");
  if (
    evidence.origin === "observed" &&
    (evidence.adapterId?.trim().length === 0 ||
      evidence.adapterId === undefined ||
      evidence.observedAt?.trim().length === 0 ||
      evidence.observedAt === undefined)
  ) {
    throw new AnalysisContractError(
      "C4ML-ANALYSIS-003",
      `Observed evidence ${evidence.id} requires adapter identity and observation time.`,
    );
  }
  return {
    id: evidence.id,
    origin: evidence.origin,
    subjectKey: evidence.subjectKey,
    statement: evidence.statement,
    ...(evidence.source === undefined ? {} : { source: cloneSource(evidence.source) }),
    ...(evidence.adapterId === undefined ? {} : { adapterId: evidence.adapterId }),
    ...(evidence.observedAt === undefined ? {} : { observedAt: evidence.observedAt }),
  };
}

function requireText(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new AnalysisContractError(
      "C4ML-ANALYSIS-001",
      `Analysis ${label} must not be empty.`,
    );
  }
}

function stableUnique<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values)].sort(compareText);
}

function stableSources(values: readonly SourceReference[]): SourceReference[] {
  return values
    .map(cloneSource)
    .sort(
      (left, right) =>
        compareText(left.file, right.file) ||
        left.range.start.offset - right.range.start.offset ||
        left.range.end.offset - right.range.end.offset,
    );
}

function cloneSource(source: SourceReference): SourceReference {
  return {
    file: source.file,
    range: {
      start: { ...source.range.start },
      end: { ...source.range.end },
    },
  };
}
