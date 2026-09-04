import { Injectable, inject, signal } from "@angular/core";

import type {
  CompilerWorkerProject,
  CompilerWorkerRouteNavigationTarget,
  PreviewRouteChangeWorkerResponse,
} from "./compiler-worker.protocol.js";
import type { C4mlMonacoSourceEditorComponent } from "./monaco-source-editor.component.js";
import { SourceAuthoringTransaction } from "./source-authoring-transaction.js";
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

  readonly #documents = inject(WorkbenchDocumentFacade);
  readonly #preview = inject(WorkbenchPreviewFacade);
  readonly #transaction = new SourceAuthoringTransaction(this.#documents);
  readonly canUndo = this.#transaction.canUndo;

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
  ): Promise<void> {
    const changeSet = response.changeSet;
    const documentUri = response.documentUri;
    if (
      response.status !== "valid" ||
      changeSet === undefined ||
      documentUri === undefined ||
      editor === undefined
    ) {
      return Promise.resolve();
    }
    return this.#transaction
      .apply(changeSet, documentUri, editor)
      .then((outcome) => {
        if (outcome === "applied") {
          this.session.set(undefined);
        }
      });
  }

  undo(editor: C4mlMonacoSourceEditorComponent | undefined): Promise<void> {
    if (editor === undefined) return Promise.resolve();
    return this.#transaction.undo(editor).then(() => undefined);
  }

  sourceChanged(): void {
    this.#transaction.sourceChanged();
  }

  reset(): void {
    this.session.set(undefined);
    this.#transaction.reset();
  }
}
