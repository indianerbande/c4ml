import { signal } from "@angular/core";

import {
  applyProjectSourceChangeSet,
  createArchitectureProjectInput,
  type ProposedProjectSourceChangeSet,
  type ProposedSourceChangeSet,
} from "@c4ml/compiler-core";

import { projectChangeToSourceChange } from "./project-change-to-source.js";
import type { SourceEditorChangeSetApplication } from "./source-editor-change-set.js";
import type { SourceEditorProjectEditApplication } from "./source-editor-project-edit.js";
import type { CompilerWorkerProject } from "./compiler-worker.protocol.js";

export type AuthoringHistoryKind =
  | "diagram"
  | "diagram-content"
  | "diagram-delete"
  | "diagram-edit"
  | "deployment"
  | "element"
  | "element-delete"
  | "placement"
  | "relationship"
  | "route"
  | "view-element"
  | "view-element-hide";

interface AuthoringDocumentState {
  readonly uri: string;
  readonly source: string;
  readonly dirty: boolean;
}

/** The subset of the workbench document state a transaction needs. */
export interface AuthoringDocumentHost {
  projectSnapshot?(): CompilerWorkerProject;
  replaceDocumentSources?(updates: readonly AuthoringDocumentState[]): void;
  projectDocuments(): readonly AuthoringDocumentState[];
  activeDocumentUri(): string;
  selectDocument(uri: string): boolean;
  source(): string;
  replaceSource(source: string, dirty: boolean): void;
}

/** The subset of the source editor a transaction needs. */
export interface AuthoringEditorHost {
  applyDocumentBatch?(
    changes: readonly { uri: string; before: string; after: string }[],
  ): SourceEditorProjectEditApplication | undefined;
  /** Wait until the source editor actually presents the selected document. */
  whenDocumentActive(uri: string): Promise<boolean>;
  applyChangeSet(
    changeSet: ProposedSourceChangeSet,
    documentUri: string,
  ): SourceEditorChangeSetApplication;
  undoAuthoringChange(): void;
  redoAuthoringChange(): void;
}

export type AuthoringApplyOutcome =
  | "applied"
  | "document-missing"
  | "editor-rejected"
  | "invalid"
  | "superseded";

interface SingleDocumentHistoryEntry {
  readonly mode: "single";
  readonly kind: AuthoringHistoryKind;
  readonly documentUri: string;
  readonly before: AuthoringDocumentState;
  readonly after: AuthoringDocumentState;
}

interface ProjectHistoryEntry {
  readonly mode: "project";
  readonly kind: AuthoringHistoryKind;
  readonly documentUri: string;
  readonly before: readonly AuthoringDocumentState[];
  readonly after: readonly AuthoringDocumentState[];
  readonly application: SourceEditorProjectEditApplication;
}

type AuthoringHistoryEntry = SingleDocumentHistoryEntry | ProjectHistoryEntry;

const historyLimit = 50;

/**
 * Applies worker-reviewed source changes and owns one shared, bounded authoring
 * history. Manual source edits invalidate this history; Monaco keeps its own
 * ordinary text history independently.
 */
export class SourceAuthoringTransaction {
  readonly canUndo = signal(false);
  readonly canRedo = signal(false);
  readonly undoKind = signal<AuthoringHistoryKind | undefined>(undefined);
  readonly redoKind = signal<AuthoringHistoryKind | undefined>(undefined);

  #applyingChange = false;
  #undoEntries: AuthoringHistoryEntry[] = [];
  #redoEntries: AuthoringHistoryEntry[] = [];

  constructor(private readonly documents: AuthoringDocumentHost) {}

  get undoDocumentUri(): string | undefined {
    return this.#undoEntries.at(-1)?.documentUri;
  }

