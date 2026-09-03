import {
  applyProjectSourceChangeSet,
  createProposedProjectSourceChangeSet,
  type ArchitectureProjectInput,
  type ProposedProjectSourceChangeSet,
  type SourceChangeIntent,
} from "@c4ml/compiler-core";
import { URI } from "langium";

import type {
  C4mlDocument,
  LayoutBlock,
  PointLiteral,
  RouteAnchorLiteral,
  RouteDeclaration,
  RouteGuideItem,
  RouteGuideProperty,
  RouteProperty,
  ViewDeclaration,
} from "./generated/ast.js";
import { createC4mlDraftServices } from "./services.js";

export type C4mlRoutePortSelection =
  | "automatic"
  | "east"
  | "north"
  | "south"
  | "west";

export type C4mlRouteEditOperation =
  | {
      readonly kind: "ports";
      readonly relationshipId: string;
      readonly sourcePort: C4mlRoutePortSelection;
      readonly targetPort: C4mlRoutePortSelection;
    }
  | {
      readonly kind: "add-waypoint";
      readonly relationshipId: string;
      readonly point: { readonly x: number; readonly y: number };
    }
  | {
      readonly kind: "move-waypoint";
      readonly relationshipId: string;
      readonly waypointIndex: number;
      readonly delta: { readonly x: number; readonly y: number };
    }
  | {
      readonly kind: "label-offset";
      readonly relationshipId: string;
      readonly offset: { readonly x: number; readonly y: number };
    }
  | {
      readonly kind: "remove-waypoint";
      readonly relationshipId: string;
      readonly waypointIndex: number;
    }
  | {
      readonly kind: "clear-guidance";
      readonly relationshipId: string;
    };

export interface C4mlRouteEditRequest {
  readonly id: string;
  readonly viewId: string;
  readonly intent: SourceChangeIntent;
  readonly operation: C4mlRouteEditOperation;
}

export type C4mlRouteAuthoringIssueCode =
  | "C4ML-AUTHORING-101"
  | "C4ML-AUTHORING-102"
  | "C4ML-AUTHORING-103"
  | "C4ML-AUTHORING-104";

export interface C4mlRouteAuthoringIssue {
  readonly code: C4mlRouteAuthoringIssueCode;
  readonly message: string;
}

export type C4mlRouteRepairCode =
  | "C4ML-ROUTE-REPAIR-001"
  | "C4ML-ROUTE-REPAIR-002"
  | "C4ML-ROUTE-REPAIR-003"
  | "C4ML-ROUTE-REPAIR-004";

export interface C4mlRouteRepair {
  readonly code: C4mlRouteRepairCode;
  readonly message: string;
}

export type C4mlRouteEditProposal =
  | {
      readonly valid: true;
      readonly changeSet: ProposedProjectSourceChangeSet;
      readonly documentUri: string;
      readonly proposedText: string;
      readonly repairs: readonly C4mlRouteRepair[];
      readonly issues: readonly [];
    }
  | {
      readonly valid: false;
      readonly repairs: readonly [];
      readonly issues: readonly C4mlRouteAuthoringIssue[];
    };

interface ParsedProjectDocument {
  readonly uri: string;
  readonly source: string;
  readonly ast: C4mlDocument;
}

type RoutePropertyKey =
  | "avoid"
  | "corridor"
  | "guide"
  | "label-offset-x"
  | "label-offset-y"
  | "label-segment"
  | "lane"
  | "points"
  | "policy"
  | "source-port"
  | "style"
  | "target-port"
  | "via";

interface RouteMutation {
  readonly propertyChanges: ReadonlyMap<RoutePropertyKey, string | undefined>;
  readonly repairs: readonly C4mlRouteRepair[];
}

interface TextEdit {
  readonly startOffset: number;
  readonly endOffset: number;
  readonly text: string;
}

