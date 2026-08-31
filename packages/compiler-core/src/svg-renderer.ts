import { ContractError, type Point } from "./layout.js";
import { comparisonEncoding } from "./comparison-scene.js";
import type {
  DiagramScene,
  SceneArrowhead,
  SceneComparisonMark,
  SceneNode,
  ScenePort,
  SceneRoute,
} from "./scene.js";
import type {
  ShapeDefinition,
  ShapePoint,
  ShapePrimitive,
} from "./shapes.js";
import {
  sceneElementRoles,
  validateSceneTheme,
  type SceneTheme,
} from "./theme.js";

export interface SvgEmbeddedFontFace {
  readonly family: string;
  readonly style: "italic" | "normal";
  readonly weight: number;
  readonly format: "woff2";
  readonly dataUrl: string;
}

export interface SvgRenderOptions {
  readonly embeddedFontFaces?: readonly SvgEmbeddedFontFace[];
}

export function renderDiagramSvg(
  scene: DiagramScene,
  options: SvgRenderOptions = {},
): string {
  validateScene(scene);
  const embeddedFontFaces = options.embeddedFontFaces ?? [];
  validateEmbeddedFontFaces(embeddedFontFaces);
  const boundaries = scene.nodes.filter((node) => node.kind !== "element" && node.kind !== "infrastructure-node");
  const elements = scene.nodes.filter((node) => node.kind === "element" || node.kind === "infrastructure-node");
  const shapeById = new Map(scene.shapes.map((shape) => [shape.id, shape]));

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}" viewBox="0 0 ${scene.width} ${scene.height}" role="img" aria-labelledby="diagram-title diagram-description" font-family="${escapeXml(scene.fontFamily)}" data-c4ml-theme="${escapeXml(scene.theme.id)}"${scene.comparison === undefined ? "" : ` data-c4ml-comparison-mode="${scene.comparison.mode}"`}>`,
    `  <title id="diagram-title">${escapeXml(scene.title)}</title>`,
    `  <desc id="diagram-description">${escapeXml(scene.description)}</desc>`,
    `  <metadata>${escapeXml(JSON.stringify({ generator: "C4ML", sceneId: scene.id, viewKind: scene.viewKind, scope: scene.scope, themeId: scene.theme.id, ...(scene.comparison === undefined ? {} : { comparison: scene.comparison }) }))}</metadata>`,
    renderDefinitions(scene, embeddedFontFaces),
    `  <rect class="canvas" x="0" y="0" width="${scene.width}" height="${scene.height}"/>`,
    `  <g id="diagram-header">`,
    `    <text class="diagram-title" x="40" y="42">${escapeXml(scene.title)}</text>`,
    `    <text class="diagram-subtitle" x="40" y="67">${escapeXml(`${humanize(scene.viewKind)} · ${scene.scope}`)}</text>`,
    `  </g>`,
    `  <g id="diagram-boundaries">`,
    ...boundaries.map((node) => renderBoundary(node)),
    `  </g>`,
    `  <g id="diagram-routes">`,
    ...scene.routes.map(renderRoutePath),
    `  </g>`,
    `  <g id="diagram-elements">`,
    ...elements.map((node) => renderElement(node, requiredShape(node, shapeById))),
    `  </g>`,
    `  <g id="diagram-ports" aria-hidden="true">`,
    ...scene.ports.map(renderPort),
    `  </g>`,
    `  <g id="diagram-route-arrows">`,
    ...scene.arrowheads.map(renderRouteArrow),
    `  </g>`,
    `  <g id="diagram-route-labels">`,
    ...scene.routes.map(renderRouteLabel),
    `  </g>`,
    renderLegend(scene),
    renderComparisonLegend(scene),
    `</svg>`,
    "",
  ].join("\n");
}

