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
  C4mlSemanticDeploymentItemKind,
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

type SemanticEditorOperationKind =
  | "create-deployment-item"
  | "create-dynamic-interaction"
  | "create-element"
  | "create-relationship";

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
  readonly deploymentItemKind = signal<C4mlSemanticDeploymentItemKind>("deployment-node");
  readonly deploymentItemId = signal("");
  readonly deploymentName = signal("");
  readonly deploymentResponsibility = signal("");
  readonly deploymentTechnology = signal("");
  readonly deploymentParentNodeId = signal("");
  readonly deploymentNodeId = signal("");
  readonly deploymentElementId = signal("");
  readonly interactionId = signal("");
  readonly interactionOrder = signal("1");
  readonly interactionRelationshipId = signal("");
  readonly interactionIntent = signal("");
  readonly interactionParallelGroup = signal("");
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
  readonly deploymentContext = computed(() => this.context()?.deployment);
  readonly deploymentActions = computed(
    () => this.deploymentContext()?.createActions ?? [],
  );
  readonly deploymentElementOptions = computed(() => {
    const expectedKind = this.deploymentItemKind() === "container-instance"
      ? "container"
      : "software-system";
    return (this.deploymentContext()?.elements ?? []).filter(
      ({ kind }) => kind === expectedKind,
    );
  });
  readonly dynamicContext = computed(() => this.context()?.dynamic);
  readonly dynamicRelationship = computed(() =>
    this.dynamicContext()?.relationships.find(
      ({ id }) => id === this.interactionRelationshipId(),
    ),
  );
  readonly editorKind = computed<"deployment" | "dynamic" | "relationship" | "static">(
    () => this.mode() === "relationship"
      ? "relationship"
      : this.context()?.viewKind === "deployment"
        ? "deployment"
        : this.context()?.viewKind === "dynamic"
          ? "dynamic"
          : "static",
  );
  readonly unsupported = computed(
    () =>
      !this.loadingContext() &&
      this.context() !== undefined &&
      (this.editorKind() === "relationship"
        ? this.sourceOptions().length === 0
        : this.editorKind() === "deployment"
          ? this.deploymentActions().length === 0
          : this.editorKind() === "dynamic"
            ? (this.dynamicContext()?.relationships.length ?? 0) === 0
            : this.createActions().length === 0),
  );
  readonly canSwapDirection = computed(() =>
    this.context()?.connectionOptions.find(
      ({ sourceId }) => sourceId === this.targetId(),
    )?.targetIds.includes(this.sourceId()) === true,
  );
  readonly canPreview = computed(() => {
    if (this.operationKind() === "create-deployment-item") {
      const itemKind = this.deploymentItemKind();
      const named = itemKind === "deployment-node" || itemKind === "infrastructure-node";
      return this.deploymentActions().includes(itemKind) &&
        this.deploymentItemId().trim().length > 0 &&
        (!named || (
          this.deploymentName().trim().length > 0 &&
          this.deploymentResponsibility().trim().length > 0 &&
          this.deploymentTechnology().trim().length > 0
        )) &&
        (itemKind === "deployment-node" || this.deploymentNodeId().length > 0) &&
        (named || this.deploymentElementId().length > 0);
    }
    if (this.operationKind() === "create-dynamic-interaction") {
      const order = Number(this.interactionOrder());
      return this.interactionId().trim().length > 0 &&
        Number.isSafeInteger(order) && order > 0 &&
        this.dynamicRelationship() !== undefined &&
        this.interactionIntent().trim().length > 0;
    }
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
  readonly eyebrowKey = computed(() =>
    this.editorKind() === "deployment"
      ? "deploymentEditor.eyebrow"
      : this.editorKind() === "dynamic"
        ? "dynamicEditor.eyebrow"
        : this.editorKind() === "relationship"
          ? "connectionEditor.eyebrow"
          : "semanticEditor.eyebrow",
  );
  readonly titleKey = computed(() =>
    this.editorKind() === "deployment"
      ? "deploymentEditor.title"
      : this.editorKind() === "dynamic"
        ? "dynamicEditor.title"
        : this.editorKind() === "relationship"
          ? "connectionEditor.title"
          : "semanticEditor.title",
  );
  readonly descriptionKey = computed(() =>
    this.editorKind() === "deployment"
      ? "deploymentEditor.description"
      : this.editorKind() === "dynamic"
        ? "dynamicEditor.description"
        : this.editorKind() === "relationship"
          ? "connectionEditor.description"
          : "semanticEditor.description",
  );
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

  selectDeploymentItemKind(event: Event): void {
    const value = selectValue(event);
    if (!isDeploymentItemKind(value)) return;
    this.deploymentItemKind.set(value);
    const firstNode = this.deploymentContext()?.nodes[0]?.id ?? "";
    this.deploymentNodeId.set(firstNode);
    this.deploymentParentNodeId.set("");
    this.deploymentElementId.set(
      this.deploymentElementOptions()[0]?.id ?? "",
    );
    this.preview.set(undefined);
  }

  selectDeploymentParent(event: Event): void {
    this.deploymentParentNodeId.set(selectValue(event) ?? "");
    this.preview.set(undefined);
  }

  selectDeploymentNode(event: Event): void {
    this.deploymentNodeId.set(selectValue(event) ?? "");
    this.preview.set(undefined);
  }

  selectDeploymentElement(event: Event): void {
    this.deploymentElementId.set(selectValue(event) ?? "");
    this.preview.set(undefined);
  }

  selectDynamicRelationship(event: Event): void {
    const value = selectValue(event) ?? "";
    const previous = this.dynamicRelationship();
    const order = Number(this.interactionOrder());
    const previousSuggestion = previous === undefined
      ? undefined
      : dynamicInteractionSuggestion(previous.id, order);
    this.interactionRelationshipId.set(value);
    const selected = this.dynamicContext()?.relationships.find(({ id }) => id === value);
    if (
      selected !== undefined &&
      (this.interactionIntent().length === 0 || this.interactionIntent() === previous?.intent)
    ) {
      this.interactionIntent.set(selected.intent);
    }
    if (
      selected !== undefined &&
      (this.interactionId().length === 0 || this.interactionId() === previousSuggestion)
    ) {
      this.interactionId.set(dynamicInteractionSuggestion(selected.id, order));
    }
    this.preview.set(undefined);
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
          summary: operationSummary(operation),
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

  deploymentKindLabel(kind: C4mlSemanticDeploymentItemKind): string {
    switch (kind) {
      case "container-instance":
        return this.i18n.t("deploymentEditor.kind.container-instance");
      case "deployment-node":
        return this.i18n.t("deploymentEditor.kind.deployment-node");
      case "infrastructure-node":
        return this.i18n.t("deploymentEditor.kind.infrastructure-node");
      case "software-system-instance":
        return this.i18n.t("deploymentEditor.kind.software-system-instance");
    }
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
    this.operationKind.set(this.mode() === "relationship"
      ? "create-relationship"
      : response.context.viewKind === "deployment"
        ? "create-deployment-item"
        : response.context.viewKind === "dynamic"
          ? "create-dynamic-interaction"
          : "create-element");
    const firstCreate = response.context.createActions[0];
    const firstSource = response.context.connectionOptions[0];
    if (firstCreate !== undefined) this.createKind.set(firstCreate.kind);
    const firstDeploymentAction = response.context.deployment?.createActions[0];
    const firstDeploymentNode = response.context.deployment?.nodes[0]?.id ?? "";
    if (firstDeploymentAction !== undefined) {
      this.deploymentItemKind.set(firstDeploymentAction);
      this.deploymentNodeId.set(firstDeploymentNode);
      this.deploymentParentNodeId.set("");
      const expectedKind = firstDeploymentAction === "container-instance"
        ? "container"
        : "software-system";
      this.deploymentElementId.set(
        response.context.deployment?.elements.find(({ kind }) => kind === expectedKind)?.id ?? "",
      );
    }
    const firstDynamic = response.context.dynamic?.relationships[0];
    if (firstDynamic !== undefined) {
      this.interactionRelationshipId.set(firstDynamic.id);
      this.interactionIntent.set(firstDynamic.intent);
      const nextOrder = response.context.dynamic?.nextOrder ?? 1;
      this.interactionOrder.set(String(nextOrder));
      this.interactionId.set(dynamicInteractionSuggestion(firstDynamic.id, nextOrder));
    }
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
    if (this.operationKind() === "create-deployment-item") {
      const itemKind = this.deploymentItemKind();
      return {
        kind: "create-deployment-item",
        itemKind,
        itemId: this.deploymentItemId().trim(),
        ...(itemKind === "deployment-node" || itemKind === "infrastructure-node"
          ? {
              name: this.deploymentName().trim(),
              responsibility: this.deploymentResponsibility().trim(),
              technology: this.deploymentTechnology().trim(),
            }
          : {}),
        ...(itemKind === "deployment-node"
          ? (this.deploymentParentNodeId() ? { parentNodeId: this.deploymentParentNodeId() } : {})
          : { nodeId: this.deploymentNodeId() }),
        ...(itemKind === "software-system-instance" || itemKind === "container-instance"
          ? { elementId: this.deploymentElementId() }
          : {}),
      };
    }
    if (this.operationKind() === "create-dynamic-interaction") {
      return {
        kind: "create-dynamic-interaction",
        interactionId: this.interactionId().trim(),
        order: Number(this.interactionOrder()),
        relationshipId: this.interactionRelationshipId(),
        intent: this.interactionIntent().trim(),
        ...(this.interactionParallelGroup().trim()
          ? { parallelGroup: this.interactionParallelGroup().trim() }
          : {}),
      };
    }
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

function isDeploymentItemKind(value: unknown): value is C4mlSemanticDeploymentItemKind {
  return [
    "container-instance",
    "deployment-node",
    "infrastructure-node",
    "software-system-instance",
  ].includes(String(value));
}

function operationSummary(operation: C4mlSemanticEditOperation): string {
  switch (operation.kind) {
    case "create-element":
      return `Create architecture element ${operation.elementId}.`;
    case "create-relationship":
      return `Create architecture relationship ${operation.relationshipId}.`;
    case "create-deployment-item":
      return `Create deployment topology item ${operation.itemId}.`;
    case "create-dynamic-interaction":
      return `Create Dynamic interaction ${operation.interactionId}.`;
  }
}

function dynamicInteractionSuggestion(relationshipId: string, order: number): string {
  return `${relationshipId}-step-${order}`;
}
