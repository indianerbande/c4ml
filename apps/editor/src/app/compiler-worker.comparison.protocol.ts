import {
  isArchitectureDifference,
  type ArchitectureDifference,
} from "@c4ml/compiler-core";

import {
  isCompilerWorkerProject,
  type CompilerWorkerDiagnostic,
  type CompilerWorkerProject,
} from "./compiler-worker.compile.protocol.js";
import {
  compilerWorkerProtocolVersion,
  isPositiveRequestId,
} from "./compiler-worker.shared.js";

export interface ComparisonWorkerInput {
  readonly file: string;
  readonly source: string;
  readonly project?: CompilerWorkerProject;
}

export interface ComparisonWorkerRequest {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "compare";
  readonly requestId: number;
  readonly before: ComparisonWorkerInput;
  readonly after: ComparisonWorkerInput;
}

export interface ComparisonWorkerDiagnostics {
  readonly before: readonly CompilerWorkerDiagnostic[];
  readonly after: readonly CompilerWorkerDiagnostic[];
}

export interface ComparisonWorkerResponse {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "comparison-result";
  readonly requestId: number;
  readonly status: "failed" | "invalid" | "valid";
  readonly diagnostics: ComparisonWorkerDiagnostics;
  readonly difference: ArchitectureDifference | undefined;
}

export function isComparisonWorkerRequest(
  value: unknown,
): value is ComparisonWorkerRequest {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<ComparisonWorkerRequest>;
  return (
    candidate.protocolVersion === compilerWorkerProtocolVersion &&
    candidate.type === "compare" &&
    isPositiveRequestId(candidate.requestId) &&
    isComparisonWorkerInput(candidate.before) &&
    isComparisonWorkerInput(candidate.after)
  );
}

export function isComparisonWorkerResponse(
  value: unknown,
): value is ComparisonWorkerResponse {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<ComparisonWorkerResponse>;
  return (
    candidate.protocolVersion === compilerWorkerProtocolVersion &&
    candidate.type === "comparison-result" &&
    isPositiveRequestId(candidate.requestId) &&
    (candidate.status === "failed" ||
      candidate.status === "invalid" ||
      candidate.status === "valid") &&
    isComparisonWorkerDiagnostics(candidate.diagnostics) &&
    (candidate.status === "valid"
      ? isArchitectureDifference(candidate.difference)
      : candidate.difference === undefined)
  );
}

function isComparisonWorkerInput(
  value: unknown,
): value is ComparisonWorkerInput {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<ComparisonWorkerInput>;
  return (
    typeof candidate.file === "string" &&
    typeof candidate.source === "string" &&
    (candidate.project === undefined ||
      (isCompilerWorkerProject(candidate.project) &&
        candidate.project.documents.some(
          ({ uri, source }) =>
            uri === candidate.file && source === candidate.source,
        )))
  );
}

function isComparisonWorkerDiagnostics(
  value: unknown,
): value is ComparisonWorkerDiagnostics {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<ComparisonWorkerDiagnostics>;
  return Array.isArray(candidate.before) && Array.isArray(candidate.after);
}
