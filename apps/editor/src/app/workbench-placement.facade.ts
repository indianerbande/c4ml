import { Injectable, computed, inject, signal } from "@angular/core";

import type {
  PreviewPlacementChangeWorkerResponse,
} from "./compiler-worker.protocol.js";
import type {
  C4mlMonacoSourceEditorComponent,
} from "./monaco-source-editor.component.js";
import type {
  PlacementEditorNode,
  PlacementEditorOperationKind,
} from "./placement-editor.component.js";
import { SourceAuthoringTransaction } from "./source-authoring-transaction.js";
import { WorkbenchDocumentFacade } from "./workbench-document.facade.js";
import { WorkbenchPreviewFacade } from "./workbench-preview.facade.js";

@Injectable({ providedIn: "root" })
export class WorkbenchPlacementFacade {
  readonly open = signal(false);
  readonly initialOperation = signal<PlacementEditorOperationKind>("relative");
  readonly initialDirection = signal<"down" | "left" | "right" | "up">("right");
  readonly project = computed(() => this.#documents.projectSnapshot());
  readonly nodes = computed<readonly PlacementEditorNode[]>(() =>
    (this.#preview.navigation()?.targets ?? []).flatMap((target) =>
      target.kind === "node" && target.nodeRole === "element"
        ? [
            {
              id: target.referenceId,
              label: target.label,
              x: target.geometry?.final.x ?? target.bounds.x,
              y: target.geometry?.final.y ?? target.bounds.y,
            },
          ]
        : [],
    ),
  );

  readonly #documents = inject(WorkbenchDocumentFacade);
  readonly #preview = inject(WorkbenchPreviewFacade);
  readonly #transaction = new SourceAuthoringTransaction(this.#documents);
  readonly canUndo = this.#transaction.canUndo;

  show(options: {
    readonly operation?: PlacementEditorOperationKind;
    readonly direction?: "down" | "left" | "right" | "up";
  } = {}): void {
    const selected = this.#preview.selectedNode();
    if (selected?.nodeRole === "element" && this.nodes().length > 0) {
      this.initialOperation.set(options.operation ?? "relative");
      this.initialDirection.set(options.direction ?? "right");
      this.open.set(true);
    }
  }

  close(): void {
    this.open.set(false);
  }

  apply(
    response: PreviewPlacementChangeWorkerResponse,
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
          this.open.set(false);
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
    this.open.set(false);
    this.initialOperation.set("relative");
    this.initialDirection.set("right");
    this.#transaction.reset();
  }
}