function renderDefinitions(
  scene: DiagramScene,
  embeddedFontFaces: readonly SvgEmbeddedFontFace[],
): string {
  const theme = scene.theme;
  validateSceneTheme(theme);
  return `  <defs>
    <style>
${embeddedFontFaces.map(renderEmbeddedFontFace).join("\n")}
      .canvas { fill: ${theme.canvas.background}; }
      .diagram-title { fill: ${theme.canvas.foreground}; font-size: 24px; font-weight: 700; }
      .diagram-subtitle { fill: ${theme.canvas.muted}; font-size: 13px; }
      .boundary-surface { stroke-width: 2; }
      .boundary-scope .boundary-surface { fill: ${theme.boundaries.scope.fill}; stroke: ${theme.boundaries.scope.border}; }
      .boundary-scope .boundary-title { fill: ${theme.boundaries.scope.title}; }
      .boundary-scope .boundary-type { fill: ${theme.boundaries.scope.metadata}; }
      .boundary-group .boundary-surface { fill: ${theme.boundaries.group.fill}; fill-opacity: 0.74; stroke: ${theme.boundaries.group.border}; stroke-dasharray: 9 6; }
      .boundary-group .boundary-title { fill: ${theme.boundaries.group.title}; }
      .boundary-group .boundary-type { fill: ${theme.boundaries.group.metadata}; }
      .boundary-deployment .boundary-surface { fill: ${theme.boundaries.deployment.fill}; stroke: ${theme.boundaries.deployment.border}; }
      .boundary-deployment .boundary-title { fill: ${theme.boundaries.deployment.title}; }
      .boundary-deployment .boundary-type { fill: ${theme.boundaries.deployment.metadata}; }
      .boundary-title { font-size: 14px; font-weight: 700; }
      .boundary-type { font-size: 11px; }
      .element-surface { stroke-width: 2; }
      .element-accent { stroke: none; }
      .element-detail { fill: none; stroke-width: 2; }
      .element-title { font-size: 15px; font-weight: 700; }
      .element-type { font-size: 11px; font-weight: 700; }
      .element-technology { font-size: 11px; font-style: italic; }
      .element-description { font-size: 11px; }
      .element-content-person text { text-anchor: middle; }
      .person-type { font-weight: 400; }
${renderElementThemeStyles(theme)}
      .route { fill: none; stroke: ${theme.routes.guided}; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
      .route-automatic { stroke: ${theme.routes.automatic}; }
      .route-fixed { stroke: ${theme.routes.fixed}; stroke-width: 2.5; }
      .route-arrow { fill: ${theme.routes.guided}; }
      .route-arrow-automatic { fill: ${theme.routes.automatic}; }
      .route-arrow-fixed { fill: ${theme.routes.fixed}; }
      .route-port { display: none; }
      .route-label { fill: ${theme.routes.label}; font-size: 11px; font-weight: 700; text-anchor: middle; }
      .route-technology { fill: ${theme.routes.technology}; font-size: 10px; text-anchor: middle; }
      .legend-title { fill: ${theme.canvas.foreground}; font-size: 12px; font-weight: 700; }
      .legend-text { fill: ${theme.canvas.muted}; font-size: 10px; }
      .legend-swatch { stroke-width: 1.5; }
${renderComparisonStyles(scene)}
    </style>
  </defs>`;
}

function renderComparisonStyles(scene: DiagramScene): string {
  if (scene.comparison === undefined) return "";
  return scene.comparison.encoding.map((entry) => {
    const selector = `.comparison-${entry.state}`;
    const dash = entry.lineStyle === "dashed" ? " stroke-dasharray: 8 5;" : "";
    return [
      `      ${selector}.route { stroke: ${entry.color} !important; stroke-width: 3;${dash} }`,
      `      ${selector}.route-arrow { fill: ${entry.color} !important; }`,
      `      ${selector} .element-surface, ${selector} .boundary-surface { stroke: ${entry.color} !important; stroke-width: 4;${dash} }`,
      `      ${selector} .element-accent { fill: ${entry.color} !important; }`,
      `      ${selector}.comparison-revision-before { opacity: 0.72; }`,
    ].join("\n");
  }).join("\n") + `
      [data-c4ml-comparison-mode="overlay"] .comparison-revision-before > text,
      [data-c4ml-comparison-mode="overlay"] .comparison-revision-before > .element-content,
      [data-c4ml-comparison-mode="overlay"] .comparison-revision-before.route-label-group { display: none; }
      [data-c4ml-comparison-mode="overlay"] .comparison-revision-before .element-surface,
      [data-c4ml-comparison-mode="overlay"] .comparison-revision-before .boundary-surface { fill-opacity: 0.08; stroke-dasharray: 7 5; }
      [data-c4ml-comparison-mode="overlay"] .comparison-revision-before.route { stroke-dasharray: 7 5; }`;
}

