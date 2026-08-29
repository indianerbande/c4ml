import {
  isWizardWorkerRequest,
  isWizardWorkerResponse,
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
export * from "./compiler-worker.compile.protocol.js";
export * from "./compiler-worker.language.protocol.js";
export * from "./compiler-worker.shared.js";

export type CompilerWorkerInbound =
  | CompilerWorkerRequest
  | CompletionWorkerRequest
  | HelpWorkerRequest
  | HighlightWorkerRequest
  | WizardWorkerRequest;

export type CompilerWorkerOutbound =
  | CompilerWorkerResponse
  | CompletionWorkerResponse
  | HelpWorkerResponse
  | HighlightWorkerResponse
  | WizardWorkerResponse;

export function isCompilerWorkerInbound(
  value: unknown,
): value is CompilerWorkerInbound {
  return (
    isCompilerWorkerRequest(value) ||
    isCompletionWorkerRequest(value) ||
    isHelpWorkerRequest(value) ||
    isHighlightWorkerRequest(value) ||
    isWizardWorkerRequest(value)
  );
}

export function isCompilerWorkerOutbound(
  value: unknown,
): value is CompilerWorkerOutbound {
  return (
    isCompilerWorkerResponse(value) ||
    isCompletionWorkerResponse(value) ||
    isHelpWorkerResponse(value) ||
    isHighlightWorkerResponse(value) ||
    isWizardWorkerResponse(value)
  );
}