export async function proposeC4mlRouteEdit(
  project: ArchitectureProjectInput,
  request: C4mlRouteEditRequest,
): Promise<C4mlRouteEditProposal> {
  const documents = await parseProject(project);
  if (documents === undefined) {
    return invalid(
      "C4ML-AUTHORING-101",
      "Syntax-aware route changes require a valid C4ML project.",
    );
  }

  const owners = documents.flatMap((document) =>
    document.ast.views
      .filter(({ name }) => name === request.viewId)
      .map((view) => ({ document, view })),
  );
  const owner = owners[0];
  if (owner === undefined || owners.length !== 1) {
    return invalid(
      "C4ML-AUTHORING-102",
      `Exactly one view declaration with stable identifier "${request.viewId}" is required.`,
    );
  }

  const relationshipIds = new Set(
    documents.flatMap(({ ast }) =>
      (ast.relations?.relationships ?? []).map(({ name }) => name),
    ),
  );
  const operationIssue = validateOperation(request.operation, relationshipIds);
  if (operationIssue !== undefined) {
    return invalid("C4ML-AUTHORING-103", operationIssue);
  }

  const route = owner.view.layout?.routes.find(
    ({ relationship }) =>
      relationship.$refText === request.operation.relationshipId,
  );
  const result = createRouteTextEdits(
    owner.document.source,
    owner.view,
    route,
    request.operation,
  );
  if (result === undefined) {
    return invalid(
      "C4ML-AUTHORING-104",
      `Route "${request.operation.relationshipId}" has no safe source edit for this operation.`,
    );
  }

  const changeSet = createProposedProjectSourceChangeSet(project, {
    id: request.id,
    intent: request.intent,
    affectedIds: [request.operation.relationshipId],
    edits: result.edits.map((edit) => ({
      documentUri: owner.document.uri,
      ...edit,
    })),
  });
  const application = applyProjectSourceChangeSet(project, changeSet);
  if (!application.valid) {
    return invalid(
      "C4ML-AUTHORING-104",
      "The proposed route source changes could not be applied atomically.",
    );
  }
  const changedSource = application.project.documents.find(
    ({ uri }) => uri === owner.document.uri,
  )?.text;
  if (changedSource === undefined) {
    return invalid(
      "C4ML-AUTHORING-104",
      "The route-owning source document is no longer available.",
    );
  }

  return {
    valid: true,
    changeSet,
    documentUri: owner.document.uri,
    proposedText:
      routeSnippet(changedSource, request.operation.relationshipId) ??
      `// ${request.operation.relationshipId} now uses automatic routing.`,
    repairs: result.repairs,
    issues: [],
  };
}

async function parseProject(
  project: ArchitectureProjectInput,
): Promise<readonly ParsedProjectDocument[] | undefined> {
  const services = createC4mlDraftServices();
  const documents = project.documents.map((sourceDocument) => {
    const document = services.shared.workspace.LangiumDocumentFactory.fromString(
      sourceDocument.text,
      URI.from({ scheme: "c4ml-route-authoring", path: `/${sourceDocument.uri}` }),
    );
    services.shared.workspace.LangiumDocuments.addDocument(document);
    return { sourceDocument, document };
  });
  await services.shared.workspace.DocumentBuilder.build(
    documents.map(({ document }) => document),
    { validation: true },
  );
  if (
    documents.some(({ document }) =>
      (document.diagnostics ?? []).some(({ severity }) => severity === 1),
    )
  ) {
    return undefined;
  }
  return documents.map(({ sourceDocument, document }) => ({
    uri: sourceDocument.uri,
    source: sourceDocument.text,
    ast: document.parseResult.value as C4mlDocument,
  }));
}

function validateOperation(
  operation: C4mlRouteEditOperation,
  relationshipIds: ReadonlySet<string>,
): string | undefined {
  if (!relationshipIds.has(operation.relationshipId)) {
    return `Route operation references unknown Relationship "${operation.relationshipId}".`;
  }
  if (operation.kind === "add-waypoint") {
    return validPoint(operation.point)
      ? undefined
      : "A new route waypoint requires finite integer diagram coordinates.";
  }
  if (operation.kind === "move-waypoint") {
    if (!Number.isSafeInteger(operation.waypointIndex) || operation.waypointIndex < 0) {
      return "A moved route waypoint requires a non-negative index.";
    }
    if (!validPoint(operation.delta) || (operation.delta.x === 0 && operation.delta.y === 0)) {
      return "A moved route waypoint requires a non-zero integer diagram-unit delta.";
    }
  }
  if (operation.kind === "label-offset") {
    return validPoint(operation.offset)
      ? undefined
      : "A relationship-label offset requires finite integer diagram-unit values.";
  }
  if (
    operation.kind === "remove-waypoint" &&
    (!Number.isSafeInteger(operation.waypointIndex) || operation.waypointIndex < 0)
  ) {
    return "A removed route waypoint requires a non-negative index.";
  }
  return undefined;
}

