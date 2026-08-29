import {
  isAnalysisWorkerRequest,
  isAnalysisWorkerResponse,
  type AnalysisWorkerRequest,
  type AnalysisWorkerResponse,
} from "./compiler-worker.analysis.protocol.js";
import {
  isPreviewProjectChangeWorkerRequest,
  isPreviewProjectChangeWorkerResponse,
  isWizardWorkerRequest,
  isWizardWorkerResponse,
  type PreviewProjectChangeWorkerRequest,
  type PreviewProjectChangeWorkerResponse,
  type WizardWorkerRequest,
  type WizardWorkerResponse,
} from "./compiler-worker.authoring.protocol.js";
import {
  isCompilerWorkerRequest,
  isCompilerWorkerResponse,
  type CompilerWorkerRequest,
  type CompilerWorkerResponse,
} from "./compiler-worker.compile.protocol.js";
import {
  isCompletionWorkerRequest,
  isCompletionWorkerResponse,
  isHelpWorkerRequest,
  isHelpWorkerResponse,
  isHighlightWorkerRequest,
  isHighlightWorkerResponse,
  type CompletionWorkerRequest,
  type CompletionWorkerResponse,
  type HelpWorkerRequest,
  type HelpWorkerResponse,
  type HighlightWorkerRequest,
  type HighlightWorkerResponse,
} from "./compiler-worker.language.protocol.js";

export * from "./compiler-worker.authoring.protocol.js";
export * from "./compiler-worker.analysis.protocol.js";
export * from "./compiler-worker.compile.protocol.js";
export * from "./compiler-worker.language.protocol.js";
export * from "./compiler-worker.shared.js";

export type CompilerWorkerInbound =
  | AnalysisWorkerRequest
  | CompilerWorkerRequest
  | CompletionWorkerRequest
  | HelpWorkerRequest
  | HighlightWorkerRequest
  | PreviewProjectChangeWorkerRequest
  | WizardWorkerRequest;

export type CompilerWorkerOutbound =
  | AnalysisWorkerResponse
  | CompilerWorkerResponse
  | CompletionWorkerResponse
  | HelpWorkerResponse
  | HighlightWorkerResponse
  | PreviewProjectChangeWorkerResponse
  | WizardWorkerResponse;

export function isCompilerWorkerInbound(
  value: unknown,
): value is CompilerWorkerInbound {
  return (
    isAnalysisWorkerRequest(value) ||
    isCompilerWorkerRequest(value) ||
    isCompletionWorkerRequest(value) ||
    isHelpWorkerRequest(value) ||
    isHighlightWorkerRequest(value) ||
    isPreviewProjectChangeWorkerRequest(value) ||
    isWizardWorkerRequest(value)
  );
}

export function isCompilerWorkerOutbound(
  value: unknown,
): value is CompilerWorkerOutbound {
  return (
    isAnalysisWorkerResponse(value) ||
    isCompilerWorkerResponse(value) ||
    isCompletionWorkerResponse(value) ||
    isHelpWorkerResponse(value) ||
    isHighlightWorkerResponse(value) ||
    isPreviewProjectChangeWorkerResponse(value) ||
    isWizardWorkerResponse(value)
  );
}
