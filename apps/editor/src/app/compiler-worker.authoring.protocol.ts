import type {
  C4mlSystemContextWizardAnswers,
  C4mlWizardIssue,
} from "@c4ml/language-c4ml";
import {
  isProjectRevision,
  isProjectSourceChangeIssue,
  isProposedProjectSourceChangeSet,
  type ProjectRevision,
  type ProjectSourceChangeIssue,
  type ProposedProjectSourceChangeSet,
} from "@c4ml/compiler-core";

import {
  isCompilerWorkerProject,
  isCompilerWorkerResponse,
  type CompilerWorkerProject,
  type CompilerWorkerResponse,
} from "./compiler-worker.compile.protocol.js";

import {
  compilerWorkerProtocolVersion,
  isPositiveRequestId,
} from "./compiler-worker.shared.js";

export interface WizardWorkerRequest {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "generate-system-context";
  readonly requestId: number;
  readonly answers: C4mlSystemContextWizardAnswers;
}

export interface WizardWorkerResponse {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "generation-result";
  readonly requestId: number;
  readonly status: "failed" | "invalid" | "valid";
  readonly source: string | undefined;
  readonly issues: readonly C4mlWizardIssue[];
  readonly message: string | undefined;
}

export interface PreviewProjectChangeWorkerRequest {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "preview-project-change";
  readonly requestId: number;
  readonly file: string;
  readonly project: CompilerWorkerProject;
  readonly changeSet: ProposedProjectSourceChangeSet;
  readonly requestedViewId?: string;
}

export interface PreviewProjectChangeWorkerResponse {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "preview-project-change-result";
  readonly requestId: number;
  readonly status: "failed" | "invalid" | "valid";
  readonly candidateProject: CompilerWorkerProject | undefined;
  readonly revision: ProjectRevision | undefined;
  readonly compilation: CompilerWorkerResponse | undefined;
  readonly issues: readonly ProjectSourceChangeIssue[];
  readonly message: string | undefined;
}

export function isWizardWorkerRequest(
  value: unknown,
): value is WizardWorkerRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<WizardWorkerRequest>;
  return (
    candidate.protocolVersion === compilerWorkerProtocolVersion &&
    candidate.type === "generate-system-context" &&
    isPositiveRequestId(candidate.requestId) &&
    isWizardAnswers(candidate.answers)
  );
}

export function isWizardWorkerResponse(
  value: unknown,
): value is WizardWorkerResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<WizardWorkerResponse>;
  return (
    candidate.protocolVersion === compilerWorkerProtocolVersion &&
    candidate.type === "generation-result" &&
    isPositiveRequestId(candidate.requestId) &&
    (candidate.status === "failed" ||
      candidate.status === "invalid" ||
      candidate.status === "valid") &&
    (candidate.source === undefined || typeof candidate.source === "string") &&
    Array.isArray(candidate.issues) &&
    candidate.issues.every(isWizardIssue) &&
    (candidate.message === undefined ||
      typeof candidate.message === "string") &&
    (candidate.status === "valid"
      ? typeof candidate.source === "string" &&
        candidate.issues.length === 0 &&
        candidate.message === undefined
      : candidate.source === undefined)
  );
}

export function isPreviewProjectChangeWorkerRequest(
  value: unknown,
): value is PreviewProjectChangeWorkerRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<PreviewProjectChangeWorkerRequest>;
  return (
    candidate.protocolVersion === compilerWorkerProtocolVersion &&
    candidate.type === "preview-project-change" &&
    isPositiveRequestId(candidate.requestId) &&
    typeof candidate.file === "string" &&
    isCompilerWorkerProject(candidate.project) &&
    candidate.project.documents.some(({ uri }) => uri === candidate.file) &&
    isProposedProjectSourceChangeSet(candidate.changeSet) &&
    (candidate.requestedViewId === undefined ||
      typeof candidate.requestedViewId === "string")
  );
}