  async apply(
    changeSet: ProposedProjectSourceChangeSet,
    documentUri: string,
    editor: AuthoringEditorHost,
    kind: AuthoringHistoryKind =
      changeSet.intent.kind === "layout" ? "placement" :
      changeSet.intent.kind === "route" ? "route" :
      changeSet.intent.kind === "view" ? "view-element" : "element",
  ): Promise<AuthoringApplyOutcome> {
    const snapshot = this.documents.projectSnapshot?.();
    const project = snapshot === undefined
      ? undefined
      : createArchitectureProjectInput({
          ...snapshot,
          documents: snapshot.documents.map(({ uri, source }) => ({
            uri,
            text: source,
          })),
        });
    if (
      project !== undefined &&
      !applyProjectSourceChangeSet(project, changeSet).valid
    ) {
      return "invalid";
    }

    if (new Set(changeSet.edits.map((edit) => edit.documentUri)).size > 1) {
      return this.#applyProjectChange(changeSet, documentUri, editor, kind, project);
    }
    return this.#applyDocumentChange(changeSet, documentUri, editor, kind, project);
  }

  async undo(editor: AuthoringEditorHost): Promise<boolean> {
    const entry = this.#undoEntries.at(-1);
    if (entry === undefined) return false;
    const undone = entry.mode === "project"
      ? this.#moveProjectEntry(entry, "undo")
      : await this.#moveDocumentEntry(entry, editor, "undo");
    if (!undone) {
      this.#clearHistory();
      return false;
    }
    if (this.#undoEntries.at(-1) !== entry) return false;
    this.#undoEntries.pop();
    this.#redoEntries.push(entry);
    this.#syncState();
    return true;
  }

  async redo(editor: AuthoringEditorHost): Promise<boolean> {
    const entry = this.#redoEntries.at(-1);
    if (entry === undefined) return false;
    const redone = entry.mode === "project"
      ? this.#moveProjectEntry(entry, "redo")
      : await this.#moveDocumentEntry(entry, editor, "redo");
    if (!redone) {
      this.#clearHistory();
      return false;
    }
    if (this.#redoEntries.at(-1) !== entry) return false;
    this.#redoEntries.pop();
    this.#undoEntries.push(entry);
    this.#syncState();
    return true;
  }

  /** Any source change outside this transaction invalidates authoring history. */
  sourceChanged(): void {
    if (this.#applyingChange) return;
    this.#clearHistory();
  }

  reset(): void {
    this.#applyingChange = false;
    this.#clearHistory();
  }

  async #applyProjectChange(
    changeSet: ProposedProjectSourceChangeSet,
    documentUri: string,
    editor: AuthoringEditorHost,
    kind: AuthoringHistoryKind,
    project: ReturnType<typeof createArchitectureProjectInput> | undefined,
  ): Promise<AuthoringApplyOutcome> {
    if (
      project === undefined ||
      this.documents.replaceDocumentSources === undefined ||
      editor.applyDocumentBatch === undefined
    ) {
      return "invalid";
    }
    const application = applyProjectSourceChangeSet(project, changeSet);
    if (!application.valid) return "invalid";
    const before = this.documents
      .projectDocuments()
      .filter(({ uri }) =>
        changeSet.edits.some((edit) => edit.documentUri === uri),
      );
    const changes = before.map((document) => ({
      uri: document.uri,
      before: document.source,
      after: application.project.documents.find(
        ({ uri }) => uri === document.uri,
      )!.text,
    }));
    this.#applyingChange = true;
    try {
      const editorApplication = editor.applyDocumentBatch(changes);
      if (editorApplication === undefined) return "editor-rejected";
      const after = changes.map(({ uri, after: source }) => ({
        uri,
        source,
        dirty: true,
      }));
      this.documents.replaceDocumentSources(after);
      this.#record({
        mode: "project",
        kind,
        documentUri,
        before,
        after,
        application: editorApplication,
      });
      return "applied";
    } finally {
      this.#applyingChange = false;
    }
  }