function createRouteTextEdits(
  source: string,
  view: ViewDeclaration,
  route: RouteDeclaration | undefined,
  operation: C4mlRouteEditOperation,
): { readonly edits: readonly TextEdit[]; readonly repairs: readonly C4mlRouteRepair[] } | undefined {
  if (route === undefined) {
    const declaration = newRouteDeclaration(operation);
    if (declaration === undefined) return undefined;
    const edit = insertRouteDeclaration(source, view, declaration);
    return edit === undefined
      ? undefined
      : {
          edits: [edit],
          repairs: operation.kind === "label-offset" ||
              (operation.kind === "ports" && operation.sourcePort === "automatic" && operation.targetPort === "automatic")
            ? []
            : [
                {
                  code: "C4ML-ROUTE-REPAIR-001",
                  message: "C4ML adds guided policy because the operation introduces explicit route intent.",
                },
              ],
        };
  }

  const mutation = routeMutation(route, operation);
  if (mutation === undefined) return undefined;
  const edits = routeMutationEdits(source, route, mutation.propertyChanges);
  if (edits === undefined || edits.length === 0) return undefined;
  return { edits, repairs: mutation.repairs };
}

function routeMutation(
  route: RouteDeclaration,
  operation: C4mlRouteEditOperation,
): RouteMutation | undefined {
  const changes = new Map<RoutePropertyKey, string | undefined>();
  const repairs: C4mlRouteRepair[] = [];
  const properties = propertyMap(route);

  switch (operation.kind) {
    case "ports": {
      changes.set(
        "source-port",
        operation.sourcePort === "automatic"
          ? undefined
          : `source-port = ${operation.sourcePort}`,
      );
      changes.set(
        "target-port",
        operation.targetPort === "automatic"
          ? undefined
          : `target-port = ${operation.targetPort}`,
      );
      if (propertyValue(properties.get("policy")) === "fixed") {
        removeIncompatibleGuidance(changes, properties, repairs);
      }
      break;
    }
    case "add-waypoint": {
      removeIncompatibleGuidance(changes, properties, repairs);
      const guide = properties.get("guide") as RouteGuideProperty | undefined;
      const items = guide === undefined ? [] : guide.items.map(renderGuideItem);
      items.push(`via canvas at ${renderPoint(operation.point)}`);
      changes.set("guide", renderGuide(items));
      break;
    }
    case "move-waypoint": {
      const guide = properties.get("guide") as RouteGuideProperty | undefined;
      if (guide === undefined) return undefined;
      const waypoints = guide.items.filter(({ $type }) => $type === "RouteWaypointGuide");
      const selected = waypoints[operation.waypointIndex];
      if (selected === undefined || selected.$type !== "RouteWaypointGuide") return undefined;
      const movedAnchor = moveAnchor(selected.anchor, operation.delta);
      if (movedAnchor === undefined) return undefined;
      let waypointIndex = 0;
      changes.set(
        "guide",
        renderGuide(
          guide.items.map((item) => {
            if (item.$type !== "RouteWaypointGuide") return renderGuideItem(item);
            const rendered = waypointIndex === operation.waypointIndex
              ? `via ${movedAnchor}`
              : renderGuideItem(item);
            waypointIndex += 1;
            return rendered;
          }),
        ),
      );
      break;
    }
    case "label-offset":
      changes.set(
        "label-offset-x",
        operation.offset.x === 0
          ? undefined
          : `label-offset-x = ${operation.offset.x}du`,
      );
      changes.set(
        "label-offset-y",
        operation.offset.y === 0
          ? undefined
          : `label-offset-y = ${operation.offset.y}du`,
      );
      break;
    case "remove-waypoint": {
      const guide = properties.get("guide") as RouteGuideProperty | undefined;
      if (guide === undefined) return undefined;
      let waypointIndex = 0;
      let removed = false;
      const remaining = guide.items.flatMap((item) => {
        if (item.$type !== "RouteWaypointGuide") return [renderGuideItem(item)];
        const remove = waypointIndex === operation.waypointIndex;
        waypointIndex += 1;
        if (remove) {
          removed = true;
          return [];
        }
        return [renderGuideItem(item)];
      });
      if (!removed) return undefined;
      changes.set("guide", remaining.length === 0 ? undefined : renderGuide(remaining));
      break;
    }
    case "clear-guidance":
      for (const key of ["avoid", "corridor", "guide", "lane", "points", "via"] as const) {
        if (properties.has(key)) changes.set(key, undefined);
      }
      break;
  }

  const futureKeys = new Set<RoutePropertyKey>(properties.keys());
  for (const [key, value] of changes) {
    if (value === undefined) futureKeys.delete(key);
    else futureKeys.add(key);
  }
  const manualKeys: readonly RoutePropertyKey[] = [
    "avoid",
    "corridor",
    "guide",
    "lane",
    "points",
    "source-port",
    "target-port",
    "via",
  ];
  const existingPolicy = propertyValue(properties.get("policy"));
  const desiredPolicy = operation.kind === "label-offset"
    ? existingPolicy ?? "automatic"
    : manualKeys.some((key) => futureKeys.has(key))
      ? "guided"
      : "automatic";
  if (existingPolicy !== desiredPolicy) {
    changes.set("policy", `policy = ${desiredPolicy}`);
    repairs.push({
      code: "C4ML-ROUTE-REPAIR-001",
      message:
        desiredPolicy === "guided"
          ? "C4ML changes the route to guided policy so the selected controls are authoritative."
          : "C4ML restores automatic policy because no explicit path guidance remains.",
    });
  }

  const finalKeys = new Set<RoutePropertyKey>(futureKeys);
  finalKeys.add("policy");
  if (
    desiredPolicy === "automatic" &&
    [...finalKeys].every((key) => key === "policy")
  ) {
    changes.clear();
    for (const key of properties.keys()) changes.set(key, undefined);
    repairs.push({
      code: "C4ML-ROUTE-REPAIR-004",
      message: "C4ML removes the now-empty route block; automatic routing needs no source control.",
    });
  }
  return { propertyChanges: changes, repairs };
}

