import {
  AstUtils,
  URI,
  type AstNode,
  type LangiumDocument,
} from "langium";

import type {
  ArchitectureProjectInput,
  SourceRange,
} from "@c4ml/compiler-core";

import type {
  C4mlDocument,
  DeploymentNodeDeclaration,
  DeploymentRelationshipDeclaration,
  ElementDeclaration,
  EnvironmentDeclaration,
  InfrastructureNodeDeclaration,
  InteractionDeclaration,
  LayoutBlock,
  PlacementAdjustDeclaration,
  PlacementAlignDeclaration,
  PlacementConstraintDeclaration,
  PlacementDistributeDeclaration,
  PlacementPinDeclaration,
  PlacementPlaceDeclaration,
  RelationshipDeclaration,
  RouteAvoidanceDeclaration,
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
  isPlacementAdjustDeclaration,
  isPlacementAlignDeclaration,
  isPlacementConstraintDeclaration,
  isPlacementDistributeDeclaration,
  isPlacementPinDeclaration,
  isPlacementPlaceDeclaration,
  isRelationshipDeclaration,
  isRouteAvoidanceDeclaration,
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
  "around",
  "anchor",
  "avoid",
  "audience",
  "bounds",
  "allow-mixed-levels",
  "classification",
  "code-kind",
  "coordinate",
  "corridor",
  "flow",
  "gap",
  "from",
  "guide",
  "display",
  "environment",
  "intent",
  "legend",
  "language",
  "label-segment",
  "label-offset-x",
  "label-offset-y",
  "lane",
  "lane-gap",
  "lanes",
  "orientation",
  "order",
  "padding",
  "parallel",
  "name",
  "move",
  "move-x",
  "move-y",
  "purpose",
  "responsibility",
  "relation",
  "relative-to",
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
  "strength",
  "target-port",
  "via",
  "x",
  "y",
]);

const valueLabels = new Set([
  "default",
  "automatic",
  "bottom",
  "center-x",
  "center-y",
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
  "hard",
  "horizontal",
  "internal",
  "left",
  "large",
  "north",
  "orthogonal",
  "right",
  "normal",
  "sequence",
  "system-context",
  "system-landscape",
  "south",
  "soft",
  "small",
  "tiny",
  "top",
  "true",
  "up",
  "vertical",
  "west",
]);

const propertyTypesByLabel: Readonly<Record<string, readonly string[]>> = {
  around: ["AvoidanceAroundProperty"],
  avoid: ["RouteAvoidProperty"],
  "allow-mixed-levels": ["ViewAllowMixedLevelsProperty"],
  audience: ["ViewAudienceProperty"],
  bounds: ["AvoidanceBoundsProperty"],
  classification: ["ClassificationProperty"],
  "code-kind": ["CodeKindProperty"],
  coordinate: ["CorridorCoordinateProperty"],
  corridor: ["RouteCorridorSelectionProperty"],
  display: ["ViewDisplayProperty"],
  environment: ["ViewEnvironmentProperty"],
  flow: ["FlowProperty"],
  gap: ["PlacementGapProperty", "PlacementIntentGapProperty"],
  from: [
    "RelationshipFromProperty",
    "InteractionFromProperty",
    "DeploymentRelationshipFromProperty",
  ],
  guide: ["RouteGuideProperty"],
  intent: [
    "RelationshipIntentProperty",
    "InteractionIntentProperty",
    "DeploymentRelationshipIntentProperty",
  ],
  legend: ["ViewLegendProperty"],
  language: ["LanguageProperty"],
  "label-segment": ["RouteLabelSegmentProperty"],
  "label-offset-x": ["RouteLabelOffsetXProperty"],
  "label-offset-y": ["RouteLabelOffsetYProperty"],
  lane: ["RouteLaneProperty"],
  "lane-gap": ["CorridorLaneGapProperty"],
  lanes: ["CorridorLanesProperty"],
  orientation: ["CorridorOrientationProperty"],
  order: ["InteractionOrderProperty"],
  padding: ["AvoidancePaddingProperty"],
  parallel: ["InteractionParallelProperty"],
  name: ["DisplayNameProperty"],
  move: ["PlacementMoveProperty"],
  "move-x": ["PlacementMoveXProperty"],
  "move-y": ["PlacementMoveYProperty"],
  purpose: ["ViewPurposeProperty"],
  responsibility: ["ResponsibilityProperty"],
  relation: [
    "InteractionRelationshipProperty",
    "DeploymentStaticRelationshipProperty",
  ],
  anchor: ["PlacementAnchorProperty"],
  "relative-to": ["PlacementRelativeToProperty"],
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
  strength: ["AvoidanceStrengthProperty", "PlacementStrengthProperty"],
  "target-port": ["RouteTargetPortProperty"],
  via: ["RouteViaProperty"],
  x: ["PlacementXProperty"],
  y: ["PlacementYProperty"],
};

