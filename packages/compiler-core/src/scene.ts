import type {
  DiagramNode,
  DiagramNodeKind,
  PreparedDiagram,
} from "./diagram-preparation.js";
import {
  ContractError,
  type LayoutNodeResult,
  type LayoutResult,
  type Point,
} from "./layout.js";
import { compareText } from "./ordering.js";
import type { CardinalPortSide, PortRole } from "./ports.js";
import type {
  EffectiveCorridor,
  EffectiveRoute,
  RoutePolicy,
  RouteStyle,
} from "./routing.js";
import type { ShapeDefinition } from "./shapes.js";
import {
  resolveSceneTheme,
  type SceneElementRole,
  type SceneTheme,
  type SceneThemeSelection,
} from "./theme.js";
import type { LegendEntry } from "./views.js";

export interface SceneTextBlock {
  readonly lines: readonly string[];
}

export interface SceneNode {
  readonly id: string;
  readonly referenceId: string;
  readonly kind: DiagramNodeKind;
  readonly elementRole?: SceneElementRole;
  readonly shapeId?: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly title: SceneTextBlock;
  readonly typeLabel: string;
  readonly description: SceneTextBlock;
  readonly technology?: string;
  readonly external: boolean;
  readonly parentId?: string;
  readonly sourceId?: string;
}

export interface SceneRoute {
  readonly id: string;
  readonly relationshipId: string;
  readonly sourceNodeId: string;
  readonly targetNodeId: string;
  readonly sourcePortId: string;
  readonly targetPortId: string;
  readonly policy: RoutePolicy;
  readonly style: RouteStyle;
  readonly points: readonly Point[];
  readonly label: string;
  readonly technology?: string;
  readonly labelPoint: Point;
  readonly labelSegment: number;
  readonly corridor?: EffectiveCorridor;
}

export interface ScenePort {
  readonly id: string;
  readonly relationshipId: string;
  readonly role: PortRole;
  readonly nodeId: string;
  readonly side: CardinalPortSide;
  readonly point: Point;
}

export interface SceneArrowhead {
  readonly id: string;
  readonly relationshipId: string;
  readonly routeId: string;
  readonly policy: RoutePolicy;
  readonly points: readonly Point[];
}

export interface DiagramScene {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly title: string;
  readonly description: string;
  readonly scope: string;
  readonly viewKind: string;
  readonly fontFamily: string;
  readonly theme: SceneTheme;
  readonly shapes: readonly ShapeDefinition[];
  readonly nodes: readonly SceneNode[];
  readonly ports: readonly ScenePort[];
  readonly routes: readonly SceneRoute[];
  readonly arrowheads: readonly SceneArrowhead[];
  readonly legend: readonly LegendEntry[];
}

export interface SceneOptions {
  readonly padding?: number;
  readonly fontFamily?: string;
  readonly theme?: SceneThemeSelection;
}

export function createDiagramScene(
  diagram: PreparedDiagram,
  layout: LayoutResult,
  routes: readonly EffectiveRoute[],
  options: SceneOptions = {},
): DiagramScene {
  const padding = options.padding ?? 40;
  if (!Number.isFinite(padding) || padding < 0) {
    throw new ContractError(
      "C4ML-SCENE-001",
      "Scene padding must be finite and non-negative.",
    );
  }
  const titleHeight = 86;
  const legend = diagram.view.legend.entries ?? [];
  const legendHeight = legend.length === 0 ? 34 : 70;
  const offset = { x: padding, y: padding + titleHeight };
  const layoutNodeById = new Map(layout.nodes.map((node) => [node.id, node]));
  const nodes = diagram.nodes.map((node) =>
    sceneNode(node, requiredLayoutNode(layoutNodeById, node.id), offset),
  );
  const sceneRoutes = routes.map((route) => sceneRoute(route, offset));
  const ports = routes.flatMap((route) => [
    scenePort(route.sourcePort, offset),
    scenePort(route.targetPort, offset),
  ]);
  const arrowheads = sceneRoutes.map(sceneArrowhead);
  const maxX = Math.max(
    layout.width,
    ...layout.nodes.map((node) => node.x + node.width),
  );
  const maxY = Math.max(
    layout.height,
    ...layout.nodes.map((node) => node.y + node.height),
  );

  return {
    id: `scene:${diagram.view.id}`,
    width: Math.ceil(maxX + padding * 2),
    height: Math.ceil(maxY + padding * 2 + titleHeight + legendHeight),
    title: diagram.view.title,
    description: diagram.view.purpose,
    scope: diagram.view.scope,
    viewKind: diagram.view.kind,
    fontFamily: options.fontFamily ?? "IBM Plex Sans",
    theme: resolveSceneTheme(
      options.theme ?? diagram.view.presentation?.theme,
    ),
    shapes: [...diagram.shapes.values()].sort((left, right) =>
      compareText(left.id, right.id),
    ),
    nodes: stableSceneNodes(nodes),
    ports: [...ports].sort((left, right) => compareText(left.id, right.id)),
    routes: [...sceneRoutes].sort((left, right) => compareText(left.id, right.id)),
    arrowheads: [...arrowheads].sort((left, right) =>
      compareText(left.id, right.id),
    ),
    legend: [...legend],
  };
}

