import {
  AstUtils,
  URI,
  type AstNode,
  type LangiumDocument,
} from "langium";

import type { SourceRange } from "@c4ml/compiler-core";

import type {
  C4mlDocument,
  DeploymentNodeDeclaration,
  DeploymentRelationshipDeclaration,
  ElementDeclaration,
  EnvironmentDeclaration,
  InfrastructureNodeDeclaration,
  InteractionDeclaration,
  LayoutBlock,
  RelationshipDeclaration,
  RouteCorridorDeclaration,
  RouteDeclaration,
  RoutePolicyProperty,
  ViewDeclaration,
} from "./generated/ast.js";
import {
  isElementDeclaration,
  isDeploymentNodeDeclaration,
  isDeploymentRelationshipDeclaration,
  isEnvironmentDeclaration,
  isInfrastructureNodeDeclaration,
  isInteractionDeclaration,
  isLayoutBlock,
  isRelationshipDeclaration,
  isRouteCorridorDeclaration,
  isRouteDeclaration,
  isViewDeclaration,
} from "./generated/ast.js";
import { c4mlDraftLanguageVersion } from "./language.js";
import { createC4mlDraftLanguageServices } from "./services.js";

export type C4mlCompletionKind =
  | "keyword"
  | "property"
  | "reference"
  | "value";

export interface C4mlCompletionEdit {
  readonly range: SourceRange;
  readonly text: string;
}

export interface C4mlCompletionCandidate {
  readonly id: string;
  readonly label: string;
  readonly kind: C4mlCompletionKind;
  readonly detail: string;
  readonly documentation: string | undefined;
  readonly edit: C4mlCompletionEdit;
}

export interface CompleteC4mlDraftOptions {
  readonly file?: string;
  readonly offset: number;
}

export interface C4mlCompletionResult {
  readonly languageVersion: typeof c4mlDraftLanguageVersion;
  readonly file: string;
  readonly offset: number;
  readonly candidates: readonly C4mlCompletionCandidate[];
}

const propertyLabels = new Set([
  "audience",
  "allow-mixed-levels",
  "classification",
  "code-kind",
  "coordinate",
  "corridor",
  "flow",
  "from",
  "display",
  "environment",
  "intent",
  "legend",
  "language",
  "label-segment",
  "label-shift",
  "lane",
  "lane-gap",
  "lanes",
  "orientation",
  "order",
  "parallel",
  "name",
  "purpose",
  "responsibility",
  "relation",
  "scope",
  "systems",
  "technology",
  "title",
  "to",
  "type",
  "protocol",
  "points",
  "policy",
  "source-port",
  "style",
  "target-port",
  "via",
]);

const valueLabels = new Set([
  "default",
  "automatic",
  "direct",
  "down",
  "east",
  "fixed",
  "container",
  "code",
  "component",
  "collaboration",
  "external",
  "dynamic",
  "deployment",
  "generated",
  "guided",
  "horizontal",
  "internal",
  "left",
  "north",
  "orthogonal",
  "right",
  "sequence",
  "system-context",
  "system-landscape",
  "south",
  "true",
  "up",
  "vertical",
  "west",
]);

