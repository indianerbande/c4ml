import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from "@angular/core";

import type {
  C4mlSemanticAuthoringContext,
  C4mlSemanticCreateAction,
  C4mlSemanticEditOperation,
  C4mlSemanticElementKind,
} from "@c4ml/language-c4ml";

import { CompilerWorkerClient } from "./compiler-worker-client.service.js";
import type {
  CompilerWorkerProject,
  PreviewSemanticChangeWorkerResponse,
} from "./compiler-worker.protocol.js";
import { WorkbenchLocalizationService } from "./workbench-localization.js";
import type { SemanticEditorMode } from "./workbench-semantic.facade.js";

type SemanticEditorOperationKind = "create-element" | "create-relationship";

@Component({
  selector: "c4ml-semantic-editor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./semantic-editor.component.html",
  styleUrls: ["./placement-editor.component.css", "./semantic-editor.component.css"],
})
export class SemanticEditorComponent {
  readonly project = input.required<CompilerWorkerProject>();
  readonly activeFile = input.required<string>();
  readonly viewId = input.required<string>();
  readonly mode = input<SemanticEditorMode>("element");
  readonly initialSourceId = input<string | undefined>(undefined);
  readonly initialTargetId = input<string | undefined>(undefined);
  readonly applied = output<PreviewSemanticChangeWorkerResponse>();
  readonly cancelled = output<void>();
  readonly selectionRequested = output<{ readonly sourceId?: string }>();

  readonly compiler = inject(CompilerWorkerClient);
  readonly i18n = inject(WorkbenchLocalizationService);
  readonly context = signal<C4mlSemanticAuthoringContext | undefined>(undefined);
  readonly contextIssues = signal<readonly string[]>([]);
  readonly operationKind = signal<SemanticEditorOperationKind>("create-element");
  readonly createKind = signal<C4mlSemanticElementKind>("person");
  readonly elementId = signal("");
  readonly elementName = signal("");
  readonly responsibility = signal("");
  readonly classification = signal<"external" | "internal">("internal");
  readonly technology = signal("");
  readonly codeKind = signal("class");
  readonly language = signal("");
  readonly relationshipId = signal("");
  readonly sourceId = signal("");
  readonly targetId = signal("");
  readonly relationshipIntent = signal("");
  readonly relationshipTechnology = signal("");
  readonly protocol = signal("");
  readonly preview = signal<PreviewSemanticChangeWorkerResponse | undefined>(undefined);
  readonly previewUrl = signal<string | undefined>(undefined);
  readonly loadingContext = computed(
    () => this.compiler.semanticContext().phase === "loading",
  );
  readonly busy = computed(
    () => this.compiler.semanticPreview().phase === "loading",
  );
  readonly createActions = computed(() => this.context()?.createActions ?? []);
  readonly selectedCreateAction = computed<C4mlSemanticCreateAction | undefined>(
    () => this.createActions().find(({ kind }) => kind === this.createKind()),
  );
  readonly sourceOptions = computed(() =>
    (this.context()?.connectionOptions ?? []).flatMap(({ sourceId }) => {
      const element = this.context()?.elements.find(({ id }) => id === sourceId);
      return element === undefined ? [] : [element];
    }),
  );
  readonly targetOptions = computed(() => {
    const ids = this.context()?.connectionOptions.find(
      ({ sourceId }) => sourceId === this.sourceId(),
    )?.targetIds ?? [];
    return ids.flatMap((id) => {
      const element = this.context()?.elements.find((candidate) => candidate.id === id);
      return element === undefined ? [] : [element];
    });
  });
  readonly unsupported = computed(
    () =>
      !this.loadingContext() &&
      this.context() !== undefined &&
      (this.mode() === "element"
        ? this.createActions().length === 0
        : this.sourceOptions().length === 0),
  );
  readonly canSwapDirection = computed(() =>
    this.context()?.connectionOptions.find(
      ({ sourceId }) => sourceId === this.targetId(),
    )?.targetIds.includes(this.sourceId()) === true,
  );
  readonly canPreview = computed(() => {
    if (this.operationKind() === "create-element") {
      return this.selectedCreateAction() !== undefined &&
        this.elementId().trim().length > 0 &&
        this.elementName().trim().length > 0 &&
        this.responsibility().trim().length > 0 &&
        (this.createKind() !== "container" && this.createKind() !== "component" || this.technology().trim().length > 0) &&
        (this.createKind() !== "code-element" || this.codeKind().trim().length > 0);
    }
    return this.relationshipId().trim().length > 0 &&
      this.sourceId().length > 0 && this.targetId().length > 0 &&
      this.sourceId() !== this.targetId() &&
      this.relationshipIntent().trim().length > 0;
  });
  readonly issues = computed(() => {
    const response = this.preview();
    return [
      ...this.contextIssues().map((message) => ({ code: "C4ML-AUTHORING-CONTEXT", message, correction: undefined })),
      ...(response?.authoringIssues ?? []).map(({ code, message }) => ({ code, message, correction: undefined })),
      ...(response?.changeIssues ?? []).map(({ code, message }) => ({ code, message, correction: undefined })),
      ...(response?.compilation?.diagnostics ?? []),
      ...(response?.message === undefined ? [] : [{ code: "C4ML-SEMANTIC-PREVIEW", message: response.message, correction: undefined }]),
    ];
  });
  readonly proposedText = computed(() => this.preview()?.proposedText);
  readonly canApply = computed(
    () => this.preview()?.status === "valid" &&
      this.preview()?.changeSet !== undefined &&
      this.preview()?.compilation?.svg !== undefined,
  );

