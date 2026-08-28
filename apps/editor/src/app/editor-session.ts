import {
  compilerWorkerProtocolVersion,
  type CompilerWorkerDiagnostic,
  type CompilerWorkerRequest,
  type CompilerWorkerResponse,
  type CompilerWorkerView,
  type CompletionWorkerCandidate,
  type CompletionWorkerRequest,
  type CompletionWorkerResponse,
  type WizardWorkerRequest,
  type WizardWorkerResponse,
} from "./compiler-worker.protocol.js";
import type {
  C4mlSystemContextWizardAnswers,
  C4mlWizardIssue,
} from "@c4ml/language-c4ml";

export class EditorRequestSequence {
  #nextRequestId = 0;

  next(): number {
    return ++this.#nextRequestId;
  }
}

export type EditorCompilationPhase =
  | "compiling"
  | "failed"
  | "idle"
  | "invalid"
  | "valid";

export interface EditorCompilationState {
  readonly phase: EditorCompilationPhase;
  readonly activeRequestId: number;
  readonly diagnostics: readonly CompilerWorkerDiagnostic[];
  readonly lastValidSvg: string | undefined;
  readonly views: readonly CompilerWorkerView[];
  readonly activeViewId: string | undefined;
}

const initialState: EditorCompilationState = {
  phase: "idle",
  activeRequestId: 0,
  diagnostics: [],
  lastValidSvg: undefined,
  views: [],
  activeViewId: undefined,
};

export class EditorCompilationSession {
  #state = initialState;

  constructor(
    readonly sequence = new EditorRequestSequence(),
  ) {}

  get state(): EditorCompilationState {
    return this.#state;
  }

  begin(
    source: string,
    file = "editor.c4ml",
    requestedViewId?: string,
  ): CompilerWorkerRequest {
    const requestId = this.sequence.next();
    this.#state = {
      ...this.#state,
      phase: "compiling",
      activeRequestId: requestId,
      diagnostics: [],
    };
    return {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "compile",
      requestId,
      file,
      source,
      ...(requestedViewId === undefined ? {} : { requestedViewId }),
    };
  }

  accept(response: CompilerWorkerResponse): boolean {
    if (response.requestId !== this.#state.activeRequestId) {
      return false;
    }

    this.#state = {
      phase: response.status,
      activeRequestId: response.requestId,
      diagnostics: response.diagnostics,
      lastValidSvg:
        response.status === "valid" && response.svg !== undefined
          ? response.svg
          : this.#state.lastValidSvg,
      views:
        response.views.length > 0 ? response.views : this.#state.views,
      activeViewId: response.activeViewId ?? this.#state.activeViewId,
    };
    return true;
  }

  failActive(message: string): void {
    this.#state = {
      ...this.#state,
      phase: "failed",
      diagnostics: [
        {
          code: "C4ML-EDITOR-001",
          severity: "error",
          message,
          source: undefined,
          correction: "Restart the editor worker and compile again.",
        },
      ],
    };
  }
}

export type EditorCompletionPhase = "failed" | "idle" | "loading" | "ready";

export interface EditorCompletionState {
  readonly phase: EditorCompletionPhase;
  readonly activeRequestId: number;
  readonly offset: number;
  readonly candidates: readonly CompletionWorkerCandidate[];
  readonly message: string | undefined;
}

const initialCompletionState: EditorCompletionState = {
  phase: "idle",
  activeRequestId: 0,
  offset: 0,
  candidates: [],
  message: undefined,
};

export class EditorCompletionSession {
  #state = initialCompletionState;
  #resolvePending:
    | ((candidates: readonly CompletionWorkerCandidate[]) => void)
    | undefined;

  constructor(
    readonly sequence = new EditorRequestSequence(),
  ) {}

  get state(): EditorCompletionState {
    return this.#state;
  }

