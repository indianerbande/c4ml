import type {
  CompilerWorkerNavigation,
  CompilerWorkerNavigationPoint,
  CompilerWorkerNavigationTarget,
  CompilerWorkerCorridorNavigationTarget,
  CompilerWorkerNodeNavigationTarget,
  CompilerWorkerPortNavigationTarget,
  CompilerWorkerRouteLabelNavigationTarget,
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
    .filter((target) => target.kind === "node" || target.kind === "route")
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

  const port = nearestPointTarget(
    targets.filter(
      (target): target is CompilerWorkerPortNavigationTarget =>
        target.kind === "port",
    ),
    point,
    12,
  );
  if (port !== undefined) {
    return port;
  }

  const label = targets
    .filter(
      (target): target is CompilerWorkerRouteLabelNavigationTarget =>
        target.kind === "route-label" && containsBounds(target.bounds, point),
    )
    .sort((left, right) => compareText(left.sceneObjectId, right.sceneObjectId))[0];
  if (label !== undefined) {
    return label;
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
  if (route !== undefined) {
    return route;
  }

  const corridor = targets
    .filter(
      (target): target is CompilerWorkerCorridorNavigationTarget =>
        target.kind === "corridor",
    )
    .map((target) => ({
      target,
      distance: distanceToSegment(point, target.points[0], target.points[1]),
    }))
    .filter(({ distance }) => distance <= 8)
    .sort(
      (left, right) =>
        left.distance - right.distance ||
        compareText(left.target.sceneObjectId, right.target.sceneObjectId),
    )[0]?.target;
  return corridor ?? smallestNode(nodes);
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
  const style = selectionStyle(target);
  const debug = selectionOverlay(target, options);
  const selectionCss =
    style.length === 0
      ? ""
      : `<style id="c4ml-editor-selection">${style}</style>`;
  const overlay = `${selectionCss}${debug}`;
  return svg.includes("</svg>") ? svg.replace("</svg>", `${overlay}</svg>`) : svg;
}

function nearestPointTarget(
  targets: readonly CompilerWorkerPortNavigationTarget[],
  point: PreviewClientPoint,
  tolerance: number,
): CompilerWorkerPortNavigationTarget | undefined {
  return targets
    .map((target) => ({
      target,
      distance: Math.hypot(
        point.x - target.point.x,
        point.y - target.point.y,
      ),
    }))
    .filter(({ distance }) => distance <= tolerance)
    .sort(
      (left, right) =>
        left.distance - right.distance ||
        compareText(left.target.sceneObjectId, right.target.sceneObjectId),
    )[0]?.target;
}

function containsBounds(
  bounds: CompilerWorkerRouteLabelNavigationTarget["bounds"],
  point: PreviewClientPoint,
): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
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

function routeSelectionStyle(svgElementIds: readonly string[]): string {
  const [pathId, arrowheadId] = svgElementIds;
  return `#${pathId}{stroke:#F59E0B!important;stroke-width:5!important;}#${arrowheadId}{fill:#F59E0B!important;stroke:#F59E0B!important;}`;
}

function selectionStyle(target: CompilerWorkerNavigationTarget): string {
  switch (target.kind) {
    case "node":
      return "";
    case "route":
      return routeSelectionStyle(target.svgElementIds);
    case "route-label":
      return `#${target.svgElementIds[0]} text{fill:#F59E0B!important;font-weight:700!important;}`;
    case "port":
    case "corridor":
      return "";
  }
}

function selectionOverlay(
  target: CompilerWorkerNavigationTarget,
  options: PreviewOverlayOptions | undefined,
): string {
  switch (target.kind) {
    case "route":
      return options?.showRouteDebug === true
        ? routeDebugOverlay(target, options)
        : "";
    case "port":
      return `<g id="c4ml-editor-detail-selection" aria-hidden="true" pointer-events="none"><circle cx="${number(target.point.x)}" cy="${number(target.point.y)}" r="9" fill="#FFF8E8" stroke="#F59E0B" stroke-width="3"/></g>`;
    case "route-label":
      return `<g id="c4ml-editor-detail-selection" aria-hidden="true" pointer-events="none"><rect x="${number(target.bounds.x)}" y="${number(target.bounds.y)}" width="${number(target.bounds.width)}" height="${number(target.bounds.height)}" rx="5" fill="none" stroke="#F59E0B" stroke-width="2" stroke-dasharray="5 3"/></g>`;
    case "corridor":
      return `<g id="c4ml-editor-detail-selection" aria-hidden="true" pointer-events="none"><line x1="${number(target.points[0].x)}" y1="${number(target.points[0].y)}" x2="${number(target.points[1].x)}" y2="${number(target.points[1].y)}" stroke="#F59E0B" stroke-width="4" stroke-dasharray="9 5" opacity=".82"/></g>`;
    case "node":
      return nodeSelectionOverlay(target);
  }
}

function nodeSelectionOverlay(
  target: CompilerWorkerNodeNavigationTarget,
): string {
  const x = target.bounds.x - 5;
  const y = target.bounds.y - 5;
  const right = target.bounds.x + target.bounds.width + 5;
  const bottom = target.bounds.y + target.bounds.height + 5;
  const corner = Math.min(18, target.bounds.width / 4, target.bounds.height / 4);
  const path = [
    `M ${number(x)} ${number(y + corner)} V ${number(y)} H ${number(x + corner)}`,
    `M ${number(right - corner)} ${number(y)} H ${number(right)} V ${number(y + corner)}`,
    `M ${number(right)} ${number(bottom - corner)} V ${number(bottom)} H ${number(right - corner)}`,
    `M ${number(x + corner)} ${number(bottom)} H ${number(x)} V ${number(bottom - corner)}`,
  ].join(" ");
  return `<g id="c4ml-editor-node-selection" aria-hidden="true" pointer-events="none"><path d="${path}" fill="none" stroke="#F59E0B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></g>`;
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