function renderEmbeddedFontFace(face: SvgEmbeddedFontFace): string {
  return `      @font-face { font-family: "${face.family}"; src: url("${face.dataUrl}") format("${face.format}"); font-style: ${face.style}; font-weight: ${face.weight}; }`;
}

function renderElementThemeStyles(theme: SceneTheme): string {
  return sceneElementRoles
    .flatMap((role) =>
      (["internal", "external"] as const).map((state) => {
        const colors = theme.elements[role][state];
        const selector = `.element-role-${role}.element-state-${state}`;
        return [
          `      ${selector} .element-surface { fill: ${colors.fill}; stroke: ${colors.border}; }`,
          `      ${selector} .element-accent { fill: ${colors.accent}; }`,
          `      ${selector} .element-detail { stroke: ${colors.metadata}; }`,
          `      ${selector} .element-title { fill: ${colors.title}; }`,
          `      ${selector} .element-type, ${selector} .element-technology { fill: ${colors.metadata}; }`,
          `      ${selector} .element-description { fill: ${colors.description}; }`,
        ].join("\n");
      }),
    )
    .join("\n");
}

function renderBoundary(node: SceneNode): string {
  const cssClass =
    node.kind === "visual-group"
      ? "boundary-group"
      : node.kind === "deployment-node"
        ? "boundary-deployment"
        : "boundary-scope";
  const titleLines = node.title.lines.map(
    (line, index) =>
      `<tspan x="${number(node.x + 14)}" dy="${index === 0 ? 0 : 17}">${escapeXml(line)}</tspan>`,
  );
  return `    <g id="${svgSceneObjectId(node.id)}" class="boundary-node ${cssClass}${comparisonClass(node.comparison)}" data-c4ml-id="${escapeXml(node.referenceId)}" data-c4ml-kind="${node.kind}"${comparisonAttributes(node.comparison)}${sourceAttribute(node.sourceId)}>
      <rect class="boundary-surface"${comparisonPaintStyle(node.comparison, "stroke")} x="${number(node.x)}" y="${number(node.y)}" width="${number(node.width)}" height="${number(node.height)}" rx="12"/>
      <text class="boundary-title" x="${number(node.x + 14)}" y="${number(node.y + 24)}">${titleLines.join("")}</text>
      <text class="boundary-type" x="${number(node.x + 14)}" y="${number(node.y + 43)}">${escapeXml(node.typeLabel)}</text>
    </g>`;
}

