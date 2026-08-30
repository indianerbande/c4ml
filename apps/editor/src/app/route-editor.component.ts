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
  C4mlRouteEditOperation,
  C4mlRoutePortSelection,
} from "@c4ml/language-c4ml";

import type {
  CompilerWorkerProject,
  CompilerWorkerRouteNavigationTarget,
  PreviewRouteChangeWorkerResponse,
} from "./compiler-worker.protocol.js";
import { CompilerWorkerClient } from "./compiler-worker-client.service.js";
import { WorkbenchLocalizationService } from "./workbench-localization.js";

export type RouteEditorOperationKind =
  | "add-waypoint"
  | "clear-guidance"
  | "move-waypoint"
  | "ports"
  | "remove-waypoint";

export interface RouteEditorSegment {
  readonly index: number;
  readonly point: { readonly x: number; readonly y: number };
}

@Component({
  selector: "c4ml-route-editor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./route-editor.component.html",
  styleUrls: [
    "./placement-editor.component.css",
    "./route-editor.component.css",
  ],
})
export class RouteEditorComponent {
  readonly project = input.required<CompilerWorkerProject>();
  readonly activeFile = input.required<string>();
  readonly viewId = input.required<string>();
  readonly route = input.required<CompilerWorkerRouteNavigationTarget>();
  readonly applied = output<PreviewRouteChangeWorkerResponse>();
  readonly cancelled = output<void>();

  readonly compiler = inject(CompilerWorkerClient);
  readonly i18n = inject(WorkbenchLocalizationService);
  readonly operationKind = signal<RouteEditorOperationKind>("ports");
  readonly sourcePort = signal<C4mlRoutePortSelection>("automatic");
  readonly targetPort = signal<C4mlRoutePortSelection>("automatic");
  readonly segmentIndex = signal(0);
  readonly waypointIndex = signal(0);
  readonly moveDirection = signal<"down" | "left" | "right" | "up">("right");
  readonly moveSteps = signal<1 | 2 | 4>(1);
  readonly preview = signal<PreviewRouteChangeWorkerResponse | undefined>(undefined);
  readonly previewUrl = signal<string | undefined>(undefined);
  readonly busy = computed(() => this.compiler.route().phase === "loading");
  readonly segments = computed<readonly RouteEditorSegment[]>(() => {
    const points = this.route().points;
    return points.slice(0, -1).map((start, index) => {
      const end = points[index + 1]!;
      return {
        index,
        point: {
          x: Math.round((start.x + end.x) / 2),
          y: Math.round((start.y + end.y) / 2),
        },
      };
    });
  });
  readonly canPreview = computed(() => {
    switch (this.operationKind()) {
      case "ports":
      case "add-waypoint":
      case "clear-guidance":
        return true;
      case "move-waypoint":
      case "remove-waypoint":
        return this.route().waypoints[this.waypointIndex()] !== undefined;
    }
  });
  readonly issues = computed(() => {
    const response = this.preview();
    return response === undefined
      ? []
      : [
          ...response.authoringIssues.map(({ code, message }) => ({
            code,
            message,
            severity: "error" as const,
            correction: undefined,
          })),
          ...response.changeIssues.map(({ code, message }) => ({
            code,
            message,
            severity: "error" as const,
            correction: undefined,
          })),
          ...(response.compilation?.diagnostics ?? []),
          ...(response.message === undefined
            ? []
            : [{
                code: "C4ML-ROUTE-PREVIEW",
                message: response.message,
                severity: "error" as const,
                correction: undefined,
              }]),
        ];
  });
  readonly repairs = computed(() => this.preview()?.repairs ?? []);
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
      const route = this.route();
      if (this.#initialized) return;
      this.#initialized = true;
      this.sourcePort.set(route.sourcePortSelection);
      this.targetPort.set(route.targetPortSelection);
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
    const value = selectValue(event);
    if (
      value !== "ports" &&
      value !== "add-waypoint" &&
      value !== "move-waypoint" &&
      value !== "remove-waypoint" &&
      value !== "clear-guidance"
    ) return;
    this.operationKind.set(value);
    this.preview.set(undefined);
  }

  setPort(role: "source" | "target", side: C4mlRoutePortSelection): void {
    (role === "source" ? this.sourcePort : this.targetPort).set(side);
    this.preview.set(undefined);
  }

  setSegment(event: Event): void {
    const value = Number(selectValue(event));
    if (Number.isSafeInteger(value) && value >= 0) {
      this.segmentIndex.set(value);
      this.preview.set(undefined);
    }
  }

  setWaypoint(event: Event): void {
    const value = Number(selectValue(event));
    if (Number.isSafeInteger(value) && value >= 0) {
      this.waypointIndex.set(value);
      this.preview.set(undefined);
    }
  }

  setMoveDirection(event: Event): void {
    const value = selectValue(event);
    if (value === "down" || value === "left" || value === "right" || value === "up") {
      this.moveDirection.set(value);
      this.preview.set(undefined);
    }
  }

  setMoveSteps(event: Event): void {
    const value = Number(selectValue(event));
    if (value === 1 || value === 2 || value === 4) {
      this.moveSteps.set(value);
      this.preview.set(undefined);
    }
  }

  async buildPreview(): Promise<void> {
    const operation = this.#operation();
    if (operation === undefined) return;
    this.preview.set(undefined);
    const response = await this.compiler.previewRouteChange(
      this.project(),
      this.activeFile(),
      {
        id: `route:${this.viewId()}:${operation.relationshipId}:${operation.kind}`,
        viewId: this.viewId(),
        intent: {
          id: `route:${operation.kind}`,
          kind: "route",
          summary: `Adjust route ${operation.relationshipId} in ${this.viewId()}.`,
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

  waypointLabel(index: number): string {
    const waypoint = this.route().waypoints[index];
    if (waypoint === undefined) return String(index + 1);
    const anchor =
      waypoint.anchorKind === "node" && waypoint.referenceId !== undefined
        ? `${waypoint.referenceId} · ${waypoint.side}`
        : waypoint.anchorKind;
    return `${index + 1}. ${anchor} · (${Math.round(waypoint.point.x)}, ${Math.round(waypoint.point.y)})`;
  }

  #operation(): C4mlRouteEditOperation | undefined {
    const relationshipId = this.route().referenceId;
    switch (this.operationKind()) {
      case "ports":
        return {
          kind: "ports",
          relationshipId,
          sourcePort: this.sourcePort(),
          targetPort: this.targetPort(),
        };
      case "add-waypoint": {
        const segment = this.segments()[this.segmentIndex()];
        return segment === undefined
          ? undefined
          : { kind: "add-waypoint", relationshipId, point: segment.point };
      }
      case "move-waypoint": {
        const amount = this.moveSteps() * 16;
        const delta = {
          x: this.moveDirection() === "left" ? -amount : this.moveDirection() === "right" ? amount : 0,
          y: this.moveDirection() === "up" ? -amount : this.moveDirection() === "down" ? amount : 0,
        };
        return {
          kind: "move-waypoint",
          relationshipId,
          waypointIndex: this.waypointIndex(),
          delta,
        };
      }
      case "remove-waypoint":
        return {
          kind: "remove-waypoint",
          relationshipId,
          waypointIndex: this.waypointIndex(),
        };
      case "clear-guidance":
        return { kind: "clear-guidance", relationshipId };
    }
  }
}

function selectValue(event: Event): string | undefined {
  return event.target instanceof HTMLSelectElement ? event.target.value : undefined;
}
