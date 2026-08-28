import type {
  CompilerWorkerNavigation,
  CompilerWorkerNavigationTarget,
} from "./compiler-worker.protocol.js";

export interface PreviewClientRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface PreviewClientPoint {
  readonly x: number;
  readonly y: number;
}

export function navigationTargetForOffset(
  targets: readonly CompilerWorkerNavigationTarget[],
  offset: number,
): CompilerWorkerNavigationTarget | undefined {
  return smallestTarget(
    targets.filter(
      ({ source }) =>
        source.start.offset <= offset && offset <= source.end.offset,
    ),
    ({ source }) => source.end.offset - source.start.offset,
  );
}

export function navigationTargetAtPoint(
  targets: readonly CompilerWorkerNavigationTarget[],
  point: PreviewClientPoint,
): CompilerWorkerNavigationTarget | undefined {
  return smallestTarget(
    targets.filter(({ bounds }) =>
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    ),
    ({ bounds }) => bounds.width * bounds.height,
  );
}

export function clientPointToScene(
  clientPoint: PreviewClientPoint,
  imageRect: PreviewClientRect,
  navigation: CompilerWorkerNavigation,
): PreviewClientPoint | undefined {
  const scale = Math.min(
    imageRect.width / navigation.width,
    imageRect.height / navigation.height,
  );
  if (!Number.isFinite(scale) || scale <= 0) {
    return undefined;
  }
  const renderedWidth = navigation.width * scale;
  const renderedHeight = navigation.height * scale;
  const contentLeft = imageRect.left + (imageRect.width - renderedWidth) / 2;
  const contentTop = imageRect.top + (imageRect.height - renderedHeight) / 2;
  const x = (clientPoint.x - contentLeft) / scale;
  const y = (clientPoint.y - contentTop) / scale;
  if (x < 0 || x > navigation.width || y < 0 || y > navigation.height) {
    return undefined;
  }
  return { x, y };
}

export function svgWithNavigationHighlight(
  svg: string,
  target: CompilerWorkerNavigationTarget | undefined,
): string {
  if (
    target === undefined ||
    !/^c4ml-[a-z0-9_-]+$/iu.test(target.svgElementId)
  ) {
    return svg;
  }
  const style = `<style id="c4ml-editor-selection">#${target.svgElementId} .element-surface,#${target.svgElementId} .boundary-surface{stroke:#F59E0B!important;stroke-width:5!important;}</style>`;
  return svg.includes("</svg>") ? svg.replace("</svg>", `${style}</svg>`) : svg;
}

function smallestTarget(
  targets: readonly CompilerWorkerNavigationTarget[],
  sizeOf: (target: CompilerWorkerNavigationTarget) => number,
): CompilerWorkerNavigationTarget | undefined {
  return [...targets].sort(
    (left, right) =>
      sizeOf(left) - sizeOf(right) ||
      compareText(left.sceneNodeId, right.sceneNodeId),
  )[0];
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