const documentationByLabel: Readonly<Record<string, string>> = {
  adjust: "Moves one element by a declared offset from its automatic candidate position.",
  align: "Aligns two or more listed elements against one explicit anchor.",
  anchor: "Selects the listed element whose alignment line remains the reference.",
  around: "Anchors an avoidance region to the current bounds of a visible architecture element.",
  avoid: "Applies named hard or soft avoidance regions to this guided route.",
  avoidance: "Declares a reusable view-local area that selected routes should not cross.",
  "allow-mixed-levels": "Acknowledges that a Dynamic View deliberately mixes C4 abstraction levels.",
  automatic: "Lets the router choose the effective path for this relationship appearance.",
  audience: "Declares the intended audience policy for this view.",
  bounds: "Declares absolute x, y, width, and height for an avoidance region.",
  canvas: "Anchors route guidance to an absolute point in view coordinates.",
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
  distribute: "Places three or more explicitly ordered elements with equal gaps.",
  gap: "Sets a named, step-based, or exact diagram-space gap.",
  from: "Selects the source element of this directed relationship.",
  generated: "Generates the diagram legend from the effective notation.",
  guided: "Keeps authored route controls while the router completes the remaining path.",
  guide: "Declares ordered relative waypoints and route segments that must stay fixed.",
  hard: "Fails compilation when a placement or routing rule cannot be respected.",
  horizontal: "Creates lanes parallel to the horizontal view axis.",
  intent: "Describes the architectural intent in the relationship direction.",
  internal: "Marks an element as owned inside the modeled organization or scope.",
  layout: "Opens view-local layout preferences without changing architecture semantics.",
  constraint: "Declares a view-local positional rule without creating an architecture relationship.",
  pin: "Fixes one visible element at an explicit view position while the rest stays automatic.",
  place: "Places one visible element above, below, left of, or right of another.",
  "relative-to": "Declares automatic candidate geometry as the stable adjustment baseline.",
  left: "Arranges the view from east to west.",
  legend: "Declares how this view explains its notation.",
  language: "Declares the implementation language of a Code Element.",
  lock: "Keeps the declared route segment unchanged while surrounding geometry is completed.",
  "label-segment": "Selects the zero-based effective route segment that carries the label.",
  "label-offset-x": "Moves the relationship label horizontally by signed diagram units.",
  "label-offset-y": "Moves the relationship label vertically by signed diagram units.",
  lane: "Selects the zero-based lane within the named corridor.",
  "lane-gap": "Sets the distance between adjacent corridor lanes.",
  lanes: "Declares how many exclusive lanes this corridor provides.",
  model: "Opens the shared semantic architecture model.",
  move: "Applies one directional offset from automatic candidate geometry.",
  "move-x": "Applies a signed horizontal step or diagram-unit offset from automatic geometry.",
  "move-y": "Applies a signed vertical step or diagram-unit offset from automatic geometry.",
  name: "Declares the human-readable display name.",
  north: "Attaches this relationship appearance to the north side.",
  orientation: "Selects whether corridor lanes run horizontally or vertically.",
  orthogonal: "Connects route points using axis-aligned segments.",
  person: "Declares a C4 Person with a stable identifier.",
  order: "Declares the positive interaction order in a Dynamic View.",
  padding: "Expands a node-relative avoidance region by this many view units.",
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
  soft: "Allows a placement or routing preference to be relaxed with an explicit warning.",
  "source-port": "Selects the source-side attachment for this relationship appearance.",
  style: "Selects direct or orthogonal route geometry.",
  strength: "Selects hard failure or warned soft relaxation for an avoidance region.",
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
  x: "Sets the horizontal view coordinate of a pinned element.",
  y: "Sets the vertical view coordinate of a pinned element.",
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
  return completeProjectDocuments(
    [{ uri: file, source }],
    file,
    options.offset,
  );
}