const propertyTypesByLabel: Readonly<Record<string, readonly string[]>> = {
  "allow-mixed-levels": ["ViewAllowMixedLevelsProperty"],
  audience: ["ViewAudienceProperty"],
  classification: ["ClassificationProperty"],
  "code-kind": ["CodeKindProperty"],
  coordinate: ["CorridorCoordinateProperty"],
  corridor: ["RouteCorridorSelectionProperty"],
  display: ["ViewDisplayProperty"],
  environment: ["ViewEnvironmentProperty"],
  flow: ["FlowProperty"],
  from: [
    "RelationshipFromProperty",
    "InteractionFromProperty",
    "DeploymentRelationshipFromProperty",
  ],
  intent: [
    "RelationshipIntentProperty",
    "InteractionIntentProperty",
    "DeploymentRelationshipIntentProperty",
  ],
  legend: ["ViewLegendProperty"],
  language: ["LanguageProperty"],
  "label-segment": ["RouteLabelSegmentProperty"],
  "label-shift": ["RouteLabelShiftProperty"],
  lane: ["RouteLaneProperty"],
  "lane-gap": ["CorridorLaneGapProperty"],
  lanes: ["CorridorLanesProperty"],
  orientation: ["CorridorOrientationProperty"],
  order: ["InteractionOrderProperty"],
  parallel: ["InteractionParallelProperty"],
  name: ["DisplayNameProperty"],
  purpose: ["ViewPurposeProperty"],
  responsibility: ["ResponsibilityProperty"],
  relation: [
    "InteractionRelationshipProperty",
    "DeploymentStaticRelationshipProperty",
  ],
  scope: ["ViewScopeProperty"],
  systems: ["ViewSystemsProperty"],
  technology: ["TechnologyProperty"],
  title: ["ViewTitleProperty"],
  to: [
    "RelationshipToProperty",
    "InteractionToProperty",
    "DeploymentRelationshipToProperty",
  ],
  type: ["ViewTypeProperty"],
  protocol: ["ProtocolProperty"],
  points: ["RoutePointsProperty"],
  policy: ["RoutePolicyProperty"],
  "source-port": ["RouteSourcePortProperty"],
  style: ["RouteStyleProperty"],
  "target-port": ["RouteTargetPortProperty"],
  via: ["RouteViaProperty"],
};

const documentationByLabel: Readonly<Record<string, string>> = {
  "allow-mixed-levels": "Acknowledges that a Dynamic View deliberately mixes C4 abstraction levels.",
  automatic: "Lets the router choose the effective path for this relationship appearance.",
  audience: "Declares the intended audience policy for this view.",
  classification: "Classifies an architecture element as internal or external.",
  code: "Declares a C4 Code Element or selects a C4 Code View in the active context.",
  "code-kind": "Names the implementation-level role, such as module, class, or function.",
  coordinate: "Sets the absolute x or y position of this corridor in view coordinates.",
  corridor: "Selects a named route corridor in the active view.",
  component: "Declares a C4 Component or selects a C4 Component View in the active context.",
  collaboration: "Renders Dynamic Interactions as a numbered collaboration.",
  container: "Selects a C4 Container View or declares a Container in a model block.",
  default: "Uses the C4ML default audience or legend policy for this context.",
  direct: "Connects route points using straight segments.",
  deployment: "Selects a C4 Deployment View over one modeled runtime environment.",
  down: "Arranges the view from north to south.",
  east: "Attaches this relationship appearance to the east side.",
  dynamic: "Selects a C4 Dynamic View over ordered static-model interactions.",
  display: "Selects the visual vocabulary for a Dynamic View.",
  external: "Marks an element as owned outside the modeled organization or scope.",
  fixed: "Uses and validates the complete authored route without replacing it.",
  environment: "Selects the Deployment Environment shown by this view.",
  flow: "Chooses the primary automatic layout direction for this view.",
  from: "Selects the source element of this directed relationship.",
  generated: "Generates the diagram legend from the effective notation.",
  guided: "Keeps authored route controls while the router completes the remaining path.",
  horizontal: "Creates lanes parallel to the horizontal view axis.",
  intent: "Describes the architectural intent in the relationship direction.",
  internal: "Marks an element as owned inside the modeled organization or scope.",
  layout: "Opens view-local layout preferences without changing architecture semantics.",
  left: "Arranges the view from east to west.",
  legend: "Declares how this view explains its notation.",
  language: "Declares the implementation language of a Code Element.",
  "label-segment": "Selects the zero-based effective route segment that carries the label.",
  "label-shift": "Moves the relationship label by an explicit x/y offset.",
  lane: "Selects the zero-based lane within the named corridor.",
  "lane-gap": "Sets the distance between adjacent corridor lanes.",
  lanes: "Declares how many exclusive lanes this corridor provides.",
  model: "Opens the shared semantic architecture model.",
  name: "Declares the human-readable display name.",
  north: "Attaches this relationship appearance to the north side.",
  orientation: "Selects whether corridor lanes run horizontally or vertically.",
  orthogonal: "Connects route points using axis-aligned segments.",
  person: "Declares a C4 Person with a stable identifier.",
  order: "Declares the positive interaction order in a Dynamic View.",
  parallel: "Groups same-order Dynamic Interactions into one explicit parallel occurrence.",
  purpose: "Explains why this view exists and what question it answers.",
  protocol: "Declares the communication protocol for a relationship.",
  points: "Supplies the complete point list for a fixed route.",
  policy: "Selects automatic, guided, or fixed route authorship.",
  relation: "Declares one stable, directed architecture relationship.",
  interaction: "Declares one ordered occurrence over the static architecture model.",
  infrastructure: "Declares infrastructure placed on a Deployment Node.",
  "system-instance": "Places one Software System instance on a Deployment Node.",
  "container-instance": "Places one Container instance on a Deployment Node.",
  "deployment-relation": "Declares runtime communication between deployed endpoints.",
  sequence: "Renders Dynamic Interactions using a sequence-oriented vocabulary.",
  south: "Attaches this relationship appearance to the south side.",
  "source-port": "Selects the source-side attachment for this relationship appearance.",
  style: "Selects direct or orthogonal route geometry.",
  relations: "Opens the shared relationship declarations.",
  responsibility: "Summarizes what this architecture element is responsible for.",
  right: "Arranges the view from west to east.",
  scope: "Selects the focal element required by the active C4 view type.",
  system: "Declares a C4 Software System with a stable identifier.",
  "system-context": "Selects a C4 System Context View.",
  "system-landscape": "Selects a C4 System Landscape View with a named organizational scope.",
  systems: "Selects the Software Systems whose runtime instances appear in a Deployment View.",
  technology: "Declares implementation or communication technology.",
  "target-port": "Selects the target-side attachment for this relationship appearance.",
  title: "Declares the human-readable diagram title.",
  to: "Selects the target element of this directed relationship.",
  true: "Explicitly enables the current boolean policy.",
  type: "Declares the C4 view type.",
  up: "Arranges the view from south to north.",
  vertical: "Creates lanes parallel to the vertical view axis.",
  via: "Adds absolute waypoints that guide an otherwise completed route.",
  view: "Declares a named projection of the shared architecture model.",
  west: "Attaches this relationship appearance to the west side.",
};

