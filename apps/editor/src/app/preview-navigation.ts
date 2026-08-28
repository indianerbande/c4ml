import type {
  CompilerWorkerNavigation,
  CompilerWorkerNavigationPoint,
  CompilerWorkerNavigationTarget,
  CompilerWorkerNodeNavigationTarget,
  CompilerWorkerRouteNavigationTarget,
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

export interface PreviewOverlayOptions {
  readonly showRouteDebug: boolean;
  readonly width: number;
  readonly height: number;
}

const routeHitTolerance = 12;

export function navigationTargetForOffset(
  targets: readonly CompilerWorkerNavigationTarget[],
  offset: number,
): CompilerWorkerNavigationTarget | undefined {
  return targets
    .flatMap((target) =>
      [target.source, ...target.relatedSources]
        .filter(
          (source) =>
            source.start.offset <= offset && offset <= source.end.offset,
        )
        .map((source) => ({
          target,
          size: source.end.offset - source.start.offset,
        })),
    )
    .sort(
      (left, right) =>
        left.size - right.size ||
        compareText(left.target.sceneObjectId, right.target.sceneObjectId),
    )[0]?.target;
}

export function navigationTargetAtPoint(
  targets: readonly CompilerWorkerNavigationTarget[],
  point: PreviewClientPoint,
): CompilerWorkerNavigationTarget | undefined {
  const nodes = targets.filter(
    (target): target is CompilerWorkerNodeNavigationTarget =>
      target.kind === "node" && contains(target, point),
  );
  const element = smallestNode(
    nodes.filter(({ nodeRole }) => nodeRole === "element"),
  );
  if (element !== undefined) {
    return element;
  }

  const route = targets
    .filter(
      (target): target is CompilerWorkerRouteNavigationTarget =>
        target.kind === "route",
    )
    .map((target) => ({ target, distance: distanceToRoute(target, point) }))
    .filter(({ distance }) => distance <= routeHitTolerance)
    .sort(
      (left, right) =>
        left.distance - right.distance ||
        compareText(left.target.sceneObjectId, right.target.sceneObjectId),
    )[0]?.target;
  return route ?? smallestNode(nodes);
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
  options?: PreviewOverlayOptions,
): string {
  if (
    target === undefined ||
    target.svgElementIds.some((id) => !/^c4ml-[a-z0-9_-]+$/iu.test(id))
  ) {
    return svg;
  }
  const style =
    target.kind === "node"
      ? nodeSelectionStyle(target.svgElementIds[0]!)
      : routeSelectionStyle(target.svgElementIds);
  const debug =
    target.kind === "route" && options?.showRouteDebug === true
      ? routeDebugOverlay(target, options)
      : "";
  const overlay = `<style id="c4ml-editor-selection">${style}</style>${debug}`;
  return svg.includes("</svg>") ? svg.replace("</svg>", `${overlay}</svg>`) : svg;
}

function contains(
  target: CompilerWorkerNodeNavigationTarget,
  point: PreviewClientPoint,
): boolean {
  const { bounds } = target;
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

function smallestNode(
  targets: readonly CompilerWorkerNodeNavigationTarget[],
): CompilerWorkerNodeNavigationTarget | undefined {
  return [...targets].sort(
    (left, right) =>
      left.bounds.width * left.bounds.height -
        right.bounds.width * right.bounds.height ||
      compareText(left.sceneObjectId, right.sceneObjectId),
  )[0];
}

function distanceToRoute(
  target: CompilerWorkerRouteNavigationTarget,
  point: PreviewClientPoint,
): number {
  let distance = Number.POSITIVE_INFINITY;
  for (let index = 1; index < target.points.length; index += 1) {
    distance = Math.min(
      distance,
      distanceToSegment(point, target.points[index - 1]!, target.points[index]!),
    );
  }
  return distance;
}

function distanceToSegment(
  point: PreviewClientPoint,
  start: CompilerWorkerNavigationPoint,
  end: CompilerWorkerNavigationPoint,
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }
  const projection = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) /
        lengthSquared,
    ),
  );
  return Math.hypot(
    point.x - (start.x + projection * dx),
    point.y - (start.y + projection * dy),
  );
}

function nodeSelectionStyle(svgElementId: string): string {
  return `#${svgElementId} .element-surface,#${svgElementId} .boundary-surface{stroke:#F59E0B!important;stroke-width:5!important;}`;
}

function routeSelectionStyle(svgElementIds: readonly string[]): string {
  const [pathId, arrowheadId] = svgElementIds;
  return `#${pathId}{stroke:#F59E0B!important;stroke-width:5!important;}#${arrowheadId}{fill:#F59E0B!important;stroke:#F59E0B!important;}`;
}

function routeDebugOverlay(
  target: CompilerWorkerRouteNavigationTarget,
  options: PreviewOverlayOptions,
): string {
  if (
    !Number.isFinite(options.width) ||
    !Number.isFinite(options.height) ||
    options.width <= 0 ||
    options.height <= 0 ||
    target.points.some((point) => !validPoint(point))
  ) {
    return "";
  }
  const corridor = corridorOverlay(target, options);
  const points = target.points
    .slice(1, -1)
    .map(
      (point) =>
        `<circle class="editor-route-point" cx="${number(point.x)}" cy="${number(point.y)}" r="4"/>`,
    )
    .join("");
  return `<g id="c4ml-editor-routing-debug" aria-hidden="true" pointer-events="none">
    <style>.editor-corridor-lane{stroke:#0F766E;stroke-width:1.5;stroke-dasharray:7 6;opacity:.38}.editor-corridor-selected{stroke:#F59E0B;stroke-width:3;stroke-dasharray:9 5;opacity:.78}.editor-route-point{fill:#FFF8E8;stroke:#F59E0B;stroke-width:2}.editor-route-port-source{fill:#0EA5E9;stroke:#FFFFFF;stroke-width:2}.editor-route-port-target{fill:#F97316;stroke:#FFFFFF;stroke-width:2}.editor-label-point{fill:#7C3AED;stroke:#FFFFFF;stroke-width:2}</style>
    ${corridor}${points}
    <circle class="editor-route-port-source" cx="${number(target.sourcePort.point.x)}" cy="${number(target.sourcePort.point.y)}" r="7"/>
    <circle class="editor-route-port-target" cx="${number(target.targetPort.point.x)}" cy="${number(target.targetPort.point.y)}" r="7"/>
    <circle class="editor-label-point" cx="${number(target.labelPoint.x)}" cy="${number(target.labelPoint.y)}" r="5"/>
  </g>`;
}

function corridorOverlay(
  target: CompilerWorkerRouteNavigationTarget,
  options: PreviewOverlayOptions,
): string {
  const corridor = target.corridor;
  if (corridor === undefined) {
    return "";
  }
  return Array.from({ length: corridor.lanes }, (_, lane) => {
    const coordinate =
      corridor.coordinate +
      (lane - (corridor.lanes - 1) / 2) * corridor.laneSpacing;
    const className =
      lane === corridor.lane
        ? "editor-corridor-selected"
        : "editor-corridor-lane";
    return corridor.orientation === "vertical"
      ? `<line class="${className}" x1="${number(coordinate)}" y1="82" x2="${number(coordinate)}" y2="${number(options.height - 54)}"/>`
      : `<line class="${className}" x1="24" y1="${number(coordinate)}" x2="${number(options.width - 24)}" y2="${number(coordinate)}"/>`;
  }).join("");
}

function validPoint(point: CompilerWorkerNavigationPoint): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function number(value: number): string {
  return value.toFixed(2).replace(/\.00$/u, "").replace(/(\.\d)0$/u, "$1");
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
