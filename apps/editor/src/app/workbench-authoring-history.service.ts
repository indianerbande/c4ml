import { Injectable, inject } from "@angular/core";

import type { ProposedProjectSourceChangeSet } from "@c4ml/compiler-core";

import type { C4mlMonacoSourceEditorComponent } from "./monaco-source-editor.component.js";
import {
  SourceAuthoringTransaction,
  type AuthoringApplyOutcome,
  type AuthoringHistoryKind,
} from "./source-authoring-transaction.js";
import { WorkbenchDocumentFacade } from "./workbench-document.facade.js";

@Injectable({ providedIn: "root" })
export class WorkbenchAuthoringHistoryService {
  readonly #transaction = new SourceAuthoringTransaction(
    inject(WorkbenchDocumentFacade),
  );

  readonly canUndo = this.#transaction.canUndo;
  readonly canRedo = this.#transaction.canRedo;
  readonly undoKind = this.#transaction.undoKind;
  readonly redoKind = this.#transaction.redoKind;

  apply(
    changeSet: ProposedProjectSourceChangeSet,
    documentUri: string,
    editor: C4mlMonacoSourceEditorComponent,
    kind: AuthoringHistoryKind,
  ): Promise<AuthoringApplyOutcome> {
    return this.#transaction.apply(changeSet, documentUri, editor, kind);
  }

  undo(editor: C4mlMonacoSourceEditorComponent | undefined): Promise<boolean> {
    return editor === undefined
      ? Promise.resolve(false)
      : this.#transaction.undo(editor);
  }

  redo(editor: C4mlMonacoSourceEditorComponent | undefined): Promise<boolean> {
    return editor === undefined
      ? Promise.resolve(false)
      : this.#transaction.redo(editor);
  }

  sourceChanged(): void {
    this.#transaction.sourceChanged();
  }

  reset(): void {
    this.#transaction.reset();
  }
}
