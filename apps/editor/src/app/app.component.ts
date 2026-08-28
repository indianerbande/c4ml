import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from "@angular/core";

import type {
  CompilerWorkerDiagnostic,
  CompilerWorkerNavigationTarget,
  CompilerWorkerRouteNavigationTarget,
} from "./compiler-worker.protocol.js";
import { CompilerWorkerClient } from "./compiler-worker-client.service.js";
import { WizardSourceSession } from "./editor-session.js";
import { initialC4mlSource } from "./initial-source.js";
import {
  C4mlMonacoSourceEditorComponent,
  type SourceEditorSelection,
} from "./monaco-source-editor.component.js";
import { resolveC4mlDesktopApi } from "./desktop-bridge.js";
import {
  clientPointToScene,
  navigationTargetAtPoint,
  navigationTargetForOffset,
  svgWithNavigationHighlight,
} from "./preview-navigation.js";
import type {
  SourceEditorCompletionProvider,
  SourceEditorHighlightProvider,
} from "./source-editor.contract.js";
import { SystemContextWizardComponent } from "./system-context-wizard.component.js";
import { SettingsPanelComponent } from "./settings-panel.component.js";
import { WorkbenchPreferencesService } from "./workbench-preferences.service.js";

@Component({
  selector: "c4ml-root",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
  imports: [
    C4mlMonacoSourceEditorComponent,
    SettingsPanelComponent,
    SystemContextWizardComponent,
  ],
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
  readonly selectedSceneObjectId = signal<string | undefined>(undefined);
  readonly routingDebugEnabled = signal(true);
  readonly wizardOpen = signal(false);
  readonly settingsOpen = signal(false);
  readonly canUndoWizard = signal(false);
  readonly settingsButton = viewChild<ElementRef<HTMLButtonElement>>(
    "settingsButton",
  );
  readonly preferences = inject(WorkbenchPreferencesService);
  readonly desktopAvailable: boolean;
  readonly documentName = signal("architecture.c4ml");
  readonly documentHandle = signal<string | undefined>(undefined);
  readonly documentDirty = signal(false);
  readonly fileOperationLabel = signal<string | undefined>(undefined);
  readonly lastValidSvg = computed(
    () => this.compiler.state().lastValidSvg,
  );
  readonly navigation = computed(
    () => this.compiler.state().lastValidNavigation,
  );
  readonly selectedTarget = computed(() =>
    this.navigation()?.targets.find(
      ({ sceneObjectId }) => sceneObjectId === this.selectedSceneObjectId(),
    ),
  );
  readonly selectedRoute = computed<
    CompilerWorkerRouteNavigationTarget | undefined
  >(() => {
    const target = this.selectedTarget();
    return target?.kind === "route" ? target : undefined;
  });
  readonly selectedLabel = computed(
    () => this.selectedTarget()?.label,
  );
  readonly previewSvg = computed(() => {
    const svg = this.lastValidSvg();
    const navigation = this.navigation();
    return svg === undefined
      ? undefined
      : svgWithNavigationHighlight(
          svg,
          this.selectedTarget(),
          navigation === undefined
            ? undefined
            : {
                showRouteDebug: this.routingDebugEnabled(),
                width: navigation.width,
                height: navigation.height,
              },
        );
  });
  readonly previewSize = computed(
    () => `${Math.round(this.previewZoom() * 100)}%`,
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
  readonly #desktop = resolveC4mlDesktopApi();
  #wizardDocumentBefore:
    | {
        readonly handle: string | undefined;
        readonly name: string;
        readonly dirty: boolean;
      }
    | undefined;

  constructor() {
    this.desktopAvailable = this.#desktop !== undefined;
    const destroyRef = inject(DestroyRef);
    const unsubscribeDesktopCommands = this.#desktop?.onCommand((command) => {
      switch (command) {
        case "open-document":
          void this.openDocument();
          break;
        case "save-document":
          void this.saveDocument("save");
          break;
        case "save-as-document":
          void this.saveDocument("save-as");
          break;
        case "open-settings":
          this.openSettings();
          break;
      }
    });
    destroyRef.onDestroy(() => {
      if (this.#compileTimer !== undefined) {
        clearTimeout(this.#compileTimer);
      }
      unsubscribeDesktopCommands?.();
    });
    effect((onCleanup) => {
      const svg = this.previewSvg();
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
    effect(() => {
      const handle = this.documentHandle();
      this.#desktop?.setDocumentState({
        displayName: this.documentName(),
        dirty: this.documentDirty(),
        ...(handle === undefined ? {} : { handle }),
      });
    });
    this.compiler.compile(this.source(), undefined, this.documentName());
  }

  onSourceChange(source: string): void {
    this.source.set(source);
    this.selectedSceneObjectId.set(undefined);
    this.#wizardSourceSession.invalidateUndo();
    this.#wizardDocumentBefore = undefined;
    this.canUndoWizard.set(false);
    this.documentDirty.set(true);
    this.#scheduleCompile();
  }

  async openDocument(): Promise<void> {
    const desktop = this.#desktop;
    if (desktop === undefined) {
      return;
    }
    if (
      this.documentDirty() &&
      !window.confirm(
        `Discard unsaved changes to ${this.documentName()} and open another source?`,
      )
    ) {
      return;
    }
    this.fileOperationLabel.set("Opening source…");
    try {
      const result = await desktop.openDocument();
      if (result.status === "opened") {
        this.source.set(result.document.source);
        this.documentHandle.set(result.document.handle);
        this.documentName.set(result.document.displayName);
        this.documentDirty.set(false);
        this.selectedSceneObjectId.set(undefined);
        this.#wizardSourceSession.invalidateUndo();
        this.#wizardDocumentBefore = undefined;
        this.canUndoWizard.set(false);
        this.compiler.compile(
          result.document.source,
          undefined,
          result.document.displayName,
        );
        this.fileOperationLabel.set(`Opened ${result.document.displayName}`);
      } else if (result.status === "failed") {
        this.fileOperationLabel.set(`${result.code}: ${result.message}`);
      } else {
        this.fileOperationLabel.set(undefined);
      }
    } catch {
      this.fileOperationLabel.set("The desktop file dialog failed unexpectedly.");
    }
  }

  async saveDocument(mode: "save" | "save-as"): Promise<void> {
    const desktop = this.#desktop;
    if (desktop === undefined) {
      return;
    }
    this.fileOperationLabel.set(
      mode === "save-as" ? "Choosing save location…" : "Saving source…",
    );
    try {
      const handle = this.documentHandle();
      const result = await desktop.saveDocument({
        suggestedName: this.documentName(),
        source: this.source(),
        mode,
        ...(handle === undefined ? {} : { handle }),
      });
      if (result.status === "saved") {
        this.documentHandle.set(result.handle);
        this.documentName.set(result.displayName);
        this.documentDirty.set(false);
        this.fileOperationLabel.set(`Saved ${result.displayName}`);
      } else if (result.status === "failed") {
        this.fileOperationLabel.set(`${result.code}: ${result.message}`);
      } else {
        this.fileOperationLabel.set(undefined);
      }
    } catch {
      this.fileOperationLabel.set("The desktop save operation failed unexpectedly.");
    }
  }

  onDiagnosticSelected(diagnostic: CompilerWorkerDiagnostic): void {
    this.sourceEditor()?.revealDiagnostic(diagnostic);
  }

  onSourceSelection(selection: SourceEditorSelection): void {
    const target = navigationTargetForOffset(
      this.navigation()?.targets ?? [],
      selection.startOffset,
    );
    this.selectedSceneObjectId.set(target?.sceneObjectId);
  }

  onPreviewClick(event: MouseEvent): void {
    const navigation = this.navigation();
    const image = event.target as HTMLImageElement | null;
    if (
      navigation === undefined ||
      this.compiler.state().phase !== "valid" ||
      image?.tagName !== "IMG"
    ) {
      return;
    }
    const point = clientPointToScene(
      { x: event.clientX, y: event.clientY },
      image.getBoundingClientRect(),
      navigation,
    );
    const target =
      point === undefined
        ? undefined
        : navigationTargetAtPoint(navigation.targets, point);
    this.#selectTarget(target, true);
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

  toggleRoutingDebug(): void {
    this.routingDebugEnabled.update((enabled) => !enabled);
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
    this.selectedSceneObjectId.set(undefined);
    this.compiler.compile(this.source(), target.value, this.documentName());
  }

  startWizard(): void {
    this.#wizardSourceSession.start(this.source());
    this.#wizardDocumentBefore = {
      handle: this.documentHandle(),
      name: this.documentName(),
      dirty: this.documentDirty(),
    };
    this.wizardOpen.set(true);
  }

  openSettings(): void {
    this.settingsOpen.set(true);
  }

  closeSettings(): void {
    this.settingsOpen.set(false);
    queueMicrotask(() => this.settingsButton()?.nativeElement.focus());
  }

  cancelWizard(): void {
    this.#wizardSourceSession.cancel(this.source());
    this.#wizardDocumentBefore = undefined;
    this.wizardOpen.set(false);
  }

  applyWizard(source: string): void {
    const next = this.#wizardSourceSession.apply(source);
    this.source.set(next);
    this.documentHandle.set(undefined);
    this.documentName.set("architecture.c4ml");
    this.documentDirty.set(true);
    this.selectedSceneObjectId.set(undefined);
    this.canUndoWizard.set(this.#wizardSourceSession.canUndo);
    this.wizardOpen.set(false);
    this.compiler.compile(next, undefined, this.documentName());
  }

  undoWizard(): void {
    const restored = this.#wizardSourceSession.undo(this.source());
    this.source.set(restored);
    const previousDocument = this.#wizardDocumentBefore;
    if (previousDocument !== undefined) {
      this.documentHandle.set(previousDocument.handle);
      this.documentName.set(previousDocument.name);
      this.documentDirty.set(previousDocument.dirty);
    }
    this.#wizardDocumentBefore = undefined;
    this.selectedSceneObjectId.set(undefined);
    this.canUndoWizard.set(this.#wizardSourceSession.canUndo);
    this.compiler.compile(restored, undefined, this.documentName());
  }

  #scheduleCompile(): void {
    if (this.#compileTimer !== undefined) {
      clearTimeout(this.#compileTimer);
    }
    this.#compileTimer = setTimeout(() => {
      this.compiler.compile(
        this.source(),
        this.compiler.state().activeViewId,
        this.documentName(),
      );
    }, 180);
  }

  #selectTarget(
    target: CompilerWorkerNavigationTarget | undefined,
    revealSource: boolean,
  ): void {
    this.selectedSceneObjectId.set(target?.sceneObjectId);
    if (revealSource && target !== undefined) {
      this.sourceEditor()?.revealSource(target.source);
    }
  }

}
