import { Injectable, computed, effect, inject, signal } from "@angular/core";

import type {
  CompilerWorkerNavigationTarget,
  CompilerWorkerNodeNavigationTarget,
  CompilerWorkerRouteNavigationTarget,
} from "./compiler-worker.protocol.js";
import { CompilerWorkerClient } from "./compiler-worker-client.service.js";
import { svgWithNavigationHighlight } from "./preview-navigation.js";
import { WorkbenchLocalizationService } from "./workbench-localization.js";
import { WorkbenchSessionService } from "./workbench-session.service.js";

@Injectable({ providedIn: "root" })
export class WorkbenchPreviewFacade {
  readonly selectedSceneObjectId = signal<string | undefined>(undefined);
  readonly previewUrl = signal<string | undefined>(undefined);

  readonly #compiler = inject(CompilerWorkerClient);
  readonly #i18n = inject(WorkbenchLocalizationService);
  readonly #session = inject(WorkbenchSessionService);

  readonly zoom = computed(() => this.#session.state().previewZoom);
  readonly routingDebugEnabled = computed(
    () => this.#session.state().routingDebugEnabled,
  );
  readonly lastValidSvg = computed(() => this.#compiler.state().lastValidSvg);
  readonly navigation = computed(
    () => this.#compiler.state().lastValidNavigation,
  );
  readonly selectedTarget = computed(() =>
    this.navigation()?.targets.find(
      ({ sceneObjectId }) => sceneObjectId === this.selectedSceneObjectId(),
    ),
  );
  readonly selectedRoute = computed<
    CompilerWorkerRouteNavigationTarget | undefined
  >(() => {
    const target = this.selectedTarget();
    if (target?.kind === "route") {
      return target;
    }
    if (target === undefined || target.kind === "node") {
      return undefined;
    }
    return this.navigation()?.targets.find(
      (candidate): candidate is CompilerWorkerRouteNavigationTarget =>
        candidate.kind === "route" &&
        candidate.referenceId === target.referenceId,
    );
  });
  readonly selectedNode = computed<
    CompilerWorkerNodeNavigationTarget | undefined
  >(() => {
    const target = this.selectedTarget();
    return target?.kind === "node" ? target : undefined;
  });
  readonly selectedKindLabel = computed(() => {
    switch (this.selectedTarget()?.kind) {
      case "corridor":
        return this.#i18n.t("selection.corridor");
      case "node":
        return this.#i18n.t("selection.node");
      case "port":
        return this.#i18n.t("selection.port");
      case "route":
        return this.#i18n.t("selection.route");
      case "route-label":
        return this.#i18n.t("selection.routeLabel");
      default:
        return this.#i18n.t("selection.object");
    }
  });
  readonly selectedLabel = computed(() => this.selectedTarget()?.label);
  readonly activeViewTitle = computed(
    () =>
      this.#compiler
        .state()
        .views.find(({ id }) => id === this.#compiler.state().activeViewId)
        ?.title ?? this.#i18n.t("view.none"),
  );
  readonly displaySvg = computed(() => {
    const svg = this.lastValidSvg();
    const navigation = this.navigation();
    return svg === undefined
      ? undefined
      : svgWithNavigationHighlight(
          svg,
          this.selectedTarget(),
          navigation === undefined
            ? undefined
            : {
                showRouteDebug: this.routingDebugEnabled(),
                width: navigation.width,
                height: navigation.height,
              },
        );
  });
  readonly displaySize = computed(() => `${Math.round(this.zoom() * 100)}%`);
  readonly zoomLabel = computed(() => `${Math.round(this.zoom() * 100)}%`);

  constructor() {
    effect((onCleanup) => {
      const svg = this.displaySvg();
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

  clearSelection(): void {
    this.selectedSceneObjectId.set(undefined);
  }

  select(
    target: CompilerWorkerNavigationTarget | undefined,
    showRoutePanel = true,
  ): CompilerWorkerNavigationTarget | undefined {
    this.selectedSceneObjectId.set(target?.sceneObjectId);
    if (showRoutePanel && target !== undefined) {
      this.#session.showPanel("route");
    }
    return target;
  }

  zoomIn(): void {
    this.#session.setPreviewZoom(this.zoom() + 0.2);
  }

  zoomOut(): void {
    this.#session.setPreviewZoom(this.zoom() - 0.2);
  }

  fit(): void {
    this.#session.setPreviewZoom(1);
  }

  toggleRoutingDebug(): void {
    this.#session.toggleRoutingDebug();
  }
}