export function isPreviewProjectChangeWorkerResponse(
  value: unknown,
): value is PreviewProjectChangeWorkerResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<PreviewProjectChangeWorkerResponse>;
  const common =
    candidate.protocolVersion === compilerWorkerProtocolVersion &&
    candidate.type === "preview-project-change-result" &&
    isPositiveRequestId(candidate.requestId) &&
    (candidate.status === "failed" ||
      candidate.status === "invalid" ||
      candidate.status === "valid") &&
    Array.isArray(candidate.issues) &&
    candidate.issues.every(isProjectSourceChangeIssue) &&
    (candidate.message === undefined || typeof candidate.message === "string");
  if (!common) {
    return false;
  }
  if (candidate.candidateProject === undefined) {
    return (
      candidate.revision === undefined &&
      candidate.compilation === undefined &&
      ((candidate.status === "invalid" &&
        candidate.issues.length > 0 &&
        candidate.message === undefined) ||
        (candidate.status === "failed" &&
          candidate.issues.length === 0 &&
          typeof candidate.message === "string"))
    );
  }
  return (
    isCompilerWorkerProject(candidate.candidateProject) &&
    isProjectRevision(candidate.revision) &&
    isCompilerWorkerResponse(candidate.compilation) &&
    candidate.compilation.requestId === candidate.requestId &&
    candidate.compilation.status === candidate.status &&
    candidate.issues.length === 0
  );
}

function isWizardAnswers(
  value: unknown,
): value is C4mlSystemContextWizardAnswers {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const answers = value as Partial<C4mlSystemContextWizardAnswers>;
  return (
    (answers.viewKind === "system-context" ||
      answers.viewKind === "container") &&
    typeof answers.personId === "string" &&
    typeof answers.personName === "string" &&
    typeof answers.personResponsibility === "string" &&
    (answers.personClassification === "external" ||
      answers.personClassification === "internal") &&
    typeof answers.systemId === "string" &&
    typeof answers.systemName === "string" &&
    typeof answers.systemResponsibility === "string" &&
    (answers.systemClassification === "external" ||
      answers.systemClassification === "internal") &&
    typeof answers.relationshipId === "string" &&
    typeof answers.relationshipIntent === "string" &&
    typeof answers.entryPartId === "string" &&
    Array.isArray(answers.parts) &&
    answers.parts.every(isWizardPart) &&
    Array.isArray(answers.connections) &&
    answers.connections.every(isWizardConnection) &&
    typeof answers.viewId === "string" &&
    typeof answers.viewTitle === "string" &&
    typeof answers.viewPurpose === "string" &&
    (answers.flow === "down" ||
      answers.flow === "left" ||
      answers.flow === "right" ||
      answers.flow === "up")
  );
}

function isWizardIssue(value: unknown): value is C4mlWizardIssue {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const issue = value as Partial<C4mlWizardIssue>;
  return (
    isWizardField(issue.field) &&
    (issue.code === "C4ML-WIZARD-001" ||
      issue.code === "C4ML-WIZARD-002" ||
      issue.code === "C4ML-WIZARD-003") &&
    typeof issue.message === "string"
  );
}

function isWizardField(value: unknown): value is C4mlWizardIssue["field"] {
  return (
    value === "viewKind" ||
    value === "personId" ||
    value === "personName" ||
    value === "personResponsibility" ||
    value === "personClassification" ||
    value === "systemId" ||
    value === "systemName" ||
    value === "systemResponsibility" ||
    value === "systemClassification" ||
    value === "relationshipId" ||
    value === "relationshipIntent" ||
    value === "entryPartId" ||
    value === "viewId" ||
    value === "viewTitle" ||
    value === "viewPurpose" ||
    value === "flow" ||
    (typeof value === "string" &&
      /^(?:parts|connections)\.\d+\.[A-Za-z][A-Za-z0-9]*$/u.test(value))
  );
}

function isWizardPart(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const part = value as Record<string, unknown>;
  return (
    typeof part["id"] === "string" &&
    typeof part["name"] === "string" &&
    typeof part["responsibility"] === "string" &&
    typeof part["technology"] === "string"
  );
}

function isWizardConnection(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const connection = value as Record<string, unknown>;
  return (
    typeof connection["id"] === "string" &&
    typeof connection["fromId"] === "string" &&
    typeof connection["toId"] === "string" &&
    typeof connection["intent"] === "string" &&
    typeof connection["protocol"] === "string"
  );
}
