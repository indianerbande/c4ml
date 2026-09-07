import { signal } from "@angular/core";

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
  isPreviewRouteChangeWorkerResponse,
  isWizardWorkerResponse,
  type PreviewPlacementChangeWorkerResponse,
  type PreviewRouteChangeWorkerResponse,
  type WizardWorkerResponse,
} from "./compiler-worker.authoring.protocol.js";
import {
  isInspectSemanticAuthoringWorkerResponse,
  isPreviewSemanticChangeWorkerResponse,
  type InspectSemanticAuthoringWorkerResponse,
  type PreviewSemanticChangeWorkerResponse,
} from "./compiler-worker.semantic-authoring.protocol.js";
import {
  EditorCompilationSession,
  EditorCompletionSession,
  EditorHighlightSession,
  EditorHelpSession,
  EditorPlacementPreviewSession,
  EditorRequestSequence,
  EditorRoutePreviewSession,
  EditorWizardGenerationSession,
  type EditorCompilationState,
  type EditorCompletionState,
  type EditorHelpState,
  type EditorPlacementPreviewState,
  type EditorRoutePreviewState,
  type EditorWizardGenerationState,
} from "./editor-session.js";
import {
  EditorSemanticContextSession,
  EditorSemanticPreviewSession,
  type EditorSemanticContextState,
  type EditorSemanticPreviewState,
} from "./editor-semantic-session.js";
import {
  EditorAnalysisSession,
  type EditorAnalysisState,
} from "./editor-analysis-session.js";
import {
  isAnalysisWorkerResponse,
  type AnalysisWorkerResponse,
} from "./compiler-worker.analysis.protocol.js";
import type {
  C4mlPlacementEditRequest,
  C4mlRouteEditRequest,
  C4mlSemanticEditRequest,
  C4mlSystemContextWizardAnswers,
} from "@c4ml/language-c4ml";

export interface CompilerWorkerPort {
  addEventListener(
    type: "error" | "message" | "messageerror",
    listener: EventListener,
  ): void;
  removeEventListener(
    type: "error" | "message" | "messageerror",
    listener: EventListener,
  ): void;
  postMessage(message: unknown): void;
  terminate(): void;
}

export type CompilerWorkerFactory = () => CompilerWorkerPort;

export interface CompilerWorkerRecoveryState {
  readonly phase: "failed" | "ready" | "recovering";
  readonly generation: number;
  readonly message: string | undefined;
}

type ActiveCompilation =
  | {
      readonly kind: "document";
      readonly source: string;
      readonly file: string;
      readonly requestedViewId: string | undefined;
    }
  | {
      readonly kind: "project";
      readonly project: CompilerWorkerProject;
      readonly activeFile: string;
      readonly requestedViewId: string | undefined;
    };

interface ActiveWorker {
  readonly port: CompilerWorkerPort;
  readonly generation: number;
  readonly onMessage: EventListener;
  readonly onFailure: EventListener;
}

