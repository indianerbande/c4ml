// @vitest-environment happy-dom

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  inject,
  Output,
  provideZonelessChangeDetection,
  signal,
  ViewChild,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from "@angular/platform-browser/testing";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";

import {
  applySourceChangeSet,
  createArchitectureProjectInput,
  createProposedProjectSourceChangeSet,
  type ProposedSourceChangeSet,
} from "@c4ml/compiler-core";

import type { CompilerWorkerSource } from "../src/app/compiler-worker.protocol.js";
import { SourceAuthoringTransaction } from "../src/app/source-authoring-transaction.js";
import { SourceEditorActivationGate } from "../src/app/source-editor-activation-gate.js";
import type { SourceEditorChangeSetApplication } from "../src/app/source-editor-change-set.js";
import type { SourceEditorProjectEditApplication } from "../src/app/source-editor-project-edit.js";
import { revealSourceInOwningDocument } from "../src/app/source-navigation.js";
import { WorkbenchDocumentFacade } from "../src/app/workbench-document.facade.js";
import { WorkbenchLocalizationService } from "../src/app/workbench-localization.js";
import { WorkbenchPreferencesService } from "../src/app/workbench-preferences.service.js";

interface EditorHistoryEntry {
  readonly before: string;
  readonly after: string;
}

class ControlledSourceEditorComponent {
  documentUri = "";
  value = "";
  readonly valueChanged = new EventEmitter<string>();
  readonly presentedUri = signal<string | undefined>(undefined);
  readonly appliedTo: string[] = [];
  readonly undoneIn: string[] = [];
  readonly redoneIn: string[] = [];
  readonly revealed: CompilerWorkerSource[] = [];

  readonly #activation = new SourceEditorActivationGate();
  readonly #buffers = new Map<string, string>();
  readonly #history = new Map<string, EditorHistoryEntry[]>();
  readonly #redoHistory = new Map<string, EditorHistoryEntry[]>();

  ngOnChanges(): void {
    this.#buffers.set(this.documentUri, this.value);
    this.presentedUri.set(this.documentUri);
    this.#activation.activated(this.documentUri);
  }

  whenDocumentActive(uri: string): Promise<boolean> {
    return this.#activation.whenActive(uri);
  }

  applyChangeSet(
    changeSet: ProposedSourceChangeSet,
    documentUri: string,
  ): SourceEditorChangeSetApplication {
    if (documentUri !== this.presentedUri()) {
      return {
        applied: false,
        reason: "editor-rejected",
        issues: [],
      };
    }
    const before = this.#buffers.get(documentUri);
    if (before === undefined) {
      return {
        applied: false,
        reason: "editor-rejected",
        issues: [],
      };
    }
    const application = applySourceChangeSet(before, changeSet);
    if (!application.valid) {
      return {
        applied: false,
        reason: "invalid",
        issues: application.issues,
      };
    }
    this.#entries(this.#history, documentUri).push({
      before,
      after: application.source,
    });
    this.#redoHistory.set(documentUri, []);
    this.#buffers.set(documentUri, application.source);
    this.appliedTo.push(documentUri);
    this.valueChanged.emit(application.source);
    return { applied: true, source: application.source, issues: [] };
  }

  applyDocumentBatch(
    changes: readonly { uri: string; before: string; after: string }[],
  ): SourceEditorProjectEditApplication | undefined {
    if (changes.some(({ uri, before }) => {
      const current = this.#buffers.get(uri);
      return current !== undefined && current !== before;
    })) {
      return undefined;
    }
    for (const { uri, before } of changes) {
      if (!this.#buffers.has(uri)) this.#buffers.set(uri, before);
    }
    let phase: "applied" | "undone" = "applied";
    for (const { uri, after } of changes) this.#buffers.set(uri, after);
    return {
      synchronize: () => changes.every(({ uri, before, after }) =>
        this.#buffers.get(uri) === (phase === "applied" ? after : before)),
      undo: () => {
        if (phase !== "applied") return false;
        for (const { uri, before } of changes) this.#buffers.set(uri, before);
        phase = "undone";
        return true;
      },
      redo: () => {
        if (phase !== "undone") return false;
        for (const { uri, after } of changes) this.#buffers.set(uri, after);
        phase = "applied";
        return true;
      },
    };
  }

  undoAuthoringChange(): void {
    const uri = this.presentedUri();
    if (uri === undefined) return;
    this.undoneIn.push(uri);
    const entry = this.#entries(this.#history, uri).pop();
    if (entry === undefined) return;
    this.#entries(this.#redoHistory, uri).push(entry);
    this.#buffers.set(uri, entry.before);
    this.valueChanged.emit(entry.before);
  }

  redoAuthoringChange(): void {
    const uri = this.presentedUri();
    if (uri === undefined) return;
    this.redoneIn.push(uri);
    const entry = this.#entries(this.#redoHistory, uri).pop();
    if (entry === undefined) return;
    this.#entries(this.#history, uri).push(entry);
    this.#buffers.set(uri, entry.after);
    this.valueChanged.emit(entry.after);
  }

  async revealSourceInDocument(source: CompilerWorkerSource): Promise<boolean> {
    if (!(await this.whenDocumentActive(source.file))) return false;
    if (this.presentedUri() !== source.file) return false;
    this.revealed.push(source);
    return true;
  }

  #entries(
    map: Map<string, EditorHistoryEntry[]>,
    uri: string,
  ): EditorHistoryEntry[] {
    const entries = map.get(uri) ?? [];
    map.set(uri, entries);
    return entries;
  }
}

