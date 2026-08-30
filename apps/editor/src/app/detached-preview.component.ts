import { DOCUMENT } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import type {
  DesktopPreviewInteraction,
  DesktopPreviewProjection,
} from "@c4ml/desktop-contract";

import { resolveC4mlPreviewApi } from "./desktop-bridge.js";
import {
  clientPointToScene,
  navigationTargetAtPoint,
} from "./preview-navigation.js";

type DetachedPreviewMessageKey =
  | "alt"
  | "building"
  | "fit"
  | "redock"
  | "routes"
  | "stale"
  | "waiting"
  | "zoomIn"
  | "zoomOut";

const detachedPreviewMessages: Record<
  "de" | "en",
  Record<DetachedPreviewMessageKey, string>
> = {
  en: {
    alt: "Compiled C4 diagram",
    building: "Waiting for the workbench preview",
    fit: "Fit diagram",
    redock: "Return preview to the workbench",
    routes: "Routes",
    stale: "Showing the last valid diagram.",
    waiting: "The main workbench remains the compiler and source authority.",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
  },
  de: {
    alt: "Kompiliertes C4-Diagramm",
    building: "Warten auf die Vorschau der Werkbank",
    fit: "Diagramm einpassen",
    redock: "Vorschau in die Werkbank zurückholen",
    routes: "Routen",
    stale: "Das letzte gültige Diagramm wird angezeigt.",
    waiting: "Die Hauptwerkbank bleibt für Compiler und Quelltext zuständig.",
    zoomIn: "Vergrößern",
    zoomOut: "Verkleinern",
  },
};

@Component({
  selector: "c4ml-root",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./detached-preview.component.html",
  styleUrl: "./detached-preview.component.css",
})
export class DetachedPreviewComponent {
  readonly projection = signal<DesktopPreviewProjection | undefined>(undefined);
  readonly previewUrl = signal<string | undefined>(undefined);
  readonly #api = resolveC4mlPreviewApi();
  readonly #document = inject(DOCUMENT);
  readonly #destroyRef = inject(DestroyRef);

  readonly previewSize = computed(() => {
    const zoom = this.projection()?.zoom ?? 1;
    return `${Math.round(zoom * 100)}%`;
  });
  readonly zoomLabel = computed(() => {
    const zoom = this.projection()?.zoom ?? 1;
    return `${Math.round(zoom * 100)}%`;
  });

  constructor() {
    const unsubscribe = this.#api?.onProjection((projection) =>
      this.#acceptProjection(projection),
    );
    this.#destroyRef.onDestroy(() => unsubscribe?.());
    void this.#api?.requestProjection().then((projection) => {
      if (projection !== undefined) {
        this.#acceptProjection(projection);
      }
    });

    effect((onCleanup) => {
      const projection = this.projection();
      const svg = projection?.svg;
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

    effect(() => {
      const presentation = this.projection()?.presentation;
      if (presentation === undefined) {
        return;
      }
      const root = this.#document.documentElement;
      root.lang = presentation.language;
      root.dataset["colorScheme"] = presentation.colorScheme;
      root.dataset["colorPalette"] = presentation.colorPalette;
      root.style.setProperty(
        "--c4ml-interface-font-size",
        `${presentation.interfaceFontSize}px`,
      );
    });
  }

  message(key: DetachedPreviewMessageKey): string {
    const language = this.projection()?.presentation.language ?? "en";
    return detachedPreviewMessages[language][key];
  }

  send(type: Exclude<DesktopPreviewInteraction["type"], "select">): void {
    this.#api?.sendInteraction({ version: 1, type });
  }

  onPreviewClick(event: MouseEvent): void {
    const projection = this.projection();
    const navigation = projection?.navigation;
    const image = event.target as HTMLImageElement | null;
    if (
      projection?.compilerPhase !== "valid" ||
      navigation === undefined ||
      image?.tagName !== "IMG"
    ) {
      return;
    }
    const point = clientPointToScene(
      { x: event.clientX, y: event.clientY },
      image.getBoundingClientRect(),
      navigation,
    );
    const target =
      point === undefined
        ? undefined
        : navigationTargetAtPoint(navigation.targets, point);
    this.#api?.sendInteraction({
      version: 1,
      type: "select",
      sceneObjectId: target?.sceneObjectId,
    });
  }

  #acceptProjection(projection: DesktopPreviewProjection): void {
    if (projection.revision <= (this.projection()?.revision ?? 0)) {
      return;
    }
    this.projection.set(projection);
    this.#document.title = `${projection.view?.title ?? "C4ML Preview"} — C4ML`;
  }
}