  #contextKey = "";

  constructor() {
    effect(() => {
      const key = `${this.project().id}:${this.viewId()}:${this.mode()}:${this.initialSourceId() ?? ""}:${this.initialTargetId() ?? ""}:${this.project().documents.map(({ uri, source }) => `${uri}\u0000${source}`).join("\u0001")}`;
      if (key === this.#contextKey) return;
      this.#contextKey = key;
      void this.#loadContext(key);
    });
    effect(() => {
      const context = this.context();
      const requestedSource = this.initialSourceId();
      const requestedTarget = this.initialTargetId();
      if (
        this.mode() !== "relationship" ||
        context === undefined ||
        requestedSource === undefined
      ) return;
      const source = context.connectionOptions.find(
        ({ sourceId }) => sourceId === requestedSource,
      );
      if (source === undefined) return;
      const targetId =
        requestedTarget !== undefined && source.targetIds.includes(requestedTarget)
          ? requestedTarget
          : source.targetIds[0] ?? "";
      this.sourceId.set(source.sourceId);
      this.targetId.set(targetId);
      this.relationshipId.set(`${source.sourceId}-to-${targetId}`);
      this.preview.set(undefined);
    });
    effect((onCleanup) => {
      const svg = this.preview()?.compilation?.svg;
      if (svg === undefined) {
        this.previewUrl.set(undefined);
        return;
      }
      const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
      this.previewUrl.set(url);
      onCleanup(() => URL.revokeObjectURL(url));
    });
  }

  selectCreateKind(event: Event): void {
    const value = selectValue(event);
    if (!isSemanticKind(value)) return;
    this.createKind.set(value);
    this.preview.set(undefined);
  }

  selectSource(event: Event): void {
    const value = selectValue(event);
    if (value === undefined) return;
    const previousSource = this.sourceId();
    const previousTarget = this.targetId();
    const nextTarget =
      this.context()?.connectionOptions.find(({ sourceId }) => sourceId === value)
        ?.targetIds[0] ?? "";
    this.sourceId.set(value);
    this.targetId.set(nextTarget);
    this.#updateRelationshipId(
      previousSource,
      previousTarget,
      value,
      nextTarget,
    );
    this.preview.set(undefined);
  }

