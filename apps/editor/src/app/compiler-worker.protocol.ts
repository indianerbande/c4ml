import { isAnalysisWorkerRequest, isAnalysisWorkerResponse, type AnalysisWorkerRequest, type AnalysisWorkerResponse } from "./compiler-worker.analysis.protocol.js";
import {
  isPreviewProjectChangeWorkerRequest,
  isPreviewProjectChangeWorkerResponse,
  isPreviewPlacementChangeWorkerRequest,
  isPreviewPlacementChangeWorkerResponse,
  isPreviewRouteChangeWorkerRequest,
  isPreviewRouteChangeWorkerResponse,
  isWizardWorkerRequest,
  isWizardWorkerResponse,
  type PreviewProjectChangeWorkerRequest,
  type PreviewProjectChangeWorkerResponse,
  type PreviewPlacementChangeWorkerRequest,
  type PreviewPlacementChangeWorkerResponse,
  type PreviewRouteChangeWorkerRequest,
  type PreviewRouteChangeWorkerResponse,
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
import { isInspectSemanticAuthoringWorkerRequest, isInspectSemanticAuthoringWorkerResponse, isPreviewSemanticChangeWorkerRequest, isPreviewSemanticChangeWorkerResponse, type InspectSemanticAuthoringWorkerRequest, type InspectSemanticAuthoringWorkerResponse, type PreviewSemanticChangeWorkerRequest, type PreviewSemanticChangeWorkerResponse } from "./compiler-worker.semantic-authoring.protocol.js";
export * from "./compiler-worker.authoring.protocol.js"; export * from "./compiler-worker.analysis.protocol.js";
export * from "./compiler-worker.compile.protocol.js"; export * from "./compiler-worker.language.protocol.js";
export * from "./compiler-worker.semantic-authoring.protocol.js"; export * from "./compiler-worker.shared.js";
export type CompilerWorkerInbound =
  | AnalysisWorkerRequest
  | CompilerWorkerRequest
  | CompletionWorkerRequest
  | HelpWorkerRequest
  | HighlightWorkerRequest
  | InspectSemanticAuthoringWorkerRequest
  | PreviewPlacementChangeWorkerRequest
  | PreviewProjectChangeWorkerRequest
  | PreviewRouteChangeWorkerRequest
  | PreviewSemanticChangeWorkerRequest
  | WizardWorkerRequest;
export type CompilerWorkerOutbound =
  | AnalysisWorkerResponse
  | CompilerWorkerResponse
  | CompletionWorkerResponse
  | HelpWorkerResponse
  | HighlightWorkerResponse
  | InspectSemanticAuthoringWorkerResponse
  | PreviewPlacementChangeWorkerResponse
  | PreviewProjectChangeWorkerResponse
  | PreviewRouteChangeWorkerResponse
  | PreviewSemanticChangeWorkerResponse
  | WizardWorkerResponse;
export function isCompilerWorkerInbound(value: unknown): value is CompilerWorkerInbound {
  return (
    isAnalysisWorkerRequest(value) ||
    isCompilerWorkerRequest(value) ||
    isCompletionWorkerRequest(value) ||
    isHelpWorkerRequest(value) ||
    isHighlightWorkerRequest(value) ||
    isInspectSemanticAuthoringWorkerRequest(value) ||
    isPreviewPlacementChangeWorkerRequest(value) ||
    isPreviewProjectChangeWorkerRequest(value) ||
    isPreviewRouteChangeWorkerRequest(value) ||
    isPreviewSemanticChangeWorkerRequest(value) ||
    isWizardWorkerRequest(value)
  );
}
export function isCompilerWorkerOutbound(value: unknown): value is CompilerWorkerOutbound {
  return (
    isAnalysisWorkerResponse(value) ||
    isCompilerWorkerResponse(value) ||
    isCompletionWorkerResponse(value) ||
    isHelpWorkerResponse(value) ||
    isHighlightWorkerResponse(value) ||
    isInspectSemanticAuthoringWorkerResponse(value) ||
    isPreviewPlacementChangeWorkerResponse(value) ||
    isPreviewProjectChangeWorkerResponse(value) ||
    isPreviewRouteChangeWorkerResponse(value) ||
    isPreviewSemanticChangeWorkerResponse(value) ||
    isWizardWorkerResponse(value)
  );
}
