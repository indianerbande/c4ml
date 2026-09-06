import type { CompilerWorkerNavigationTarget } from "./compiler-worker.protocol.js";

export type DiagramContextMenuAction =
  | { readonly kind: "show-element" }
  | { readonly kind: "connect" }
  | {
      readonly kind: "placement";
      readonly operation: "align" | "nudge" | "pin";
      readonly direction?: "down" | "left" | "right" | "up";
    }
  | {
      readonly kind: "route";
      readonly operation:
        | "add-waypoint"
        | "clear-guidance"
        | "label-offset"
        | "ports";
    }
  | { readonly kind: "reveal-source" };

export interface DiagramContextMenuPosition {
  readonly x: number;
  readonly y: number;
  readonly submenuSide: "left" | "right";
}

export interface DiagramContextMenuCapabilities {
  readonly kind: "element" | "route" | "source-only" | "canvas";
  readonly canConnect: boolean;
  readonly primaryRouteOperation: "label-offset" | "ports" | undefined;
}

const menuWidth = 248;
const menuHeight = 390;
const submenuWidth = 190;
const viewportMargin = 8;

export function diagramContextMenuCapabilities(
  target: CompilerWorkerNavigationTarget | undefined,
  connectAvailable: boolean,
): DiagramContextMenuCapabilities {
  if (target === undefined) return { kind: "canvas", canConnect: false, primaryRouteOperation: undefined };
  if (target.kind === "node") {
    return target.nodeRole === "element"
      ? {
          kind: "element",
          canConnect: connectAvailable,
          primaryRouteOperation: undefined,
        }
      : {
          kind: "source-only",
          canConnect: false,
          primaryRouteOperation: undefined,
        };
  }
  return {
    kind: "route",
    canConnect: false,
    primaryRouteOperation:
      target.kind === "route-label" ? "label-offset" : "ports",
  };
}

export function diagramContextMenuPosition(
  point: { readonly x: number; readonly y: number },
  viewport: { readonly width: number; readonly height: number },
): DiagramContextMenuPosition {
  const maxX = Math.max(
    viewportMargin,
    viewport.width - menuWidth - viewportMargin,
  );
  const maxY = Math.max(
    viewportMargin,
    viewport.height - menuHeight - viewportMargin,
  );
  const x = Math.min(Math.max(viewportMargin, point.x), maxX);
  const y = Math.min(Math.max(viewportMargin, point.y), maxY);
  return {
    x,
    y,
    submenuSide:
      x + menuWidth + submenuWidth + viewportMargin <= viewport.width
        ? "right"
        : "left",
  };
}
