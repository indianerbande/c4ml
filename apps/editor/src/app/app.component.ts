import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from "@angular/core";

import type { CompilerWorkerDiagnostic } from "./compiler-worker.protocol.js";
import { CompilerWorkerClient } from "./compiler-worker-client.service.js";
import { WizardSourceSession } from "./editor-session.js";
import { initialC4mlSource } from "./initial-source.js";
import { C4mlMonacoSourceEditorComponent } from "./monaco-source-editor.component.js";
import type {
  SourceEditorCompletionProvider,
  SourceEditorHighlightProvider,
} from "./source-editor.contract.js";
import { SystemContextWizardComponent } from "./system-context-wizard.component.js";

@Component({
  selector: "c4ml-root",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
  imports: [C4mlMonacoSourceEditorComponent, SystemContextWizardComponent],
})
export class AppComponent {
  readonly sourceEditor = viewChild<C4mlMonacoSourceEditorComponent>(
    "sourceEditor",
  );
  readonly source = signal(initialC4mlSource);
  readonly compiler = inject(CompilerWorkerClient);
  readonly provideCompletions: SourceEditorCompletionProvider = (
    source,
    offset,
  ) => this.compiler.complete(source, offset);
  readonly provideHighlights: SourceEditorHighlightProvider = (source) =>
    this.compiler.highlight(source);
  readonly previewUrl = signal<string | undefined>(undefined);
  readonly previewZoom = signal(1);
  readonly wizardOpen = signal(false);
  readonly canUndoWizard = signal(false);
  readonly lastValidSvg = computed(
    () => this.compiler.state().lastValidSvg,
  );
  readonly previewTransform = computed(
    () => `scale(${this.previewZoom()})`,
  );
  readonly zoomLabel = computed(
    () => `${Math.round(this.previewZoom() * 100)}%`,
  );
  readonly statusLabel = computed(() => {
    switch (this.compiler.state().phase) {
      case "compiling":
        return "Compiling";
      case "failed":
        return "Worker failed";
      case "invalid":
        return "Source has errors";
      case "valid":
        return "Preview current";
      default:
        return "Waiting";
    }
  });

  #compileTimer: ReturnType<typeof setTimeout> | undefined;
  readonly #wizardSourceSession = new WizardSourceSession();

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.#compileTimer !== undefined) {
        clearTimeout(this.#compileTimer);
      }
    });
    effect((onCleanup) => {
      const svg = this.lastValidSvg();
      if (svg === undefined) {
        this.previewUrl.set(undefined);
        return;
      }
      const url = URL.createObjectURL(
        new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
      );
      this.previewUrl.set(url);
      onCleanup(() => URL.revokeObjectURL(url));
    });
    this.compiler.compile(this.source());
  }

  onSourceChange(source: string): void {
    this.source.set(source);
    this.#wizardSourceSession.invalidateUndo();
    this.canUndoWizard.set(false);
    this.#scheduleCompile();
  }

  onDiagnosticSelected(diagnostic: CompilerWorkerDiagnostic): void {
    this.sourceEditor()?.revealDiagnostic(diagnostic);
  }

  triggerSuggestions(): void {
    this.sourceEditor()?.triggerSuggestions();
  }

  zoomIn(): void {
    this.previewZoom.update((zoom) => Math.min(2.5, zoom + 0.2));
  }

  zoomOut(): void {
    this.previewZoom.update((zoom) => Math.max(0.4, zoom - 0.2));
  }

  fitPreview(): void {
    this.previewZoom.set(1);
  }

  exportSvg(): void {
    const svg = this.lastValidSvg();
    if (svg === undefined) {
      return;
    }
    const url = URL.createObjectURL(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${this.compiler.state().activeViewId ?? "architecture"}.svg`;
    anchor.click();
    queueMicrotask(() => URL.revokeObjectURL(url));
  }

  onViewSelection(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement) || target.value.length === 0) {
      return;
    }
    this.compiler.compile(this.source(), target.value);
  }

  startWizard(): void {
    this.#wizardSourceSession.start(this.source());
    this.wizardOpen.set(true);
  }

  cancelWizard(): void {
    this.#wizardSourceSession.cancel(this.source());
    this.wizardOpen.set(false);
  }

  applyWizard(source: string): void {
    const next = this.#wizardSourceSession.apply(source);
    this.source.set(next);
    this.canUndoWizard.set(this.#wizardSourceSession.canUndo);
    this.wizardOpen.set(false);
    this.compiler.compile(next);
  }

  undoWizard(): void {
    const restored = this.#wizardSourceSession.undo(this.source());
    this.source.set(restored);
    this.canUndoWizard.set(this.#wizardSourceSession.canUndo);
    this.compiler.compile(restored);
  }

  #scheduleCompile(): void {
    if (this.#compileTimer !== undefined) {
      clearTimeout(this.#compileTimer);
    }
    this.#compileTimer = setTimeout(() => {
      this.compiler.compile(
        this.source(),
        this.compiler.state().activeViewId,
      );
    }, 180);
  }

}