export async function completeC4mlDraft(
  source: string,
  options: CompleteC4mlDraftOptions,
): Promise<C4mlCompletionResult> {
  if (
    !Number.isSafeInteger(options.offset) ||
    options.offset < 0 ||
    options.offset > source.length
  ) {
    throw new RangeError("Completion offset must be inside the source text.");
  }

  const file = options.file ?? "<memory>";
  const services = createC4mlDraftLanguageServices();
  const document = services.shared.workspace.LangiumDocumentFactory.fromString(
    source,
    URI.parse("c4ml:///completion.c4ml"),
  );
  services.shared.workspace.LangiumDocuments.addDocument(document);
  await services.shared.workspace.DocumentBuilder.build([document], {
    validation: true,
  });

  const provider = services.language.lsp.CompletionProvider;
  if (provider === undefined) {
    return {
      languageVersion: c4mlDraftLanguageVersion,
      file,
      offset: options.offset,
      candidates: [],
    };
  }

  const completion = await provider.getCompletion(document, {
    textDocument: { uri: document.uri.toString() },
    position: document.textDocument.positionAt(options.offset),
  });
  const owner = completionOwner(
    document.parseResult.value as C4mlDocument,
    options.offset,
  );
  const candidates = (completion?.items ?? [])
    .map((item) => toCandidate(item, document, owner, options.offset))
    .filter((candidate): candidate is C4mlCompletionCandidate =>
      candidate !== undefined && !isAlreadyDeclared(candidate, owner, options.offset),
    );

  return {
    languageVersion: c4mlDraftLanguageVersion,
    file,
    offset: options.offset,
    candidates: deduplicateAndSort(candidates),
  };
}

type CompletionOwner =
  | DeploymentNodeDeclaration
  | DeploymentRelationshipDeclaration
  | ElementDeclaration
  | EnvironmentDeclaration
  | InfrastructureNodeDeclaration
  | InteractionDeclaration
  | LayoutBlock
  | RelationshipDeclaration
  | RouteCorridorDeclaration
  | RouteDeclaration
  | ViewDeclaration
  | undefined;

interface CompletionItemLike {
  readonly detail?: string;
  readonly insertText?: string;
  readonly kind?: number;
  readonly label: string;
  readonly textEdit?: unknown;
}

