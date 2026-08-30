import type { C4mlSemanticEditRequest } from "@c4ml/language-c4ml";

import type { CompilerWorkerProject } from "./compiler-worker.compile.protocol.js";
import type {
  InspectSemanticAuthoringWorkerRequest,
  InspectSemanticAuthoringWorkerResponse,
  PreviewSemanticChangeWorkerRequest,
  PreviewSemanticChangeWorkerResponse,
} from "./compiler-worker.semantic-authoring.protocol.js";
import { compilerWorkerProtocolVersion } from "./compiler-worker.shared.js";
import { EditorRequestSequence } from "./editor-session.js";

export type EditorSemanticAuthoringPhase =
  | "failed"
  | "idle"
  | "invalid"
  | "loading"
  | "valid";

export interface EditorSemanticContextState {
  readonly phase: EditorSemanticAuthoringPhase;
  readonly activeRequestId: number;
  readonly response: InspectSemanticAuthoringWorkerResponse | undefined;
}

export interface EditorSemanticPreviewState {
  readonly phase: EditorSemanticAuthoringPhase;
  readonly activeRequestId: number;
  readonly response: PreviewSemanticChangeWorkerResponse | undefined;
}

export class EditorSemanticContextSession {
  #state: EditorSemanticContextState = {
    phase: "idle",
    activeRequestId: 0,
    response: undefined,
  };
  #resolvePending:
    | ((response: InspectSemanticAuthoringWorkerResponse | undefined) => void)
    | undefined;

  constructor(readonly sequence = new EditorRequestSequence()) {}

  get state(): EditorSemanticContextState {
    return this.#state;
  }

  beginAsync(project: CompilerWorkerProject, file: string, viewId: string) {
    this.#finish(undefined);
    const requestId = this.sequence.next();
    this.#state = { phase: "loading", activeRequestId: requestId, response: undefined };
    const request: InspectSemanticAuthoringWorkerRequest = {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "inspect-semantic-authoring",
      requestId,
      project,
      file,
      viewId,
    };
    const result = new Promise<InspectSemanticAuthoringWorkerResponse | undefined>(
      (resolve) => { this.#resolvePending = resolve; },
    );
    return { request, result };
  }

  accept(response: InspectSemanticAuthoringWorkerResponse): boolean {
    if (response.requestId !== this.#state.activeRequestId) return false;
    this.#state = { phase: response.status, activeRequestId: response.requestId, response };
    this.#finish(response);
    return true;
  }

  failActive(message: string): void {
    const response: InspectSemanticAuthoringWorkerResponse = {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "semantic-authoring-context-result",
      requestId: this.#state.activeRequestId,
      status: "failed",
      context: undefined,
      issues: [],
      message,
    };
    this.#state = { ...this.#state, phase: "failed", response };
    this.#finish(response);
  }

  #finish(response: InspectSemanticAuthoringWorkerResponse | undefined): void {
    const resolve = this.#resolvePending;
    this.#resolvePending = undefined;
    resolve?.(response);
  }
}

export class EditorSemanticPreviewSession {
  #state: EditorSemanticPreviewState = {
    phase: "idle",
    activeRequestId: 0,
    response: undefined,
  };
  #resolvePending:
    | ((response: PreviewSemanticChangeWorkerResponse | undefined) => void)
    | undefined;

  constructor(readonly sequence = new EditorRequestSequence()) {}

  get state(): EditorSemanticPreviewState {
    return this.#state;
  }

  beginAsync(
    project: CompilerWorkerProject,
    file: string,
    semantic: C4mlSemanticEditRequest,
    requestedViewId?: string,
  ) {
    this.#finish(undefined);
    const requestId = this.sequence.next();
    this.#state = { phase: "loading", activeRequestId: requestId, response: undefined };
    const request: PreviewSemanticChangeWorkerRequest = {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "preview-semantic-change",
      requestId,
      project,
      file,
      semantic,
      ...(requestedViewId === undefined ? {} : { requestedViewId }),
    };
    const result = new Promise<PreviewSemanticChangeWorkerResponse | undefined>(
      (resolve) => { this.#resolvePending = resolve; },
    );
    return { request, result };
  }

  accept(response: PreviewSemanticChangeWorkerResponse): boolean {
    if (response.requestId !== this.#state.activeRequestId) return false;
    this.#state = { phase: response.status, activeRequestId: response.requestId, response };
    this.#finish(response);
    return true;
  }

  failActive(message: string): void {
    const response: PreviewSemanticChangeWorkerResponse = {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "preview-semantic-change-result",
      requestId: this.#state.activeRequestId,
      status: "failed",
      changeSet: undefined,
      documentUri: undefined,
      proposedText: undefined,
      candidateProject: undefined,
      compilation: undefined,
      authoringIssues: [],
      changeIssues: [],
      message,
    };
    this.#state = { ...this.#state, phase: "failed", response };
    this.#finish(response);
  }

  #finish(response: PreviewSemanticChangeWorkerResponse | undefined): void {
    const resolve = this.#resolvePending;
    this.#resolvePending = undefined;
    resolve?.(response);
  }
}
