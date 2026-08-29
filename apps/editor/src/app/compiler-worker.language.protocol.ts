import type {
  C4mlCompletionCandidate,
  C4mlCompletionKind,
  C4mlHelpTopicId,
  C4mlHighlight,
} from "@c4ml/language-c4ml";

import {
  compilerWorkerProtocolVersion,
  isPositiveRequestId,
  isWorkerPosition,
} from "./compiler-worker.shared.js";
import {
  isCompilerWorkerProject,
  type CompilerWorkerProject,
} from "./compiler-worker.compile.protocol.js";

export interface CompletionWorkerRequest {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "complete";
  readonly requestId: number;
  readonly file: string;
  readonly source: string;
  readonly offset: number;
  readonly project?: CompilerWorkerProject;
}

export interface HighlightWorkerRequest {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "highlight";
  readonly requestId: number;
  readonly file: string;
  readonly source: string;
}

export interface HelpWorkerRequest {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "help-context";
  readonly requestId: number;
  readonly file: string;
  readonly source: string;
  readonly offset: number;
}

export interface CompletionWorkerCandidate
  extends Omit<C4mlCompletionCandidate, "kind"> {
  readonly kind: C4mlCompletionKind;
}

export interface CompletionWorkerResponse {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "completion-result";
  readonly requestId: number;
  readonly status: "complete" | "failed";
  readonly candidates: readonly CompletionWorkerCandidate[];
  readonly message: string | undefined;
}

export type HighlightWorkerSpan = C4mlHighlight;

export interface HighlightWorkerResponse {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "highlight-result";
  readonly requestId: number;
  readonly status: "complete" | "failed";
  readonly highlights: readonly HighlightWorkerSpan[];
  readonly message: string | undefined;
}

export interface HelpWorkerResponse {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "help-context-result";
  readonly requestId: number;
  readonly status: "complete" | "failed";
  readonly topicId: C4mlHelpTopicId;
  readonly message: string | undefined;
}

export function isCompletionWorkerRequest(
  value: unknown,
): value is CompletionWorkerRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<CompletionWorkerRequest>;
  return (
    candidate.protocolVersion === compilerWorkerProtocolVersion &&
    candidate.type === "complete" &&
    isPositiveRequestId(candidate.requestId) &&
    typeof candidate.file === "string" &&
    typeof candidate.source === "string" &&
    (candidate.project === undefined ||
      (isCompilerWorkerProject(candidate.project) &&
        candidate.project.documents.some(
          ({ uri, source }) => uri === candidate.file && source === candidate.source,
        ))) &&
    Number.isSafeInteger(candidate.offset) &&
    (candidate.offset ?? -1) >= 0 &&
    (candidate.offset ?? Number.POSITIVE_INFINITY) <= candidate.source.length
  );
}

export function isHighlightWorkerRequest(
  value: unknown,
): value is HighlightWorkerRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<HighlightWorkerRequest>;
  return (
    candidate.protocolVersion === compilerWorkerProtocolVersion &&
    candidate.type === "highlight" &&
    isPositiveRequestId(candidate.requestId) &&
    typeof candidate.file === "string" &&
    typeof candidate.source === "string"
  );
}

export function isHelpWorkerRequest(
  value: unknown,
): value is HelpWorkerRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<HelpWorkerRequest>;
  return (
    candidate.protocolVersion === compilerWorkerProtocolVersion &&
    candidate.type === "help-context" &&
    isPositiveRequestId(candidate.requestId) &&
    typeof candidate.file === "string" &&
    typeof candidate.source === "string" &&
    Number.isSafeInteger(candidate.offset) &&
    (candidate.offset ?? -1) >= 0 &&
    (candidate.offset ?? Number.POSITIVE_INFINITY) <= candidate.source.length
  );
}

export function isCompletionWorkerResponse(
  value: unknown,
): value is CompletionWorkerResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<CompletionWorkerResponse>;
  return (
    candidate.protocolVersion === compilerWorkerProtocolVersion &&
    candidate.type === "completion-result" &&
    isPositiveRequestId(candidate.requestId) &&
    (candidate.status === "complete" || candidate.status === "failed") &&
    Array.isArray(candidate.candidates) &&
    candidate.candidates.every(isCompletionCandidate) &&
    (candidate.message === undefined || typeof candidate.message === "string") &&
    (candidate.status === "complete"
      ? candidate.message === undefined
      : typeof candidate.message === "string")
  );
}

export function isHighlightWorkerResponse(
  value: unknown,
): value is HighlightWorkerResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<HighlightWorkerResponse>;
  return (
    candidate.protocolVersion === compilerWorkerProtocolVersion &&
    candidate.type === "highlight-result" &&
    isPositiveRequestId(candidate.requestId) &&
    (candidate.status === "complete" || candidate.status === "failed") &&
    Array.isArray(candidate.highlights) &&
    candidate.highlights.every(isHighlightSpan) &&
    (candidate.message === undefined || typeof candidate.message === "string") &&
    (candidate.status === "complete"
      ? candidate.message === undefined
      : typeof candidate.message === "string")
  );
}

export function isHelpWorkerResponse(
  value: unknown,
): value is HelpWorkerResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<HelpWorkerResponse>;
  return (
    candidate.protocolVersion === compilerWorkerProtocolVersion &&
    candidate.type === "help-context-result" &&
    isPositiveRequestId(candidate.requestId) &&
    (candidate.status === "complete" || candidate.status === "failed") &&
    isHelpTopicId(candidate.topicId) &&
    (candidate.message === undefined || typeof candidate.message === "string") &&
    (candidate.status === "complete"
      ? candidate.message === undefined
      : typeof candidate.message === "string")
  );
}

function isCompletionCandidate(
  value: unknown,
): value is CompletionWorkerCandidate {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<CompletionWorkerCandidate>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.label === "string" &&
    (candidate.kind === "keyword" ||
      candidate.kind === "property" ||
      candidate.kind === "reference" ||
      candidate.kind === "value") &&
    typeof candidate.detail === "string" &&
    (candidate.documentation === undefined ||
      typeof candidate.documentation === "string") &&
    isCompletionEdit(candidate.edit)
  );
}

function isCompletionEdit(
  value: unknown,
): value is CompletionWorkerCandidate["edit"] {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const edit = value as Partial<CompletionWorkerCandidate["edit"]>;
  return (
    typeof edit.text === "string" &&
    typeof edit.range === "object" &&
    edit.range !== null &&
    isWorkerPosition(edit.range.start) &&
    isWorkerPosition(edit.range.end)
  );
}

function isHighlightSpan(value: unknown): value is HighlightWorkerSpan {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const span = value as Partial<HighlightWorkerSpan>;
  return (
    (span.kind === "comment" ||
      span.kind === "identifier" ||
      span.kind === "keyword" ||
      span.kind === "number" ||
      span.kind === "operator" ||
      span.kind === "string") &&
    typeof span.range === "object" &&
    span.range !== null &&
    isWorkerPosition(span.range.start) &&
    isWorkerPosition(span.range.end) &&
    span.range.start.offset < span.range.end.offset &&
    span.range.start.line === span.range.end.line
  );
}

function isHelpTopicId(value: unknown): value is C4mlHelpTopicId {
  return (
    value === "getting-started" ||
    value === "model" ||
    value === "people" ||
    value === "systems" ||
    value === "containers" ||
    value === "components-code" ||
    value === "relationships" ||
    value === "views" ||
    value === "deployments" ||
    value === "layout" ||
    value === "routes" ||
    value === "export"
  );
}
