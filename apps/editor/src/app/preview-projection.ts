import type {
  DesktopPreviewNavigationTarget,
  DesktopPreviewProjection,
} from "@c4ml/desktop-contract";

import type {
  CompilerWorkerNavigation,
  CompilerWorkerNavigationTarget,
  CompilerWorkerView,
} from "./compiler-worker.protocol.js";
import type { EditorCompilationPhase } from "./editor-session.js";
import type {
  WorkbenchColorPalette,
  WorkbenchUiLanguage,
} from "./workbench-preferences.js";

export interface PreviewProjectionInput {
  readonly revision: number;
  readonly compilerPhase: EditorCompilationPhase;
  readonly statusLabel: string;
  readonly views: readonly CompilerWorkerView[];
  readonly activeViewId: string | undefined;
  readonly svg: string | undefined;
  readonly navigation: CompilerWorkerNavigation | undefined;
  readonly selectedSceneObjectId: string | undefined;
  readonly selectionLabel: string | undefined;
  readonly zoom: number;
  readonly routeDebugEnabled: boolean;
  readonly stale: boolean;
  readonly language: WorkbenchUiLanguage;
  readonly colorScheme: "dark" | "light";
  readonly colorPalette: WorkbenchColorPalette;
  readonly interfaceFontSize: number;
}

export function createPreviewProjection(
  input: PreviewProjectionInput,
): DesktopPreviewProjection {
  const activeView = input.views.find(({ id }) => id === input.activeViewId);
  return {
    version: 1,
    revision: input.revision,
    compilerPhase: input.compilerPhase,
    statusLabel: input.statusLabel,
    view:
      activeView === undefined
        ? undefined
        : { id: activeView.id, title: activeView.title },
    svg: input.svg,
    navigation:
      input.navigation === undefined
        ? undefined
        : {
            width: input.navigation.width,
            height: input.navigation.height,
            targets: input.navigation.targets.map(toPreviewNavigationTarget),
          },
    selectedSceneObjectId: input.selectedSceneObjectId,
    selectionLabel: input.selectionLabel,
    zoom: input.zoom,
    routeDebugEnabled: input.routeDebugEnabled,
    stale: input.stale,
    presentation: {
      language: input.language,
      colorScheme: input.colorScheme,
      colorPalette: input.colorPalette,
      interfaceFontSize: input.interfaceFontSize,
    },
  };
}

function toPreviewNavigationTarget(
  target: CompilerWorkerNavigationTarget,
): DesktopPreviewNavigationTarget {
  const identity = {
    sceneObjectId: target.sceneObjectId,
    label: target.label,
  };
  switch (target.kind) {
    case "node":
      return {
        ...identity,
        kind: "node",
        nodeRole: target.nodeRole,
        bounds: target.bounds,
      };
    case "route":
      return { ...identity, kind: "route", points: target.points };
    case "port":
      return { ...identity, kind: "port", point: target.point };
    case "route-label":
      return { ...identity, kind: "route-label", bounds: target.bounds };
    case "corridor":
      return { ...identity, kind: "corridor", points: target.points };
  }
}