  async #applyDocumentChange(
    changeSet: ProposedProjectSourceChangeSet,
    documentUri: string,
    editor: AuthoringEditorHost,
    kind: AuthoringHistoryKind,
    project: ReturnType<typeof createArchitectureProjectInput> | undefined,
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

    const current = this.documents.projectSnapshot?.();
    if (
      current !== undefined &&
      !applyProjectSourceChangeSet(
        createArchitectureProjectInput({
          ...current,
          documents: current.documents.map(({ uri, source }) => ({
            uri,
            text: source,
          })),
        }),
        changeSet,
      ).valid
    ) {
      return "invalid";
    }

    this.#applyingChange = true;
    try {
      const application = editor.applyChangeSet(
        localChange.changeSet,
        documentUri,
      );
      if (!application.applied) return "editor-rejected";
      this.#record({
        mode: "single",
        kind,
        documentUri,
        before: document,
        after: { uri: documentUri, source: application.source, dirty: true },
      });
      return "applied";
    } finally {
      this.#applyingChange = false;
    }
  }

  async #moveDocumentEntry(
    entry: SingleDocumentHistoryEntry,
    editor: AuthoringEditorHost,
    direction: "redo" | "undo",
  ): Promise<boolean> {
    const expected = direction === "undo" ? entry.after : entry.before;
    const target = direction === "undo" ? entry.before : entry.after;
    if (
      this.documents.projectDocuments().find(({ uri }) => uri === entry.documentUri)
        ?.source !== expected.source
    ) {
      return false;
    }
    if (this.documents.activeDocumentUri() !== entry.documentUri) {
      if (!this.documents.selectDocument(entry.documentUri)) return false;
      if (!(await editor.whenDocumentActive(entry.documentUri))) return false;
    }
    const activeEntry = direction === "undo"
      ? this.#undoEntries.at(-1)
      : this.#redoEntries.at(-1);
    if (
      activeEntry !== entry ||
      this.documents.activeDocumentUri() !== entry.documentUri ||
      this.documents.source() !== expected.source
    ) {
      return false;
    }

    this.#applyingChange = true;
    try {
      if (direction === "undo") editor.undoAuthoringChange();
      else editor.redoAuthoringChange();
      if (this.documents.source() !== target.source) return false;
      this.documents.replaceSource(target.source, target.dirty);
      return true;
    } finally {
      this.#applyingChange = false;
    }
  }

  #moveProjectEntry(
    entry: ProjectHistoryEntry,
    direction: "redo" | "undo",
  ): boolean {
    if (this.documents.replaceDocumentSources === undefined) return false;
    const expected = direction === "undo" ? entry.after : entry.before;
    if (
      !expected.every(
        ({ uri, source }) =>
          this.documents.projectDocuments().find((document) => document.uri === uri)
            ?.source === source,
      )
    ) {
      return false;
    }
    this.#applyingChange = true;
    try {
      if (!entry.application.synchronize()) return false;
      const moved = direction === "undo"
        ? entry.application.undo()
        : entry.application.redo();
      if (!moved) return false;
      this.documents.replaceDocumentSources(
        direction === "undo" ? entry.before : entry.after,
      );
      return true;
    } finally {
      this.#applyingChange = false;
    }
  }

  #record(entry: AuthoringHistoryEntry): void {
    this.#undoEntries.push(entry);
    if (this.#undoEntries.length > historyLimit) this.#undoEntries.shift();
    this.#redoEntries = [];
    this.#syncState();
  }

  #clearHistory(): void {
    this.#undoEntries = [];
    this.#redoEntries = [];
    this.#syncState();
  }

  #syncState(): void {
    const undo = this.#undoEntries.at(-1);
    const redo = this.#redoEntries.at(-1);
    this.canUndo.set(undo !== undefined);
    this.canRedo.set(redo !== undefined);
    this.undoKind.set(undo?.kind);
    this.redoKind.set(redo?.kind);
  }
}
