import { describe, expect, it } from "vitest";

import {
  applySourceChangeSet,
  createArchitectureProjectInput,
  createProposedProjectSourceChangeSet,
  type ProposedSourceChangeSet,
} from "@c4ml/compiler-core";

import {
  SourceAuthoringTransaction,
  type AuthoringDocumentHost,
  type AuthoringEditorHost,
} from "../src/app/source-authoring-transaction.js";

interface FakeDocument {
  uri: string;
  source: string;
  dirty: boolean;
}

/**
 * Mirrors the workbench: `selectDocument` only records the wish, the editor
 * presents the document later, when `presentActive()` simulates Angular's
 * next change-detection tick.
 */
class FakeWorkbench implements AuthoringDocumentHost, AuthoringEditorHost {
  readonly documents: FakeDocument[];
  activeUri: string;
  presentedUri: string;
  readonly appliedTo: string[] = [];
  readonly undoneIn: string[] = [];
  readonly #waiters: { uri: string; resolve: (active: boolean) => void }[] = [];
  #history: { uri: string; before: string }[] = [];

  constructor(documents: FakeDocument[], activeUri: string) {
    this.documents = documents;
    this.activeUri = activeUri;
    this.presentedUri = activeUri;
  }

  projectDocuments(): readonly FakeDocument[] {
    return this.documents.map((document) => ({ ...document }));
  }

  activeDocumentUri(): string {
    return this.activeUri;
  }

  selectDocument(uri: string): boolean {
    if (!this.documents.some((document) => document.uri === uri)) return false;
    this.activeUri = uri;
    return true;
  }

  source(): string {
    return this.#active().source;
  }

  replaceSource(source: string, dirty: boolean): void {
    const document = this.#active();
    document.source = source;
    document.dirty = dirty;
  }

  whenDocumentActive(uri: string): Promise<boolean> {
    if (this.presentedUri === uri) return Promise.resolve(true);
    return new Promise((resolve) => this.#waiters.push({ uri, resolve }));
  }

  applyChangeSet(changeSet: ProposedSourceChangeSet, documentUri: string) {
    if (documentUri !== this.presentedUri) {
      return { applied: false as const, reason: "editor-rejected" as const, issues: [] as const };
    }
    const presented = this.#presented();
    const application = applySourceChangeSet(presented.source, changeSet);
    if (!application.valid) {
      return { applied: false as const, reason: "invalid" as const, issues: application.issues };
    }
    this.#history.push({ uri: presented.uri, before: presented.source });
    presented.source = application.source;
    presented.dirty = true;
    this.appliedTo.push(presented.uri);
    return { applied: true as const, source: application.source, issues: [] as const };
  }

  undoAuthoringChange(): void {
    const presented = this.#presented();
    const entry = [...this.#history].reverse().find(({ uri }) => uri === presented.uri);
    this.undoneIn.push(presented.uri);
    if (entry === undefined) return;
    this.#history = this.#history.filter((candidate) => candidate !== entry);
    presented.source = entry.before;
    presented.dirty = true;
  }

  /** Simulates the change-detection tick that swaps the Monaco model. */
  presentActive(): void {
    this.presentedUri = this.activeUri;
    for (const waiter of this.#waiters.splice(0)) {
      waiter.resolve(waiter.uri === this.presentedUri);
    }
  }

  #active(): FakeDocument {
    return this.documents.find(({ uri }) => uri === this.activeUri)!;
  }

  #presented(): FakeDocument {
    return this.documents.find(({ uri }) => uri === this.presentedUri)!;
  }
}

const contextSource = "view context { flow = right }";
const containerSource = "view container { flow = down }";

function workbench(): FakeWorkbench {
  return new FakeWorkbench(
    [
      { uri: "views/context.c4ml", source: contextSource, dirty: false },
      { uri: "views/container.c4ml", source: containerSource, dirty: false },
    ],
    "views/container.c4ml",
  );
}

function contextChange(host: FakeWorkbench) {
  const project = createArchitectureProjectInput({
    id: "garden",
    documents: host.documents.map(({ uri, source }) => ({ uri, text: source })),
  });
  return createProposedProjectSourceChangeSet(project, {
    id: "turn-context",
    intent: { id: "placement", kind: "layout", summary: "Turn the context flow." },
    affectedIds: ["context"],
    edits: [
      {
        documentUri: "views/context.c4ml",
        startOffset: contextSource.indexOf("right"),
        endOffset: contextSource.indexOf("right") + "right".length,
        text: "down",
      },
    ],
  });
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("source authoring transaction", () => {
  it("applies a change to another document only after the editor presents it", async () => {
    const host = workbench();
    const transaction = new SourceAuthoringTransaction(host);

    const outcome = transaction.apply(contextChange(host), "views/context.c4ml", host);
    await settle();

    expect(host.activeUri).toBe("views/context.c4ml");
    expect(host.appliedTo).toEqual([]);
    expect(host.documents[1]!.source).toBe(containerSource);

    host.presentActive();

    expect(await outcome).toBe("applied");
    expect(host.appliedTo).toEqual(["views/context.c4ml"]);
    expect(host.documents[0]!.source).toBe("view context { flow = down }");
    expect(host.documents[1]!.source).toBe(containerSource);
    expect(transaction.canUndo()).toBe(true);
    expect(transaction.undoDocumentUri).toBe("views/context.c4ml");
  });

  it("gives up when a different document wins the switch", async () => {
    const host = workbench();
    const transaction = new SourceAuthoringTransaction(host);

    const outcome = transaction.apply(contextChange(host), "views/context.c4ml", host);
    await settle();
    host.selectDocument("views/container.c4ml");
    host.presentActive();

    expect(await outcome).toBe("superseded");
    expect(host.appliedTo).toEqual([]);
    expect(transaction.canUndo()).toBe(false);
  });

  it("undoes in the document that received the change even after a tab switch", async () => {
    const host = workbench();
    const transaction = new SourceAuthoringTransaction(host);
    const outcome = transaction.apply(contextChange(host), "views/context.c4ml", host);
    await settle();
    host.presentActive();
    await outcome;

    host.selectDocument("views/container.c4ml");
    host.presentActive();

    const undone = transaction.undo(host);
    await settle();
    expect(host.activeUri).toBe("views/context.c4ml");
    expect(host.undoneIn).toEqual([]);
    host.presentActive();

    expect(await undone).toBe(true);
    expect(host.undoneIn).toEqual(["views/context.c4ml"]);
    expect(host.documents[0]).toEqual({
      uri: "views/context.c4ml",
      source: contextSource,
      dirty: false,
    });
    expect(host.documents[1]!.source).toBe(containerSource);
    expect(transaction.canUndo()).toBe(false);
  });

  it("keeps its undo step through its own edits but not through foreign ones", async () => {
    const host = workbench();
    const transaction = new SourceAuthoringTransaction(host);
    host.selectDocument("views/context.c4ml");
    host.presentActive();
    // The workbench reports every content change back, including the
    // transaction's own apply; that must not clear the undo step.
    const original = host.applyChangeSet.bind(host);
    host.applyChangeSet = (changeSet, uri) => {
      const result = original(changeSet, uri);
      transaction.sourceChanged();
      return result;
    };

    expect(await transaction.apply(contextChange(host), "views/context.c4ml", host)).toBe(
      "applied",
    );
    expect(transaction.canUndo()).toBe(true);

    transaction.sourceChanged();

    expect(transaction.canUndo()).toBe(false);
    expect(transaction.undoDocumentUri).toBeUndefined();
    expect(await transaction.undo(host)).toBe(false);
  });
});