export class CompilerWorkerClientCore {
  readonly #sequence = new EditorRequestSequence();
  readonly #session = new EditorCompilationSession(this.#sequence);
  readonly #completionSession = new EditorCompletionSession(this.#sequence);
  readonly #highlightSession = new EditorHighlightSession(this.#sequence);
  readonly #helpSession = new EditorHelpSession(this.#sequence);
  readonly #wizardSession = new EditorWizardGenerationSession(this.#sequence);
  readonly #placementSession = new EditorPlacementPreviewSession(this.#sequence);
  readonly #routeSession = new EditorRoutePreviewSession(this.#sequence);
  readonly #semanticContextSession = new EditorSemanticContextSession(this.#sequence);
  readonly #semanticPreviewSession = new EditorSemanticPreviewSession(this.#sequence);
  readonly #analysisSession = new EditorAnalysisSession(this.#sequence);
  readonly #workerFactory: CompilerWorkerFactory;
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
  readonly route = signal<EditorRoutePreviewState>(this.#routeSession.state);
  readonly semanticContext = signal<EditorSemanticContextState>(
    this.#semanticContextSession.state,
  );
  readonly semanticPreview = signal<EditorSemanticPreviewState>(
    this.#semanticPreviewSession.state,
  );
  readonly analysis = signal<EditorAnalysisState>(this.#analysisSession.state);
  readonly recovery = signal<CompilerWorkerRecoveryState>({
    phase: "ready",
    generation: 0,
    message: undefined,
  });
  #activeFile = "editor.c4ml";
  #activeProject: CompilerWorkerProject | undefined;
  #activeCompilation: ActiveCompilation | undefined;
  #activeWorker: ActiveWorker | undefined;
  #workerGeneration = 0;
  #automaticRecoveryUsed = false;
  #recoveryCompilationAccepted = false;
  #recoveryAnalysisAccepted = false;
  #destroyed = false;

  constructor(workerFactory: CompilerWorkerFactory) {
    this.#workerFactory = workerFactory;
    this.#installWorker("ready");
  }

  destroy(): void {
    this.#destroyed = true;
    this.#retireWorker();
  }

  reset(): void {
    this.#activeFile = "editor.c4ml";
    this.#activeProject = undefined;
    this.#activeCompilation = undefined;
    this.#session.reset();
    this.#analysisSession.reset();
    this.state.set(this.#session.state);
    this.analysis.set(this.#analysisSession.state);
    if (this.#activeWorker !== undefined) {
      this.#automaticRecoveryUsed = false;
      this.recovery.set({
        phase: "ready",
        generation: this.#activeWorker.generation,
        message: undefined,
      });
    }
  }

  compile(
    source: string,
    requestedViewId?: string,
    file = "editor.c4ml",
  ): void {
    this.#activeFile = file;
    this.#activeProject = undefined;
    this.#activeCompilation = {
      kind: "document",
      source,
      file,
      requestedViewId,
    };
    this.#dispatchActiveCompilation();
  }

  compileProject(
    project: CompilerWorkerProject,
    activeFile: string,
    requestedViewId?: string,
  ): void {
    this.#activeFile = activeFile;
    this.#activeProject = project;
    const activeDocument = project.documents.find(({ uri }) => uri === activeFile);
    if (activeDocument === undefined) {
      throw new Error(`Active project document "${activeFile}" does not exist.`);
    }
    this.#activeCompilation = {
      kind: "project",
      project,
      activeFile,
      requestedViewId,
    };
    this.#dispatchActiveCompilation();
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
    this.#postMessage(request);
    return result;
  }

  highlight(source: string): Promise<readonly HighlightWorkerSpan[]> {
    const { request, result } = this.#highlightSession.beginAsync(
      source,
      this.#activeFile,
    );
    this.#postMessage(request);
    return result;
  }

  resolveHelpContext(source: string, offset: number): void {
    const request = this.#helpSession.begin(source, offset, this.#activeFile);
    this.help.set(this.#helpSession.state);
    this.#postMessage(request);
  }

  generateSystemContext(
    answers: C4mlSystemContextWizardAnswers,
    extension?: { readonly file: string; readonly project: CompilerWorkerProject },
  ): void {
    const request = this.#wizardSession.begin(answers, extension);
    this.wizard.set(this.#wizardSession.state);
    this.#postMessage(request);
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
    this.#postMessage(request);
    return result;
  }

  previewRouteChange(
    project: CompilerWorkerProject,
    file: string,
    route: C4mlRouteEditRequest,
    requestedViewId?: string,
  ): Promise<PreviewRouteChangeWorkerResponse | undefined> {
    const { request, result } = this.#routeSession.beginAsync(
      project,
      file,
      route,
      requestedViewId,
    );
    this.route.set(this.#routeSession.state);
    this.#postMessage(request);
    return result;
  }

  inspectSemanticAuthoring(
    project: CompilerWorkerProject,
    file: string,
    viewId: string | undefined,
  ): Promise<InspectSemanticAuthoringWorkerResponse | undefined> {
    const { request, result } = this.#semanticContextSession.beginAsync(
      project,
      file,
      viewId,
    );
    this.semanticContext.set(this.#semanticContextSession.state);
    this.#postMessage(request);
    return result;
  }

  previewSemanticChange(
    project: CompilerWorkerProject,
    file: string,
    semantic: C4mlSemanticEditRequest,
    requestedViewId?: string,
  ): Promise<PreviewSemanticChangeWorkerResponse | undefined> {
    const { request, result } = this.#semanticPreviewSession.beginAsync(
      project,
      file,
      semantic,
      requestedViewId,
    );
    this.semanticPreview.set(this.#semanticPreviewSession.state);
    this.#postMessage(request);
    return result;
  }

  retryWorker(): void {
    if (this.#destroyed || this.recovery().phase === "recovering") return;
    this.#retireWorker();
    this.#automaticRecoveryUsed = true;
    if (!this.#installWorker("recovering")) return;
    if (this.#activeCompilation === undefined) {
      this.#automaticRecoveryUsed = false;
      this.recovery.update((state) => ({
        ...state,
        phase: "ready",
        message: undefined,
      }));
      return;
    }
    this.#dispatchActiveCompilation();
  }

  #handleMessage(generation: number, data: unknown): void {
    if (generation !== this.#activeWorker?.generation) return;
    if (isCompilerWorkerResponse(data)) {
      this.#acceptCompilation(data);
    } else if (isAnalysisWorkerResponse(data)) {
      this.#acceptAnalysis(data);
    } else if (isCompletionWorkerResponse(data)) {
      this.#acceptCompletion(data);
    } else if (isHighlightWorkerResponse(data)) {
      this.#acceptHighlight(data);
    } else if (isHelpWorkerResponse(data)) {
      this.#acceptHelp(data);
    } else if (isWizardWorkerResponse(data)) {
      this.#acceptWizard(data);
    } else if (isPreviewPlacementChangeWorkerResponse(data)) {
      this.#acceptPlacement(data);
    } else if (isPreviewRouteChangeWorkerResponse(data)) {
      this.#acceptRoute(data);
    } else if (isInspectSemanticAuthoringWorkerResponse(data)) {
      this.#acceptSemanticContext(data);
    } else if (isPreviewSemanticChangeWorkerResponse(data)) {
      this.#acceptSemanticPreview(data);
    }
  }

  #handleWorkerFailure(generation: number): void {
    if (generation !== this.#activeWorker?.generation) return;
    this.#retireWorker();
    const message = "The compiler worker stopped unexpectedly.";
    this.#failActiveSessions(message);

    if (
      this.#activeCompilation !== undefined &&
      !this.#automaticRecoveryUsed &&
      !this.#destroyed
    ) {
      this.#automaticRecoveryUsed = true;
      if (this.#installWorker("recovering")) {
        this.#dispatchActiveCompilation();
      }
      return;
    }

    this.recovery.set({
      phase: "failed",
      generation: this.#workerGeneration,
      message,
    });
  }

  #failActiveSessions(message: string): void {
    this.#session.failActive(message);
    this.#completionSession.failActive(
      "The language worker stopped unexpectedly.",
    );
    this.#highlightSession.failActive();
    this.#helpSession.failActive("The language worker stopped unexpectedly.");
    this.#wizardSession.failActive("The source generator stopped unexpectedly.");
    this.#placementSession.failActive(
      "The placement preview worker stopped unexpectedly.",
    );
    this.#routeSession.failActive("The route preview worker stopped unexpectedly.");
    this.#semanticContextSession.failActive(
      "The architecture authoring context worker stopped unexpectedly.",
    );
    this.#semanticPreviewSession.failActive(
      "The architecture change preview worker stopped unexpectedly.",
    );
    this.#analysisSession.failActive(
      "The architecture analysis worker stopped unexpectedly.",
    );
    this.state.set(this.#session.state);
    this.completion.set(this.#completionSession.state);
    this.wizard.set(this.#wizardSession.state);
    this.help.set(this.#helpSession.state);
    this.placement.set(this.#placementSession.state);
    this.route.set(this.#routeSession.state);
    this.semanticContext.set(this.#semanticContextSession.state);
    this.semanticPreview.set(this.#semanticPreviewSession.state);
    this.analysis.set(this.#analysisSession.state);
  }

  #dispatchActiveCompilation(): void {
    const compilation = this.#activeCompilation;
    if (compilation === undefined) return;

    if (compilation.kind === "document") {
      const request = this.#session.begin(
        compilation.source,
        compilation.file,
        compilation.requestedViewId,
      );
      this.state.set(this.#session.state);
      if (!this.#postMessage(request)) return;
      const analysisRequest = this.#analysisSession.begin(
        compilation.source,
        compilation.file,
      );
      this.analysis.set(this.#analysisSession.state);
      this.#postMessage(analysisRequest);
      return;
    }

    const activeDocument = compilation.project.documents.find(
      ({ uri }) => uri === compilation.activeFile,
    );
    if (activeDocument === undefined) {
      throw new Error(
        `Active project document "${compilation.activeFile}" does not exist.`,
      );
    }
    const request = this.#session.beginProject(
      compilation.project,
      compilation.activeFile,
      compilation.requestedViewId,
    );
    this.state.set(this.#session.state);
    if (!this.#postMessage(request)) return;
    const analysisRequest = this.#analysisSession.begin(
      activeDocument.source,
      compilation.activeFile,
      compilation.project,
    );
    this.analysis.set(this.#analysisSession.state);
    this.#postMessage(analysisRequest);
  }

  #postMessage(message: unknown): boolean {
    const worker = this.#activeWorker;
    if (worker === undefined) {
      this.#failActiveSessions("The compiler worker is unavailable.");
      return false;
    }
    try {
      worker.port.postMessage(message);
      return true;
    } catch {
      this.#handleWorkerFailure(worker.generation);
      return false;
    }
  }

  #installWorker(phase: "ready" | "recovering"): boolean {
    const generation = ++this.#workerGeneration;
    try {
      const port = this.#workerFactory();
      const onMessage: EventListener = (event) =>
        this.#handleMessage(generation, (event as MessageEvent<unknown>).data);
      const onFailure: EventListener = () =>
        this.#handleWorkerFailure(generation);
      port.addEventListener("message", onMessage);
      port.addEventListener("error", onFailure);
      port.addEventListener("messageerror", onFailure);
      this.#activeWorker = { port, generation, onMessage, onFailure };
      this.#recoveryCompilationAccepted = phase === "ready";
      this.#recoveryAnalysisAccepted = phase === "ready";
      this.recovery.set({ phase, generation, message: undefined });
      return true;
    } catch {
      const message = "The compiler worker could not be started.";
      this.#failActiveSessions(message);
      this.recovery.set({ phase: "failed", generation, message });
      return false;
    }
  }

  #retireWorker(): void {
    const worker = this.#activeWorker;
    if (worker === undefined) return;
    this.#activeWorker = undefined;
    worker.port.removeEventListener("message", worker.onMessage);
    worker.port.removeEventListener("error", worker.onFailure);
    worker.port.removeEventListener("messageerror", worker.onFailure);
    worker.port.terminate();
  }

  #markWorkerResponsive(kind: "analysis" | "compilation" | "other"): void {
    const worker = this.#activeWorker;
    if (worker === undefined) return;
    if (this.recovery().phase === "recovering") {
      if (kind === "compilation") this.#recoveryCompilationAccepted = true;
      if (kind === "analysis") this.#recoveryAnalysisAccepted = true;
      if (
        !this.#recoveryCompilationAccepted ||
        !this.#recoveryAnalysisAccepted
      ) {
        return;
      }
    }
    this.#automaticRecoveryUsed = false;
    this.recovery.set({
      phase: "ready",
      generation: worker.generation,
      message: undefined,
    });
  }

  #acceptCompilation(response: CompilerWorkerResponse): void {
    if (this.#session.accept(response)) {
      this.state.set(this.#session.state);
      this.#markWorkerResponsive("compilation");
    }
  }

  #acceptAnalysis(response: AnalysisWorkerResponse): void {
    if (this.#analysisSession.accept(response)) {
      this.analysis.set(this.#analysisSession.state);
      this.#markWorkerResponsive("analysis");
    }
  }

  #acceptCompletion(response: CompletionWorkerResponse): void {
    if (this.#completionSession.accept(response)) {
      this.completion.set(this.#completionSession.state);
      this.#markWorkerResponsive("other");
    }
  }

  #acceptHighlight(response: HighlightWorkerResponse): void {
    if (this.#highlightSession.accept(response)) {
      this.#markWorkerResponsive("other");
    }
  }

  #acceptHelp(response: HelpWorkerResponse): void {
    if (this.#helpSession.accept(response)) {
      this.help.set(this.#helpSession.state);
      this.#markWorkerResponsive("other");
    }
  }

  #acceptWizard(response: WizardWorkerResponse): void {
    if (this.#wizardSession.accept(response)) {
      this.wizard.set(this.#wizardSession.state);
      this.#markWorkerResponsive("other");
    }
  }

  #acceptPlacement(response: PreviewPlacementChangeWorkerResponse): void {
    if (this.#placementSession.accept(response)) {
      this.placement.set(this.#placementSession.state);
      this.#markWorkerResponsive("other");
    }
  }

  #acceptRoute(response: PreviewRouteChangeWorkerResponse): void {
    if (this.#routeSession.accept(response)) {
      this.route.set(this.#routeSession.state);
      this.#markWorkerResponsive("other");
    }
  }

  #acceptSemanticContext(response: InspectSemanticAuthoringWorkerResponse): void {
    if (this.#semanticContextSession.accept(response)) {
      this.semanticContext.set(this.#semanticContextSession.state);
      this.#markWorkerResponsive("other");
    }
  }

  #acceptSemanticPreview(response: PreviewSemanticChangeWorkerResponse): void {
    if (this.#semanticPreviewSession.accept(response)) {
      this.semanticPreview.set(this.#semanticPreviewSession.state);
      this.#markWorkerResponsive("other");
    }
  }
}
