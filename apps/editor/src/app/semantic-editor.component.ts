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
  readonly applied = output<PreviewSemanticChangeWorkerResponse>();
  readonly cancelled = output<void>();

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
      this.createActions().length === 0 &&
      this.sourceOptions().length === 0,
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
      const key = `${this.project().id}:${this.viewId()}:${this.project().documents.map(({ uri, source }) => `${uri}\u0000${source}`).join("\u0001")}`;
      if (key === this.#contextKey) return;
      this.#contextKey = key;
      void this.#loadContext();
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

  selectOperation(event: Event): void {
    const value = selectValue(event);
    if (value !== "create-element" && value !== "create-relationship") return;
    this.operationKind.set(value);
    this.preview.set(undefined);
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
    this.sourceId.set(value);
    this.targetId.set(
      this.context()?.connectionOptions.find(({ sourceId }) => sourceId === value)?.targetIds[0] ?? "",
    );
    this.preview.set(undefined);
  }

  selectTarget(event: Event): void {
    const value = selectValue(event);
    if (value !== undefined) {
      this.targetId.set(value);
      this.preview.set(undefined);
    }
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

  async #loadContext(): Promise<void> {
    this.context.set(undefined);
    this.contextIssues.set([]);
    const response = await this.compiler.inspectSemanticAuthoring(
      this.project(),
      this.activeFile(),
      this.viewId(),
    );
    if (response?.status !== "valid" || response.context === undefined) {
      this.contextIssues.set([
        ...(response?.issues ?? []).map(({ message }) => message),
        ...(response?.message === undefined ? [] : [response.message]),
      ]);
      return;
    }
    this.context.set(response.context);
    const firstCreate = response.context.createActions[0];
    const firstSource = response.context.connectionOptions[0];
    if (firstCreate !== undefined) this.createKind.set(firstCreate.kind);
    if (firstSource !== undefined) {
      this.sourceId.set(firstSource.sourceId);
      this.targetId.set(firstSource.targetIds[0] ?? "");
    }
    if (firstCreate === undefined && firstSource !== undefined) {
      this.operationKind.set("create-relationship");
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
}

function selectValue(event: Event): string | undefined {
  return event.target instanceof HTMLSelectElement ? event.target.value : undefined;
}

function isSemanticKind(value: unknown): value is C4mlSemanticElementKind {
  return ["code-element", "component", "container", "person", "software-system"].includes(String(value));
}