function sceneNode(
  node: DiagramNode,
  layout: LayoutNodeResult,
  offset: Point,
): SceneNode {
  return {
    id: `scene-node:${node.id}`,
    referenceId: node.referenceId,
    kind: node.kind,
    ...(node.elementRole === undefined ? {} : { elementRole: node.elementRole }),
    ...(node.shapeId === undefined ? {} : { shapeId: node.shapeId }),
    x: layout.x + offset.x,
    y: layout.y + offset.y,
    width: layout.width,
    height: layout.height,
    title: { lines: wrapText(node.title, 30, 2) },
    typeLabel: node.typeLabel,
    description: {
      lines: wrapText(
        node.description,
        node.kind === "element" || node.kind === "infrastructure-node" ? 38 : 54,
        node.kind === "element" || node.kind === "infrastructure-node" ? 3 : 2,
      ),
    },
    ...(node.technology === undefined ? {} : { technology: node.technology }),
    external: node.external ?? false,
    ...(node.parentId === undefined
      ? {}
      : { parentId: `scene-node:${node.parentId}` }),
    ...(node.sourceId === undefined ? {} : { sourceId: node.sourceId }),
  };
}

function sceneRoute(route: EffectiveRoute, offset: Point): SceneRoute {
  return {
    id: `scene-route:${route.edgeId}`,
    relationshipId: route.relationshipId,
    sourceNodeId: `scene-node:${route.sourceNodeId}`,
    targetNodeId: `scene-node:${route.targetNodeId}`,
    sourcePortId: `scene-port:${route.sourcePort.id}`,
    targetPortId: `scene-port:${route.targetPort.id}`,
    policy: route.policy,
    style: route.style,
    points: route.points.map((point) => ({
      x: point.x + offset.x,
      y: point.y + offset.y,
    })),
    label: route.label,
    ...(route.technology === undefined ? {} : { technology: route.technology }),
    labelPoint: {
      x: route.labelPoint.x + offset.x,
      y: route.labelPoint.y + offset.y,
    },
    labelSegment: route.labelSegment,
    ...(route.corridor === undefined
      ? {}
      : { corridor: sceneCorridor(route.corridor, offset) }),
  };
}

function sceneCorridor(
  corridor: EffectiveCorridor,
  offset: Point,
): EffectiveCorridor {
  const sceneOffset =
    corridor.orientation === "vertical" ? offset.x : offset.y;
  return {
    ...corridor,
    coordinate: corridor.coordinate + sceneOffset,
    laneCoordinate: corridor.laneCoordinate + sceneOffset,
  };
}

function scenePort(
  port: EffectiveRoute["sourcePort"],
  offset: Point,
): ScenePort {
  return {
    id: `scene-port:${port.id}`,
    relationshipId: port.relationshipId,
    role: port.role,
    nodeId: `scene-node:${port.nodeId}`,
    side: port.side,
    point: { x: port.point.x + offset.x, y: port.point.y + offset.y },
  };
}

function sceneArrowhead(route: SceneRoute): SceneArrowhead {
  return {
    id: `${route.id}:arrowhead`,
    relationshipId: route.relationshipId,
    routeId: route.id,
    policy: route.policy,
    points: arrowheadPoints(route.points),
  };
}

function arrowheadPoints(points: readonly Point[]): readonly Point[] {
  const end = points.at(-1);
  if (end === undefined) {
    throw new ContractError("C4ML-SCENE-003", "Route has no arrow endpoint.");
  }
  const previous = [...points]
    .reverse()
    .find((point) => point.x !== end.x || point.y !== end.y);
  if (previous === undefined) {
    throw new ContractError(
      "C4ML-SCENE-003",
      "Route has no visible terminal segment for its arrowhead.",
    );
  }
  const dx = end.x - previous.x;
  const dy = end.y - previous.y;
  const length = Math.hypot(dx, dy);
  const direction = { x: dx / length, y: dy / length };
  const perpendicular = { x: -direction.y, y: direction.x };
  const tipOverlap = 2;
  const baseDistance = 10;
  const halfWidth = 5;
  const tip = {
    x: end.x + direction.x * tipOverlap,
    y: end.y + direction.y * tipOverlap,
  };
  const base = {
    x: end.x - direction.x * baseDistance,
    y: end.y - direction.y * baseDistance,
  };
  return [
    tip,
    {
      x: base.x + perpendicular.x * halfWidth,
      y: base.y + perpendicular.y * halfWidth,
    },
    {
      x: base.x - perpendicular.x * halfWidth,
      y: base.y - perpendicular.y * halfWidth,
    },
  ];
}

function requiredLayoutNode(
  nodeById: ReadonlyMap<string, LayoutNodeResult>,
  id: string,
): LayoutNodeResult {
  const node = nodeById.get(id);
  if (node === undefined) {
    throw new ContractError(
      "C4ML-SCENE-002",
      `Layout result is missing diagram node ${id}.`,
    );
  }
  return node;
}

function stableSceneNodes(nodes: readonly SceneNode[]): SceneNode[] {
  const rank: Readonly<Record<DiagramNodeKind, number>> = {
    "scope-boundary": 0,
    "deployment-node": 1,
    "visual-group": 2,
    "infrastructure-node": 3,
    element: 4,
  };
  return [...nodes].sort(
    (left, right) => rank[left.kind] - rank[right.kind] || compareText(left.id, right.id),
  );
}

function wrapText(
  text: string,
  maximumCharacters: number,
  maximumLines: number,
): string[] {
  const words = text.trim().split(/\s+/u).filter(Boolean);
  if (words.length === 0) {
    return [];
  }
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current.length === 0 ? word : `${current} ${word}`;
    if (candidate.length <= maximumCharacters || current.length === 0) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maximumLines - 1) {
      break;
    }
  }
  if (lines.length < maximumLines && current.length > 0) {
    const consumed = lines.join(" ").split(/\s+/u).filter(Boolean).length;
    const remaining = words.slice(consumed).join(" ");
    lines.push(
      remaining.length <= maximumCharacters
        ? remaining
        : `${remaining.slice(0, Math.max(1, maximumCharacters - 1)).trimEnd()}…`,
    );
  }
  return lines.slice(0, maximumLines);
}
