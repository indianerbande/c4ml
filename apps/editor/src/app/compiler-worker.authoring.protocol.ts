import type {
  C4mlPlacementAuthoringIssue,
  C4mlPlacementEditRequest,
  C4mlRouteAuthoringIssue,
  C4mlRouteEditRequest,
  C4mlRouteRepair,
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
  readonly extension?: {
    readonly file: string;
    readonly project: CompilerWorkerProject;
  };
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

export interface PreviewPlacementChangeWorkerRequest {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "preview-placement-change";
  readonly requestId: number;
  readonly file: string;
  readonly project: CompilerWorkerProject;
  readonly placement: C4mlPlacementEditRequest;
  readonly requestedViewId?: string;
}

export interface PreviewPlacementChangeWorkerResponse {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "preview-placement-change-result";
  readonly requestId: number;
  readonly status: "failed" | "invalid" | "valid";
  readonly changeSet: ProposedProjectSourceChangeSet | undefined;
  readonly documentUri: string | undefined;
  readonly proposedText: string | undefined;
  readonly candidateProject: CompilerWorkerProject | undefined;
  readonly compilation: CompilerWorkerResponse | undefined;
  readonly authoringIssues: readonly C4mlPlacementAuthoringIssue[];
  readonly changeIssues: readonly ProjectSourceChangeIssue[];
  readonly message: string | undefined;
}

export interface PreviewRouteChangeWorkerRequest {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "preview-route-change";
  readonly requestId: number;
  readonly file: string;
  readonly project: CompilerWorkerProject;
  readonly route: C4mlRouteEditRequest;
  readonly requestedViewId?: string;
}

export interface PreviewRouteChangeWorkerResponse {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "preview-route-change-result";
  readonly requestId: number;
  readonly status: "failed" | "invalid" | "valid";
  readonly changeSet: ProposedProjectSourceChangeSet | undefined;
  readonly documentUri: string | undefined;
  readonly proposedText: string | undefined;
  readonly candidateProject: CompilerWorkerProject | undefined;
  readonly compilation: CompilerWorkerResponse | undefined;
  readonly repairs: readonly C4mlRouteRepair[];
  readonly authoringIssues: readonly C4mlRouteAuthoringIssue[];
  readonly changeIssues: readonly ProjectSourceChangeIssue[];
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
    isWizardAnswers(candidate.answers) &&
    (candidate.extension === undefined ||
      (typeof candidate.extension === "object" &&
        candidate.extension !== null &&
        typeof candidate.extension.file === "string" &&
        isCompilerWorkerProject(candidate.extension.project) &&
        candidate.extension.project.documents.some(
          ({ uri }) => uri === candidate.extension?.file,
        )))
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

export function isPreviewPlacementChangeWorkerRequest(
  value: unknown,
): value is PreviewPlacementChangeWorkerRequest {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<PreviewPlacementChangeWorkerRequest>;
  return (
    candidate.protocolVersion === compilerWorkerProtocolVersion &&
    candidate.type === "preview-placement-change" &&
    isPositiveRequestId(candidate.requestId) &&
    typeof candidate.file === "string" &&
    isCompilerWorkerProject(candidate.project) &&
    candidate.project.documents.some(({ uri }) => uri === candidate.file) &&
    isPlacementEditRequest(candidate.placement) &&
    (candidate.requestedViewId === undefined ||
      typeof candidate.requestedViewId === "string")
  );
}

export function isPreviewRouteChangeWorkerRequest(
  value: unknown,
): value is PreviewRouteChangeWorkerRequest {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<PreviewRouteChangeWorkerRequest>;
  return (
    candidate.protocolVersion === compilerWorkerProtocolVersion &&
    candidate.type === "preview-route-change" &&
    isPositiveRequestId(candidate.requestId) &&
    typeof candidate.file === "string" &&
    isCompilerWorkerProject(candidate.project) &&
    candidate.project.documents.some(({ uri }) => uri === candidate.file) &&
    isRouteEditRequest(candidate.route) &&
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

export function isPreviewPlacementChangeWorkerResponse(
  value: unknown,
): value is PreviewPlacementChangeWorkerResponse {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<PreviewPlacementChangeWorkerResponse>;
  const common =
    candidate.protocolVersion === compilerWorkerProtocolVersion &&
    candidate.type === "preview-placement-change-result" &&
    isPositiveRequestId(candidate.requestId) &&
    (candidate.status === "failed" ||
      candidate.status === "invalid" ||
      candidate.status === "valid") &&
    Array.isArray(candidate.authoringIssues) &&
    candidate.authoringIssues.every(isPlacementAuthoringIssue) &&
    Array.isArray(candidate.changeIssues) &&
    candidate.changeIssues.every(isProjectSourceChangeIssue) &&
    (candidate.message === undefined || typeof candidate.message === "string");
  if (!common) return false;

  if (candidate.changeSet === undefined) {
    return (
      candidate.documentUri === undefined &&
      candidate.proposedText === undefined &&
      candidate.candidateProject === undefined &&
      candidate.compilation === undefined &&
      ((candidate.status === "failed" && typeof candidate.message === "string") ||
        (candidate.status === "invalid" &&
          candidate.authoringIssues.length + candidate.changeIssues.length > 0))
    );
  }
  const hasProposal =
    isProposedProjectSourceChangeSet(candidate.changeSet) &&
    typeof candidate.documentUri === "string" &&
    typeof candidate.proposedText === "string" &&
    candidate.authoringIssues.length === 0;
  if (!hasProposal) return false;
  if (candidate.candidateProject === undefined) {
    return (
      candidate.compilation === undefined &&
      ((candidate.status === "invalid" &&
        candidate.changeIssues.length > 0 &&
        candidate.message === undefined) ||
        (candidate.status === "failed" &&
          candidate.changeIssues.length === 0 &&
          typeof candidate.message === "string"))
    );
  }
  return (
    isCompilerWorkerProject(candidate.candidateProject) &&
    isCompilerWorkerResponse(candidate.compilation) &&
    candidate.compilation.requestId === candidate.requestId &&
    candidate.compilation.status === candidate.status &&
    candidate.changeIssues.length === 0 &&
    candidate.message === undefined
  );
}

export function isPreviewRouteChangeWorkerResponse(
  value: unknown,
): value is PreviewRouteChangeWorkerResponse {
  if (!isRecord(value)) return false;
  const candidate = value as Partial<PreviewRouteChangeWorkerResponse>;
  const common =
    candidate.protocolVersion === compilerWorkerProtocolVersion &&
    candidate.type === "preview-route-change-result" &&
    isPositiveRequestId(candidate.requestId) &&
    (candidate.status === "failed" ||
      candidate.status === "invalid" ||
      candidate.status === "valid") &&
    Array.isArray(candidate.repairs) &&
    candidate.repairs.every(isRouteRepair) &&
    Array.isArray(candidate.authoringIssues) &&
    candidate.authoringIssues.every(isRouteAuthoringIssue) &&
    Array.isArray(candidate.changeIssues) &&
    candidate.changeIssues.every(isProjectSourceChangeIssue) &&
    (candidate.message === undefined || typeof candidate.message === "string");
  if (!common) return false;

  if (candidate.changeSet === undefined) {
    return (
      candidate.documentUri === undefined &&
      candidate.proposedText === undefined &&
      candidate.candidateProject === undefined &&
      candidate.compilation === undefined &&
      ((candidate.status === "failed" && typeof candidate.message === "string") ||
        (candidate.status === "invalid" &&
          candidate.authoringIssues.length + candidate.changeIssues.length > 0))
    );
  }
  const hasProposal =
    isProposedProjectSourceChangeSet(candidate.changeSet) &&
    typeof candidate.documentUri === "string" &&
    typeof candidate.proposedText === "string" &&
    candidate.authoringIssues.length === 0;
  if (!hasProposal) return false;
  if (candidate.candidateProject === undefined) {
    return (
      candidate.compilation === undefined &&
      ((candidate.status === "invalid" &&
        candidate.changeIssues.length > 0 &&
        candidate.message === undefined) ||
        (candidate.status === "failed" &&
          candidate.changeIssues.length === 0 &&
          typeof candidate.message === "string"))
    );
  }
  return (
    isCompilerWorkerProject(candidate.candidateProject) &&
    isCompilerWorkerResponse(candidate.compilation) &&
    candidate.compilation.requestId === candidate.requestId &&
    candidate.compilation.status === candidate.status &&
    candidate.changeIssues.length === 0 &&
    candidate.message === undefined
  );
}

function isPlacementEditRequest(value: unknown): value is C4mlPlacementEditRequest {
  if (!isRecord(value)) return false;
  const intent = value["intent"];
  const operation = value["operation"];
  return (
    typeof value["id"] === "string" &&
    value["id"].length > 0 &&
    typeof value["viewId"] === "string" &&
    value["viewId"].length > 0 &&
    isRecord(intent) &&
    typeof intent["id"] === "string" &&
    intent["kind"] === "layout" &&
    typeof intent["summary"] === "string" &&
    isPlacementOperation(operation)
  );
}

function isRouteEditRequest(value: unknown): value is C4mlRouteEditRequest {
  if (!isRecord(value)) return false;
  const intent = value["intent"];
  const operation = value["operation"];
  return (
    isId(value["id"]) &&
    isId(value["viewId"]) &&
    isRecord(intent) &&
    isId(intent["id"]) &&
    intent["kind"] === "route" &&
    typeof intent["summary"] === "string" &&
    isRouteOperation(operation)
  );
}

function isRouteOperation(value: unknown): boolean {
  if (!isRecord(value) || !isId(value["relationshipId"])) return false;
  switch (value["kind"]) {
    case "ports":
      return isRoutePort(value["sourcePort"]) && isRoutePort(value["targetPort"]);
    case "add-waypoint":
      return isIntegerPoint(value["point"]);
    case "move-waypoint":
      return (
        Number.isSafeInteger(value["waypointIndex"]) &&
        Number(value["waypointIndex"]) >= 0 &&
        isIntegerPoint(value["delta"])
      );
    case "label-offset":
      return isIntegerPoint(value["offset"]);
    case "remove-waypoint":
      return Number.isSafeInteger(value["waypointIndex"]) && Number(value["waypointIndex"]) >= 0;
    case "clear-guidance":
      return true;
    default:
      return false;
  }
}

function isRoutePort(value: unknown): boolean {
  return ["automatic", "east", "north", "south", "west"].includes(String(value));
}

function isIntegerPoint(value: unknown): boolean {
  return (
    isRecord(value) &&
    Number.isSafeInteger(value["x"]) &&
    Number.isSafeInteger(value["y"])
  );
}

function isPlacementOperation(value: unknown): boolean {
  if (!isRecord(value) || typeof value["kind"] !== "string") return false;
  const strength = value["strength"];
  if (strength !== "hard" && strength !== "soft") return false;
  switch (value["kind"]) {
    case "relative":
      return (
        isId(value["subjectId"]) &&
        isId(value["anchorId"]) &&
        ["above", "below", "left-of", "right-of"].includes(
          String(value["relation"]),
        ) &&
        isGap(value["gap"])
      );
    case "nudge":
      return (
        isId(value["targetId"]) &&
        ["down", "left", "right", "up"].includes(String(value["direction"])) &&
        isGap(value["distance"])
      );
    case "align":
      return (
        isIdArray(value["itemIds"]) &&
        ["bottom", "center-x", "center-y", "left", "right", "top"].includes(
          String(value["alignment"]),
        ) &&
        isId(value["anchorId"])
      );
    case "distribute":
      return (
        isIdArray(value["itemIds"]) &&
        (value["orientation"] === "horizontal" ||
          value["orientation"] === "vertical") &&
        isGap(value["gap"])
      );
    case "pin":
      return (
        isId(value["targetId"]) &&
        Number.isSafeInteger(value["x"]) &&
        Number.isSafeInteger(value["y"])
      );
    default:
      return false;
  }
}

function isPlacementAuthoringIssue(
  value: unknown,
): value is C4mlPlacementAuthoringIssue {
  return (
    isRecord(value) &&
    [
      "C4ML-AUTHORING-001",
      "C4ML-AUTHORING-005",
      "C4ML-AUTHORING-006",
      "C4ML-AUTHORING-007",
    ].includes(String(value["code"])) &&
    typeof value["message"] === "string"
  );
}

function isRouteAuthoringIssue(value: unknown): value is C4mlRouteAuthoringIssue {
  return (
    isRecord(value) &&
    [
      "C4ML-AUTHORING-101",
      "C4ML-AUTHORING-102",
      "C4ML-AUTHORING-103",
      "C4ML-AUTHORING-104",
    ].includes(String(value["code"])) &&
    typeof value["message"] === "string"
  );
}

function isRouteRepair(value: unknown): value is C4mlRouteRepair {
  return (
    isRecord(value) &&
    [
      "C4ML-ROUTE-REPAIR-001",
      "C4ML-ROUTE-REPAIR-002",
      "C4ML-ROUTE-REPAIR-003",
      "C4ML-ROUTE-REPAIR-004",
    ].includes(String(value["code"])) &&
    typeof value["message"] === "string"
  );
}

function isGap(value: unknown): boolean {
  return value === "tiny" || value === "small" || value === "normal" || value === "large";
}

function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isIdArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(isId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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
