import { DestroyRef, Injectable, inject, signal } from "@angular/core";

import {
  isCompilerWorkerResponse,
  type CompilerWorkerProject,
  type CompilerWorkerResponse,
} from "./compiler-worker.compile.protocol.js";
import {
  isCompletionWorkerResponse,
  isHighlightWorkerResponse,
  isHelpWorkerResponse,
  type CompletionWorkerCandidate,
  type CompletionWorkerResponse,
  type HighlightWorkerResponse,
  type HighlightWorkerSpan,
  type HelpWorkerResponse,
} from "./compiler-worker.language.protocol.js";
import {
  isWizardWorkerResponse,
  type WizardWorkerResponse,
} from "./compiler-worker.authoring.protocol.js";
import {
  EditorCompilationSession,
  EditorCompletionSession,
  EditorHighlightSession,
  EditorHelpSession,
  EditorRequestSequence,
  EditorWizardGenerationSession,
  type EditorCompilationState,
  type EditorCompletionState,
  type EditorHelpState,
  type EditorWizardGenerationState,
} from "./editor-session.js";
import type { C4mlSystemContextWizardAnswers } from "@c4ml/language-c4ml";

@Injectable({ providedIn: "root" })
export class CompilerWorkerClient {
  readonly #sequence = new EditorRequestSequence();
  readonly #session = new EditorCompilationSession(this.#sequence);
  readonly #completionSession = new EditorCompletionSession(this.#sequence);
  readonly #highlightSession = new EditorHighlightSession(this.#sequence);
  readonly #helpSession = new EditorHelpSession(this.#sequence);
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
  readonly help = signal<EditorHelpState>(this.#helpSession.state);
  #activeFile = "editor.c4ml";
  #activeProject: CompilerWorkerProject | undefined;

  constructor() {
    this.#worker.addEventListener("message", this.#onMessage);
    this.#worker.addEventListener("error", this.#onError);
    inject(DestroyRef).onDestroy(() => {
      this.#worker.removeEventListener("message", this.#onMessage);
      this.#worker.removeEventListener("error", this.#onError);
      this.#worker.terminate();
    });
  }

  compile(
    source: string,
    requestedViewId?: string,
    file = "editor.c4ml",
  ): void {
    this.#activeFile = file;
    this.#activeProject = undefined;
    const request = this.#session.begin(source, file, requestedViewId);
    this.state.set(this.#session.state);
    this.#worker.postMessage(request);
  }

  compileProject(
    project: CompilerWorkerProject,
    activeFile: string,
    requestedViewId?: string,
  ): void {
    this.#activeFile = activeFile;
    this.#activeProject = project;
    const request = this.#session.beginProject(
      project,
      activeFile,
      requestedViewId,
    );
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
      this.#activeFile,
      this.#activeProject,
    );
    this.completion.set(this.#completionSession.state);
    this.#worker.postMessage(request);
    return result;
  }

  highlight(source: string): Promise<readonly HighlightWorkerSpan[]> {
    const { request, result } = this.#highlightSession.beginAsync(
      source,
      this.#activeFile,
    );
    this.#worker.postMessage(request);
    return result;
  }

  resolveHelpContext(source: string, offset: number): void {
    const request = this.#helpSession.begin(source, offset, this.#activeFile);
    this.help.set(this.#helpSession.state);
    this.#worker.postMessage(request);
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
    } else if (isHighlightWorkerResponse(event.data)) {
      this.#acceptHighlight(event.data);
    } else if (isHelpWorkerResponse(event.data)) {
      this.#acceptHelp(event.data);
    } else if (isWizardWorkerResponse(event.data)) {
      this.#acceptWizard(event.data);
    }
  };

  readonly #onError = (): void => {
    this.#session.failActive("The compiler worker stopped unexpectedly.");
    this.#completionSession.failActive(
      "The language worker stopped unexpectedly.",
    );
    this.#highlightSession.failActive();
    this.#helpSession.failActive("The language worker stopped unexpectedly.");
    this.#wizardSession.failActive("The source generator stopped unexpectedly.");
    this.state.set(this.#session.state);
    this.completion.set(this.#completionSession.state);
    this.wizard.set(this.#wizardSession.state);
    this.help.set(this.#helpSession.state);
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

  #acceptHighlight(response: HighlightWorkerResponse): void {
    this.#highlightSession.accept(response);
  }

  #acceptHelp(response: HelpWorkerResponse): void {
    if (this.#helpSession.accept(response)) {
      this.help.set(this.#helpSession.state);
    }
  }

  #acceptWizard(response: WizardWorkerResponse): void {
    if (this.#wizardSession.accept(response)) {
      this.wizard.set(this.#wizardSession.state);
    }
  }
}
