import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal,
  viewChild,
} from "@angular/core";

import type {
  CompilerWorkerDiagnostic,
  CompilerWorkerNavigationTarget,
  PreviewPlacementChangeWorkerResponse,
  PreviewRouteChangeWorkerResponse,
  PreviewSemanticChangeWorkerResponse,
  CompilerWorkerSource,
} from "./compiler-worker.protocol.js";
import type { AnalysisFinding } from "@c4ml/compiler-core";
import type { C4mlHelpTopicId } from "@c4ml/language-c4ml";
import { CompilerWorkerClient } from "./compiler-worker-client.service.js";
import { WizardSourceSession } from "./editor-session.js";
import {
  C4mlMonacoSourceEditorComponent,
  type SourceEditorSelection,
} from "./monaco-source-editor.component.js";
import {
  clientPointToScene,
  navigationTargetAtPoint,
  navigationTargetForOffset,
} from "./preview-navigation.js";
import type {
  SourceEditorCompletionProvider,
  SourceEditorHighlightProvider,
} from "./source-editor.contract.js";
import { SystemContextWizardComponent } from "./system-context-wizard.component.js";
import {
  PlacementEditorComponent,
} from "./placement-editor.component.js";
import { RouteEditorComponent } from "./route-editor.component.js";
import { SemanticEditorComponent } from "./semantic-editor.component.js";
import { SettingsPanelComponent } from "./settings-panel.component.js";
import { HelpArticleComponent } from "./help-article.component.js";
import { WorkbenchPreferencesService } from "./workbench-preferences.service.js";
import { WorkbenchLocalizationService } from "./workbench-localization.js";
import type { WorkbenchCommand } from "./workbench-command.js";
import { WorkbenchCommandFacade } from "./workbench-command.facade.js";
import {
  WorkbenchDocumentFacade,
  type WorkbenchDocumentState,
} from "./workbench-document.facade.js";
import { WorkbenchHelpFacade } from "./workbench-help.facade.js";
import { WorkbenchPreviewFacade } from "./workbench-preview.facade.js";
import { WorkbenchSessionService } from "./workbench-session.service.js";
import type { WorkbenchActivity, WorkbenchPanel } from "./workbench-session.js";
import { sourceEditorSuggestionShortcut } from "./source-editor-shortcut.js";
import { WorkbenchPlacementFacade } from "./workbench-placement.facade.js";
import { WorkbenchRouteFacade } from "./workbench-route.facade.js";
import { WorkbenchSemanticFacade } from "./workbench-semantic.facade.js";

