import { Injectable, inject, signal } from "@angular/core";

import type {
  CompilerWorkerProject,
  CompilerWorkerRouteNavigationTarget,
  PreviewRouteChangeWorkerResponse,
} from "./compiler-worker.protocol.js";
import type { C4mlMonacoSourceEditorComponent } from "./monaco-source-editor.component.js";
import { projectChangeToSourceChange } from "./project-change-to-source.js";
import { WorkbenchDocumentFacade } from "./workbench-document.facade.js";
import { WorkbenchPreviewFacade } from "./workbench-preview.facade.js";

export interface RouteEditorSession {
  readonly project: CompilerWorkerProject;
  readonly activeFile: string;
  readonly viewId: string;
  readonly route: CompilerWorkerRouteNavigationTarget;
}

@Injectable({ providedIn: "root" })
export class WorkbenchRouteFacade {
  readonly session = signal<RouteEditorSession | undefined>(undefined);
  readonly canUndo = signal(false);

  readonly #documents = inject(WorkbenchDocumentFacade);
  readonly #preview = inject(WorkbenchPreviewFacade);
  #applyingChange = false;
  #documentWasDirty = false;

  show(): void {
    const route = this.#preview.selectedRoute();
    const viewId = this.#preview.activeViewId();
    if (route === undefined || viewId === undefined) return;
    this.session.set({
      project: this.#documents.projectSnapshot(),
      activeFile: this.#documents.activeDocumentUri(),
      viewId,
      route,
    });
  }

  close(): void {
    this.session.set(undefined);
  }

  apply(
    response: PreviewRouteChangeWorkerResponse,
    editor: C4mlMonacoSourceEditorComponent | undefined,
  ): void {
    const changeSet = response.changeSet;
    const documentUri = response.documentUri;
    if (
      response.status !== "valid" ||
      changeSet === undefined ||
      documentUri === undefined ||
      editor === undefined
    ) return;
    const document = this.#documents.projectDocuments().find(({ uri }) => uri === documentUri);
    if (document === undefined) return;
    const localChange = projectChangeToSourceChange(changeSet, documentUri, document.source);
    if (!localChange.valid || !this.#documents.selectDocument(documentUri)) return;

    queueMicrotask(() => {
      this.#applyingChange = true;
      const application = editor.applyChangeSet(localChange.changeSet);
      this.#applyingChange = false;
      if (!application.applied) return;
      this.#documentWasDirty = document.dirty;
      this.session.set(undefined);
      this.canUndo.set(true);
    });
  }

  undo(editor: C4mlMonacoSourceEditorComponent | undefined): void {
    if (editor === undefined || !this.canUndo()) return;
    const wasDirty = this.#documentWasDirty;
    this.#applyingChange = true;
    editor.undoAuthoringChange();
    this.#applyingChange = false;
    this.canUndo.set(false);
    queueMicrotask(() => {
      this.#documents.replaceSource(this.#documents.source(), wasDirty);
      this.#documentWasDirty = false;
    });
  }

  sourceChanged(): void {
    if (this.#applyingChange) return;
    this.canUndo.set(false);
    this.#documentWasDirty = false;
  }

  reset(): void {
    this.session.set(undefined);
    this.canUndo.set(false);
    this.#documentWasDirty = false;
    this.#applyingChange = false;
  }
}