  selectTarget(event: Event): void {
    const value = selectValue(event);
    if (value !== undefined) {
      const previousTarget = this.targetId();
      this.targetId.set(value);
      this.#updateRelationshipId(
        this.sourceId(),
        previousTarget,
        this.sourceId(),
        value,
      );
      this.preview.set(undefined);
    }
  }

  swapDirection(): void {
    if (!this.canSwapDirection()) return;
    const sourceId = this.sourceId();
    const targetId = this.targetId();
    this.sourceId.set(targetId);
    this.targetId.set(sourceId);
    this.#updateRelationshipId(sourceId, targetId, targetId, sourceId);
    this.preview.set(undefined);
  }

  requestDiagramSelection(): void {
    const sourceId = this.initialSourceId() === undefined
      ? undefined
      : this.sourceId();
    this.selectionRequested.emit({
      ...(sourceId === undefined ? {} : { sourceId }),
    });
  }

  update(target: ReturnType<typeof signal<string>>, event: Event): void {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      target.set(event.target.value);
      this.preview.set(undefined);
    }
  }

  setClassification(event: Event): void {
    const value = selectValue(event);
    if (value === "internal" || value === "external") {
      this.classification.set(value);
      this.preview.set(undefined);
    }
  }

  async buildPreview(): Promise<void> {
    const operation = this.#operation();
    if (operation === undefined) return;
    this.preview.set(undefined);
    const response = await this.compiler.previewSemanticChange(
      this.project(),
      this.activeFile(),
      {
        id: `semantic:${this.viewId()}:${operation.kind}`,
        viewId: this.viewId(),
        intent: {
          id: `architecture:${operation.kind}`,
          kind: "architecture",
          summary: operation.kind === "create-element"
            ? `Create architecture element ${operation.elementId}.`
            : `Create architecture relationship ${operation.relationshipId}.`,
        },
        operation,
      },
      this.viewId(),
    );
    this.preview.set(response);
  }

  apply(): void {
    const response = this.preview();
    if (response !== undefined && this.canApply()) this.applied.emit(response);
  }

  cancel(): void {
    this.cancelled.emit();
  }

  elementLabel(id: string): string {
    const element = this.context()?.elements.find((candidate) => candidate.id === id);
    return element === undefined ? id : `${element.label} · ${id}`;
  }

  kindLabel(kind: C4mlSemanticElementKind): string {
    return this.i18n.t(`semanticEditor.kind.${kind}`);
  }

  async #loadContext(expectedKey: string): Promise<void> {
    this.context.set(undefined);
    this.contextIssues.set([]);
    const response = await this.compiler.inspectSemanticAuthoring(
      this.project(),
      this.activeFile(),
      this.viewId(),
    );
    if (expectedKey !== this.#contextKey) return;
    if (response?.status !== "valid" || response.context === undefined) {
      this.contextIssues.set([
        ...(response?.issues ?? []).map(({ message }) => message),
        ...(response?.message === undefined ? [] : [response.message]),
      ]);
      return;
    }
    this.context.set(response.context);
    this.operationKind.set(
      this.mode() === "relationship" ? "create-relationship" : "create-element",
    );
    const firstCreate = response.context.createActions[0];
    const firstSource = response.context.connectionOptions[0];
    if (firstCreate !== undefined) this.createKind.set(firstCreate.kind);
    if (firstSource !== undefined) {
      const requestedSource = this.initialSourceId();
      const source = response.context.connectionOptions.find(
        ({ sourceId }) => sourceId === requestedSource,
      ) ?? firstSource;
      const requestedTarget = this.initialTargetId();
      const targetId =
        requestedTarget !== undefined && source.targetIds.includes(requestedTarget)
          ? requestedTarget
          : source.targetIds[0] ?? "";
      this.sourceId.set(source.sourceId);
      this.targetId.set(targetId);
      if (this.mode() === "relationship" && this.relationshipId().length === 0) {
        this.relationshipId.set(`${source.sourceId}-to-${targetId}`);
      }
    }
  }

  #operation(): C4mlSemanticEditOperation | undefined {
    if (this.operationKind() === "create-relationship") {
      return {
        kind: "create-relationship",
        relationshipId: this.relationshipId().trim(),
        sourceId: this.sourceId(),
        targetId: this.targetId(),
        intent: this.relationshipIntent().trim(),
        ...(this.relationshipTechnology().trim() ? { technology: this.relationshipTechnology().trim() } : {}),
        ...(this.protocol().trim() ? { protocol: this.protocol().trim() } : {}),
      };
    }
    const action = this.selectedCreateAction();
    if (action === undefined) return undefined;
    return {
      kind: "create-element",
      elementKind: action.kind,
      elementId: this.elementId().trim(),
      name: this.elementName().trim(),
      responsibility: this.responsibility().trim(),
      ...(action.ownerId === undefined ? {} : { ownerId: action.ownerId }),
      ...(action.kind === "person" || action.kind === "software-system" ? { classification: this.classification() } : {}),
      ...(action.kind === "container" || action.kind === "component" ? { technology: this.technology().trim() } : {}),
      ...(action.kind === "code-element" ? { codeKind: this.codeKind().trim(), ...(this.language().trim() ? { language: this.language().trim() } : {}) } : {}),
    };
  }

  #updateRelationshipId(
    previousSource: string,
    previousTarget: string,
    nextSource: string,
    nextTarget: string,
  ): void {
    const current = this.relationshipId();
    if (
      current.length === 0 ||
      current === `${previousSource}-to-${previousTarget}`
    ) {
      this.relationshipId.set(`${nextSource}-to-${nextTarget}`);
    }
  }
}

function selectValue(event: Event): string | undefined {
  return event.target instanceof HTMLSelectElement ? event.target.value : undefined;
}

function isSemanticKind(value: unknown): value is C4mlSemanticElementKind {
  return ["code-element", "component", "container", "person", "software-system"].includes(String(value));
}
