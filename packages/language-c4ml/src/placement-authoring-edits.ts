import {
  createProposedProjectSourceChangeSet,
  type ArchitectureProjectInput,
  type ProposedProjectSourceChangeSet,
  type SourceChangeIntent,
} from "@c4ml/compiler-core";
import { URI } from "langium";

import type {
  C4mlDocument,
  LayoutBlock,
  PlacementAdjustDeclaration,
  PlacementAlignDeclaration,
  PlacementDistributeDeclaration,
  PlacementPinDeclaration,
  PlacementPlaceDeclaration,
  ViewDeclaration,
} from "./generated/ast.js";
import { createC4mlDraftServices } from "./services.js";

export type C4mlPlacementStrength = "hard" | "soft";
export type C4mlPlacementGap = "large" | "normal" | "small" | "tiny";

export type C4mlPlacementEditOperation =
  | {
      readonly kind: "relative";
      readonly subjectId: string;
      readonly anchorId: string;
      readonly relation: "above" | "below" | "left-of" | "right-of";
      readonly gap: C4mlPlacementGap;
      readonly strength: C4mlPlacementStrength;
    }
  | {
      readonly kind: "nudge";
      readonly targetId: string;
      readonly direction: "down" | "left" | "right" | "up";
      readonly distance: C4mlPlacementGap;
      readonly strength: C4mlPlacementStrength;
    }
  | {
      readonly kind: "align";
      readonly itemIds: readonly string[];
      readonly alignment: "bottom" | "center-x" | "center-y" | "left" | "right" | "top";
      readonly anchorId: string;
      readonly strength: C4mlPlacementStrength;
    }
  | {
      readonly kind: "distribute";
      readonly itemIds: readonly string[];
      readonly orientation: "horizontal" | "vertical";
      readonly gap: C4mlPlacementGap;
      readonly strength: C4mlPlacementStrength;
    }
  | {
      readonly kind: "pin";
      readonly targetId: string;
      readonly x: number;
      readonly y: number;
      readonly strength: C4mlPlacementStrength;
    };

export interface C4mlPlacementEditRequest {
  readonly id: string;
  readonly viewId: string;
  readonly intent: SourceChangeIntent;
  readonly operation: C4mlPlacementEditOperation;
}

export type C4mlPlacementAuthoringIssueCode =
  | "C4ML-AUTHORING-001"
  | "C4ML-AUTHORING-005"
  | "C4ML-AUTHORING-006"
  | "C4ML-AUTHORING-007";

export interface C4mlPlacementAuthoringIssue {
  readonly code: C4mlPlacementAuthoringIssueCode;
  readonly message: string;
}

export type C4mlPlacementEditProposal =
  | {
      readonly valid: true;
      readonly changeSet: ProposedProjectSourceChangeSet;
      readonly documentUri: string;
      readonly proposedText: string;
      readonly issues: readonly [];
    }
  | {
      readonly valid: false;
      readonly issues: readonly C4mlPlacementAuthoringIssue[];
    };

interface ParsedProjectDocument {
  readonly uri: string;
  readonly source: string;
  readonly ast: C4mlDocument;
}

interface TextRange {
  readonly startOffset: number;
  readonly endOffset: number;
}

