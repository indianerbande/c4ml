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
  C4mlPlacementEditOperation,
  C4mlPlacementGap,
  C4mlPlacementStrength,
} from "@c4ml/language-c4ml";

import type {
  CompilerWorkerProject,
  PreviewPlacementChangeWorkerResponse,
} from "./compiler-worker.protocol.js";
import { CompilerWorkerClient } from "./compiler-worker-client.service.js";
import { WorkbenchLocalizationService } from "./workbench-localization.js";

export type PlacementEditorOperationKind =
  | "align"
  | "distribute"
  | "nudge"
  | "pin"
  | "relative";

export interface PlacementEditorNode {
  readonly id: string;
  readonly label: string;
  readonly x: number;
  readonly y: number;
}

@Component({
  selector: "c4ml-placement-editor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./placement-editor.component.html",
  styleUrl: "./placement-editor.component.css",
})
export class PlacementEditorComponent {
  readonly project = input.required<CompilerWorkerProject>();
  readonly activeFile = input.required<string>();
  readonly viewId = input.required<string>();
  readonly nodes = input.required<readonly PlacementEditorNode[]>();
  readonly selectedId = input.required<string>();
  readonly applied = output<PreviewPlacementChangeWorkerResponse>();
  readonly cancelled = output<void>();

  readonly compiler = inject(CompilerWorkerClient);
  readonly i18n = inject(WorkbenchLocalizationService);
  readonly operationKind = signal<PlacementEditorOperationKind>("relative");
  readonly primaryId = signal("");
  readonly itemIds = signal<readonly string[]>([]);
  readonly anchorId = signal("");
  readonly relation = signal<"above" | "below" | "left-of" | "right-of">(
    "right-of",
  );
  readonly direction = signal<"down" | "left" | "right" | "up">("right");
  readonly alignment = signal<
    "bottom" | "center-x" | "center-y" | "left" | "right" | "top"
  >("top");
  readonly orientation = signal<"horizontal" | "vertical">("horizontal");
  readonly gap = signal<C4mlPlacementGap>("small");
  readonly strength = signal<C4mlPlacementStrength>("soft");
  readonly preview = signal<PreviewPlacementChangeWorkerResponse | undefined>(
    undefined,
  );
  readonly previewUrl = signal<string | undefined>(undefined);
  readonly busy = computed(() => this.compiler.placement().phase === "loading");
  readonly otherNodes = computed(() =>
    this.nodes().filter(({ id }) => id !== this.primaryId()),
  );
  readonly chosenNodes = computed(() =>
    this.itemIds().flatMap((id) => {
      const node = this.nodes().find((candidate) => candidate.id === id);
      return node === undefined ? [] : [node];
    }),
  );
  readonly canPreview = computed(() => {
    const primary = this.primaryId();
    if (primary.length === 0) return false;
    switch (this.operationKind()) {
      case "relative":
        return this.anchorId().length > 0 && this.anchorId() !== primary;
      case "nudge":
      case "pin":
        return true;
      case "align":
        return this.itemIds().length >= 2 && this.itemIds().includes(this.anchorId());
      case "distribute":
        return this.itemIds().length >= 3;
    }
  });
  readonly issues = computed(() => {
    const response = this.preview();
    return response === undefined
      ? []
      : [
          ...response.authoringIssues.map(({ message }) => message),
          ...response.changeIssues.map(({ message }) => message),
          ...(response.compilation?.diagnostics ?? []).map(({ message }) => message),
          ...(response.message === undefined ? [] : [response.message]),
        ];
  });
  readonly proposedText = computed(() => this.preview()?.proposedText);
  readonly canApply = computed(
    () =>
      this.preview()?.status === "valid" &&
      this.preview()?.changeSet !== undefined &&
      this.preview()?.compilation?.svg !== undefined,
  );

  #initialized = false;