function removeIncompatibleGuidance(
  changes: Map<RoutePropertyKey, string | undefined>,
  properties: ReadonlyMap<RoutePropertyKey, RouteProperty>,
  repairs: C4mlRouteRepair[],
): void {
  if (properties.has("points")) {
    changes.set("points", undefined);
    repairs.push({
      code: "C4ML-ROUTE-REPAIR-002",
      message: "C4ML removes the complete fixed point list before applying guided route intent.",
    });
  }
  if (properties.has("via")) {
    changes.set("via", undefined);
    repairs.push({
      code: "C4ML-ROUTE-REPAIR-002",
      message: "C4ML removes the older absolute waypoint list before applying ordered guidance.",
    });
  }
  if (properties.has("corridor") || properties.has("lane")) {
    changes.set("corridor", undefined);
    changes.set("lane", undefined);
    repairs.push({
      code: "C4ML-ROUTE-REPAIR-003",
      message: "C4ML releases the corridor lane because ordered waypoint guidance cannot share it.",
    });
  }
}

function routeMutationEdits(
  source: string,
  route: RouteDeclaration,
  changes: ReadonlyMap<RoutePropertyKey, string | undefined>,
): readonly TextEdit[] | undefined {
  const properties = propertyMap(route);
  const remainingKeys = new Set(properties.keys());
  for (const [key, value] of changes) {
    if (value === undefined) remainingKeys.delete(key);
    else remainingKeys.add(key);
  }
  if (remainingKeys.size === 0) {
    const range = nodeLineRange(source, route.$cstNode);
    return range === undefined ? undefined : [{ ...range, text: "" }];
  }

  const edits: TextEdit[] = [];
  const insertions: { readonly key: RoutePropertyKey; readonly text: string }[] = [];
  for (const [key, text] of changes) {
    const property = properties.get(key);
    if (property?.$cstNode !== undefined) {
      edits.push({
        startOffset: property.$cstNode.offset,
        endOffset: property.$cstNode.end,
        text: text ?? "",
      });
    } else if (text !== undefined) {
      insertions.push({ key, text });
    }
  }
  if (insertions.length > 0) {
    const routeNode = route.$cstNode;
    if (routeNode === undefined) return undefined;
    const closeOffset = routeNode.offset + routeNode.text.lastIndexOf("}");
    if (closeOffset < routeNode.offset) return undefined;
    const indent = `${lineIndentAt(source, routeNode.offset)}  `;
    const ordered = insertions
      .sort((left, right) => propertyRank(left.key) - propertyRank(right.key))
      .map(({ text }) => indentBlock(text, indent))
      .join("\n");
    edits.push({
      startOffset: closeOffset,
      endOffset: closeOffset,
      text: `\n${ordered}\n${lineIndentAt(source, routeNode.offset)}`,
    });
  }
  return edits;
}