Input({ required: true })(ControlledSourceEditorComponent.prototype, "documentUri");
Input({ required: true })(ControlledSourceEditorComponent.prototype, "value");
Output()(ControlledSourceEditorComponent.prototype, "valueChanged");
Component({
  selector: "c4ml-controlled-source-editor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: "",
})(ControlledSourceEditorComponent);

class AngularAuthoringHarnessComponent {
  readonly documents = inject(WorkbenchDocumentFacade);
  editor?: ControlledSourceEditorComponent;
  readonly transaction = new SourceAuthoringTransaction(this.documents);
}

ViewChild(ControlledSourceEditorComponent, { static: true })(
  AngularAuthoringHarnessComponent.prototype,
  "editor",
);
Component({
  selector: "c4ml-angular-authoring-harness",
  imports: [ControlledSourceEditorComponent],
  template: `
    <c4ml-controlled-source-editor
      [documentUri]="documents.activeDocumentUri()"
      [value]="documents.source()"
      (valueChanged)="documents.replaceSource($event, true)"
    />
  `,
})(AngularAuthoringHarnessComponent);

const contextUri = "views/context.c4ml";
const containerUri = "views/container.c4ml";
const contextSource = "view context { flow = right }";
const containerSource = "view container { flow = down }";

function restoreProject(harness: AngularAuthoringHarnessComponent): void {
  harness.documents.restoreState({
    project: {
      version: 1,
      id: "garden",
      documents: [
        { uri: contextUri, source: contextSource },
        { uri: containerUri, source: containerSource },
      ],
    },
    projectMode: true,
    documents: [
      {
        uri: contextUri,
        displayName: "context.c4ml",
        source: contextSource,
        dirty: false,
      },
      {
        uri: containerUri,
        displayName: "container.c4ml",
        source: containerSource,
        dirty: true,
      },
    ],
    activeUri: containerUri,
  });
}

function turnContextFlow(harness: AngularAuthoringHarnessComponent) {
  const project = createArchitectureProjectInput({
    id: "garden",
    documents: harness.documents
      .projectDocuments()
      .map(({ uri, source }) => ({ uri, text: source })),
  });
  const startOffset = contextSource.indexOf("right");
  return createProposedProjectSourceChangeSet(project, {
    id: "turn-context",
    intent: {
      id: "placement",
      kind: "layout",
      summary: "Turn the context flow.",
    },
    affectedIds: ["context"],
    edits: [
      {
        documentUri: contextUri,
        startOffset,
        endOffset: startOffset + "right".length,
        text: "down",
      },
    ],
  });
}

function createSystemAndView(harness: AngularAuthoringHarnessComponent) {
  const project = createArchitectureProjectInput({
    id: "garden",
    documents: harness.documents
      .projectDocuments()
      .map(({ uri, source }) => ({ uri, text: source })),
  });
  return createProposedProjectSourceChangeSet(project, {
    id: "create-system-and-view",
    intent: {
      id: "architecture:create-system-with-container-view",
      kind: "architecture",
      summary: "Create a sibling system and its Container diagram.",
    },
    affectedIds: ["partner-shop", "partner-shop-containers"],
    edits: [
      {
        documentUri: contextUri,
        startOffset: contextSource.length,
        endOffset: contextSource.length,
        text: "\nsystem partner-shop {}",
      },
      {
        documentUri: containerUri,
        startOffset: containerSource.length,
        endOffset: containerSource.length,
        text: "\nview partner-shop-containers {}",
      },
    ],
  });
}

function contextRange(): CompilerWorkerSource {
  return {
    file: contextUri,
    start: { offset: 5, line: 0, column: 5 },
    end: { offset: 12, line: 0, column: 12 },
  };
}

beforeAll(() => {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
});

afterEach(() => {
  TestBed.resetTestingModule();
  localStorage.clear();
});