  begin(
    source: string,
    offset: number,
    file = "editor.c4ml",
  ): CompletionWorkerRequest {
    this.#finishPending([]);
    const requestId = this.sequence.next();
    this.#state = {
      phase: "loading",
      activeRequestId: requestId,
      offset,
      candidates: [],
      message: undefined,
    };
    return {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "complete",
      requestId,
      file,
      source,
      offset,
    };
  }

  beginAsync(
    source: string,
    offset: number,
    file = "editor.c4ml",
  ): {
    readonly request: CompletionWorkerRequest;
    readonly result: Promise<readonly CompletionWorkerCandidate[]>;
  } {
    const request = this.begin(source, offset, file);
    const result = new Promise<readonly CompletionWorkerCandidate[]>(
      (resolve) => {
        this.#resolvePending = resolve;
      },
    );
    return { request, result };
  }

  accept(response: CompletionWorkerResponse): boolean {
    if (response.requestId !== this.#state.activeRequestId) {
      return false;
    }
    this.#state = {
      ...this.#state,
      phase: response.status === "complete" ? "ready" : "failed",
      candidates: response.candidates,
      message: response.message,
    };
    this.#finishPending(
      response.status === "complete" ? response.candidates : [],
    );
    return true;
  }

  failActive(message: string): void {
    this.#state = {
      ...this.#state,
      phase: "failed",
      candidates: [],
      message,
    };
    this.#finishPending([]);
  }

  #finishPending(candidates: readonly CompletionWorkerCandidate[]): void {
    const resolve = this.#resolvePending;
    this.#resolvePending = undefined;
    resolve?.(candidates);
  }
}

export type EditorWizardGenerationPhase =
  | "failed"
  | "idle"
  | "invalid"
  | "loading"
  | "valid";

export interface EditorWizardGenerationState {
  readonly phase: EditorWizardGenerationPhase;
  readonly activeRequestId: number;
  readonly source: string | undefined;
  readonly issues: readonly C4mlWizardIssue[];
  readonly message: string | undefined;
}

const initialWizardGenerationState: EditorWizardGenerationState = {
  phase: "idle",
  activeRequestId: 0,
  source: undefined,
  issues: [],
  message: undefined,
};

export class EditorWizardGenerationSession {
  #state = initialWizardGenerationState;

  constructor(
    readonly sequence = new EditorRequestSequence(),
  ) {}

  get state(): EditorWizardGenerationState {
    return this.#state;
  }

  begin(answers: C4mlSystemContextWizardAnswers): WizardWorkerRequest {
    const requestId = this.sequence.next();
    this.#state = {
      phase: "loading",
      activeRequestId: requestId,
      source: undefined,
      issues: [],
      message: undefined,
    };
    return {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "generate-system-context",
      requestId,
      answers,
    };
  }

  accept(response: WizardWorkerResponse): boolean {
    if (response.requestId !== this.#state.activeRequestId) {
      return false;
    }
    this.#state = {
      phase: response.status,
      activeRequestId: response.requestId,
      source: response.source,
      issues: response.issues,
      message: response.message,
    };
    return true;
  }

  failActive(message: string): void {
    this.#state = {
      ...this.#state,
      phase: "failed",
      source: undefined,
      issues: [],
      message,
    };
  }
}

export class WizardSourceSession {
  #sourceBeforeWizard: string | undefined;
  #undoSource: string | undefined;

  get canUndo(): boolean {
    return this.#undoSource !== undefined;
  }

  start(source: string): void {
    this.#sourceBeforeWizard = source;
  }

  cancel(source: string): string {
    this.#sourceBeforeWizard = undefined;
    return source;
  }

  apply(generatedSource: string): string {
    if (this.#sourceBeforeWizard === undefined) {
      throw new Error("The wizard must be started before applying source.");
    }
    this.#undoSource = this.#sourceBeforeWizard;
    this.#sourceBeforeWizard = undefined;
    return generatedSource;
  }

  undo(source: string): string {
    if (this.#undoSource === undefined) {
      return source;
    }
    const restored = this.#undoSource;
    this.#undoSource = undefined;
    return restored;
  }

  invalidateUndo(): void {
    this.#undoSource = undefined;
  }
}