function toCandidate(
  item: CompletionItemLike,
  document: LangiumDocument,
  owner: CompletionOwner,
  offset: number,
): C4mlCompletionCandidate | undefined {
  const edit = completionEdit(item, document, offset);
  if (edit === undefined) {
    return undefined;
  }
  const kind = completionKind(item);
  const ownerType = owner?.$type ?? "document";
  return {
    id: `${c4mlDraftLanguageVersion}:${ownerType}:${kind}:${item.label}`,
    label: item.label,
    kind,
    detail:
      kind === "reference"
        ? referenceDetail(item.detail, owner)
        : completionDetail(kind),
    documentation: documentationByLabel[item.label],
    edit,
  };
}

function completionEdit(
  item: CompletionItemLike,
  document: LangiumDocument,
  offset: number,
): C4mlCompletionEdit | undefined {
  const textEdit = item.textEdit;
  if (isTextEdit(textEdit)) {
    return {
      text: textEdit.newText,
      range: sourceRange(document, textEdit.range),
    };
  }
  if (isInsertReplaceEdit(textEdit)) {
    return {
      text: textEdit.newText,
      range: sourceRange(document, textEdit.replace),
    };
  }
  const position = document.textDocument.positionAt(offset);
  return {
    text: item.insertText ?? item.label,
    range: {
      start: { offset, line: position.line, column: position.character },
      end: { offset, line: position.line, column: position.character },
    },
  };
}

function completionKind(item: CompletionItemLike): C4mlCompletionKind {
  if (item.kind === 18) {
    return "reference";
  }
  if (propertyLabels.has(item.label)) {
    return "property";
  }
  if (valueLabels.has(item.label)) {
    return "value";
  }
  return "keyword";
}

function completionDetail(kind: C4mlCompletionKind): string {
  switch (kind) {
    case "keyword":
      return "C4ML keyword";
    case "property":
      return "Property allowed in the current block";
    case "reference":
      return "Architecture reference";
    case "value":
      return "Value allowed for the current property";
  }
}

function referenceDetail(
  detail: string | undefined,
  owner: CompletionOwner,
): string {
  switch (detail) {
    case "PersonDeclaration":
      return "Person reference";
    case "SoftwareSystemDeclaration":
      return "Software System reference";
    case "ContainerDeclaration":
      return "Container reference";
    case "ComponentDeclaration":
      return "Component reference";
    case "CodeElementDeclaration":
      return "Code Element reference";
    case "RelationshipDeclaration":
      return "Relationship reference";
    case "DeploymentNodeDeclaration":
      return "Deployment Node reference";
    case "DeploymentEndpointDeclaration":
      return "Deployment endpoint reference";
    case "EnvironmentDeclaration":
      return "Deployment Environment reference";
    default:
      return isDeploymentRelationshipDeclaration(owner)
        ? "Deployment endpoint reference"
        : "Architecture element reference";
  }
}

function completionOwner(root: C4mlDocument, offset: number): CompletionOwner {
  let owner: CompletionOwner;
  let ownerLength = Number.POSITIVE_INFINITY;
  for (const node of [root, ...AstUtils.streamAllContents(root)]) {
    if (!isCompletionOwner(node) || !containsOffset(node, offset)) {
      continue;
    }
    const length = (node.$cstNode?.end ?? 0) - (node.$cstNode?.offset ?? 0);
    if (length < ownerLength) {
      owner = node;
      ownerLength = length;
    }
  }
  return owner;
}

function isCompletionOwner(node: AstNode): node is Exclude<CompletionOwner, undefined> {
  return (
    isElementDeclaration(node) ||
    isDeploymentNodeDeclaration(node) ||
    isDeploymentRelationshipDeclaration(node) ||
    isEnvironmentDeclaration(node) ||
    isInfrastructureNodeDeclaration(node) ||
    isInteractionDeclaration(node) ||
    isRelationshipDeclaration(node) ||
    isRouteCorridorDeclaration(node) ||
    isRouteDeclaration(node) ||
    isViewDeclaration(node) ||
    isLayoutBlock(node)
  );
}

function containsOffset(node: AstNode, offset: number): boolean {
  const cst = node.$cstNode;
  return cst !== undefined && cst.offset <= offset && offset <= cst.end;
}