  constructor() {
    effect(() => {
      const selected = this.selectedId();
      const nodes = this.nodes();
      if (this.#initialized || selected.length === 0 || nodes.length === 0) return;
      this.#initialized = true;
      this.primaryId.set(selected);
      this.itemIds.set([selected]);
      this.anchorId.set(nodes.find(({ id }) => id !== selected)?.id ?? selected);
    });
    effect((onCleanup) => {
      const svg = this.preview()?.compilation?.svg;
      if (svg === undefined) {
        this.previewUrl.set(undefined);
        return;
      }
      const url = URL.createObjectURL(
        new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
      );
      this.previewUrl.set(url);
      onCleanup(() => URL.revokeObjectURL(url));
    });
  }

  selectOperation(event: Event): void {
    const value = selectValue(event) as PlacementEditorOperationKind | undefined;
    if (value === undefined) return;
    this.operationKind.set(value);
    this.preview.set(undefined);
    if (value === "align" && !this.itemIds().includes(this.anchorId())) {
      this.anchorId.set(this.itemIds()[0] ?? this.primaryId());
    }
  }

  selectPrimary(event: Event): void {
    const value = selectValue(event);
    if (value === undefined) return;
    this.primaryId.set(value);
    if (!this.itemIds().includes(value)) {
      this.itemIds.update((ids) => [...ids, value]);
    }
    if (this.anchorId() === value) {
      this.anchorId.set(this.nodes().find(({ id }) => id !== value)?.id ?? value);
    }
    this.preview.set(undefined);
  }

  selectAnchor(event: Event): void {
    const value = selectValue(event);
    if (value !== undefined) {
      this.anchorId.set(value);
      this.preview.set(undefined);
    }
  }

  setRelation(event: Event): void {
    const value = selectValue(event);
    if (value === "above" || value === "below" || value === "left-of" || value === "right-of") {
      this.relation.set(value);
      this.preview.set(undefined);
    }
  }

  setDirection(event: Event): void {
    const value = selectValue(event);
    if (value === "down" || value === "left" || value === "right" || value === "up") {
      this.direction.set(value);
      this.preview.set(undefined);
    }
  }

  setAlignment(event: Event): void {
    const value = selectValue(event);
    if (
      value === "bottom" ||
      value === "center-x" ||
      value === "center-y" ||
      value === "left" ||
      value === "right" ||
      value === "top"
    ) {
      this.alignment.set(value);
      this.preview.set(undefined);
    }
  }

  setOrientation(event: Event): void {
    const value = selectValue(event);
    if (value === "horizontal" || value === "vertical") {
      this.orientation.set(value);
      this.preview.set(undefined);
    }
  }

  setGap(event: Event): void {
    const value = selectValue(event);
    if (value === "tiny" || value === "small" || value === "normal" || value === "large") {
      this.gap.set(value);
      this.preview.set(undefined);
    }
  }

  setStrength(event: Event): void {
    const value = selectValue(event);
    if (value === "hard" || value === "soft") {
      this.strength.set(value);
      this.preview.set(undefined);
    }
  }

  toggleItem(id: string, event: Event): void {
    const checked = event.target instanceof HTMLInputElement && event.target.checked;
    this.itemIds.update((ids) =>
      checked ? (ids.includes(id) ? ids : [...ids, id]) : ids.filter((item) => item !== id),
    );
    if (!this.itemIds().includes(this.anchorId())) {
      this.anchorId.set(this.itemIds()[0] ?? "");
    }
    this.preview.set(undefined);
  }

  moveItem(id: string, delta: -1 | 1): void {
    this.itemIds.update((ids) => {
      const index = ids.indexOf(id);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= ids.length) return ids;
      const next = [...ids];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
    this.preview.set(undefined);
  }

  async buildPreview(): Promise<void> {
    const operation = this.#operation();
    if (operation === undefined) return;
    this.preview.set(undefined);
    const response = await this.compiler.previewPlacementChange(
      this.project(),
      this.activeFile(),
      {
        id: `placement:${this.viewId()}:${operation.kind}:${affectedOperationIds(operation).join(":")}`,
        viewId: this.viewId(),
        intent: {
          id: `layout:${operation.kind}`,
          kind: "layout",
          summary: `Arrange ${affectedOperationIds(operation).join(", ")} in ${this.viewId()}.`,
        },
        operation,
      },
      this.viewId(),
    );
    this.preview.set(response);
  }

  apply(): void {
    const response = this.preview();
    if (response !== undefined && this.canApply()) {
      this.applied.emit(response);
    }
  }

  cancel(): void {
    this.cancelled.emit();
  }

  #operation(): C4mlPlacementEditOperation | undefined {
    const primary = this.primaryId();
    switch (this.operationKind()) {
      case "relative":
        return {
          kind: "relative",
          subjectId: primary,
          anchorId: this.anchorId(),
          relation: this.relation(),
          gap: this.gap(),
          strength: this.strength(),
        };
      case "nudge":
        return {
          kind: "nudge",
          targetId: primary,
          direction: this.direction(),
          distance: this.gap(),
          strength: this.strength(),
        };
      case "align":
        return {
          kind: "align",
          itemIds: this.itemIds(),
          alignment: this.alignment(),
          anchorId: this.anchorId(),
          strength: this.strength(),
        };
      case "distribute":
        return {
          kind: "distribute",
          itemIds: this.itemIds(),
          orientation: this.orientation(),
          gap: this.gap(),
          strength: this.strength(),
        };
      case "pin": {
        const node = this.nodes().find(({ id }) => id === primary);
        return node === undefined
          ? undefined
          : {
              kind: "pin",
              targetId: primary,
              x: Math.max(0, Math.round(node.x)),
              y: Math.max(0, Math.round(node.y)),
              strength: this.strength(),
            };
      }
    }
  }
}

function selectValue(event: Event): string | undefined {
  return event.target instanceof HTMLSelectElement ? event.target.value : undefined;
}

function affectedOperationIds(operation: C4mlPlacementEditOperation): readonly string[] {
  switch (operation.kind) {
    case "relative":
      return [operation.subjectId, operation.anchorId];
    case "nudge":
    case "pin":
      return [operation.targetId];
    case "align":
    case "distribute":
      return operation.itemIds;
  }
}