function renderElement(node: SceneNode, shape: ShapeDefinition): string {
  if (node.elementRole === undefined) {
    throw new ContractError(
      "C4ML-SVG-006",
      `Renderable element ${node.referenceId} has no semantic element role.`,
    );
  }
  const state = node.external ? "external" : "internal";
  if (shape.id === "c4ml-person" && node.elementRole === "person") {
    return renderBuiltInPerson(node, shape, state);
  }
  const content = scaledBox(node, shape.contentBox);
  const textX = content.x;
  const titleStart = content.y + 18;
  const titleLines = tspans(node.title.lines, textX, titleStart, 17);
  const titleHeight = Math.max(1, node.title.lines.length) * 17;
  const typeY = titleStart + titleHeight + 1;
  const technologyY = typeY + 16;
  const descriptionY = technologyY + (node.technology === undefined ? 4 : 18);
  const descriptionLines = tspans(
    node.description.lines,
    textX,
    descriptionY,
    15,
  );
  return `    <g id="${svgSceneObjectId(node.id)}" class="element-node element-role-${node.elementRole} element-state-${state}${comparisonClass(node.comparison)}" data-c4ml-id="${escapeXml(node.referenceId)}" data-c4ml-kind="${node.kind}" data-c4ml-element-role="${node.elementRole}" data-c4ml-element-state="${state}" data-c4ml-shape="${escapeXml(shape.id)}"${comparisonAttributes(node.comparison)}${sourceAttribute(node.sourceId)}>
      <g class="element-shape">${shape.primitives.map((primitive) => renderShapePrimitive(node, shape, primitive)).join("")}</g>
      <text class="element-title">${titleLines}</text>
      <text class="element-type" x="${number(textX)}" y="${number(typeY)}">${escapeXml(node.typeLabel)}</text>
      ${node.technology === undefined ? "" : `<text class="element-technology" x="${number(textX)}" y="${number(technologyY)}">${escapeXml(node.technology)}</text>`}
      <text class="element-description">${descriptionLines}</text>
    </g>`;
}

function renderBuiltInPerson(
  node: SceneNode,
  shape: ShapeDefinition,
  state: "external" | "internal",
): string {
  const content = scaledBox(node, shape.contentBox);
  const textX = content.x + content.width / 2;
  const typeY = node.y + node.height * 0.105;
  const titleStart = node.y + node.height * 0.61;
  const titleLineHeight = 16;
  const titleLines = tspans(
    node.title.lines,
    textX,
    titleStart,
    titleLineHeight,
  );
  const titleHeight = Math.max(0, node.title.lines.length - 1) * titleLineHeight;
  const technologyY = titleStart + titleHeight + 17;
  const descriptionY =
    titleStart + titleHeight + (node.technology === undefined ? 24 : 35);
  const descriptionLines = tspans(
    node.description.lines,
    textX,
    descriptionY,
    14,
  );

  return `    <g id="${svgSceneObjectId(node.id)}" class="element-node element-role-${node.elementRole} element-state-${state}${comparisonClass(node.comparison)}" data-c4ml-id="${escapeXml(node.referenceId)}" data-c4ml-kind="${node.kind}" data-c4ml-element-role="${node.elementRole}" data-c4ml-element-state="${state}" data-c4ml-shape="${escapeXml(shape.id)}"${comparisonAttributes(node.comparison)}${sourceAttribute(node.sourceId)}>
      <g class="element-shape">${shape.primitives.map((primitive) => renderShapePrimitive(node, shape, primitive)).join("")}</g>
      <g class="element-content element-content-person">
        <text class="element-type person-type" x="${number(textX)}" y="${number(typeY)}">${escapeXml(node.typeLabel)}</text>
        <text class="element-title person-title">${titleLines}</text>
        ${node.technology === undefined ? "" : `<text class="element-technology person-technology" x="${number(textX)}" y="${number(technologyY)}">${escapeXml(node.technology)}</text>`}
        <text class="element-description person-description">${descriptionLines}</text>
      </g>
    </g>`;
}