function isAlreadyDeclared(
  candidate: C4mlCompletionCandidate,
  owner: CompletionOwner,
  offset: number,
): boolean {
  if (candidate.kind !== "property" || owner === undefined) {
    return false;
  }
  if (
    isRouteDeclaration(owner) &&
    !isRoutePropertyAllowed(candidate.label, owner)
  ) {
    return true;
  }
  const propertyTypes = propertyTypesByLabel[candidate.label];
  if (propertyTypes === undefined) {
    return false;
  }
  const properties = owner.properties;
  return properties.some(
    (property) =>
      propertyTypes.includes(property.$type) && !containsOffset(property, offset),
  );
}

function isRoutePropertyAllowed(
  label: string,
  route: RouteDeclaration,
): boolean {
  const policy = route.properties.find(
    (property): property is RoutePolicyProperty =>
      property.$type === "RoutePolicyProperty",
  )?.value;
  if (policy === undefined) {
    return label === "policy";
  }

  const allowedByPolicy: Readonly<Record<typeof policy, ReadonlySet<string>>> = {
    automatic: new Set(["label-segment", "label-shift", "policy"]),
    guided: new Set([
      "corridor",
      "label-segment",
      "label-shift",
      "lane",
      "policy",
      "source-port",
      "style",
      "target-port",
      "via",
    ]),
    fixed: new Set([
      "label-segment",
      "label-shift",
      "points",
      "policy",
      "style",
    ]),
  };
  if (!allowedByPolicy[policy].has(label)) {
    return false;
  }

  const hasVia = route.properties.some(
    ({ $type }) => $type === "RouteViaProperty",
  );
  const hasCorridorSelection = route.properties.some(
    ({ $type }) =>
      $type === "RouteCorridorSelectionProperty" ||
      $type === "RouteLaneProperty",
  );
  return !(
    (hasVia && (label === "corridor" || label === "lane")) ||
    (hasCorridorSelection && label === "via")
  );
}

function deduplicateAndSort(
  candidates: readonly C4mlCompletionCandidate[],
): readonly C4mlCompletionCandidate[] {
  const byKey = new Map<string, C4mlCompletionCandidate>();
  for (const candidate of candidates) {
    const key = [
      candidate.kind,
      candidate.label,
      candidate.edit.range.start.offset,
      candidate.edit.range.end.offset,
      candidate.edit.text,
    ].join(":");
    byKey.set(key, candidate);
  }
  return [...byKey.values()].sort((left, right) => {
    const kind = compareText(left.kind, right.kind);
    return kind === 0 ? compareText(left.label, right.label) : kind;
  });
}

function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

interface PositionLike {
  readonly line: number;
  readonly character: number;
}

interface RangeLike {
  readonly start: PositionLike;
  readonly end: PositionLike;
}

function sourceRange(
  document: LangiumDocument,
  range: RangeLike,
): SourceRange {
  return {
    start: {
      offset: document.textDocument.offsetAt(range.start),
      line: range.start.line,
      column: range.start.character,
    },
    end: {
      offset: document.textDocument.offsetAt(range.end),
      line: range.end.line,
      column: range.end.character,
    },
  };
}

function isTextEdit(
  value: unknown,
): value is { readonly newText: string; readonly range: RangeLike } {
  return (
    typeof value === "object" &&
    value !== null &&
    "newText" in value &&
    typeof value.newText === "string" &&
    "range" in value &&
    isRange(value.range)
  );
}

function isInsertReplaceEdit(
  value: unknown,
): value is { readonly newText: string; readonly replace: RangeLike } {
  return (
    typeof value === "object" &&
    value !== null &&
    "newText" in value &&
    typeof value.newText === "string" &&
    "replace" in value &&
    isRange(value.replace)
  );
}

function isRange(value: unknown): value is RangeLike {
  return (
    typeof value === "object" &&
    value !== null &&
    "start" in value &&
    isPosition(value.start) &&
    "end" in value &&
    isPosition(value.end)
  );
}

function isPosition(value: unknown): value is PositionLike {
  return (
    typeof value === "object" &&
    value !== null &&
    "line" in value &&
    typeof value.line === "number" &&
    "character" in value &&
    typeof value.character === "number"
  );
}
