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
  isPreviewPlacementChangeWorkerResponse,
  isWizardWorkerResponse,
  type PreviewPlacementChangeWorkerResponse,
  type WizardWorkerResponse,
} from "./compiler-worker.authoring.protocol.js";
import {
  EditorCompilationSession,
  EditorCompletionSession,
  EditorHighlightSession,
  EditorHelpSession,
  EditorPlacementPreviewSession,
  EditorRequestSequence,
  EditorWizardGenerationSession,
  type EditorCompilationState,
  type EditorCompletionState,
  type EditorHelpState,
  type EditorPlacementPreviewState,
  type EditorWizardGenerationState,
} from "./editor-session.js";
import type {
  C4mlPlacementEditRequest,
  C4mlSystemContextWizardAnswers,
} from "@c4ml/language-c4ml";

@Injectable({ providedIn: "root" })
export class CompilerWorkerClient {
  readonly #sequence = new EditorRequestSequence();
  readonly #session = new EditorCompilationSession(this.#sequence);
  readonly #completionSession = new EditorCompletionSession(this.#sequence);
  readonly #highlightSession = new EditorHighlightSession(this.#sequence);
  readonly #helpSession = new EditorHelpSession(this.#sequence);
  readonly #wizardSession = new EditorWizardGenerationSession(this.#sequence);
  readonly #placementSession = new EditorPlacementPreviewSession(this.#sequence);
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
  readonly placement = signal<EditorPlacementPreviewState>(
    this.#placementSession.state,
  );
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

  previewPlacementChange(
    project: CompilerWorkerProject,
    file: string,
    placement: C4mlPlacementEditRequest,
    requestedViewId?: string,
  ): Promise<PreviewPlacementChangeWorkerResponse | undefined> {
    const { request, result } = this.#placementSession.beginAsync(
      project,
      file,
      placement,
      requestedViewId,
    );
    this.placement.set(this.#placementSession.state);
    this.#worker.postMessage(request);
    return result;
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
    } else if (isPreviewPlacementChangeWorkerResponse(event.data)) {
      this.#acceptPlacement(event.data);
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
    this.#placementSession.failActive(
      "The placement preview worker stopped unexpectedly.",
    );
    this.state.set(this.#session.state);
    this.completion.set(this.#completionSession.state);
    this.wizard.set(this.#wizardSession.state);
    this.help.set(this.#helpSession.state);
    this.placement.set(this.#placementSession.state);
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

  #acceptPlacement(response: PreviewPlacementChangeWorkerResponse): void {
    if (this.#placementSession.accept(response)) {
      this.placement.set(this.#placementSession.state);
    }
  }
}
