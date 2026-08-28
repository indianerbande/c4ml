import { DestroyRef, Injectable, inject, signal } from "@angular/core";

import {
  isCompletionWorkerResponse,
  isCompilerWorkerResponse,
  isWizardWorkerResponse,
  type CompilerWorkerResponse,
  type CompletionWorkerCandidate,
  type CompletionWorkerResponse,
  type WizardWorkerResponse,
} from "./compiler-worker.protocol.js";
import {
  EditorCompilationSession,
  EditorCompletionSession,
  EditorRequestSequence,
  EditorWizardGenerationSession,
  type EditorCompilationState,
  type EditorCompletionState,
  type EditorWizardGenerationState,
} from "./editor-session.js";
import type { C4mlSystemContextWizardAnswers } from "@c4ml/language-c4ml";

@Injectable({ providedIn: "root" })
export class CompilerWorkerClient {
  readonly #sequence = new EditorRequestSequence();
  readonly #session = new EditorCompilationSession(this.#sequence);
  readonly #completionSession = new EditorCompletionSession(this.#sequence);
  readonly #wizardSession = new EditorWizardGenerationSession(this.#sequence);
  readonly #worker = new Worker(new URL("./compiler.worker", import.meta.url), {
    name: "c4ml-compiler",
    type: "module",
  });
  readonly state = signal<EditorCompilationState>(this.#session.state);
  readonly completion = signal<EditorCompletionState>(
    this.#completionSession.state,
  );
  readonly wizard = signal<EditorWizardGenerationState>(
    this.#wizardSession.state,
  );

  constructor() {
    this.#worker.addEventListener("message", this.#onMessage);
    this.#worker.addEventListener("error", this.#onError);
    inject(DestroyRef).onDestroy(() => {
      this.#worker.removeEventListener("message", this.#onMessage);
      this.#worker.removeEventListener("error", this.#onError);
      this.#worker.terminate();
    });
  }

  compile(source: string, requestedViewId?: string): void {
    const request = this.#session.begin(source, "editor.c4ml", requestedViewId);
    this.state.set(this.#session.state);
    this.#worker.postMessage(request);
  }

  complete(
    source: string,
    offset: number,
  ): Promise<readonly CompletionWorkerCandidate[]> {
    const { request, result } = this.#completionSession.beginAsync(
      source,
      offset,
    );
    this.completion.set(this.#completionSession.state);
    this.#worker.postMessage(request);
    return result;
  }

  generateSystemContext(answers: C4mlSystemContextWizardAnswers): void {
    const request = this.#wizardSession.begin(answers);
    this.wizard.set(this.#wizardSession.state);
    this.#worker.postMessage(request);
  }

  readonly #onMessage = (event: MessageEvent<unknown>): void => {
    if (isCompilerWorkerResponse(event.data)) {
      this.#acceptCompilation(event.data);
    } else if (isCompletionWorkerResponse(event.data)) {
      this.#acceptCompletion(event.data);
    } else if (isWizardWorkerResponse(event.data)) {
      this.#acceptWizard(event.data);
    }
  };

  readonly #onError = (): void => {
    this.#session.failActive("The compiler worker stopped unexpectedly.");
    this.#completionSession.failActive(
      "The language worker stopped unexpectedly.",
    );
    this.#wizardSession.failActive("The source generator stopped unexpectedly.");
    this.state.set(this.#session.state);
    this.completion.set(this.#completionSession.state);
    this.wizard.set(this.#wizardSession.state);
  };

  #acceptCompilation(response: CompilerWorkerResponse): void {
    if (this.#session.accept(response)) {
      this.state.set(this.#session.state);
    }
  }

  #acceptCompletion(response: CompletionWorkerResponse): void {
    if (this.#completionSession.accept(response)) {
      this.completion.set(this.#completionSession.state);
    }
  }

  #acceptWizard(response: WizardWorkerResponse): void {
    if (this.#wizardSession.accept(response)) {
      this.wizard.set(this.#wizardSession.state);
    }
  }
}