function newRouteDeclaration(operation: C4mlRouteEditOperation): string | undefined {
  switch (operation.kind) {
    case "ports":
      if (operation.sourcePort === "automatic" && operation.targetPort === "automatic") {
        return undefined;
      }
      return [
        `route ${operation.relationshipId} {`,
        "  policy = guided",
        ...(operation.sourcePort === "automatic" ? [] : [`  source-port = ${operation.sourcePort}`]),
        ...(operation.targetPort === "automatic" ? [] : [`  target-port = ${operation.targetPort}`]),
        "}",
      ].join("\n");
    case "add-waypoint":
      return [
        `route ${operation.relationshipId} {`,
        "  policy = guided",
        "  style = orthogonal",
        `  ${renderGuide([`via canvas at ${renderPoint(operation.point)}`])}`,
        "}",
      ].join("\n");
    case "label-offset":
      if (operation.offset.x === 0 && operation.offset.y === 0) return undefined;
      return [
        `route ${operation.relationshipId} {`,
        "  policy = automatic",
        ...(operation.offset.x === 0
          ? []
          : [`  label-offset-x = ${operation.offset.x}du`]),
        ...(operation.offset.y === 0
          ? []
          : [`  label-offset-y = ${operation.offset.y}du`]),
        "}",
      ].join("\n");
    case "clear-guidance":
    case "move-waypoint":
    case "remove-waypoint":
      return undefined;
  }
}

function insertRouteDeclaration(
  source: string,
  view: ViewDeclaration,
  declaration: string,
): TextEdit | undefined {
  const layout = view.layout;
  if (layout !== undefined) {
    const node = layout.$cstNode;
    if (node === undefined) return undefined;
    const closeOffset = node.offset + node.text.lastIndexOf("}");
    if (closeOffset < node.offset) return undefined;
    const layoutIndent = lineIndentAt(source, node.offset);
    return {
      startOffset: closeOffset,
      endOffset: closeOffset,
      text: `\n${indentBlock(declaration, `${layoutIndent}  `)}\n${layoutIndent}`,
    };
  }
  const viewNode = view.$cstNode;
  if (viewNode === undefined) return undefined;
  const closeOffset = viewNode.offset + viewNode.text.lastIndexOf("}");
  if (closeOffset < viewNode.offset) return undefined;
  const viewIndent = lineIndentAt(source, viewNode.offset);
  return {
    startOffset: closeOffset,
    endOffset: closeOffset,
    text: `\n\n${viewIndent}  layout {\n${indentBlock(declaration, `${viewIndent}    `)}\n${viewIndent}  }\n${viewIndent}`,
  };
}

function propertyMap(route: RouteDeclaration): Map<RoutePropertyKey, RouteProperty> {
  return new Map(
    route.properties.flatMap((property) => {
      const key = propertyKey(property);
      return key === undefined ? [] : [[key, property] as const];
    }),
  );
}

function propertyKey(property: RouteProperty): RoutePropertyKey | undefined {
  switch (property.$type) {
    case "RouteAvoidProperty": return "avoid";
    case "RouteCorridorSelectionProperty": return "corridor";
    case "RouteGuideProperty": return "guide";
    case "RouteLabelOffsetXProperty": return "label-offset-x";
    case "RouteLabelOffsetYProperty": return "label-offset-y";
    case "RouteLabelSegmentProperty": return "label-segment";
    case "RouteLaneProperty": return "lane";
    case "RoutePointsProperty": return "points";
    case "RoutePolicyProperty": return "policy";
    case "RouteSourcePortProperty": return "source-port";
    case "RouteStyleProperty": return "style";
    case "RouteTargetPortProperty": return "target-port";
    case "RouteViaProperty": return "via";
  }
}

function propertyRank(key: RoutePropertyKey): number {
  return [
    "policy", "style", "source-port", "target-port", "via", "guide", "avoid",
    "corridor", "lane", "points", "label-segment", "label-offset-x",
    "label-offset-y",
  ].indexOf(key);
}

