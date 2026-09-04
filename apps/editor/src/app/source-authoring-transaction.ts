import { signal } from "@angular/core";

import type {
  ProposedProjectSourceChangeSet,
  ProposedSourceChangeSet,
} from "@c4ml/compiler-core";

import { projectChangeToSourceChange } from "./project-change-to-source.js";
import type { SourceEditorChangeSetApplication } from "./source-editor-change-set.js";

/** The subset of the workbench document state a transaction needs. */
export interface AuthoringDocumentHost {
  projectDocuments(): readonly {
    readonly uri: string;
    readonly source: string;
    readonly dirty: boolean;
  }[];
  activeDocumentUri(): string;
  selectDocument(uri: string): boolean;
  source(): string;
  replaceSource(source: string, dirty: boolean): void;
}

/** The subset of the source editor a transaction needs. */
export interface AuthoringEditorHost {
  /**
   * Resolves once the editor presents the document with `uri`. The workbench
   * switches documents through signals, so the Monaco model changes only in
   * the next change-detection tick; a transaction must wait for that instead
   * of assuming the switch happened synchronously.
   */
  whenDocumentActive(uri: string): Promise<boolean>;
  applyChangeSet(
    changeSet: ProposedSourceChangeSet,
    documentUri: string,
  ): SourceEditorChangeSetApplication;
  undoAuthoringChange(): void;
}

export type AuthoringApplyOutcome =
  | "applied"
  | "document-missing"
  | "editor-rejected"
  | "invalid"
  | "superseded";

/**
 * Applies one worker-reviewed project change set to exactly one document as a
 * single editor undo unit and offers one-step undo bound to that document.
 *
 * Shared by the placement, route, and semantic authoring facades so their
 * apply/undo behavior cannot drift apart.
 */
export class SourceAuthoringTransaction {
  readonly canUndo = signal(false);

  #applyingChange = false;
  #documentWasDirty = false;
  #undoDocumentUri: string | undefined;

  constructor(private readonly documents: AuthoringDocumentHost) {}

  /** The document whose last authoring change this transaction can undo. */
  get undoDocumentUri(): string | undefined {
    return this.canUndo() ? this.#undoDocumentUri : undefined;
  }

  async apply(
    changeSet: ProposedProjectSourceChangeSet,
    documentUri: string,
    editor: AuthoringEditorHost,
  ): Promise<AuthoringApplyOutcome> {
    const document = this.documents
      .projectDocuments()
      .find(({ uri }) => uri === documentUri);
    if (document === undefined) return "document-missing";
    const localChange = projectChangeToSourceChange(
      changeSet,
      documentUri,
      document.source,
    );
    if (!localChange.valid) return "invalid";
    if (!this.documents.selectDocument(documentUri)) return "document-missing";

    if (!(await editor.whenDocumentActive(documentUri))) return "superseded";
    if (this.documents.activeDocumentUri() !== documentUri) return "superseded";

    this.#applyingChange = true;
    let application: SourceEditorChangeSetApplication;
    try {
      application = editor.applyChangeSet(localChange.changeSet, documentUri);
    } finally {
      this.#applyingChange = false;
    }
    if (!application.applied) return "editor-rejected";
    this.#documentWasDirty = document.dirty;
    this.#undoDocumentUri = documentUri;
    this.canUndo.set(true);
    return "applied";
  }

  async undo(editor: AuthoringEditorHost): Promise<boolean> {
    const documentUri = this.#undoDocumentUri;
    if (!this.canUndo() || documentUri === undefined) return false;
    if (this.documents.activeDocumentUri() !== documentUri) {
      if (!this.documents.selectDocument(documentUri)) {
        this.#clearUndo();
        return false;
      }
      if (!(await editor.whenDocumentActive(documentUri))) return false;
      if (!this.canUndo()) return false;
    }

    const wasDirty = this.#documentWasDirty;
    this.#applyingChange = true;
    try {
      editor.undoAuthoringChange();
      // The editor reports the undone content synchronously through the
      // workbench; restore the dirty state the document had before the change.
      this.documents.replaceSource(this.documents.source(), wasDirty);
    } finally {
      this.#applyingChange = false;
    }
    this.#clearUndo();
    return true;
  }

  /** Any source change outside this transaction invalidates its undo step. */
  sourceChanged(): void {
    if (this.#applyingChange) return;
    this.#clearUndo();
  }

  reset(): void {
    this.#applyingChange = false;
    this.#clearUndo();
  }

  #clearUndo(): void {
    this.canUndo.set(false);
    this.#documentWasDirty = false;
    this.#undoDocumentUri = undefined;
  }
}