@Component({
  selector: "c4ml-root",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
  imports: [
    C4mlMonacoSourceEditorComponent,
    HelpArticleComponent,
    PlacementEditorComponent,
    RouteEditorComponent,
    SemanticEditorComponent,
    SettingsPanelComponent,
    SystemContextWizardComponent,
  ],
})
export class AppComponent {
  readonly suggestionShortcut = sourceEditorSuggestionShortcut(
    globalThis.navigator.userAgent,
  );
  readonly suggestionShortcutHint =
    this.suggestionShortcut === "⌘I"
      ? "editor.suggestionShortcutMacHint"
      : "editor.suggestionShortcutHint";
  readonly sourceEditor =
    viewChild<C4mlMonacoSourceEditorComponent>("sourceEditor");
  readonly compiler = inject(CompilerWorkerClient);
  readonly documents = inject(WorkbenchDocumentFacade);
  readonly preview = inject(WorkbenchPreviewFacade);
  readonly help = inject(WorkbenchHelpFacade);
  readonly commands = inject(WorkbenchCommandFacade);
  readonly placement = inject(WorkbenchPlacementFacade);
  readonly routeEditor = inject(WorkbenchRouteFacade);
  readonly semanticEditor = inject(WorkbenchSemanticFacade);
  readonly source = this.documents.source;
  readonly documentName = this.documents.documentName;
  readonly documentHandle = this.documents.documentHandle;
  readonly documentDirty = this.documents.documentDirty;
  readonly projectDirty = this.documents.projectDirty;
  readonly projectDocuments = this.documents.projectDocuments;
  readonly activeDocumentUri = this.documents.activeDocumentUri;
  readonly documentSetRevision = this.documents.documentSetRevision;
  readonly workspaceName = this.documents.workspaceName;
  readonly fileOperationLabel = this.documents.fileOperationLabel;
  readonly pngScale = this.documents.pngScale;
  readonly desktopAvailable = this.documents.desktopAvailable;
  readonly previewUrl = this.preview.previewUrl;
  readonly lastValidSvg = this.preview.lastValidSvg;
  readonly navigation = this.preview.navigation;
  readonly selectedRoute = this.preview.selectedRoute;
  readonly selectedNode = this.preview.selectedNode;
  readonly selectedKindLabel = this.preview.selectedKindLabel;
  readonly selectedLabel = this.preview.selectedLabel;
  readonly activeViewTitle = this.preview.activeViewTitle;
  readonly previewSize = this.preview.displaySize;
  readonly zoomLabel = this.preview.zoomLabel;
  readonly routingDebugEnabled = this.preview.routingDebugEnabled;
  readonly previewWorkspaceMode = this.preview.workspaceMode;
  readonly previewDetached = this.preview.detached;
  readonly previewDetachmentAvailable = this.preview.desktopDetachmentAvailable;
  readonly commandPaletteOpen = this.commands.open;
  readonly commandQuery = this.commands.query;
  readonly filteredCommands = this.commands.commands;
  readonly helpQuery = this.help.query;
  readonly activeHelpTopicId = this.help.activeTopicId;
  readonly rightPaneMode = this.help.pane;
  readonly filteredHelpCategories = this.help.categories;
  readonly activeHelpTopic = this.help.activeTopic;
  readonly contextHelpTopic = this.help.contextTopic;
  readonly provideCompletions: SourceEditorCompletionProvider = (
    source,
    offset,
  ) => this.compiler.complete(source, offset);
  readonly provideHighlights: SourceEditorHighlightProvider = (source) =>
    this.compiler.highlight(source);
  readonly wizardOpen = signal(false);
  readonly settingsOpen = signal(false);
  readonly sourceCursorOffset = signal(0);
  readonly canUndoWizard = signal(false);
  readonly settingsButton =
    viewChild<ElementRef<HTMLButtonElement>>("settingsButton");
  readonly commandInput =
    viewChild<ElementRef<HTMLInputElement>>("commandInput");
  readonly preferences = inject(WorkbenchPreferencesService);
  readonly i18n = inject(WorkbenchLocalizationService);
  readonly session = inject(WorkbenchSessionService);
  readonly activeActivity = computed(() => this.session.state().activeActivity);
  readonly bottomPanelOpen = computed(
    () => this.session.state().bottomPanelOpen,
  );
  readonly bottomPanel = computed(() => this.session.state().bottomPanel);
  readonly activeDiagnostics = computed(() =>
    this.compiler
      .state()
      .diagnostics.filter(
        ({ source }) =>
          source === undefined || source.file === this.activeDocumentUri(),
      ),
  );
  readonly analysisFindings = computed(
    () => this.compiler.analysis().report?.findings ?? [],
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
  #wizardDocumentBefore: WorkbenchDocumentState | undefined;

  constructor() {
    const destroyRef = inject(DestroyRef);
    const unsubscribeDesktopCommands = this.documents.onDesktopCommand(
      (command) => {
        switch (command) {
          case "export-png":
            void this.exportPng();
            break;
          case "open-document":
            void this.openDocument();
            break;
          case "open-project":
            void this.openProject();
            break;
          case "save-document":
            void this.saveDocument("save");
            break;
          case "save-all-documents":
            void this.saveAllDocuments();
            break;
          case "save-as-document":
            void this.saveDocument("save-as");
            break;
          case "open-settings":
            this.openSettings();
            break;
          case "open-preview-window":
            void this.detachPreview();
            break;
          case "toggle-preview-focus":
            this.togglePreviewFocus();
            break;
        }
      },
    );
    const unsubscribeDetachedSelection = this.preview.onDetachedSelection(
      (target) => this.#selectTarget(target, true),
    );
    destroyRef.onDestroy(() => {
      if (this.#compileTimer !== undefined) {
        clearTimeout(this.#compileTimer);
      }
      unsubscribeDesktopCommands?.();
      unsubscribeDetachedSelection();
    });
    this.#compileCurrentProject();
    this.compiler.resolveHelpContext(this.source(), 0);
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
    } else if (
      event.key === "F1" &&
      !this.commandPaletteOpen() &&
      !this.settingsOpen() &&
      !this.wizardOpen()
    ) {
      event.preventDefault();
      this.openContextHelp();
    }
  }

  onSourceChange(source: string): void {
    this.documents.replaceSource(source, true);
    this.preview.clearSelection();
    this.#wizardSourceSession.invalidateUndo();
    this.#wizardDocumentBefore = undefined;
    this.canUndoWizard.set(false);
    this.placement.sourceChanged();
    this.routeEditor.sourceChanged();
    this.semanticEditor.sourceChanged();
    this.#refreshHelpContext(source);
    this.#scheduleCompile();
  }

  async openDocument(): Promise<void> {
    const opened = await this.documents.openDocument();
    if (opened !== undefined) {
      this.#afterDocumentSetChanged();
      this.#compileCurrentProject(undefined);
      this.#refreshHelpContext(opened.source);
    }
  }

  async openProject(): Promise<void> {
    if (await this.documents.openProject()) {
      this.#afterDocumentSetChanged();
      this.#compileCurrentProject(undefined);
      this.#refreshHelpContext(this.source());
    }
  }

  selectDocument(uri: string): void {
    if (!this.documents.selectDocument(uri)) {
      return;
    }
    this.preview.clearSelection();
    this.#compileCurrentProject(this.compiler.state().activeViewId);
    this.#refreshHelpContext(this.source());
  }

  async saveDocument(mode: "save" | "save-as"): Promise<void> {
    await this.documents.saveDocument(mode);
  }

  async saveAllDocuments(): Promise<void> {
    await this.documents.saveAllDocuments();
  }

  onDiagnosticSelected(diagnostic: CompilerWorkerDiagnostic): void {
    const source = diagnostic.source;
    if (source !== undefined && source.file !== this.activeDocumentUri()) {
      this.documents.selectDocument(source.file);
      this.#compileCurrentProject(this.compiler.state().activeViewId);
    }
    queueMicrotask(() => this.sourceEditor()?.revealDiagnostic(diagnostic));
  }

  onAnalysisFindingSelected(finding: AnalysisFinding): void {
    const source = finding.sourceLocations[0];
    if (source === undefined) return;
    if (source.file !== this.activeDocumentUri()) {
      this.documents.selectDocument(source.file);
      this.#compileCurrentProject(this.compiler.state().activeViewId);
    }
    queueMicrotask(() => this.sourceEditor()?.revealSource({
      file: source.file,
      start: source.range.start,
      end: source.range.end,
    }));
  }

  onInspectorSourceSelected(source: CompilerWorkerSource): void {
    if (source.file !== this.activeDocumentUri()) {
      this.documents.selectDocument(source.file);
      this.#compileCurrentProject(this.compiler.state().activeViewId);
    }
    queueMicrotask(() => this.sourceEditor()?.revealSource(source));
  }

  onSourceSelection(selection: SourceEditorSelection): void {
    this.sourceCursorOffset.set(selection.startOffset);
    this.compiler.resolveHelpContext(this.source(), selection.startOffset);
    const target = navigationTargetForOffset(
      this.navigation()?.targets ?? [],
      selection.startOffset,
      this.activeDocumentUri(),
    );
    this.preview.select(target, false);
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
    this.preview.zoomIn();
  }

  zoomOut(): void {
    this.preview.zoomOut();
  }

  fitPreview(): void {
    this.preview.fit();
  }

  toggleRoutingDebug(): void {
    this.preview.toggleRoutingDebug();
  }

  togglePreviewFocus(): void {
    this.preview.toggleFocusMode();
    this.help.showDiagram();
  }

  async detachPreview(): Promise<void> {
    this.help.showDiagram();
    await this.preview.detach();
  }

  redockPreview(): void {
    this.preview.redock();
  }

  formatGeometry(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  openPlacementEditor(): void {
    this.placement.show();
  }

  closePlacementEditor(): void {
    this.placement.close();
  }

  applyPlacement(response: PreviewPlacementChangeWorkerResponse): void {
    this.placement.apply(response, this.sourceEditor());
  }

  undoPlacement(): void {
    this.placement.undo(this.sourceEditor());
  }

  openRouteEditor(): void {
    this.routeEditor.show();
  }

  closeRouteEditor(): void {
    this.routeEditor.close();
  }

  applyRoute(response: PreviewRouteChangeWorkerResponse): void {
    this.routeEditor.apply(response, this.sourceEditor());
  }

  undoRoute(): void {
    this.routeEditor.undo(this.sourceEditor());
  }

  openSemanticEditor(): void {
    this.semanticEditor.show(this.compiler.state().activeViewId);
  }

  closeSemanticEditor(): void {
    this.semanticEditor.close();
  }

  applySemantic(response: PreviewSemanticChangeWorkerResponse): void {
    this.semanticEditor.apply(response, this.sourceEditor());
  }

  undoSemantic(): void {
    this.semanticEditor.undo(this.sourceEditor());
  }

  exportSvg(): void {
    const svg = this.lastValidSvg();
    if (svg === undefined) {
      return;
    }
    this.documents.downloadSvg(svg, this.compiler.state().activeViewId);
  }

  async exportPng(): Promise<void> {
    const svg = this.lastValidSvg();
    if (
      !this.desktopAvailable ||
      svg === undefined ||
      this.compiler.state().phase !== "valid"
    ) {
      return;
    }
    await this.documents.exportPng(svg, this.compiler.state().activeViewId);
  }

  onPngScaleSelection(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }
    this.documents.setPngScale(target.value);
  }

  onViewSelection(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement) || target.value.length === 0) {
      return;
    }
    this.preview.clearSelection();
    this.#compileCurrentProject(target.value);
  }

  selectView(viewId: string): void {
    this.preview.clearSelection();
    this.#compileCurrentProject(viewId);
  }

  selectActivity(activity: WorkbenchActivity): void {
    this.session.setActivity(activity);
    if (activity === "help") {
      this.help.pane.set("help");
    }
  }

  updateHelpQuery(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.help.setQuery(target.value);
    }
  }

  openHelpTopic(topicId: C4mlHelpTopicId): void {
    this.help.openTopic(topicId);
  }

  openContextHelp(): void {
    this.help.openContext();
  }

  showDiagram(): void {
    this.help.showDiagram();
  }

  showBottomPanel(panel: WorkbenchPanel): void {
    this.session.showPanel(panel);
  }

  toggleBottomPanel(): void {
    this.session.togglePanel();
  }

  openCommandPalette(): void {
    this.commands.show();
    queueMicrotask(() => this.commandInput()?.nativeElement.focus());
  }

  closeCommandPalette(): void {
    this.commands.close();
  }

  updateCommandQuery(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.commands.setQuery(target.value);
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
      case "file.open-project":
        void this.openProject();
        break;
      case "file.save":
        void this.saveDocument("save");
        break;
      case "file.save-all":
        void this.saveAllDocuments();
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
      case "diagram.focus":
        this.togglePreviewFocus();
        break;
      case "diagram.detach":
        void this.detachPreview();
        break;
      case "diagram.route-debug":
        this.toggleRoutingDebug();
        break;
      case "panel.problems":
        this.toggleBottomPanel();
        break;
      case "help.open":
        this.session.setActivity("help");
        this.help.pane.set("help");
        break;
      case "help.context":
        this.openContextHelp();
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
    this.#wizardDocumentBefore = this.documents.captureState();
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
    this.documents.resetAsGeneratedDocument(next);
    this.preview.clearSelection();
    this.canUndoWizard.set(this.#wizardSourceSession.canUndo);
    this.wizardOpen.set(false);
    this.#compileCurrentProject(undefined);
    this.#refreshHelpContext(next);
  }

  undoWizard(): void {
    const restored = this.#wizardSourceSession.undo(this.source());
    const previousDocument = this.#wizardDocumentBefore;
    if (previousDocument !== undefined) {
      this.documents.restoreState(previousDocument);
    } else {
      this.documents.replaceSource(restored, this.documentDirty());
    }
    this.#wizardDocumentBefore = undefined;
    this.preview.clearSelection();
    this.canUndoWizard.set(this.#wizardSourceSession.canUndo);
    this.#compileCurrentProject(undefined);
    this.#refreshHelpContext(this.source());
  }

  #scheduleCompile(): void {
    if (this.#compileTimer !== undefined) {
      clearTimeout(this.#compileTimer);
    }
    this.#compileTimer = setTimeout(() => {
      this.#compileCurrentProject(this.compiler.state().activeViewId);
    }, 180);
  }

  #refreshHelpContext(source: string): void {
    const offset = Math.min(this.sourceCursorOffset(), source.length);
    this.sourceCursorOffset.set(offset);
    this.compiler.resolveHelpContext(source, offset);
  }

  #selectTarget(
    target: CompilerWorkerNavigationTarget | undefined,
    revealSource: boolean,
  ): void {
    this.preview.select(target);
    if (revealSource && target !== undefined) {
      if (target.source.file !== this.activeDocumentUri()) {
        this.documents.selectDocument(target.source.file);
        this.#compileCurrentProject(this.compiler.state().activeViewId);
      }
      queueMicrotask(() => this.sourceEditor()?.revealSource(target.source));
    }
  }

  #compileCurrentProject(
    requestedViewId = this.compiler.state().activeViewId,
  ): void {
    this.compiler.compileProject(
      this.documents.projectSnapshot(),
      this.activeDocumentUri(),
      requestedViewId,
    );
  }

  #afterDocumentSetChanged(): void {
    this.preview.clearSelection();
    this.#wizardSourceSession.invalidateUndo();
    this.#wizardDocumentBefore = undefined;
    this.canUndoWizard.set(false);
    this.placement.reset();
    this.routeEditor.reset();
    this.semanticEditor.reset();
  }
}
