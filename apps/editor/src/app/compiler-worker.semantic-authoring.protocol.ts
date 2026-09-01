import type {
  C4mlSemanticAuthoringContext,
  C4mlSemanticAuthoringIssue,
  C4mlSemanticEditRequest,
} from "@c4ml/language-c4ml";
import {
  isProjectSourceChangeIssue,
  isProposedProjectSourceChangeSet,
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

export interface InspectSemanticAuthoringWorkerRequest {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "inspect-semantic-authoring";
  readonly requestId: number;
  readonly file: string;
  readonly project: CompilerWorkerProject;
  readonly viewId: string;
}

export interface InspectSemanticAuthoringWorkerResponse {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "semantic-authoring-context-result";
  readonly requestId: number;
  readonly status: "failed" | "invalid" | "valid";
  readonly context: C4mlSemanticAuthoringContext | undefined;
  readonly issues: readonly C4mlSemanticAuthoringIssue[];
  readonly message: string | undefined;
}

export interface PreviewSemanticChangeWorkerRequest {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "preview-semantic-change";
  readonly requestId: number;
  readonly file: string;
  readonly project: CompilerWorkerProject;
  readonly semantic: C4mlSemanticEditRequest;
  readonly requestedViewId?: string;
}

export interface PreviewSemanticChangeWorkerResponse {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "preview-semantic-change-result";
  readonly requestId: number;
  readonly status: "failed" | "invalid" | "valid";
  readonly changeSet: ProposedProjectSourceChangeSet | undefined;
  readonly documentUri: string | undefined;
  readonly proposedText: string | undefined;
  readonly candidateProject: CompilerWorkerProject | undefined;
  readonly compilation: CompilerWorkerResponse | undefined;
  readonly authoringIssues: readonly C4mlSemanticAuthoringIssue[];
  readonly changeIssues: readonly ProjectSourceChangeIssue[];
  readonly message: string | undefined;
}

export function isInspectSemanticAuthoringWorkerRequest(
  value: unknown,
): value is InspectSemanticAuthoringWorkerRequest {
  if (!isRecord(value)) return false;
  return (
    value["protocolVersion"] === compilerWorkerProtocolVersion &&
    value["type"] === "inspect-semantic-authoring" &&
    isPositiveRequestId(value["requestId"]) &&
    typeof value["file"] === "string" &&
    isCompilerWorkerProject(value["project"]) &&
    value["project"].documents.some(({ uri }) => uri === value["file"]) &&
    isId(value["viewId"])
  );
}

export function isInspectSemanticAuthoringWorkerResponse(
  value: unknown,
): value is InspectSemanticAuthoringWorkerResponse {
  if (!isRecord(value)) return false;
  const issues = value["issues"];
  const common =
    value["protocolVersion"] === compilerWorkerProtocolVersion &&
    value["type"] === "semantic-authoring-context-result" &&
    isPositiveRequestId(value["requestId"]) &&
    isStatus(value["status"]) &&
    Array.isArray(issues) &&
    issues.every(isSemanticAuthoringIssue) &&
    (value["message"] === undefined || typeof value["message"] === "string");
  if (!common) return false;
  return value["status"] === "valid"
    ? isSemanticAuthoringContext(value["context"]) &&
        issues.length === 0 &&
        value["message"] === undefined
    : value["context"] === undefined &&
        (issues.length > 0 || typeof value["message"] === "string");
}

export function isPreviewSemanticChangeWorkerRequest(
  value: unknown,
): value is PreviewSemanticChangeWorkerRequest {
  if (!isRecord(value)) return false;
  return (
    value["protocolVersion"] === compilerWorkerProtocolVersion &&
    value["type"] === "preview-semantic-change" &&
    isPositiveRequestId(value["requestId"]) &&
    typeof value["file"] === "string" &&
    isCompilerWorkerProject(value["project"]) &&
    value["project"].documents.some(({ uri }) => uri === value["file"]) &&
    isSemanticEditRequest(value["semantic"]) &&
    (value["requestedViewId"] === undefined || isId(value["requestedViewId"]))
  );
}

export function isPreviewSemanticChangeWorkerResponse(
  value: unknown,
): value is PreviewSemanticChangeWorkerResponse {
  if (!isRecord(value)) return false;
  const authoringIssues = value["authoringIssues"];
  const changeIssues = value["changeIssues"];
  const common =
    value["protocolVersion"] === compilerWorkerProtocolVersion &&
    value["type"] === "preview-semantic-change-result" &&
    isPositiveRequestId(value["requestId"]) &&
    isStatus(value["status"]) &&
    Array.isArray(authoringIssues) &&
    authoringIssues.every(isSemanticAuthoringIssue) &&
    Array.isArray(changeIssues) &&
    changeIssues.every(isProjectSourceChangeIssue) &&
    (value["message"] === undefined || typeof value["message"] === "string");
  if (!common) return false;
  if (value["changeSet"] === undefined) {
    return (
      value["documentUri"] === undefined &&
      value["proposedText"] === undefined &&
      value["candidateProject"] === undefined &&
      value["compilation"] === undefined &&
      (authoringIssues.length + changeIssues.length > 0 ||
        typeof value["message"] === "string")
    );
  }
  if (
    !isProposedProjectSourceChangeSet(value["changeSet"]) ||
    typeof value["documentUri"] !== "string" ||
    typeof value["proposedText"] !== "string" ||
    authoringIssues.length > 0
  ) return false;
  if (value["candidateProject"] === undefined) {
    return (
      value["compilation"] === undefined &&
      (changeIssues.length > 0 || typeof value["message"] === "string")
    );
  }
  return (
    isCompilerWorkerProject(value["candidateProject"]) &&
    isCompilerWorkerResponse(value["compilation"]) &&
    value["compilation"].requestId === value["requestId"] &&
    value["compilation"].status === value["status"] &&
    changeIssues.length === 0 &&
    value["message"] === undefined
  );
}

function isSemanticEditRequest(value: unknown): value is C4mlSemanticEditRequest {
  if (!isRecord(value) || !isRecord(value["intent"]) || !isRecord(value["operation"])) return false;
  return (
    isId(value["id"]) &&
    isId(value["viewId"]) &&
    isId(value["intent"]["id"]) &&
    value["intent"]["kind"] === "architecture" &&
    typeof value["intent"]["summary"] === "string" &&
    isSemanticOperation(value["operation"])
  );
}

function isSemanticOperation(value: Record<string, unknown>): boolean {
  if (value["kind"] === "create-element") {
    return (
      isSemanticKind(value["elementKind"]) &&
      isId(value["elementId"]) &&
      typeof value["name"] === "string" &&
      typeof value["responsibility"] === "string" &&
      optionalString(value["ownerId"]) &&
      (value["classification"] === undefined || value["classification"] === "internal" || value["classification"] === "external") &&
      optionalString(value["technology"]) &&
      optionalString(value["codeKind"]) &&
      optionalString(value["language"])
    );
  }
  if (value["kind"] === "create-relationship") {
    return isId(value["relationshipId"]) && isId(value["sourceId"]) &&
      isId(value["targetId"]) && typeof value["intent"] === "string" &&
      optionalString(value["technology"]) && optionalString(value["protocol"]);
  }
  if (value["kind"] === "create-deployment-item") {
    return isDeploymentItemKind(value["itemKind"]) &&
      isId(value["itemId"]) && optionalString(value["name"]) &&
      optionalString(value["responsibility"]) && optionalString(value["technology"]) &&
      optionalString(value["parentNodeId"]) && optionalString(value["nodeId"]) &&
      optionalString(value["elementId"]);
  }
  return value["kind"] === "create-dynamic-interaction" &&
    isId(value["interactionId"]) &&
    typeof value["order"] === "number" && Number.isSafeInteger(value["order"]) &&
    isId(value["relationshipId"]) && typeof value["intent"] === "string" &&
    optionalString(value["parallelGroup"]);
}

function isSemanticAuthoringContext(value: unknown): value is C4mlSemanticAuthoringContext {
  if (!isRecord(value)) return false;
  return isId(value["viewId"]) && isViewKind(value["viewKind"]) &&
    optionalString(value["scopeId"]) && Array.isArray(value["createActions"]) &&
    value["createActions"].every((action) => isRecord(action) && isSemanticKind(action["kind"]) && optionalString(action["ownerId"]) && optionalString(action["ownerLabel"])) &&
    Array.isArray(value["elements"]) && value["elements"].every((element) => isRecord(element) && isId(element["id"]) && typeof element["label"] === "string" && isSemanticKind(element["kind"]) && optionalString(element["ownerId"])) &&
    Array.isArray(value["connectionOptions"]) && value["connectionOptions"].every((option) => isRecord(option) && isId(option["sourceId"]) && Array.isArray(option["targetIds"]) && option["targetIds"].every(isId)) &&
    (value["deployment"] === undefined || isDeploymentContext(value["deployment"])) &&
    (value["dynamic"] === undefined || isDynamicContext(value["dynamic"]));
}

function isDeploymentContext(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return isId(value["environmentId"]) && typeof value["environmentLabel"] === "string" &&
    Array.isArray(value["createActions"]) && value["createActions"].every(isDeploymentItemKind) &&
    Array.isArray(value["nodes"]) && value["nodes"].every((node) =>
      isRecord(node) && isId(node["id"]) && typeof node["label"] === "string") &&
    Array.isArray(value["elements"]) && value["elements"].every((element) =>
      isRecord(element) && isId(element["id"]) && typeof element["label"] === "string" &&
      (element["kind"] === "container" || element["kind"] === "software-system"));
}

function isDynamicContext(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return typeof value["nextOrder"] === "number" && Number.isSafeInteger(value["nextOrder"]) &&
    value["nextOrder"] > 0 && Array.isArray(value["relationships"]) &&
    value["relationships"].every((relationship) =>
      isRecord(relationship) && isId(relationship["id"]) &&
      isId(relationship["sourceId"]) && typeof relationship["sourceLabel"] === "string" &&
      isId(relationship["targetId"]) && typeof relationship["targetLabel"] === "string" &&
      typeof relationship["intent"] === "string");
}

function isSemanticAuthoringIssue(value: unknown): value is C4mlSemanticAuthoringIssue {
  return isRecord(value) && ["C4ML-AUTHORING-201", "C4ML-AUTHORING-202", "C4ML-AUTHORING-203", "C4ML-AUTHORING-204", "C4ML-AUTHORING-205"].includes(String(value["code"])) && typeof value["message"] === "string";
}

function isSemanticKind(value: unknown): boolean {
  return ["code-element", "component", "container", "person", "software-system"].includes(String(value));
}

function isDeploymentItemKind(value: unknown): boolean {
  return [
    "container-instance",
    "deployment-node",
    "infrastructure-node",
    "software-system-instance",
  ].includes(String(value));
}

function isViewKind(value: unknown): boolean {
  return ["code", "component", "container", "deployment", "dynamic", "system-context", "system-landscape"].includes(String(value));
}

function isStatus(value: unknown): boolean {
  return value === "failed" || value === "invalid" || value === "valid";
}

function optionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