export async function proposeC4mlPlacementEdit(
  project: ArchitectureProjectInput,
  request: C4mlPlacementEditRequest,
): Promise<C4mlPlacementEditProposal> {
  const documents = await parseProject(project);
  if (documents === undefined) {
    return invalid(
      "C4ML-AUTHORING-001",
      "Syntax-aware placement changes require a valid C4ML project.",
    );
  }

  const views = documents.flatMap((document) =>
    document.ast.views
      .filter(({ name }) => name === request.viewId)
      .map((view) => ({ document, view })),
  );
  const owner = views[0];
  if (owner === undefined || views.length !== 1) {
    return invalid(
      "C4ML-AUTHORING-005",
      `Exactly one view declaration with stable identifier "${request.viewId}" is required.`,
    );
  }

  const elementIds = new Set(
    documents.flatMap(({ ast }) =>
      (ast.model?.elements ?? []).map(({ name }) => name),
    ),
  );
  const operationIssue = validateOperation(request.operation, elementIds);
  if (operationIssue !== undefined) {
    return invalid("C4ML-AUTHORING-006", operationIssue);
  }

  const edits = createPlacementTextEdits(
    owner.document.source,
    owner.view,
    request.operation,
  );
  if (edits === undefined) {
    return invalid(
      "C4ML-AUTHORING-007",
      `View "${request.viewId}" has no stable source range for a placement edit.`,
    );
  }

  return {
    valid: true,
    changeSet: createProposedProjectSourceChangeSet(project, {
      id: request.id,
      intent: request.intent,
      affectedIds: affectedIds(request.operation),
      edits: edits.map((edit) => ({
        documentUri: owner.document.uri,
        ...edit,
      })),
    }),
    documentUri: owner.document.uri,
    proposedText: renderOperation(request.operation),
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
      URI.from({ scheme: "c4ml-authoring", path: `/${sourceDocument.uri}` }),
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
  operation: C4mlPlacementEditOperation,
  elementIds: ReadonlySet<string>,
): string | undefined {
  const ids = affectedIds(operation);
  if (ids.some((id) => !elementIds.has(id))) {
    return `Placement operation references an unknown element: ${ids.find((id) => !elementIds.has(id))}.`;
  }
  if (new Set(ids).size !== ids.length) {
    return "Placement operation requires unique element identifiers.";
  }
  if (operation.kind === "relative" && operation.subjectId === operation.anchorId) {
    return "Relative placement requires two different elements.";
  }
  if (operation.kind === "align") {
    if (operation.itemIds.length < 2 || !operation.itemIds.includes(operation.anchorId)) {
      return "Alignment requires at least two elements and an anchor from that set.";
    }
  }
  if (operation.kind === "distribute" && operation.itemIds.length < 3) {
    return "Distribution requires at least three explicitly ordered elements.";
  }
  if (
    operation.kind === "pin" &&
    (!Number.isSafeInteger(operation.x) ||
      !Number.isSafeInteger(operation.y) ||
      operation.x < 0 ||
      operation.y < 0)
  ) {
    return "Exact pins require non-negative integer diagram-unit coordinates.";
  }
  return undefined;
}

function createPlacementTextEdits(
  source: string,
  view: ViewDeclaration,
  operation: C4mlPlacementEditOperation,
): readonly {
  readonly startOffset: number;
  readonly endOffset: number;
  readonly text: string;
}[] | undefined {
  const declaration = renderOperation(operation);
  const existing = replaceableDeclarations(view.layout, operation);
  const first = existing.find((candidate) =>
    isDesiredDeclaration(view.layout, operation, candidate),
  );
  if (first !== undefined) {
    const range = nodeLineRange(source, first.$cstNode);
    if (range === undefined) return undefined;
    const indent = lineIndentAt(source, first.$cstNode?.offset ?? range.startOffset);
    const extraRanges = existing.filter((candidate) => candidate !== first).map(({ $cstNode }) =>
      nodeLineRange(source, $cstNode),
    );
    if (extraRanges.some((range) => range === undefined)) return undefined;
    return [
      {
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        text:
          indentBlock(declaration, indent) +
          lineEndingAt(source, range.endOffset),
      },
      ...extraRanges.map((extra) => ({
        startOffset: extra!.startOffset,
        endOffset: extra!.endOffset,
        text: "",
      })),
    ];
  }

  if (view.layout !== undefined) {
    const insertion = orderedLayoutInsertion(
      source,
      view.layout,
      operation,
      existing,
      declaration,
    );
    if (insertion === undefined) return undefined;
    const obsoleteRanges = existing.map(({ $cstNode }) =>
      nodeLineRange(source, $cstNode),
    );
    if (obsoleteRanges.some((range) => range === undefined)) return undefined;
    if (insertion !== "append") {
      return [
        insertion,
        ...obsoleteRanges.map((range) => ({
          startOffset: range!.startOffset,
          endOffset: range!.endOffset,
          text: "",
        })),
      ];
    }
    const layoutNode = view.layout.$cstNode;
    if (layoutNode === undefined) return undefined;
    const closeOffset = layoutNode.offset + layoutNode.text.lastIndexOf("}");
    if (closeOffset < layoutNode.offset) return undefined;
    const layoutIndent = lineIndentAt(source, layoutNode.offset);
    return [
      ...obsoleteRanges.map((range) => ({
        startOffset: range!.startOffset,
        endOffset: range!.endOffset,
        text: "",
      })),
      {
        startOffset: closeOffset,
        endOffset: closeOffset,
        text: `\n${indentBlock(declaration, `${layoutIndent}  `)}\n${layoutIndent}`,
      },
    ];
  }

  const viewNode = view.$cstNode;
  if (viewNode === undefined) return undefined;
  const closeOffset = viewNode.offset + viewNode.text.lastIndexOf("}");
  if (closeOffset < viewNode.offset) return undefined;
  const viewIndent = lineIndentAt(source, viewNode.offset);
  return [{
    startOffset: closeOffset,
    endOffset: closeOffset,
    text: `\n\n${viewIndent}  layout {\n${indentBlock(declaration, `${viewIndent}    `)}\n${viewIndent}  }\n${viewIndent}`,
  }];
}

function orderedLayoutInsertion(
  source: string,
  layout: LayoutBlock,
  operation: C4mlPlacementEditOperation,
  obsolete: readonly (
    | PlacementAdjustDeclaration
    | PlacementAlignDeclaration
    | PlacementDistributeDeclaration
    | PlacementPinDeclaration
    | PlacementPlaceDeclaration
  )[],
  declaration: string,
):
  | { readonly startOffset: number; readonly endOffset: number; readonly text: string }
  | "append"
  | undefined {
  const rank = operationRank(operation);
  const candidates = [
    ...layout.places.map((node) => ({ node, rank: 0 })),
    ...layout.alignments.map((node) => ({ node, rank: 1 })),
    ...layout.distributions.map((node) => ({ node, rank: 2 })),
    ...layout.adjustments.map((node) => ({ node, rank: 3 })),
    ...layout.constraints.map((node) => ({ node, rank: 4 })),
    ...layout.pins.map((node) => ({ node, rank: 5 })),
    ...layout.avoidanceRegions.map((node) => ({ node, rank: 6 })),
    ...layout.corridors.map((node) => ({ node, rank: 7 })),
    ...layout.routes.map((node) => ({ node, rank: 8 })),
  ]
    .filter(({ node, rank: candidateRank }) =>
      candidateRank > rank && !obsolete.includes(node as never),
    )
    .sort((left, right) => byOffset(left.node, right.node));
  const next = candidates[0]?.node;
  if (next === undefined) return "append";
  const range = nodeLineRange(source, next.$cstNode);
  if (range === undefined) return undefined;
  const indent = lineIndentAt(source, next.$cstNode?.offset ?? range.startOffset);
  return {
    startOffset: range.startOffset,
    endOffset: range.startOffset,
    text: `${indentBlock(declaration, indent)}\n\n`,
  };
}

function operationRank(operation: C4mlPlacementEditOperation): number {
  switch (operation.kind) {
    case "relative":
      return 0;
    case "align":
      return 1;
    case "distribute":
      return 2;
    case "nudge":
      return 3;
    case "pin":
      return 5;
  }
}

function isDesiredDeclaration(
  layout: LayoutBlock | undefined,
  operation: C4mlPlacementEditOperation,
  candidate:
    | PlacementAdjustDeclaration
    | PlacementAlignDeclaration
    | PlacementDistributeDeclaration
    | PlacementPinDeclaration
    | PlacementPlaceDeclaration,
): boolean {
  if (layout === undefined) return false;
  switch (operation.kind) {
    case "relative":
      return layout.places.includes(candidate as PlacementPlaceDeclaration);
    case "nudge":
      return layout.adjustments.includes(candidate as PlacementAdjustDeclaration);
    case "align":
      return layout.alignments.includes(candidate as PlacementAlignDeclaration);
    case "distribute":
      return layout.distributions.includes(candidate as PlacementDistributeDeclaration);
    case "pin":
      return layout.pins.includes(candidate as PlacementPinDeclaration);
  }
}

function replaceableDeclarations(
  layout: LayoutBlock | undefined,
  operation: C4mlPlacementEditOperation,
): readonly (
  | PlacementAdjustDeclaration
  | PlacementAlignDeclaration
  | PlacementDistributeDeclaration
  | PlacementPinDeclaration
  | PlacementPlaceDeclaration
)[] {
  if (layout === undefined) return [];
  switch (operation.kind) {
    case "relative":
      return [
        ...layout.places.filter(({ subject }) => subject.$refText === operation.subjectId),
        ...layout.adjustments.filter(({ target }) => target.$refText === operation.subjectId),
        ...layout.pins.filter(({ target }) => target.$refText === operation.subjectId),
      ].sort(byOffset);
    case "nudge":
      return [
        ...layout.adjustments.filter(({ target }) => target.$refText === operation.targetId),
        ...layout.pins.filter(({ target }) => target.$refText === operation.targetId),
      ].sort(byOffset);
    case "pin":
      return [
        ...layout.places.filter(({ subject }) => subject.$refText === operation.targetId),
        ...layout.adjustments.filter(({ target }) => target.$refText === operation.targetId),
        ...layout.pins.filter(({ target }) => target.$refText === operation.targetId),
      ].sort(byOffset);
    case "align":
      return layout.alignments.filter(({ items }) =>
        sameIds(items.map(({ $refText }) => $refText), operation.itemIds),
      );
    case "distribute":
      return layout.distributions.filter(({ items }) =>
        sameIds(items.map(({ $refText }) => $refText), operation.itemIds),
      );
  }
}

function renderOperation(operation: C4mlPlacementEditOperation): string {
  switch (operation.kind) {
    case "relative":
      return `place ${operation.subjectId} ${operation.relation} ${operation.anchorId} {\n  gap = ${operation.gap}\n  strength = ${operation.strength}\n}`;
    case "nudge":
      return `adjust ${operation.targetId} {\n  relative-to = automatic\n  move = ${operation.direction} ${operation.distance}\n  strength = ${operation.strength}\n}`;
    case "align":
      return `align ${operation.alignment} [${operation.itemIds.join(", ")}] {\n  anchor = ${operation.anchorId}\n  strength = ${operation.strength}\n}`;
    case "distribute":
      return `distribute ${operation.orientation} [${operation.itemIds.join(", ")}] {\n  gap = ${operation.gap}\n  strength = ${operation.strength}\n}`;
    case "pin":
      return `pin ${operation.targetId} {\n  x = ${operation.x} du\n  y = ${operation.y} du\n  strength = ${operation.strength}\n}`;
  }
}

function affectedIds(operation: C4mlPlacementEditOperation): string[] {
  switch (operation.kind) {
    case "relative":
      return [operation.subjectId, operation.anchorId];
    case "nudge":
    case "pin":
      return [operation.targetId];
    case "align":
    case "distribute":
      return [...operation.itemIds];
  }
}

function nodeLineRange(
  source: string,
  node: { readonly offset: number; readonly end: number } | undefined,
): TextRange | undefined {
  if (node === undefined) return undefined;
  const startOffset = source.lastIndexOf("\n", Math.max(0, node.offset - 1)) + 1;
  const nextLine = source.indexOf("\n", node.end);
  return {
    startOffset,
    endOffset: nextLine < 0 ? node.end : nextLine + 1,
  };
}

function lineIndentAt(source: string, offset: number): string {
  const lineStart = source.lastIndexOf("\n", Math.max(0, offset - 1)) + 1;
  return source.slice(lineStart, offset).match(/^[\t ]*/u)?.[0] ?? "";
}

function lineEndingAt(source: string, offset: number): string {
  if (source.slice(Math.max(0, offset - 2), offset) === "\r\n") return "\r\n";
  return source[offset - 1] === "\n" ? "\n" : "";
}

function indentBlock(text: string, indent: string): string {
  return text
    .split("\n")
    .map((line) => `${indent}${line}`)
    .join("\n");
}

function byOffset(
  left: { readonly $cstNode?: { readonly offset: number } },
  right: { readonly $cstNode?: { readonly offset: number } },
): number {
  return (left.$cstNode?.offset ?? 0) - (right.$cstNode?.offset ?? 0);
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function invalid(
  code: C4mlPlacementAuthoringIssueCode,
  message: string,
): C4mlPlacementEditProposal {
  return { valid: false, issues: [{ code, message }] };
}
