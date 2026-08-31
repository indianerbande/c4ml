import { Injectable, computed, effect, inject, signal } from "@angular/core";

import type { DesktopCommand } from "@c4ml/desktop-contract";

import { resolveC4mlDesktopApi } from "./desktop-bridge.js";
import { initialC4mlSource } from "./initial-source.js";
import { WorkbenchLocalizationService } from "./workbench-localization.js";
import { WorkbenchPreferencesService } from "./workbench-preferences.service.js";
import { saveAllProjectDocuments } from "./workbench-document-save-all.js";

export interface WorkbenchProjectDocument {
  readonly uri: string;
  readonly displayName: string;
  readonly source: string;
  readonly handle?: string;
  readonly dirty: boolean;
}

export interface WorkbenchProjectSnapshot {
  readonly version: 1;
  readonly id: string;
  readonly name?: string;
  readonly description?: string;
  readonly documents: readonly {
    readonly uri: string;
    readonly source: string;
  }[];
  readonly policy?: {
    readonly uri: string;
    readonly source: string;
  };
  readonly observations?: {
    readonly uri: string;
    readonly source: string;
  };
  readonly glossary?: {
    readonly uri: string;
    readonly source: string;
  };
  readonly narratives?: readonly {
    readonly uri: string;
    readonly source: string;
  }[];
  readonly publication?: {
    readonly uri: string;
    readonly source: string;
  };
  readonly theme?: { readonly uri: string; readonly source: string };
}

export interface WorkbenchDocumentState {
  readonly project: WorkbenchProjectSnapshot;
  readonly projectMode: boolean;
  readonly documents: readonly WorkbenchProjectDocument[];
  readonly activeUri: string;
}

export interface OpenedWorkbenchDocument {
  readonly source: string;
  readonly displayName: string;
}

const initialDocument: WorkbenchProjectDocument = {
  uri: "architecture.c4ml",
  displayName: "architecture.c4ml",
  source: initialC4mlSource,
  dirty: false,
};

@Injectable({ providedIn: "root" })
export class WorkbenchDocumentFacade {
  readonly projectDocuments = signal<readonly WorkbenchProjectDocument[]>([
    initialDocument,
  ]);
  readonly activeDocumentUri = signal(initialDocument.uri);
  readonly documentSetRevision = signal(0);
  readonly projectId = signal("implicit-project");
  readonly projectName = signal<string | undefined>(undefined);
  readonly projectDescription = signal<string | undefined>(undefined);
  readonly projectPolicy = signal<WorkbenchProjectSnapshot["policy"]>(undefined);
  readonly projectObservations = signal<WorkbenchProjectSnapshot["observations"]>(undefined);
  readonly projectGlossary = signal<WorkbenchProjectSnapshot["glossary"]>(undefined);
  readonly projectNarratives = signal<WorkbenchProjectSnapshot["narratives"]>(undefined);
  readonly projectPublication = signal<WorkbenchProjectSnapshot["publication"]>(undefined);
  readonly projectTheme = signal<WorkbenchProjectSnapshot["theme"]>(undefined);
  readonly projectMode = signal(false);
  readonly activeDocument = computed(
    () =>
      this.projectDocuments().find(
        ({ uri }) => uri === this.activeDocumentUri(),
      ) ?? this.projectDocuments()[0]!,
  );
  readonly source = computed(() => this.activeDocument().source);
  readonly documentName = computed(() => this.activeDocument().displayName);
  readonly documentHandle = computed(() => this.activeDocument().handle);
  readonly documentDirty = computed(() => this.activeDocument().dirty);
  readonly projectDirty = computed(() =>
    this.projectDocuments().some(({ dirty }) => dirty),
  );
  readonly workspaceName = computed(
    () => this.projectName() ?? this.#i18n.t("files.workspaceName"),
  );
  readonly fileOperationLabel = signal<string | undefined>(undefined);
  readonly pngScale = signal(2);

