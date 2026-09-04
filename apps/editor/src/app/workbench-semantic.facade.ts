import { Injectable, computed, inject, signal } from "@angular/core";
import type {
  C4mlSemanticAuthoringContext,
} from "@c4ml/language-c4ml";

import { CompilerWorkerClient } from "./compiler-worker-client.service.js";
import type { PreviewSemanticChangeWorkerResponse } from "./compiler-worker.protocol.js";
import type { C4mlMonacoSourceEditorComponent } from "./monaco-source-editor.component.js";
import { SourceAuthoringTransaction } from "./source-authoring-transaction.js";
import { WorkbenchDocumentFacade } from "./workbench-document.facade.js";

export type SemanticEditorMode = "element" | "relationship";

export type ConnectionPickResult =
  | { readonly status: "ignored" }
  | { readonly status: "source-selected" }
  | { readonly status: "relationship-ready" };

@Injectable({ providedIn: "root" })
export class WorkbenchSemanticFacade {
  readonly open = signal(false);
  readonly mode = signal<SemanticEditorMode>("element");
  readonly initialSourceId = signal<string | undefined>(undefined);
  readonly initialTargetId = signal<string | undefined>(undefined);
  readonly picking = signal(false);
  readonly pickerSourceId = signal<string | undefined>(undefined);
  readonly pickerIssue = signal<"invalid-source" | "invalid-target" | undefined>(
    undefined,
  );
  readonly project = computed(() => this.#documents.projectSnapshot());
  readonly pickerSourceLabel = computed(() => {
    const id = this.pickerSourceId();
    return id === undefined
      ? undefined
      : this.#connectionContext()?.elements.find((element) => element.id === id)
          ?.label ?? id;
  });

  readonly #documents = inject(WorkbenchDocumentFacade);
  readonly #compiler = inject(CompilerWorkerClient);
  readonly #connectionContext = signal<C4mlSemanticAuthoringContext | undefined>(
    undefined,
  );
  readonly #transaction = new SourceAuthoringTransaction(this.#documents);
  readonly canUndo = this.#transaction.canUndo;
  #activeViewId: string | undefined;

  showElement(activeViewId: string | undefined): void {
    this.#show(activeViewId, "element");
  }

  showRelationship(
    activeViewId: string | undefined,
    sourceId?: string,
    targetId?: string,
  ): void {
    this.#show(activeViewId, "relationship", sourceId, targetId);
  }

  close(): void {
    this.open.set(false);
    this.initialSourceId.set(undefined);
    this.initialTargetId.set(undefined);
  }

  async beginConnectionPicking(
    activeViewId: string | undefined,
    sourceId?: string,
  ): Promise<boolean> {
    if (activeViewId === undefined) return false;
    const response = await this.#compiler.inspectSemanticAuthoring(
      this.project(),
      this.#documents.activeDocumentUri(),
      activeViewId,
    );
    const context = response?.status === "valid" ? response.context : undefined;
    if (context === undefined || context.connectionOptions.length === 0) {
      return false;
    }
    this.#activeViewId = activeViewId;
    this.#connectionContext.set(context);
    this.open.set(false);
    this.mode.set("relationship");
    this.initialSourceId.set(undefined);
    this.initialTargetId.set(undefined);
    this.pickerIssue.set(undefined);
    this.pickerSourceId.set(
      sourceId !== undefined && this.#isValidSource(sourceId)
        ? sourceId
        : undefined,
    );
    this.picking.set(true);
    return true;
  }

  pickConnectionElement(id: string): ConnectionPickResult {
    if (!this.picking()) return { status: "ignored" };
    const sourceId = this.pickerSourceId();
    if (sourceId === undefined) {
      if (!this.#isValidSource(id)) {
        this.pickerIssue.set("invalid-source");
        return { status: "ignored" };
      }
      this.pickerSourceId.set(id);
      this.pickerIssue.set(undefined);
      return { status: "source-selected" };
    }
    if (!this.#isValidTarget(sourceId, id)) {
      this.pickerIssue.set("invalid-target");
      return { status: "ignored" };
    }
    const activeViewId = this.#activeViewId;
    this.cancelConnectionPicking();
    this.showRelationship(activeViewId, sourceId, id);
    return { status: "relationship-ready" };
  }

  useConnectionLists(): void {
    const sourceId = this.pickerSourceId();
    const activeViewId = this.#activeViewId;
    this.cancelConnectionPicking();
    this.showRelationship(activeViewId, sourceId);
  }

  cancelConnectionPicking(): void {
    this.picking.set(false);
    this.pickerSourceId.set(undefined);
    this.pickerIssue.set(undefined);
    this.#connectionContext.set(undefined);
  }

  apply(
    response: PreviewSemanticChangeWorkerResponse,
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
          this.initialSourceId.set(undefined);
          this.initialTargetId.set(undefined);
        }
      });
  }

  undo(editor: C4mlMonacoSourceEditorComponent | undefined): Promise<void> {
    if (editor === undefined) return Promise.resolve();
    return this.#transaction.undo(editor).then(() => undefined);
  }

  sourceChanged(): void {
    // Connection picking is bound to the compiled diagram; any edit ends it.
    // Only the undo step must survive the facade's own apply/undo edits.
    this.cancelConnectionPicking();
    this.#transaction.sourceChanged();
  }

  reset(): void {
    this.open.set(false);
    this.mode.set("element");
    this.initialSourceId.set(undefined);
    this.initialTargetId.set(undefined);
    this.cancelConnectionPicking();
    this.#transaction.reset();
  }

  #show(
    activeViewId: string | undefined,
    mode: SemanticEditorMode,
    sourceId?: string,
    targetId?: string,
  ): void {
    if (activeViewId === undefined) return;
    this.#activeViewId = activeViewId;
    this.cancelConnectionPicking();
    this.mode.set(mode);
    this.initialSourceId.set(sourceId);
    this.initialTargetId.set(targetId);
    this.open.set(true);
  }

  #isValidSource(id: string): boolean {
    return this.#connectionContext()?.connectionOptions.some(
      ({ sourceId }) => sourceId === id,
    ) === true;
  }

  #isValidTarget(sourceId: string, targetId: string): boolean {
    return this.#connectionContext()?.connectionOptions.find(
      (option) => option.sourceId === sourceId,
    )?.targetIds.includes(targetId) === true;
  }
}