export async function completeC4mlProjectDraft(
  project: ArchitectureProjectInput,
  file: string,
  offset: number,
): Promise<C4mlCompletionResult> {
  const activeDocument = project.documents.find(({ uri }) => uri === file);
  if (activeDocument === undefined) {
    throw new Error(`Completion source "${file}" is not part of project "${project.id}".`);
  }
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > activeDocument.text.length) {
    throw new RangeError("Completion offset must be inside the source text.");
  }
  return completeProjectDocuments(
    project.documents.map(({ uri, text }) => ({ uri, source: text })),
    file,
    offset,
  );
}

async function completeProjectDocuments(
  sources: readonly { readonly uri: string; readonly source: string }[],
  file: string,
  offset: number,
): Promise<C4mlCompletionResult> {
  const services = createC4mlDraftLanguageServices();
  const documents = sources.map(({ uri, source }, index) => {
    const document = services.shared.workspace.LangiumDocumentFactory.fromString(
      source,
      URI.from({
        scheme: "c4ml-completion",
        path: `/${index}-${uri.endsWith(".c4ml") ? uri : "memory.c4ml"}`,
      }),
    );
    services.shared.workspace.LangiumDocuments.addDocument(document);
    return { uri, document };
  });
  const document = documents.find(({ uri }) => uri === file)?.document;
  if (document === undefined) {
    throw new Error(`Completion source "${file}" is unavailable.`);
  }
  await services.shared.workspace.DocumentBuilder.build(
    documents.map(({ document }) => document),
    {
    validation: true,
    },
  );

  const provider = services.language.lsp.CompletionProvider;
  if (provider === undefined) {
    return {
      languageVersion: c4mlDraftLanguageVersion,
      file,
      offset,
      candidates: [],
    };
  }

  const completion = await provider.getCompletion(document, {
    textDocument: { uri: document.uri.toString() },
    position: document.textDocument.positionAt(offset),
  });
  const root = document.parseResult.value as C4mlDocument;
  const owner = completionOwner(root, offset);
  const source = sources.find(({ uri }) => uri === file)?.source ?? "";
  const candidates = (completion?.items ?? [])
    .map((item) => toCandidate(item, document, owner, offset))
    .filter((candidate): candidate is C4mlCompletionCandidate =>
      candidate !== undefined &&
      !isAlreadyDeclared(candidate, owner, offset) &&
      isRoutePolicyValueAllowed(candidate, owner, source, offset),
    );
  const recoveredCandidates = recoverTopLevelModelCompletion(
    source,
    document,
    root,
    owner,
    offset,
    candidates,
  );
  const recoveredModelCandidates = recoverModelElementCompletion(
    source,
    document,
    offset,
    candidates,
  );
  const recoveredViewCandidates = recoverViewPropertyCompletion(
    source,
    document,
    offset,
    candidates,
  );

  return {
    languageVersion: c4mlDraftLanguageVersion,
    file,
    offset,
    candidates: deduplicateAndSort([
      ...candidates,
      ...recoveredCandidates,
      ...recoveredModelCandidates,
      ...recoveredViewCandidates,
    ]),
  };
}

function recoverViewPropertyCompletion(
  source: string,
  document: LangiumDocument,
  offset: number,
  candidates: readonly C4mlCompletionCandidate[],
): readonly C4mlCompletionCandidate[] {
  const stack = structuralBlockStackAt(source, offset);
  if (
    candidates.length > 0 ||
    stack.length !== 1 ||
    stack[0] !== "view"
  ) {
    return [];
  }

  const lineStart = source.lastIndexOf("\n", Math.max(0, offset - 1)) + 1;
  const linePrefix = source.slice(lineStart, offset);
  if (!/^\s*[A-Za-z-]*$/.test(linePrefix)) {
    return [];
  }
  const tokenStart = lineStart + (linePrefix.match(/^\s*/u)?.[0].length ?? 0);
  const start = document.textDocument.positionAt(tokenStart);
  const end = document.textDocument.positionAt(offset);
  const labels = [
    "allow-mixed-levels",
    "audience",
    "display",
    "environment",
    "legend",
    "purpose",
    "scope",
    "systems",
    "title",
    "type",
  ] as const;
  return labels.flatMap((label) =>
    candidates.some((candidate) => candidate.label === label)
      ? []
      : [
          {
            id: `${c4mlDraftLanguageVersion}:ViewDeclaration:property:${label}`,
            label,
            kind: "property" as const,
            detail: completionDetail("property"),
            documentation: documentationByLabel[label],
            edit: {
              text: label,
              range: {
                start: {
                  offset: tokenStart,
                  line: start.line,
                  column: start.character,
                },
                end: {
                  offset,
                  line: end.line,
                  column: end.character,
                },
              },
            },
          },
        ],
  );
}