  readonly #desktop = resolveC4mlDesktopApi();
  readonly #i18n = inject(WorkbenchLocalizationService);
  readonly #preferences = inject(WorkbenchPreferencesService);
  readonly desktopAvailable = this.#desktop !== undefined;

  constructor() {
    effect(() => {
      const handle = this.documentHandle();
      this.#desktop?.setDocumentState({
        displayName: this.documentName(),
        dirty: this.projectDirty(),
        ...(handle === undefined ? {} : { handle }),
      });
    });
    effect(() => {
      this.#desktop?.setUiLanguage(this.#preferences.uiLanguage());
    });
  }

  onDesktopCommand(listener: (command: DesktopCommand) => void): () => void {
    return this.#desktop?.onCommand(listener) ?? (() => undefined);
  }

  projectSnapshot(): WorkbenchProjectSnapshot {
    const name = this.projectName();
    const description = this.projectDescription();
    const policy = this.projectPolicy();
    const observations = this.projectObservations();
    const glossary = this.projectGlossary();
    const narratives = this.projectNarratives();
    const publication = this.projectPublication();
    const theme = this.projectTheme();
    return {
      version: 1,
      id: this.projectId(),
      ...(name === undefined ? {} : { name }),
      ...(description === undefined ? {} : { description }),
      ...(policy === undefined ? {} : { policy }),
      ...(observations === undefined ? {} : { observations }),
      ...(glossary === undefined ? {} : { glossary }),
      ...(narratives === undefined ? {} : { narratives }),
      ...(publication === undefined ? {} : { publication }),
      ...(theme === undefined ? {} : { theme }),
      documents: this.projectDocuments().map(({ uri, source }) => ({
        uri,
        source,
      })),
    };
  }

  captureState(): WorkbenchDocumentState {
    return {
      project: this.projectSnapshot(),
      projectMode: this.projectMode(),
      documents: this.projectDocuments().map((document) => ({ ...document })),
      activeUri: this.activeDocumentUri(),
    };
  }

  restoreState(state: WorkbenchDocumentState): void {
    this.projectId.set(state.project.id);
    this.projectName.set(state.project.name);
    this.projectDescription.set(state.project.description);
    this.projectPolicy.set(state.project.policy);
    this.projectObservations.set(state.project.observations);
    this.projectGlossary.set(state.project.glossary);
    this.projectNarratives.set(state.project.narratives);
    this.projectPublication.set(state.project.publication);
    this.projectTheme.set(state.project.theme);
    this.projectMode.set(state.projectMode);
    this.projectDocuments.set(state.documents.map((document) => ({ ...document })));
    this.activeDocumentUri.set(state.activeUri);
    this.documentSetRevision.update((revision) => revision + 1);
  }

  selectDocument(uri: string): boolean {
    if (!this.projectDocuments().some((document) => document.uri === uri)) {
      return false;
    }
    this.activeDocumentUri.set(uri);
    return true;
  }

  replaceSource(source: string, dirty: boolean): void {
    this.#updateActiveDocument((document) => ({ ...document, source, dirty }));
  }

  resetAsGeneratedDocument(source: string): void {
    this.#replaceProject({
      id: "implicit-project",
      projectMode: false,
      documents: [
        {
          uri: "architecture.c4ml",
          displayName: "architecture.c4ml",
          source,
          dirty: true,
        },
      ],
    });
  }

  async openDocument(): Promise<OpenedWorkbenchDocument | undefined> {
    const desktop = this.#desktop;
    if (desktop === undefined || !this.#confirmDiscard()) {
      return undefined;
    }
    this.fileOperationLabel.set(this.#i18n.t("operation.opening"));
    try {
      const result = await desktop.openDocument();
      if (result.status === "opened") {
        this.#replaceProject({
          id: "implicit-project",
          projectMode: false,
          documents: [
            {
              uri: result.document.displayName,
              displayName: result.document.displayName,
              source: result.document.source,
              handle: result.document.handle,
              dirty: false,
            },
          ],
        });
        this.fileOperationLabel.set(
          this.#i18n.t("operation.opened", {
            name: result.document.displayName,
          }),
        );
        return {
          source: result.document.source,
          displayName: result.document.displayName,
        };
      }
      this.#recordOpenFailure(result);
    } catch {
      this.fileOperationLabel.set(this.#i18n.t("operation.openFailed"));
    }
    return undefined;
  }

  async openProject(): Promise<boolean> {
    const desktop = this.#desktop;
    if (desktop === undefined || !this.#confirmDiscard()) {
      return false;
    }
    this.fileOperationLabel.set(this.#i18n.t("operation.openingProject"));
    try {
      const result = await desktop.openProject();
      if (result.status === "opened") {
        this.#replaceProject({
          id: result.project.id,
          projectMode: true,
          ...(result.project.name === undefined
            ? {}
            : { name: result.project.name }),
          ...(result.project.description === undefined
            ? {}
            : { description: result.project.description }),
          ...(result.project.policy === undefined
            ? {}
            : { policy: result.project.policy }),
          ...(result.project.observations === undefined
            ? {}
            : { observations: result.project.observations }),
          ...(result.project.glossary === undefined
            ? {}
            : { glossary: result.project.glossary }),
          ...(result.project.narratives === undefined
            ? {}
            : { narratives: result.project.narratives }),
          ...(result.project.publication === undefined
            ? {}
            : { publication: result.project.publication }),
          ...(result.project.theme === undefined ? {} : { theme: result.project.theme }),
          documents: result.project.documents.map((document) => ({
            ...document,
            dirty: false,
          })),
        });
        this.fileOperationLabel.set(
          this.#i18n.t("operation.openedProject", {
            name: result.project.name ?? result.project.id,
            count: result.project.documents.length,
          }),
        );
        return true;
      }
      this.#recordOpenFailure(result);
    } catch {
      this.fileOperationLabel.set(this.#i18n.t("operation.openProjectFailed"));
    }
    return false;
  }

  async saveDocument(mode: "save" | "save-as"): Promise<void> {
    const desktop = this.#desktop;
    if (desktop === undefined) {
      return;
    }
    this.fileOperationLabel.set(
      this.#i18n.t(
        mode === "save-as" ? "operation.choosingSave" : "operation.saving",
      ),
    );
    try {
      const current = this.activeDocument();
      const result = await desktop.saveDocument({
        suggestedName: current.displayName,
        source: current.source,
        mode,
        ...(current.handle === undefined ? {} : { handle: current.handle }),
      });
      if (result.status === "saved") {
        this.#updateActiveDocument((document) => ({
          ...document,
          handle: result.handle,
          displayName: result.displayName,
          dirty: false,
        }));
        this.fileOperationLabel.set(
          this.#i18n.t("operation.saved", { name: result.displayName }),
        );
      } else if (result.status === "failed") {
        this.fileOperationLabel.set(`${result.code}: ${result.message}`);
      } else {
        this.fileOperationLabel.set(undefined);
      }
    } catch {
      this.fileOperationLabel.set(this.#i18n.t("operation.saveFailed"));
    }
  }

  async saveAllDocuments(): Promise<void> {
    const desktop = this.#desktop;
    if (desktop === undefined) {
      return;
    }
    const dirtyCount = this.projectDocuments().filter(({ dirty }) => dirty).length;
    if (dirtyCount === 0) {
      this.fileOperationLabel.set(this.#i18n.t("operation.allSaved"));
      return;
    }
    this.fileOperationLabel.set(
      this.#i18n.t("operation.savingAll", { count: dirtyCount }),
    );
    const result = await saveAllProjectDocuments(
      this.projectDocuments(),
      (request) => desktop.saveDocument(request),
    );
    this.projectDocuments.set(result.documents);
    const remaining = result.documents.filter(({ dirty }) => dirty).length;
    if (result.canceled) {
      this.fileOperationLabel.set(
        this.#i18n.t("operation.saveAllCanceled", {
          saved: result.savedCount,
          remaining,
        }),
      );
    } else if (result.failedCount > 0) {
      this.fileOperationLabel.set(
        this.#i18n.t("operation.saveAllFailed", {
          saved: result.savedCount,
          failed: result.failedCount,
        }),
      );
    } else {
      this.fileOperationLabel.set(
        this.#i18n.t("operation.savedAll", { count: result.savedCount }),
      );
    }
  }

  downloadSvg(svg: string, activeViewId: string | undefined): void {
    const url = URL.createObjectURL(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${activeViewId ?? "architecture"}.svg`;
    anchor.click();
    queueMicrotask(() => URL.revokeObjectURL(url));
  }

  async exportPng(
    svg: string,
    activeViewId: string | undefined,
  ): Promise<void> {
    const desktop = this.#desktop;
    if (desktop === undefined) {
      return;
    }
    this.fileOperationLabel.set(this.#i18n.t("operation.renderingPng"));
    try {
      const result = await desktop.exportPng({
        svg,
        scale: this.pngScale(),
        suggestedName: `${activeViewId ?? "architecture"}.png`,
      });
      if (result.status === "exported") {
        this.fileOperationLabel.set(
          this.#i18n.t("operation.exportedPng", {
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
      this.fileOperationLabel.set(this.#i18n.t("operation.pngFailed"));
    }
  }

  setPngScale(value: unknown): void {
    const scale = Number(value);
    if (Number.isFinite(scale) && scale >= 0.25 && scale <= 8) {
      this.pngScale.set(scale);
    }
  }

  #replaceProject(input: {
    readonly id: string;
    readonly name?: string;
    readonly description?: string;
    readonly policy?: WorkbenchProjectSnapshot["policy"];
    readonly observations?: WorkbenchProjectSnapshot["observations"];
    readonly glossary?: WorkbenchProjectSnapshot["glossary"];
    readonly narratives?: WorkbenchProjectSnapshot["narratives"];
    readonly publication?: WorkbenchProjectSnapshot["publication"];
    readonly theme?: WorkbenchProjectSnapshot["theme"];
    readonly projectMode: boolean;
    readonly documents: readonly WorkbenchProjectDocument[];
  }): void {
    const first = input.documents[0];
    if (first === undefined) {
      return;
    }
    this.projectId.set(input.id);
    this.projectName.set(input.name);
    this.projectDescription.set(input.description);
    this.projectPolicy.set(input.policy);
    this.projectObservations.set(input.observations);
    this.projectGlossary.set(input.glossary);
    this.projectNarratives.set(input.narratives);
    this.projectPublication.set(input.publication);
    this.projectTheme.set(input.theme);
    this.projectMode.set(input.projectMode);
    this.projectDocuments.set(input.documents.map((document) => ({ ...document })));
    this.activeDocumentUri.set(first.uri);
    this.documentSetRevision.update((revision) => revision + 1);
  }

  #updateActiveDocument(
    update: (document: WorkbenchProjectDocument) => WorkbenchProjectDocument,
  ): void {
    const activeUri = this.activeDocumentUri();
    this.projectDocuments.update((documents) =>
      documents.map((document) =>
        document.uri === activeUri ? update(document) : document,
      ),
    );
  }

  #confirmDiscard(): boolean {
    return (
      !this.projectDirty() ||
      window.confirm(
        this.#i18n.t("operation.discardProject", {
          name: this.workspaceName(),
        }),
      )
    );
  }

  #recordOpenFailure(result: {
    readonly status: "canceled" | "failed";
    readonly code?: string;
    readonly message?: string;
  }): void {
    if (result.status === "failed") {
      this.fileOperationLabel.set(`${result.code}: ${result.message}`);
    } else {
      this.fileOperationLabel.set(undefined);
    }
  }
}