function propertyValue(property: RouteProperty | undefined): string | undefined {
  return property !== undefined && "value" in property && typeof property.value === "string"
    ? property.value
    : undefined;
}

function renderGuide(items: readonly string[]): string {
  return items.length === 1
    ? `guide = [${items[0]}]`
    : `guide = [\n${items.map((item) => `  ${item}`).join(",\n")}\n]`;
}

function renderGuideItem(item: RouteGuideItem): string {
  return item.$type === "RouteWaypointGuide"
    ? `via ${renderAnchor(item.anchor)}`
    : `lock ${renderAnchor(item.start)} to ${renderAnchor(item.end)}`;
}

function renderAnchor(anchor: RouteAnchorLiteral): string {
  switch (anchor.$type) {
    case "RoutePortAnchor":
      return `${anchor.kind}${anchor.offset === undefined ? "" : ` shift ${renderAstPoint(anchor.offset)}`}`;
    case "RouteElementAnchor":
      return `element ${anchor.element.$refText} ${anchor.side}${anchor.offset === undefined ? "" : ` shift ${renderAstPoint(anchor.offset)}`}`;
    case "RouteCanvasAnchor":
      return `canvas at ${renderAstPoint(anchor.point)}`;
  }
}

function moveAnchor(
  anchor: RouteAnchorLiteral,
  delta: { readonly x: number; readonly y: number },
): string | undefined {
  switch (anchor.$type) {
    case "RoutePortAnchor": {
      const moved = addPoint(astPoint(anchor.offset), delta);
      return moved === undefined ? undefined : `${anchor.kind} shift ${renderPoint(moved)}`;
    }
    case "RouteElementAnchor": {
      const moved = addPoint(astPoint(anchor.offset), delta);
      return moved === undefined
        ? undefined
        : `element ${anchor.element.$refText} ${anchor.side} shift ${renderPoint(moved)}`;
    }
    case "RouteCanvasAnchor": {
      const moved = addPoint(astPoint(anchor.point), delta);
      return moved === undefined ? undefined : `canvas at ${renderPoint(moved)}`;
    }
  }
}

function astPoint(point: PointLiteral | undefined): { readonly x: number; readonly y: number } {
  return point === undefined ? { x: 0, y: 0 } : { x: signed(point.x), y: signed(point.y) };
}

function addPoint(
  point: { readonly x: number; readonly y: number },
  delta: { readonly x: number; readonly y: number },
): { readonly x: number; readonly y: number } | undefined {
  const next = { x: point.x + delta.x, y: point.y + delta.y };
  return validPoint(next) ? next : undefined;
}

function signed(value: { readonly negative: boolean; readonly value: number }): number {
  return value.negative ? -value.value : value.value;
}

function renderAstPoint(point: PointLiteral): string {
  return renderPoint(astPoint(point));
}

function renderPoint(point: { readonly x: number; readonly y: number }): string {
  return `(${point.x}, ${point.y})`;
}

function validPoint(point: { readonly x: number; readonly y: number }): boolean {
  return Number.isSafeInteger(point.x) && Number.isSafeInteger(point.y);
}

function nodeLineRange(
  source: string,
  node: { readonly offset: number; readonly end: number } | undefined,
): { readonly startOffset: number; readonly endOffset: number } | undefined {
  if (node === undefined) return undefined;
  const startOffset = source.lastIndexOf("\n", Math.max(0, node.offset - 1)) + 1;
  const nextLine = source.indexOf("\n", node.end);
  return { startOffset, endOffset: nextLine < 0 ? node.end : nextLine + 1 };
}

function lineIndentAt(source: string, offset: number): string {
  const lineStart = source.lastIndexOf("\n", Math.max(0, offset - 1)) + 1;
  return source.slice(lineStart, offset).match(/^[\t ]*/u)?.[0] ?? "";
}

function indentBlock(text: string, indent: string): string {
  return text.split("\n").map((line) => `${indent}${line}`).join("\n");
}

function routeSnippet(source: string, relationshipId: string): string | undefined {
  const marker = `route ${relationshipId}`;
  const start = source.indexOf(marker);
  if (start < 0) return undefined;
  const open = source.indexOf("{", start + marker.length);
  if (open < 0) return undefined;
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return undefined;
}

function invalid(
  code: C4mlRouteAuthoringIssueCode,
  message: string,
): C4mlRouteEditProposal {
  return { valid: false, repairs: [], issues: [{ code, message }] };
}