function recoverModelElementCompletion(
  source: string,
  document: LangiumDocument,
  offset: number,
  candidates: readonly C4mlCompletionCandidate[],
): readonly C4mlCompletionCandidate[] {
  if (!isAtModelDeclarationLevel(source, offset)) {
    return [];
  }

  const lineStart = source.lastIndexOf("\n", Math.max(0, offset - 1)) + 1;
  const linePrefix = source.slice(lineStart, offset);
  if (!/^\s*[A-Za-z-]*$/.test(linePrefix)) {
    return [];
  }
  const tokenStart = lineStart + (linePrefix.match(/^\s*/u)?.[0].length ?? 0);
  const start = document.textDocument.positionAt(tokenStart);
  const end = document.textDocument.positionAt(offset);
  return ["person", "system"].flatMap((label) =>
    candidates.some((candidate) => candidate.label === label)
      ? []
      : [
          {
            id: `${c4mlDraftLanguageVersion}:document:keyword:${label}`,
            label,
            kind: "keyword" as const,
            detail: completionDetail("keyword"),
            documentation: documentationByLabel[label],
            edit: {
              text: label,
              range: {
                start: {
                  offset: tokenStart,
                  line: start.line,
                  column: start.character,
                },
                end: {
                  offset,
                  line: end.line,
                  column: end.character,
                },
              },
            },
          },
        ],
  );
}

function isAtModelDeclarationLevel(source: string, offset: number): boolean {
  const stack = structuralBlockStackAt(source, offset);
  return stack.length === 1 && stack[0] === "model";
}

function structuralBlockStackAt(source: string, offset: number): string[] {
  const stack: string[] = [];
  let index = 0;
  while (index < offset) {
    const character = source[index];
    const next = source[index + 1];
    if (character === '"') {
      index += 1;
      while (index < offset) {
        if (source[index] === "\\") {
          index += 2;
          continue;
        }
        if (source[index] === '"') {
          index += 1;
          break;
        }
        index += 1;
      }
      continue;
    }
    if (character === "/" && next === "/") {
      const lineEnd = source.indexOf("\n", index + 2);
      index = lineEnd < 0 || lineEnd >= offset ? offset : lineEnd + 1;
      continue;
    }
    if (character === "/" && next === "*") {
      const commentEnd = source.indexOf("*/", index + 2);
      index = commentEnd < 0 || commentEnd + 2 >= offset
        ? offset
        : commentEnd + 2;
      continue;
    }
    if (character === "{") {
      stack.push(blockKindBeforeOpeningBrace(source, index));
    } else if (character === "}") {
      stack.pop();
    }
    index += 1;
  }
  return stack;
}

function blockKindBeforeOpeningBrace(
  source: string,
  braceOffset: number,
): "model" | "other" | "view" {
  const lineStart = source.lastIndexOf("\n", Math.max(0, braceOffset - 1)) + 1;
  const prefix = source.slice(lineStart, braceOffset).trim();
  if (prefix === "model") {
    return "model";
  }
  if (/^view(?:\s+[A-Za-z][A-Za-z0-9-]*)?$/u.test(prefix)) {
    return "view";
  }
  return "other";
}

