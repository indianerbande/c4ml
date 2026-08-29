import {
  isArchitectureAnalysisReport,
  type ArchitectureAnalysisReport,
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

export interface AnalysisWorkerRequest {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "analyze";
  readonly requestId: number;
  readonly file: string;
  readonly source: string;
  readonly project?: CompilerWorkerProject;
}

export interface AnalysisWorkerResponse {
  readonly protocolVersion: typeof compilerWorkerProtocolVersion;
  readonly type: "analysis-result";
  readonly requestId: number;
  readonly status: "failed" | "invalid" | "valid";
  readonly diagnostics: readonly CompilerWorkerDiagnostic[];
  readonly report: ArchitectureAnalysisReport | undefined;
}

export function isAnalysisWorkerRequest(
  value: unknown,
): value is AnalysisWorkerRequest {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<AnalysisWorkerRequest>;
  return (
    candidate.protocolVersion === compilerWorkerProtocolVersion &&
    candidate.type === "analyze" &&
    isPositiveRequestId(candidate.requestId) &&
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

export function isAnalysisWorkerResponse(
  value: unknown,
): value is AnalysisWorkerResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<AnalysisWorkerResponse>;
  return (
    candidate.protocolVersion === compilerWorkerProtocolVersion &&
    candidate.type === "analysis-result" &&
    isPositiveRequestId(candidate.requestId) &&
    (candidate.status === "failed" ||
      candidate.status === "invalid" ||
      candidate.status === "valid") &&
    Array.isArray(candidate.diagnostics) &&
    (candidate.status === "valid"
      ? isArchitectureAnalysisReport(candidate.report)
      : candidate.report === undefined)
  );
}
