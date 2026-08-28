import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
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
import { WorkbenchLocalizationService } from "./workbench-localization.js";
import {
  filterWorkbenchCommands,
  type WorkbenchCommand,
} from "./workbench-command.js";
import { WorkbenchSessionService } from "./workbench-session.service.js";
import type {
  WorkbenchActivity,
  WorkbenchPanel,
} from "./workbench-session.js";

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
  readonly pngScale = signal(2);
  readonly selectedSceneObjectId = signal<string | undefined>(undefined);
  readonly wizardOpen = signal(false);
  readonly settingsOpen = signal(false);
  readonly commandPaletteOpen = signal(false);
  readonly commandQuery = signal("");
  readonly canUndoWizard = signal(false);
  readonly settingsButton = viewChild<ElementRef<HTMLButtonElement>>(
    "settingsButton",
  );
  readonly commandInput = viewChild<ElementRef<HTMLInputElement>>("commandInput");
  readonly preferences = inject(WorkbenchPreferencesService);
  readonly i18n = inject(WorkbenchLocalizationService);
  readonly session = inject(WorkbenchSessionService);
  readonly previewZoom = computed(() => this.session.state().previewZoom);
  readonly routingDebugEnabled = computed(
    () => this.session.state().routingDebugEnabled,
  );
  readonly activeActivity = computed(
    () => this.session.state().activeActivity,
  );
  readonly bottomPanelOpen = computed(
    () => this.session.state().bottomPanelOpen,
  );
  readonly bottomPanel = computed(() => this.session.state().bottomPanel);
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
    if (target?.kind === "route") {
      return target;
    }
    if (target === undefined || target.kind === "node") {
      return undefined;
    }
    return this.navigation()?.targets.find(
      (candidate): candidate is CompilerWorkerRouteNavigationTarget =>
        candidate.kind === "route" &&
        candidate.referenceId === target.referenceId,
    );
  });
  readonly selectedKindLabel = computed(() => {
    switch (this.selectedTarget()?.kind) {
      case "corridor":
        return this.i18n.t("selection.corridor");
      case "node":
        return this.i18n.t("selection.node");
      case "port":
        return this.i18n.t("selection.port");
      case "route":
        return this.i18n.t("selection.route");
      case "route-label":
        return this.i18n.t("selection.routeLabel");
      default:
        return this.i18n.t("selection.object");
    }
  });
  readonly selectedLabel = computed(
    () => this.selectedTarget()?.label,
  );
  readonly filteredCommands = computed(() =>
    filterWorkbenchCommands(
      this.commandQuery(),
      this.desktopAvailable,
      this.preferences.uiLanguage(),
    ),
  );
  readonly activeViewTitle = computed(
    () =>
      this.compiler.state().views.find(
        ({ id }) => id === this.compiler.state().activeViewId,
      )?.title ?? this.i18n.t("view.none"),
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
        return this.i18n.t("status.compiling");
      case "failed":
        return this.i18n.t("status.failed");
      case "invalid":
        return this.i18n.t("status.invalid");
      case "valid":
        return this.i18n.t("status.valid");
      default:
        return this.i18n.t("status.waiting");
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
        case "export-png":
          void this.exportPng();
          break;
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
    effect(() => {
      this.#desktop?.setUiLanguage(this.preferences.uiLanguage());
    });
    this.compiler.compile(this.source(), undefined, this.documentName());
  }

  @HostListener("document:keydown", ["$event"])
  onWorkbenchKeydown(event: KeyboardEvent): void {
    const modifier = event.metaKey || event.ctrlKey;
    if (modifier && event.shiftKey && event.key.toLocaleLowerCase() === "p") {
      event.preventDefault();
      this.openCommandPalette();
    } else if (event.key === "Escape" && this.commandPaletteOpen()) {
      event.preventDefault();
      this.closeCommandPalette();
    }
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
        this.i18n.t("operation.discard", { name: this.documentName() }),
      )
    ) {
      return;
    }
    this.fileOperationLabel.set(this.i18n.t("operation.opening"));
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
        this.fileOperationLabel.set(
          this.i18n.t("operation.opened", {
            name: result.document.displayName,
          }),
        );
      } else if (result.status === "failed") {
        this.fileOperationLabel.set(`${result.code}: ${result.message}`);
      } else {
        this.fileOperationLabel.set(undefined);
      }
    } catch {
      this.fileOperationLabel.set(this.i18n.t("operation.openFailed"));
    }
  }

  async saveDocument(mode: "save" | "save-as"): Promise<void> {
    const desktop = this.#desktop;
    if (desktop === undefined) {
      return;
    }
    this.fileOperationLabel.set(
      this.i18n.t(
        mode === "save-as" ? "operation.choosingSave" : "operation.saving",
      ),
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
        this.fileOperationLabel.set(
          this.i18n.t("operation.saved", { name: result.displayName }),
        );
      } else if (result.status === "failed") {
        this.fileOperationLabel.set(`${result.code}: ${result.message}`);
      } else {
        this.fileOperationLabel.set(undefined);
      }
    } catch {
      this.fileOperationLabel.set(this.i18n.t("operation.saveFailed"));
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
    this.session.setPreviewZoom(this.previewZoom() + 0.2);
  }

  zoomOut(): void {
    this.session.setPreviewZoom(this.previewZoom() - 0.2);
  }

  fitPreview(): void {
    this.session.setPreviewZoom(1);
  }

  toggleRoutingDebug(): void {
    this.session.toggleRoutingDebug();
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

  async exportPng(): Promise<void> {
    const desktop = this.#desktop;
    const svg = this.lastValidSvg();
    if (
      desktop === undefined ||
      svg === undefined ||
      this.compiler.state().phase !== "valid"
    ) {
      return;
    }
    this.fileOperationLabel.set(this.i18n.t("operation.renderingPng"));
    try {
      const result = await desktop.exportPng({
        svg,
        scale: this.pngScale(),
        suggestedName: `${
          this.compiler.state().activeViewId ?? "architecture"
        }.png`,
      });
      if (result.status === "exported") {
        this.fileOperationLabel.set(
          this.i18n.t("operation.exportedPng", {
            name: result.displayName,
            width: result.width,
            height: result.height,
          }),
        );
      } else if (result.status === "failed") {
        this.fileOperationLabel.set(`${result.code}: ${result.message}`);
      } else {
        this.fileOperationLabel.set(undefined);
      }
    } catch {
      this.fileOperationLabel.set(this.i18n.t("operation.pngFailed"));
    }
  }

  onPngScaleSelection(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }
    const scale = Number(target.value);
    if (Number.isFinite(scale) && scale >= 0.25 && scale <= 8) {
      this.pngScale.set(scale);
    }
  }

  onViewSelection(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement) || target.value.length === 0) {
      return;
    }
    this.selectedSceneObjectId.set(undefined);
    this.compiler.compile(this.source(), target.value, this.documentName());
  }

  selectView(viewId: string): void {
    this.selectedSceneObjectId.set(undefined);
    this.compiler.compile(this.source(), viewId, this.documentName());
  }

  selectActivity(activity: WorkbenchActivity): void {
    this.session.setActivity(activity);
  }

  showBottomPanel(panel: WorkbenchPanel): void {
    this.session.showPanel(panel);
  }

  toggleBottomPanel(): void {
    this.session.togglePanel();
  }

  openCommandPalette(): void {
    this.commandQuery.set("");
    this.commandPaletteOpen.set(true);
    queueMicrotask(() => this.commandInput()?.nativeElement.focus());
  }

  closeCommandPalette(): void {
    this.commandPaletteOpen.set(false);
    this.commandQuery.set("");
  }

  updateCommandQuery(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.commandQuery.set(target.value);
    }
  }

  onCommandInputKeydown(event: KeyboardEvent): void {
    if (event.key !== "Enter") {
      return;
    }
    const first = this.filteredCommands().at(0);
    if (first !== undefined) {
      event.preventDefault();
      this.executeCommand(first);
    }
  }

  executeCommand(command: WorkbenchCommand): void {
    this.closeCommandPalette();
    switch (command.id) {
      case "file.open":
        void this.openDocument();
        break;
      case "file.save":
        void this.saveDocument("save");
        break;
      case "file.save-as":
        void this.saveDocument("save-as");
        break;
      case "diagram.export-svg":
        this.exportSvg();
        break;
      case "diagram.export-png":
        void this.exportPng();
        break;
      case "diagram.fit":
        this.fitPreview();
        break;
      case "diagram.route-debug":
        this.toggleRoutingDebug();
        break;
      case "panel.problems":
        this.toggleBottomPanel();
        break;
      case "wizard.new":
        this.startWizard();
        break;
      case "settings.open":
        this.openSettings();
        break;
    }
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
    if (target !== undefined && target.kind !== "node") {
      this.showBottomPanel("route");
    }
    if (revealSource && target !== undefined) {
      this.sourceEditor()?.revealSource(target.source);
    }
  }

}