function recoverTopLevelModelCompletion(
  source: string,
  document: LangiumDocument,
  root: C4mlDocument,
  owner: CompletionOwner,
  offset: number,
  candidates: readonly C4mlCompletionCandidate[],
): readonly C4mlCompletionCandidate[] {
  if (
    owner !== undefined ||
    root.model !== undefined ||
    structuralBlockStackAt(source, offset).length > 0 ||
    candidates.some(({ label }) => label === "model")
  ) {
    return [];
  }

  const lineStart = source.lastIndexOf("\n", Math.max(0, offset - 1)) + 1;
  const linePrefix = source.slice(lineStart, offset);
  if (!/^[A-Za-z-]*$/.test(linePrefix)) {
    return [];
  }

  const start = document.textDocument.positionAt(lineStart);
  const end = document.textDocument.positionAt(offset);
  return [
    {
      id: `${c4mlDraftLanguageVersion}:document:keyword:model`,
      label: "model",
      kind: "keyword",
      detail: completionDetail("keyword"),
      documentation: documentationByLabel.model,
      edit: {
        text: "model",
        range: {
          start: {
            offset: lineStart,
            line: start.line,
            column: start.character,
          },
          end: {
            offset,
            line: end.line,
            column: end.character,
          },
        },
      },
    },
  ];
}

type CompletionOwner =
  | DeploymentNodeDeclaration
  | DeploymentRelationshipDeclaration
  | ElementDeclaration
  | EnvironmentDeclaration
  | InfrastructureNodeDeclaration
  | InteractionDeclaration
  | LayoutBlock
  | PlacementAdjustDeclaration
  | PlacementAlignDeclaration
  | PlacementConstraintDeclaration
  | PlacementDistributeDeclaration
  | PlacementPinDeclaration
  | PlacementPlaceDeclaration
  | RelationshipDeclaration
  | RouteAvoidanceDeclaration
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
    case "RouteAvoidanceDeclaration":
      return "Route avoidance reference";
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
    isPlacementAdjustDeclaration(node) ||
    isPlacementAlignDeclaration(node) ||
    isPlacementConstraintDeclaration(node) ||
    isPlacementDistributeDeclaration(node) ||
    isPlacementPinDeclaration(node) ||
    isPlacementPlaceDeclaration(node) ||
    isRelationshipDeclaration(node) ||
    isRouteAvoidanceDeclaration(node) ||
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
    automatic: new Set([
      "label-offset-x",
      "label-offset-y",
      "label-segment",
      "policy",
    ]),
    guided: new Set([
      "avoid",
      "corridor",
      "guide",
      "label-segment",
      "label-offset-x",
      "label-offset-y",
      "lane",
      "policy",
      "source-port",
      "style",
      "target-port",
      "via",
    ]),
    fixed: new Set([
      "label-segment",
      "label-offset-x",
      "label-offset-y",
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
  const hasGuide = route.properties.some(
    ({ $type }) => $type === "RouteGuideProperty",
  );
  return !(
    (hasVia && (label === "corridor" || label === "guide" || label === "lane")) ||
    (hasCorridorSelection && (label === "guide" || label === "via")) ||
    (hasGuide && (label === "corridor" || label === "lane" || label === "via"))
  );
}

function isRoutePolicyValueAllowed(
  candidate: C4mlCompletionCandidate,
  owner: CompletionOwner,
  source: string,
  offset: number,
): boolean {
  if (
    !isRouteDeclaration(owner) ||
    candidate.kind !== "value" ||
    !isRoutePolicyValue(candidate.label) ||
    !isCompletingRoutePolicy(source, offset)
  ) {
    return true;
  }

  const propertyTypes = new Set<string>(
    owner.properties
      .filter(({ $type }) => $type !== "RoutePolicyProperty")
      .map(({ $type }) => $type),
  );
  const hasPoints = propertyTypes.has("RoutePointsProperty");
  const hasStyle = propertyTypes.has("RouteStyleProperty");
  const hasGuidedControl = [
    "RouteAvoidProperty",
    "RouteCorridorSelectionProperty",
    "RouteGuideProperty",
    "RouteLaneProperty",
    "RouteSourcePortProperty",
    "RouteTargetPortProperty",
    "RouteViaProperty",
  ].some((type) => propertyTypes.has(type));

  switch (candidate.label) {
    case "automatic":
      return !hasPoints && !hasStyle && !hasGuidedControl;
    case "guided":
      return !hasPoints;
    case "fixed":
      return hasPoints && !hasGuidedControl;
  }
}

function isCompletingRoutePolicy(source: string, offset: number): boolean {
  const lineStart = source.lastIndexOf("\n", Math.max(0, offset - 1)) + 1;
  return /^\s*policy\s*=\s*[A-Za-z-]*$/u.test(source.slice(lineStart, offset));
}

function isRoutePolicyValue(
  label: string,
): label is RoutePolicyProperty["value"] {
  return label === "automatic" || label === "guided" || label === "fixed";
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
