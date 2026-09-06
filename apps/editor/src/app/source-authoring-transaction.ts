import { signal } from "@angular/core";

import { applyProjectSourceChangeSet, createArchitectureProjectInput,
  type ProposedProjectSourceChangeSet,
  type ProposedSourceChangeSet,
} from "@c4ml/compiler-core";

import { projectChangeToSourceChange } from "./project-change-to-source.js";
import type { SourceEditorChangeSetApplication } from "./source-editor-change-set.js";
import type { CompilerWorkerProject } from "./compiler-worker.protocol.js";

/** The subset of the workbench document state a transaction needs. */
export interface AuthoringDocumentHost {
  projectSnapshot?(): CompilerWorkerProject;
  replaceDocumentSources?(updates: readonly { uri: string; source: string; dirty: boolean }[]): void;
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
  applyDocumentBatch?(changes: readonly { uri: string; before: string; after: string }[]): (() => boolean) | undefined;
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
 * Applies one worker-reviewed project change set and offers one-step authoring
 * undo bound to every affected document.
 *
 * Shared by the placement, route, and semantic authoring facades so their
 * apply/undo behavior cannot drift apart.
 */
export class SourceAuthoringTransaction {
  readonly canUndo = signal(false);

  #applyingChange = false;
  #documentWasDirty = false;
  #undoDocumentUri: string | undefined;
  #undoBatch: (() => boolean) | undefined;

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
    const snapshot = this.documents.projectSnapshot?.();
    const project = snapshot === undefined ? undefined : createArchitectureProjectInput({
      ...snapshot, documents: snapshot.documents.map(({ uri, source }) => ({ uri, text: source })),
    });
    if (project !== undefined && !applyProjectSourceChangeSet(project, changeSet).valid) return "invalid";
    if (new Set(changeSet.edits.map(({ documentUri }) => documentUri)).size > 1) {
      if (project === undefined || this.documents.replaceDocumentSources === undefined || editor.applyDocumentBatch === undefined) return "invalid";
      const application = applyProjectSourceChangeSet(project, changeSet);
      if (!application.valid) return "invalid";
      const before = this.documents.projectDocuments().filter(({ uri }) => changeSet.edits.some((edit) => edit.documentUri === uri));
      const changes = before.map((document) => ({ uri: document.uri, before: document.source,
        after: application.project.documents.find(({ uri }) => uri === document.uri)!.text }));
      this.#applyingChange = true;
      try {
        const undo = editor.applyDocumentBatch(changes);
        if (undo === undefined) return "editor-rejected";
        this.documents.replaceDocumentSources(changes.map(({ uri, after }) => ({ uri, source: after, dirty: true })));
        this.#undoBatch = () => {
          if (!changes.every(({ uri, after }) => this.documents.projectDocuments().find((doc) => doc.uri === uri)?.source === after)) return false;
          if (!undo()) return false;
          this.documents.replaceDocumentSources!(before);
          return true;
        };
        this.#undoDocumentUri = documentUri;
        this.canUndo.set(true);
        return "applied";
      } finally { this.#applyingChange = false; }
    }
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
    const current = this.documents.projectSnapshot?.();
    if (current !== undefined && !applyProjectSourceChangeSet(createArchitectureProjectInput({
      ...current, documents: current.documents.map(({ uri, source }) => ({ uri, text: source })),
    }), changeSet).valid) return "invalid";

    this.#applyingChange = true;
    let application: SourceEditorChangeSetApplication;
    try {
      application = editor.applyChangeSet(localChange.changeSet, documentUri);
    } finally {
      this.#applyingChange = false;
    }
    if (!application.applied) return "editor-rejected";
    this.#undoBatch = undefined;
    this.#documentWasDirty = document.dirty;
    this.#undoDocumentUri = documentUri;
    this.canUndo.set(true);
    return "applied";
  }

  async undo(editor: AuthoringEditorHost): Promise<boolean> {
    if (this.canUndo() && this.#undoBatch !== undefined) {
      this.#applyingChange = true;
      try {
        const undone = this.#undoBatch();
        this.#clearUndo();
        return undone;
      } finally { this.#applyingChange = false; }
    }
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
    this.#undoBatch = undefined;
    this.canUndo.set(false);
    this.#documentWasDirty = false;
    this.#undoDocumentUri = undefined;
  }
}
