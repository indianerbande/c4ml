import {
  DestroyRef,
  Injectable,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import type {
  DesktopPreviewInteraction,
  DesktopPreviewProjection,
  DesktopPreviewWindowState,
} from "@c4ml/desktop-contract";

import type {
  CompilerWorkerNavigationTarget,
  CompilerWorkerNodeNavigationTarget,
  CompilerWorkerRouteNavigationTarget,
} from "./compiler-worker.protocol.js";
import { CompilerWorkerClient } from "./compiler-worker-client.service.js";
import { resolveC4mlDesktopApi } from "./desktop-bridge.js";
import { createPreviewProjection } from "./preview-projection.js";
import { svgWithNavigationHighlight } from "./preview-navigation.js";
import { WorkbenchLocalizationService } from "./workbench-localization.js";
import { WorkbenchPreferencesService } from "./workbench-preferences.service.js";
import { WorkbenchSessionService } from "./workbench-session.service.js";

@Injectable({ providedIn: "root" })
export class WorkbenchPreviewFacade {
  readonly selectedSceneObjectId = signal<string | undefined>(undefined);
  readonly previewUrl = signal<string | undefined>(undefined);
  readonly detached = signal(false);

  readonly #compiler = inject(CompilerWorkerClient);
  readonly #i18n = inject(WorkbenchLocalizationService);
  readonly #preferences = inject(WorkbenchPreferencesService);
  readonly #session = inject(WorkbenchSessionService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #desktop = resolveC4mlDesktopApi();
  readonly #detachedSelectionListeners = new Set<
    (target: CompilerWorkerNavigationTarget | undefined) => void
  >();
  #projectionRevision = 0;

  readonly zoom = computed(() => this.#session.state().previewZoom);
  readonly routingDebugEnabled = computed(
    () => this.#session.state().routingDebugEnabled,
  );
  readonly workspaceMode = computed(
    () => this.#session.state().previewWorkspaceMode,
  );
  readonly desktopDetachmentAvailable = this.#desktop !== undefined;
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

    const unsubscribeInteraction = this.#desktop?.onPreviewInteraction(
      (interaction) => this.#handleDetachedInteraction(interaction),
    );
    const unsubscribeWindowState = this.#desktop?.onPreviewWindowState(
      (state) => this.#acceptWindowState(state),
    );
    void this.#desktop
      ?.getPreviewWindowState()
      .then((state) => this.#acceptWindowState(state));
    this.#destroyRef.onDestroy(() => {
      unsubscribeInteraction?.();
      unsubscribeWindowState?.();
    });

    effect(() => {
      const projection = this.#nextProjection();
      if (this.detached()) {
        this.#desktop?.updatePreviewProjection(projection);
      }
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

  toggleFocusMode(): void {
    this.#session.setPreviewWorkspaceMode(
      this.workspaceMode() === "focus" ? "split" : "focus",
    );
  }

  async detach(): Promise<boolean> {
    if (this.#desktop === undefined) {
      return false;
    }
    this.#session.setPreviewWorkspaceMode("split");
    const result = await this.#desktop.openPreviewWindow({
      projection: this.#nextProjection(),
      bounds: this.#session.state().previewWindowBounds,
    });
    if (result.status === "opened") {
      this.detached.set(true);
      return true;
    }
    return false;
  }

  redock(): void {
    this.#desktop?.closePreviewWindow();
    this.detached.set(false);
    this.#session.setPreviewWorkspaceMode("split");
  }

  onDetachedSelection(
    listener: (target: CompilerWorkerNavigationTarget | undefined) => void,
  ): () => void {
    this.#detachedSelectionListeners.add(listener);
    return () => this.#detachedSelectionListeners.delete(listener);
  }

  #nextProjection(): DesktopPreviewProjection {
    const compiler = this.#compiler.state();
    const preferences = this.#preferences.preferences();
    return createPreviewProjection({
      revision: ++this.#projectionRevision,
      compilerPhase: compiler.phase,
      statusLabel: this.#statusLabel(compiler.phase),
      views: compiler.views,
      activeViewId: compiler.activeViewId,
      svg: this.displaySvg(),
      navigation: compiler.lastValidNavigation,
      selectedSceneObjectId: this.selectedSceneObjectId(),
      selectionLabel: this.selectedLabel(),
      zoom: this.zoom(),
      routeDebugEnabled: this.routingDebugEnabled(),
      stale:
        compiler.phase === "invalid" && compiler.lastValidSvg !== undefined,
      language: preferences.uiLanguage,
      colorScheme: this.#preferences.effectiveColorScheme(),
      colorPalette: preferences.colorPalette,
      interfaceFontSize: preferences.interfaceFontSize,
    });
  }

  #handleDetachedInteraction(interaction: DesktopPreviewInteraction): void {
    switch (interaction.type) {
      case "fit":
        this.fit();
        break;
      case "redock":
        this.redock();
        break;
      case "select": {
        const target = this.navigation()?.targets.find(
          ({ sceneObjectId }) => sceneObjectId === interaction.sceneObjectId,
        );
        for (const listener of this.#detachedSelectionListeners) {
          listener(target);
        }
        break;
      }
      case "toggle-route-debug":
        this.toggleRoutingDebug();
        break;
      case "zoom-in":
        this.zoomIn();
        break;
      case "zoom-out":
        this.zoomOut();
        break;
    }
  }

  #acceptWindowState(state: DesktopPreviewWindowState): void {
    this.detached.set(state.open);
    if (state.bounds !== undefined) {
      this.#session.setPreviewWindowBounds(state.bounds);
    }
  }

  #statusLabel(phase: "compiling" | "failed" | "idle" | "invalid" | "valid"): string {
    switch (phase) {
      case "compiling":
        return this.#i18n.t("status.compiling");
      case "failed":
        return this.#i18n.t("status.failed");
      case "invalid":
        return this.#i18n.t("status.invalid");
      case "valid":
        return this.#i18n.t("status.valid");
      default:
        return this.#i18n.t("status.waiting");
    }
  }
}