function renderShapePrimitive(
  node: SceneNode,
  shape: ShapeDefinition,
  primitive: ShapePrimitive,
): string {
  const className =
    primitive.paint === "surface"
      ? "element-surface"
      : primitive.paint === "accent"
        ? "element-accent"
        : "element-detail";
  const comparisonStyle = comparisonPaintStyle(
    node.comparison,
    primitive.paint === "accent" ? "fill" : "stroke",
  );
  const presentationStyle = primitivePresentationStyle(primitive);
  const style = mergeStyleAttributes(presentationStyle, comparisonStyle);
  switch (primitive.kind) {
    case "rectangle": {
      const box = scaledBox(node, primitive);
      const radius =
        primitive.cornerRadius === undefined
          ? 0
          : (primitive.cornerRadius / shape.canvas.width) * node.width;
      return `<rect class="${className}"${style} x="${number(box.x)}" y="${number(box.y)}" width="${number(box.width)}" height="${number(box.height)}" rx="${number(radius)}"/>`;
    }
    case "ellipse": {
      const center = scaledPoint(node, shape, {
        x: primitive.centerX,
        y: primitive.centerY,
      });
      return `<ellipse class="${className}"${comparisonStyle} cx="${number(center.x)}" cy="${number(center.y)}" rx="${number((primitive.radiusX / shape.canvas.width) * node.width)}" ry="${number((primitive.radiusY / shape.canvas.height) * node.height)}"/>`;
    }
    case "polygon":
      return `<polygon class="${className}"${comparisonStyle} points="${primitive.points.map((point) => pointAttribute(scaledPoint(node, shape, point))).join(" ")}"/>`;
    case "line": {
      const start = scaledPoint(node, shape, primitive.start);
      const end = scaledPoint(node, shape, primitive.end);
      return `<line class="${className}"${comparisonStyle} x1="${number(start.x)}" y1="${number(start.y)}" x2="${number(end.x)}" y2="${number(end.y)}"/>`;
    }
  }
}

function primitivePresentationStyle(primitive: ShapePrimitive): string {
  if (primitive.kind !== "rectangle") return "";
  const declarations = [
    ...(primitive.color === undefined
      ? []
      : [`${primitive.paint === "detail" ? "stroke" : "fill"}:${primitive.color}`]),
    ...(primitive.opacity === undefined ? [] : [`opacity:${number(primitive.opacity)}`]),
  ];
  return declarations.length === 0 ? "" : ` style="${declarations.join(";")}"`;
}

function mergeStyleAttributes(...attributes: readonly string[]): string {
  const declarations = attributes
    .filter((attribute) => attribute.length > 0)
    .flatMap((attribute) =>
      attribute.replace(/^ style="|"$/gu, "").split(";").filter(Boolean),
    );
  return declarations.length === 0 ? "" : ` style="${declarations.join(";")}"`;
}

function scaledPoint(
  node: SceneNode,
  shape: ShapeDefinition,
  point: ShapePoint,
): Point {
  return {
    x: node.x + (point.x / shape.canvas.width) * node.width,
    y: node.y + (point.y / shape.canvas.height) * node.height,
  };
}

function scaledBox(
  node: SceneNode,
  box: ShapeDefinition["contentBox"],
): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
  return {
    x: node.x + (box.x / 100) * node.width,
    y: node.y + (box.y / 100) * node.height,
    width: (box.width / 100) * node.width,
    height: (box.height / 100) * node.height,
  };
}

function pointAttribute(point: Point): string {
  return `${number(point.x)},${number(point.y)}`;
}

function requiredShape(
  node: SceneNode,
  shapeById: ReadonlyMap<string, ShapeDefinition>,
): ShapeDefinition {
  const shape = node.shapeId === undefined ? undefined : shapeById.get(node.shapeId);
  if (shape === undefined) {
    throw new ContractError(
      "C4ML-SVG-007",
      `Renderable element ${node.referenceId} has no resolved shape.`,
    );
  }
  return shape;
}

function renderRoutePath(route: SceneRoute): string {
  return `    <path id="${svgSceneObjectId(route.id)}" class="route${routePolicyClass(route.policy, "route")}${comparisonClass(route.comparison)}"${comparisonPaintStyle(route.comparison, "stroke")} data-c4ml-id="${escapeXml(route.relationshipId)}" data-c4ml-route-policy="${route.policy}" data-c4ml-route-style="${route.style}" data-c4ml-source-port="${svgSceneObjectId(route.sourcePortId)}" data-c4ml-target-port="${svgSceneObjectId(route.targetPortId)}"${comparisonAttributes(route.comparison)} d="${routePath(route)}"/>`;
}

