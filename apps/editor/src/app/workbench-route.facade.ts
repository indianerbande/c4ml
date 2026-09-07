import { Injectable, inject, signal } from "@angular/core";

import type {
  CompilerWorkerProject,
  CompilerWorkerRouteNavigationTarget,
  PreviewRouteChangeWorkerResponse,
} from "./compiler-worker.protocol.js";
import type { C4mlMonacoSourceEditorComponent } from "./monaco-source-editor.component.js";
import type { RouteEditorOperationKind } from "./route-editor.component.js";
import { WorkbenchDocumentFacade } from "./workbench-document.facade.js";
import { WorkbenchPreviewFacade } from "./workbench-preview.facade.js";
import { WorkbenchAuthoringHistoryService } from "./workbench-authoring-history.service.js";

export interface RouteEditorSession {
  readonly project: CompilerWorkerProject;
  readonly activeFile: string;
  readonly viewId: string;
  readonly route: CompilerWorkerRouteNavigationTarget;
  readonly initialOperation: RouteEditorOperationKind;
}

@Injectable({ providedIn: "root" })
export class WorkbenchRouteFacade {
  readonly session = signal<RouteEditorSession | undefined>(undefined);

  readonly #documents = inject(WorkbenchDocumentFacade);
  readonly #preview = inject(WorkbenchPreviewFacade);
  readonly #history = inject(WorkbenchAuthoringHistoryService);

  show(initialOperation: RouteEditorOperationKind = "ports"): void {
    const route = this.#preview.selectedRoute();
    const viewId = this.#preview.activeViewId();
    if (route === undefined || viewId === undefined) return;
    this.session.set({
      project: this.#documents.projectSnapshot(),
      activeFile: this.#documents.activeDocumentUri(),
      viewId,
      route,
      initialOperation,
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
    return this.#history
      .apply(changeSet, documentUri, editor, "route")
      .then((outcome) => {
        if (outcome === "applied") {
          this.session.set(undefined);
        }
      });
  }

  sourceChanged(): void {
    this.#history.sourceChanged();
  }

  reset(): void {
    this.session.set(undefined);
    this.#history.reset();
  }
}