afterAll(() => {
  TestBed.resetTestEnvironment();
});

function createHarness() {
  TestBed.configureTestingModule({
    imports: [AngularAuthoringHarnessComponent],
    providers: [
      provideZonelessChangeDetection(),
      {
        provide: WorkbenchLocalizationService,
        useValue: { t: (key: string) => key },
      },
      {
        provide: WorkbenchPreferencesService,
        useValue: { uiLanguage: signal("en") },
      },
    ],
  });
  const fixture = TestBed.createComponent(AngularAuthoringHarnessComponent);
  restoreProject(fixture.componentInstance);
  fixture.detectChanges();
  return fixture;
}

describe("Angular authoring integration", () => {
  it("waits for the selected document before apply and undo, preserving dirty state", async () => {
    const fixture = createHarness();
    await fixture.whenStable();
    const harness = fixture.componentInstance;
    const editor = harness.editor!;
    expect(editor.presentedUri()).toBe(containerUri);

    const applied = harness.transaction.apply(
      turnContextFlow(harness),
      contextUri,
      editor,
      "placement",
    );

    expect(harness.documents.activeDocumentUri()).toBe(contextUri);
    expect(editor.presentedUri()).toBe(containerUri);
    expect(editor.appliedTo).toEqual([]);

    await fixture.whenStable();
    expect(await applied).toBe("applied");
    expect(editor.appliedTo).toEqual([contextUri]);
    expect(harness.documents.source()).toBe("view context { flow = down }");
    expect(harness.documents.documentDirty()).toBe(true);

    harness.documents.selectDocument(containerUri);
    await fixture.whenStable();
    const undone = harness.transaction.undo(editor);

    expect(harness.documents.activeDocumentUri()).toBe(contextUri);
    expect(editor.presentedUri()).toBe(containerUri);
    expect(editor.undoneIn).toEqual([]);

    await fixture.whenStable();
    expect(await undone).toBe(true);
    expect(editor.undoneIn).toEqual([contextUri]);
    expect(harness.documents.source()).toBe(contextSource);
    expect(harness.documents.documentDirty()).toBe(false);
    expect(
      harness.documents.projectDocuments().find(({ uri }) => uri === containerUri)
        ?.dirty,
    ).toBe(true);

    expect(await harness.transaction.redo(editor)).toBe(true);
    expect(editor.redoneIn).toEqual([contextUri]);
    expect(harness.documents.source()).toBe("view context { flow = down }");
    expect(harness.documents.documentDirty()).toBe(true);
  });

  it("reveals a range only after Angular presents its owning document", async () => {
    const fixture = createHarness();
    await fixture.whenStable();
    const harness = fixture.componentInstance;
    const editor = harness.editor!;
    const selected: string[] = [];

    const revealed = revealSourceInOwningDocument(
      harness.documents,
      editor,
      contextRange(),
      () => selected.push(harness.documents.activeDocumentUri()),
    );

    expect(harness.documents.activeDocumentUri()).toBe(contextUri);
    expect(editor.presentedUri()).toBe(containerUri);
    expect(editor.revealed).toEqual([]);
    expect(selected).toEqual([contextUri]);

    await fixture.whenStable();
    expect(await revealed).toBe(true);
    expect(editor.revealed).toEqual([contextRange()]);
  });

  it("applies and reverses system plus diagram documents as one history entry", async () => {
    const fixture = createHarness();
    await fixture.whenStable();
    const harness = fixture.componentInstance;
    const editor = harness.editor!;

    expect(await harness.transaction.apply(
      createSystemAndView(harness),
      contextUri,
      editor,
      "system-view",
    )).toBe("applied");
    expect(harness.documents.projectDocuments().find(({ uri }) => uri === contextUri)?.source)
      .toContain("system partner-shop");
    expect(harness.documents.projectDocuments().find(({ uri }) => uri === containerUri)?.source)
      .toContain("view partner-shop-containers");
    expect(harness.transaction.undoKind()).toBe("system-view");

    expect(await harness.transaction.undo(editor)).toBe(true);
    expect(harness.documents.projectDocuments().find(({ uri }) => uri === contextUri)?.source)
      .toBe(contextSource);
    expect(harness.documents.projectDocuments().find(({ uri }) => uri === containerUri)?.source)
      .toBe(containerSource);

    expect(await harness.transaction.redo(editor)).toBe(true);
    expect(harness.documents.projectDocuments().find(({ uri }) => uri === contextUri)?.source)
      .toContain("system partner-shop");
    expect(harness.documents.projectDocuments().find(({ uri }) => uri === containerUri)?.source)
      .toContain("view partner-shop-containers");
  });
});