function renderPort(port: ScenePort): string {
  return `    <circle id="${svgSceneObjectId(port.id)}" class="route-port" data-c4ml-id="${escapeXml(port.relationshipId)}" data-c4ml-port-role="${port.role}" data-c4ml-port-side="${port.side}" data-c4ml-node="${svgSceneObjectId(port.nodeId)}" cx="${number(port.point.x)}" cy="${number(port.point.y)}" r="0"/>`;
}

function renderRouteArrow(arrowhead: SceneArrowhead): string {
  const path = arrowhead.points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${number(point.x)} ${number(point.y)}`,
    )
    .join(" ");
  return `    <path id="${svgSceneObjectId(arrowhead.id)}" class="route-arrow${routePolicyClass(arrowhead.policy, "route-arrow")}${comparisonClass(arrowhead.comparison)}"${comparisonPaintStyle(arrowhead.comparison, "fill")} data-c4ml-id="${escapeXml(arrowhead.relationshipId)}" data-c4ml-route="${svgSceneObjectId(arrowhead.routeId)}"${comparisonAttributes(arrowhead.comparison)} d="${path} Z"/>`;
}

function routePolicyClass(policy: SceneRoute["policy"], prefix: string): string {
  return policy === "automatic"
    ? ` ${prefix}-automatic`
    : policy === "fixed"
      ? ` ${prefix}-fixed`
      : "";
}

function renderRouteLabel(route: SceneRoute): string {
  const labelStartY = route.labelBounds.y + 14;
  const technologyStartY = labelStartY + route.labelLines.length * 13;
  return `    <g id="${svgSceneObjectId(`${route.id}:label`)}" class="route-label-group${comparisonClass(route.comparison)}" data-c4ml-id="${escapeXml(route.relationshipId)}"${comparisonAttributes(route.comparison)}>
      <text class="route-label">${tspans(route.labelLines, route.labelPoint.x, labelStartY, 13)}</text>
      ${route.technologyLines.length === 0 ? "" : `<text class="route-technology">${tspans(route.technologyLines, route.labelPoint.x, technologyStartY, 12)}</text>`}
    </g>`;
}

function renderLegend(scene: DiagramScene): string {
  const y = scene.height - (scene.comparison === undefined ? 42 : 86);
  const entries = scene.legend.slice(0, 6);
  return `  <g id="diagram-legend">
    <text class="legend-title" x="40" y="${y}">Notation</text>
    ${entries
      .map((entry, index) => {
        const x = 112 + index * Math.max(112, (scene.width - 140) / Math.max(entries.length, 1));
        return renderLegendEntry(scene, entry, x, y);
      })
      .join("\n    ")}
  </g>`;
}

function renderComparisonLegend(scene: DiagramScene): string {
  if (scene.comparison === undefined) return "";
  const y = scene.height - 28;
  const spacing = Math.max(122, (scene.width - 152) / scene.comparison.encoding.length);
  return `  <g id="comparison-legend" data-c4ml-comparison-mode="${scene.comparison.mode}">
    <text class="legend-title" x="40" y="${y}">Comparison</text>
    ${scene.comparison.encoding.map((entry, index) => {
      const x = 124 + index * spacing;
      return `<g class="comparison-legend-entry" data-c4ml-comparison-state="${entry.state}">
      <title>${escapeXml(entry.description)}</title>
      <line x1="${number(x)}" y1="${number(y - 4)}" x2="${number(x + 18)}" y2="${number(y - 4)}" stroke="${entry.color}" stroke-width="4"${entry.lineStyle === "dashed" ? ` stroke-dasharray="5 3"` : ""}/>
      <text class="legend-text" x="${number(x + 24)}" y="${y}">${escapeXml(entry.label)}</text>
    </g>`;
    }).join("\n    ")}
  </g>`;
}

function comparisonClass(mark: SceneComparisonMark | undefined): string {
  return mark === undefined
    ? ""
    : ` comparison-${mark.state} comparison-revision-${mark.revision}`;
}

function comparisonAttributes(mark: SceneComparisonMark | undefined): string {
  return mark === undefined
    ? ""
    : ` data-c4ml-comparison-state="${mark.state}" data-c4ml-comparison-revision="${mark.revision}"`;
}

function comparisonPaintStyle(
  mark: SceneComparisonMark | undefined,
  property: "fill" | "stroke",
): string {
  if (mark === undefined || mark.state === "unchanged") return "";
  const color = comparisonEncoding.find(({ state }) => state === mark.state)?.color;
  return color === undefined ? "" : ` style="${property}:${color}"`;
}

function renderLegendEntry(
  scene: DiagramScene,
  entry: DiagramScene["legend"][number],
  x: number,
  y: number,
): string {
  const node = scene.nodes.find(
    (candidate) =>
      candidate.typeLabel === entry.label ||
      (candidate.elementRole !== undefined &&
        humanize(candidate.elementRole) === entry.label) ||
      (candidate.kind === "visual-group" && entry.label === "Visual Group") ||
      (candidate.kind === "deployment-node" && entry.label === "Deployment Node"),
  );
  if (node === undefined) {
    return `<text class="legend-text" x="${number(x)}" y="${y}">${escapeXml(entry.label)}</text>`;
  }

  const nodeClass =
    node.elementRole !== undefined
      ? `element-role-${node.elementRole} element-state-${node.external ? "external" : "internal"}`
      : node.kind === "visual-group"
        ? "boundary-group"
        : node.kind === "deployment-node"
          ? "boundary-deployment"
          : "boundary-scope";
  const surfaceClass =
    node.elementRole === undefined ? "boundary-surface" : "element-surface";
  return `<g class="legend-entry ${nodeClass}" data-c4ml-legend="${escapeXml(entry.label)}">
      <rect class="legend-swatch ${surfaceClass}" x="${number(x)}" y="${number(y - 10)}" width="14" height="10" rx="2"/>
      <text class="legend-text" x="${number(x + 20)}" y="${y}">${escapeXml(entry.label)}</text>
    </g>`;
}

function routePath(route: SceneRoute): string {
  const points = route.points;
  if (points.length < 2) {
    return points
      .map((point) => `M ${number(point.x)} ${number(point.y)}`)
      .join(" ");
  }
  const commands = [`M ${number(points[0]!.x)} ${number(points[0]!.y)}`];
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index]!;
    const end = points[index + 1]!;
    if (index !== route.labelSegment) {
      commands.push(`L ${number(end.x)} ${number(end.y)}`);
      continue;
    }
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);
    if (length <= 16) {
      commands.push(`L ${number(end.x)} ${number(end.y)}`);
      continue;
    }
    const unitX = dx / length;
    const unitY = dy / length;
    const labelCenter =
      (route.labelPoint.x - start.x) * unitX +
      (route.labelPoint.y - start.y) * unitY;
    const clearance =
      Math.abs(unitX) * (route.labelBounds.width / 2) +
      Math.abs(unitY) * (route.labelBounds.height / 2) +
      4;
    const gapStart = Math.max(8, labelCenter - clearance);
    const gapEnd = Math.min(length - 8, labelCenter + clearance);
    if (gapStart >= gapEnd) {
      commands.push(`L ${number(end.x)} ${number(end.y)}`);
      continue;
    }
    commands.push(
      `L ${number(start.x + unitX * gapStart)} ${number(start.y + unitY * gapStart)}`,
      `M ${number(start.x + unitX * gapEnd)} ${number(start.y + unitY * gapEnd)}`,
      `L ${number(end.x)} ${number(end.y)}`,
    );
  }
  return commands.join(" ");
}

function tspans(
  lines: readonly string[],
  x: number,
  firstY: number,
  lineHeight: number,
): string {
  return lines
    .map(
      (line, index) =>
        `<tspan x="${number(x)}" y="${number(firstY + index * lineHeight)}">${escapeXml(line)}</tspan>`,
    )
    .join(" ");
}

export function svgSceneObjectId(id: string): string {
  return `c4ml-${id.replace(/[^a-z0-9_-]+/giu, "-").replace(/^-+|-+$/gu, "")}`;
}

function sourceAttribute(sourceId: string | undefined): string {
  return sourceId === undefined ? "" : ` data-c4ml-source="${escapeXml(sourceId)}"`;
}

function number(value: number): string {
  if (!Number.isFinite(value)) {
    throw new ContractError("C4ML-SVG-002", "Scene contains non-finite geometry.");
  }
  return value.toFixed(2).replace(/\.00$/u, "").replace(/(\.\d)0$/u, "$1");
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function humanize(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function validateScene(scene: DiagramScene): void {
  if (
    !Number.isFinite(scene.width) ||
    !Number.isFinite(scene.height) ||
    scene.width <= 0 ||
    scene.height <= 0
  ) {
    throw new ContractError("C4ML-SVG-003", "Scene canvas dimensions are invalid.");
  }
  const ids = new Set<string>();
  for (const item of [
    ...scene.nodes,
    ...scene.ports,
    ...scene.routes,
    ...scene.arrowheads,
  ]) {
    const id = svgSceneObjectId(item.id);
    if (ids.has(id)) {
      throw new ContractError("C4ML-SVG-004", `Duplicate SVG identifier ${id}.`);
    }
    ids.add(id);
  }
  const shapeIds = new Set(scene.shapes.map((shape) => shape.id));
  for (const node of scene.nodes) {
    if (
      (node.kind === "element" || node.kind === "infrastructure-node") &&
      (node.shapeId === undefined || !shapeIds.has(node.shapeId))
    ) {
      throw new ContractError(
        "C4ML-SVG-007",
        `Renderable element ${node.referenceId} has no resolved shape.`,
      );
    }
  }
  const portIds = new Set(scene.ports.map((port) => port.id));
  for (const route of scene.routes) {
    if (!portIds.has(route.sourcePortId) || !portIds.has(route.targetPortId)) {
      throw new ContractError(
        "C4ML-SVG-008",
        `Route ${route.relationshipId} references an unknown scene port.`,
      );
    }
    if (
      !Number.isFinite(route.labelBounds.x) ||
      !Number.isFinite(route.labelBounds.y) ||
      !Number.isFinite(route.labelBounds.width) ||
      !Number.isFinite(route.labelBounds.height) ||
      route.labelBounds.width <= 0 ||
      route.labelBounds.height <= 0
    ) {
      throw new ContractError(
        "C4ML-SVG-011",
        `Route ${route.relationshipId} has invalid label bounds.`,
      );
    }
  }
}

function validateEmbeddedFontFaces(
  faces: readonly SvgEmbeddedFontFace[],
): void {
  const identities = new Set<string>();
  for (const face of faces) {
    if (
      !/^[A-Za-z0-9 _-]+$/u.test(face.family) ||
      (face.style !== "italic" && face.style !== "normal") ||
      !Number.isSafeInteger(face.weight) ||
      face.weight < 1 ||
      face.weight > 1000 ||
      face.format !== "woff2" ||
      !/^data:font\/woff2;base64,[A-Za-z0-9+/]+={0,2}$/u.test(face.dataUrl)
    ) {
      throw new ContractError(
        "C4ML-SVG-009",
        "Embedded SVG font faces must use validated WOFF2 data URLs and finite CSS metadata.",
      );
    }
    const identity = `${face.family}\u0000${face.style}\u0000${face.weight}`;
    if (identities.has(identity)) {
      throw new ContractError(
        "C4ML-SVG-010",
        `Duplicate embedded SVG font face ${face.family} ${face.style} ${face.weight}.`,
      );
    }
    identities.add(identity);
  }
}
