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
  ElementDeclaration,
  ViewDeclaration,
} from "./generated/ast.js";
import { createC4mlDraftServices } from "./services.js";

export type C4mlSemanticElementKind =
  | "code-element"
  | "component"
  | "container"
  | "person"
  | "software-system";

export type C4mlSemanticViewKind =
  | "code"
  | "component"
  | "container"
  | "deployment"
  | "dynamic"
  | "system-context"
  | "system-landscape";

export interface C4mlSemanticAuthoringElement {
  readonly id: string;
  readonly label: string;
  readonly kind: C4mlSemanticElementKind;
  readonly ownerId?: string;
}

export interface C4mlSemanticCreateAction {
  readonly kind: C4mlSemanticElementKind;
  readonly ownerId?: string;
  readonly ownerLabel?: string;
}

export interface C4mlSemanticConnectionOption {
  readonly sourceId: string;
  readonly targetIds: readonly string[];
}

export interface C4mlSemanticAuthoringContext {
  readonly viewId: string;
  readonly viewKind: C4mlSemanticViewKind;
  readonly scopeId?: string;
  readonly createActions: readonly C4mlSemanticCreateAction[];
  readonly elements: readonly C4mlSemanticAuthoringElement[];
  readonly connectionOptions: readonly C4mlSemanticConnectionOption[];
}

export type C4mlSemanticEditOperation =
  | {
      readonly kind: "create-element";
      readonly elementKind: C4mlSemanticElementKind;
      readonly elementId: string;
      readonly name: string;
      readonly responsibility: string;
      readonly ownerId?: string;
      readonly classification?: "external" | "internal";
      readonly technology?: string;
      readonly codeKind?: string;
      readonly language?: string;
    }
  | {
      readonly kind: "create-relationship";
      readonly relationshipId: string;
      readonly sourceId: string;
      readonly targetId: string;
      readonly intent: string;
      readonly technology?: string;
      readonly protocol?: string;
    };

export interface C4mlSemanticEditRequest {
  readonly id: string;
  readonly viewId: string;
  readonly intent: SourceChangeIntent;
  readonly operation: C4mlSemanticEditOperation;
}

export type C4mlSemanticAuthoringIssueCode =
  | "C4ML-AUTHORING-201"
  | "C4ML-AUTHORING-202"
  | "C4ML-AUTHORING-203"
  | "C4ML-AUTHORING-204"
  | "C4ML-AUTHORING-205";

export interface C4mlSemanticAuthoringIssue {
  readonly code: C4mlSemanticAuthoringIssueCode;
  readonly message: string;
}

export type C4mlSemanticAuthoringContextResult =
  | {
      readonly valid: true;
      readonly context: C4mlSemanticAuthoringContext;
      readonly issues: readonly [];
    }
  | {
      readonly valid: false;
      readonly context: undefined;
      readonly issues: readonly C4mlSemanticAuthoringIssue[];
    };

export type C4mlSemanticEditProposal =
  | {
      readonly valid: true;
      readonly changeSet: ProposedProjectSourceChangeSet;
      readonly documentUri: string;
      readonly proposedText: string;
      readonly issues: readonly [];
    }
  | {
      readonly valid: false;
      readonly issues: readonly C4mlSemanticAuthoringIssue[];
    };

interface ParsedProjectDocument {
  readonly uri: string;
  readonly source: string;
  readonly ast: C4mlDocument;
}

interface ContextOwner {
  readonly document: ParsedProjectDocument;
  readonly view: ViewDeclaration;
}

const identifierPattern = /^[_A-Za-z][\-_A-Za-z0-9]*$/u;

export async function inspectC4mlSemanticAuthoringContext(
  project: ArchitectureProjectInput,
  viewId: string,
): Promise<C4mlSemanticAuthoringContextResult> {
  const parsed = await parseProject(project);
  if (parsed === undefined) {
    return contextInvalid(
      "C4ML-AUTHORING-201",
      "Semantic authoring requires a valid C4ML project.",
    );
  }
  const owner = uniqueViewOwner(parsed, viewId);
  if (owner === undefined) {
    return contextInvalid(
      "C4ML-AUTHORING-202",
      `Exactly one view declaration with stable identifier "${viewId}" is required.`,
    );
  }
  const viewKind = viewType(owner.view);
  if (viewKind === undefined) {
    return contextInvalid(
      "C4ML-AUTHORING-202",
      `View "${viewId}" has no supported C4 view type.`,
    );
  }
  return {
    valid: true,
    context: createContext(parsed, owner, viewKind),
    issues: [],
  };
}

export async function proposeC4mlSemanticEdit(
  project: ArchitectureProjectInput,
  request: C4mlSemanticEditRequest,
): Promise<C4mlSemanticEditProposal> {
  if (request.intent.kind !== "architecture") {
    return proposalInvalid(
      "C4ML-AUTHORING-203",
      "Semantic authoring changes require an architecture intent.",
    );
  }
  const parsed = await parseProject(project);
  if (parsed === undefined) {
    return proposalInvalid(
      "C4ML-AUTHORING-201",
      "Semantic authoring requires a valid C4ML project.",
    );
  }
  const owner = uniqueViewOwner(parsed, request.viewId);
  const viewKind = owner === undefined ? undefined : viewType(owner.view);
  if (owner === undefined || viewKind === undefined) {
    return proposalInvalid(
      "C4ML-AUTHORING-202",
      `Exactly one supported view declaration with stable identifier "${request.viewId}" is required.`,
    );
  }
  const context = createContext(parsed, owner, viewKind);
  const issue = validateOperation(parsed, context, request.operation);
  if (issue !== undefined) return proposalInvalid(issue.code, issue.message);

  const generated =
    request.operation.kind === "create-element"
      ? createElementEdit(parsed, owner, request.operation)
      : createRelationshipEdit(parsed, owner, request.operation);
  if (generated === undefined) {
    return proposalInvalid(
      "C4ML-AUTHORING-205",
      "C4ML could not locate a safe source insertion point for this architecture change.",
    );
  }
  const changeSet = createProposedProjectSourceChangeSet(project, {
    id: request.id,
    intent: request.intent,
    affectedIds:
      request.operation.kind === "create-element"
        ? [
            request.operation.elementId,
            ...(request.operation.ownerId === undefined
              ? []
              : [request.operation.ownerId]),
          ]
        : [
            request.operation.relationshipId,
            request.operation.sourceId,
            request.operation.targetId,
          ],
    edits: [{ documentUri: generated.documentUri, ...generated.edit }],
  });
  const application = applyProjectSourceChangeSet(project, changeSet);
  if (!application.valid) {
    return proposalInvalid(
      "C4ML-AUTHORING-205",
      "The proposed architecture source change could not be applied atomically.",
    );
  }
  return {
    valid: true,
    changeSet,
    documentUri: generated.documentUri,
    proposedText: generated.proposedText,
    issues: [],
  };
}

function createContext(
  documents: readonly ParsedProjectDocument[],
  owner: ContextOwner,
  viewKind: C4mlSemanticViewKind,
): C4mlSemanticAuthoringContext {
  const allElements = documents.flatMap(({ ast }) => ast.model?.elements ?? []);
  const scopeId = viewScope(owner.view);
  const createActions = createActionsFor(viewKind, scopeId, allElements);
  const eligible = connectionElementsFor(viewKind, scopeId, allElements);
  const connectionOptions = eligible
    .map((source) => ({
      sourceId: source.id,
      targetIds: eligible
        .filter(
          (target) =>
            target.id !== source.id &&
            validConnectionPair(viewKind, scopeId, allElements, source.id, target.id),
        )
        .map(({ id }) => id)
        .sort(compareText),
    }))
    .filter(({ targetIds }) => targetIds.length > 0)
    .sort((left, right) => compareText(left.sourceId, right.sourceId));
  return {
    viewId: owner.view.name,
    viewKind,
    ...(scopeId === undefined ? {} : { scopeId }),
    createActions,
    elements: eligible.sort((left, right) => compareText(left.id, right.id)),
    connectionOptions,
  };
}

function createActionsFor(
  viewKind: C4mlSemanticViewKind,
  scopeId: string | undefined,
  elements: readonly ElementDeclaration[],
): readonly C4mlSemanticCreateAction[] {
  if (viewKind === "system-context" || viewKind === "system-landscape") {
    return [{ kind: "person" }, { kind: "software-system" }];
  }
  const scope = elements.find(({ name }) => name === scopeId);
  const actionKind =
    viewKind === "container" && scope?.$type === "SoftwareSystemDeclaration"
      ? "container"
      : viewKind === "component" && scope?.$type === "ContainerDeclaration"
        ? "component"
        : viewKind === "code" && scope?.$type === "ComponentDeclaration"
          ? "code-element"
          : undefined;
  return actionKind === undefined || scopeId === undefined || scope === undefined
    ? []
    : [{ kind: actionKind, ownerId: scopeId, ownerLabel: elementLabel(scope) }];
}

function connectionElementsFor(
  viewKind: C4mlSemanticViewKind,
  scopeId: string | undefined,
  elements: readonly ElementDeclaration[],
): C4mlSemanticAuthoringElement[] {
  const scope = elements.find(({ name }) => name === scopeId);
  return elements.flatMap((element) => {
    const kind = semanticKind(element);
    if (kind === undefined) return [];
    const ownerId = elementOwnerId(element);
    const eligible =
      viewKind === "system-landscape" || viewKind === "system-context"
        ? kind === "person" || kind === "software-system"
        : viewKind === "container"
          ? kind === "person" ||
            kind === "software-system" ||
            (kind === "container" && ownerId === scopeId)
          : viewKind === "component"
            ? kind === "person" ||
              kind === "software-system" ||
              (kind === "component" && ownerId === scopeId) ||
              (kind === "container" &&
                scope?.$type === "ContainerDeclaration" &&
                ownerId === scope.owner.$refText)
            : viewKind === "code"
              ? kind === "code-element" && ownerId === scopeId
              : false;
    return eligible
      ? [{ id: element.name, label: elementLabel(element), kind, ...(ownerId === undefined ? {} : { ownerId }) }]
      : [];
  });
}

function validConnectionPair(
  viewKind: C4mlSemanticViewKind,
  scopeId: string | undefined,
  allElements: readonly ElementDeclaration[],
  sourceId: string,
  targetId: string,
): boolean {
  if (sourceId === targetId) return false;
  if (viewKind === "system-landscape") return true;
  if (viewKind === "system-context") {
    return sourceId === scopeId || targetId === scopeId;
  }
  const primary = (id: string): boolean => {
    const element = allElements.find(({ name }) => name === id);
    if (element === undefined) return false;
    return viewKind === "container"
      ? element.$type === "ContainerDeclaration" && element.owner.$refText === scopeId
      : viewKind === "component"
        ? element.$type === "ComponentDeclaration" && element.owner.$refText === scopeId
        : viewKind === "code"
          ? element.$type === "CodeElementDeclaration" && element.owner.$refText === scopeId
          : false;
  };
  return primary(sourceId) || primary(targetId);
}

function validateOperation(
  documents: readonly ParsedProjectDocument[],
  context: C4mlSemanticAuthoringContext,
  operation: C4mlSemanticEditOperation,
): C4mlSemanticAuthoringIssue | undefined {
  const elements = documents.flatMap(({ ast }) => ast.model?.elements ?? []);
  const relationships = documents.flatMap(
    ({ ast }) => ast.relations?.relationships ?? [],
  );
  if (operation.kind === "create-element") {
    if (!identifierPattern.test(operation.elementId)) {
      return issue("C4ML-AUTHORING-203", "The element identifier must start with a letter and contain only letters, numbers, hyphens, or underscores.");
    }
    if (elements.some(({ name }) => name === operation.elementId)) {
      return issue("C4ML-AUTHORING-204", `Element identifier "${operation.elementId}" is already in use.`);
    }
    if (operation.name.trim().length === 0 || operation.responsibility.trim().length === 0) {
      return issue("C4ML-AUTHORING-203", "Name and responsibility are required.");
    }
    const action = context.createActions.find(
      ({ kind, ownerId }) => kind === operation.elementKind && ownerId === operation.ownerId,
    );
    if (action === undefined) {
      return issue("C4ML-AUTHORING-203", `A ${operation.elementKind} cannot be created in this C4 view context.`);
    }
    if (
      (operation.elementKind === "person" || operation.elementKind === "software-system") &&
      operation.classification !== "internal" &&
      operation.classification !== "external"
    ) {
      return issue("C4ML-AUTHORING-203", "People and software systems require an internal or external classification.");
    }
    if (
      (operation.elementKind === "container" || operation.elementKind === "component") &&
      operation.technology?.trim().length === 0
    ) {
      return issue("C4ML-AUTHORING-203", "Containers and Components require a technology or runtime.");
    }
    if (
      operation.elementKind === "code-element" &&
      (operation.codeKind?.trim().length === 0 ||
        !identifierPattern.test(operation.codeKind?.trim() ?? ""))
    ) {
      return issue("C4ML-AUTHORING-203", "Code Elements require a code kind written as a stable identifier.");
    }
    return undefined;
  }
  if (!identifierPattern.test(operation.relationshipId)) {
    return issue("C4ML-AUTHORING-203", "The connection identifier must start with a letter and contain only letters, numbers, hyphens, or underscores.");
  }
  if (relationships.some(({ name }) => name === operation.relationshipId)) {
    return issue("C4ML-AUTHORING-204", `Relationship identifier "${operation.relationshipId}" is already in use.`);
  }
  if (operation.intent.trim().length === 0) {
    return issue("C4ML-AUTHORING-203", "A directed connection requires a meaningful intent.");
  }
  const targetIds = context.connectionOptions.find(
    ({ sourceId }) => sourceId === operation.sourceId,
  )?.targetIds;
  if (targetIds === undefined || !targetIds.includes(operation.targetId)) {
    return issue("C4ML-AUTHORING-203", "The selected source and target are not a valid connection in this C4 view context.");
  }
  return undefined;
}

function createElementEdit(
  documents: readonly ParsedProjectDocument[],
  owner: ContextOwner,
  operation: Extract<C4mlSemanticEditOperation, { readonly kind: "create-element" }>,
) {
  const target =
    operation.ownerId === undefined
      ? documents.find(({ ast }) => ast.model !== undefined) ?? owner.document
      : documents.find(({ ast }) =>
          ast.model?.elements.some(({ name }) => name === operation.ownerId),
        );
  if (target === undefined) return undefined;
  const proposedText = elementDeclaration(operation);
  const edit = target.ast.model === undefined
    ? insertTopLevelBlock(target.source, target.ast, `model {\n${proposedText}\n}`)
    : insertIntoBlock(target.source, target.ast.model.$cstNode, proposedText);
  return edit === undefined ? undefined : { documentUri: target.uri, edit, proposedText };
}

function createRelationshipEdit(
  documents: readonly ParsedProjectDocument[],
  owner: ContextOwner,
  operation: Extract<C4mlSemanticEditOperation, { readonly kind: "create-relationship" }>,
) {
  const target = documents.find(({ ast }) => ast.relations !== undefined) ?? owner.document;
  const proposedText = relationshipDeclaration(operation);
  const edit = target.ast.relations === undefined
    ? insertRelationsBlock(target.source, target.ast, proposedText)
    : insertIntoBlock(target.source, target.ast.relations.$cstNode, proposedText);
  return edit === undefined ? undefined : { documentUri: target.uri, edit, proposedText };
}

function elementDeclaration(
  operation: Extract<C4mlSemanticEditOperation, { readonly kind: "create-element" }>,
): string {
  const e = "  ";
  const p = "    ";
  const head =
    operation.elementKind === "software-system"
      ? `system ${operation.elementId}`
      : operation.elementKind === "code-element"
        ? `code ${operation.elementId} inside ${operation.ownerId}`
        : operation.elementKind === "person"
          ? `person ${operation.elementId}`
          : `${operation.elementKind} ${operation.elementId} inside ${operation.ownerId}`;
  const properties = [
    `${p}name = ${JSON.stringify(operation.name.trim())}`,
    `${p}responsibility = ${JSON.stringify(operation.responsibility.trim())}`,
    ...(operation.classification === undefined
      ? []
      : [`${p}classification = ${operation.classification}`]),
    ...(operation.technology?.trim()
      ? [`${p}technology = ${JSON.stringify(operation.technology.trim())}`]
      : []),
    ...(operation.codeKind?.trim()
      ? [`${p}code-kind = ${operation.codeKind.trim()}`]
      : []),
    ...(operation.language?.trim()
      ? [`${p}language = ${JSON.stringify(operation.language.trim())}`]
      : []),
  ];
  return [`${e}${head} {`, ...properties, `${e}}`].join("\n");
}

function relationshipDeclaration(
  operation: Extract<C4mlSemanticEditOperation, { readonly kind: "create-relationship" }>,
): string {
  return [
    `  relation ${operation.relationshipId} {`,
    `    from = ${operation.sourceId}`,
    `    to = ${operation.targetId}`,
    `    intent = ${JSON.stringify(operation.intent.trim())}`,
    ...(operation.technology?.trim()
      ? [`    technology = ${JSON.stringify(operation.technology.trim())}`]
      : []),
    ...(operation.protocol?.trim()
      ? [`    protocol = ${JSON.stringify(operation.protocol.trim())}`]
      : []),
    "  }",
  ].join("\n");
}

function insertIntoBlock(
  source: string,
  node: { readonly offset: number; readonly end: number; readonly text: string } | undefined,
  declaration: string,
) {
  if (node === undefined) return undefined;
  const relativeClose = node.text.lastIndexOf("}");
  if (relativeClose < 0) return undefined;
  const closeOffset = node.offset + relativeClose;
  const eol = lineEnding(source);
  const leading = source.slice(0, closeOffset).endsWith("\n") ? "" : eol;
  return { startOffset: closeOffset, endOffset: closeOffset, text: `${leading}${declaration.replaceAll("\n", eol)}${eol}` };
}

function insertRelationsBlock(
  source: string,
  ast: C4mlDocument,
  declaration: string,
) {
  const eol = lineEnding(source);
  const block = `relations {${eol}${declaration.replaceAll("\n", eol)}${eol}}`;
  const anchor = ast.deployment?.$cstNode ?? ast.views[0]?.$cstNode;
  const offset = anchor?.offset ?? source.length;
  return { startOffset: offset, endOffset: offset, text: `${block}${eol}${eol}` };
}

function insertTopLevelBlock(
  source: string,
  ast: C4mlDocument,
  block: string,
) {
  const eol = lineEnding(source);
  const anchor = ast.relations?.$cstNode ?? ast.deployment?.$cstNode ?? ast.views[0]?.$cstNode;
  const offset = anchor?.offset ?? source.length;
  return { startOffset: offset, endOffset: offset, text: `${block.replaceAll("\n", eol)}${eol}${eol}` };
}

async function parseProject(
  project: ArchitectureProjectInput,
): Promise<readonly ParsedProjectDocument[] | undefined> {
  const services = createC4mlDraftServices();
  const documents = project.documents.map((sourceDocument) => {
    const document = services.shared.workspace.LangiumDocumentFactory.fromString(
      sourceDocument.text,
      URI.from({ scheme: "c4ml-semantic-authoring", path: `/${sourceDocument.uri}` }),
    );
    services.shared.workspace.LangiumDocuments.addDocument(document);
    return { sourceDocument, document };
  });
  await services.shared.workspace.DocumentBuilder.build(
    documents.map(({ document }) => document),
    { validation: true },
  );
  if (documents.some(({ document }) => (document.diagnostics ?? []).some(({ severity }) => severity === 1))) {
    return undefined;
  }
  return documents.map(({ sourceDocument, document }) => ({
    uri: sourceDocument.uri,
    source: sourceDocument.text,
    ast: document.parseResult.value as C4mlDocument,
  }));
}

function uniqueViewOwner(
  documents: readonly ParsedProjectDocument[],
  viewId: string,
): ContextOwner | undefined {
  const owners = documents.flatMap((document) =>
    document.ast.views.filter(({ name }) => name === viewId).map((view) => ({ document, view })),
  );
  return owners.length === 1 ? owners[0] : undefined;
}

function viewType(view: ViewDeclaration): C4mlSemanticViewKind | undefined {
  const property = view.properties.find(({ $type }) => $type === "ViewTypeProperty");
  return property?.$type === "ViewTypeProperty"
    ? property.value as C4mlSemanticViewKind
    : undefined;
}

function viewScope(view: ViewDeclaration): string | undefined {
  const scope = view.properties.find(({ $type }) => $type === "ViewScopeProperty");
  return scope?.$type === "ViewScopeProperty" ? scope.element?.$refText : undefined;
}

function semanticKind(element: ElementDeclaration): C4mlSemanticElementKind | undefined {
  switch (element.$type) {
    case "PersonDeclaration": return "person";
    case "SoftwareSystemDeclaration": return "software-system";
    case "ContainerDeclaration": return "container";
    case "ComponentDeclaration": return "component";
    case "CodeElementDeclaration": return "code-element";
  }
}

function elementOwnerId(element: ElementDeclaration): string | undefined {
  switch (element.$type) {
    case "ContainerDeclaration":
    case "ComponentDeclaration":
    case "CodeElementDeclaration":
      return element.owner.$refText;
    default:
      return undefined;
  }
}

function elementLabel(element: ElementDeclaration): string {
  const name = element.properties.find(({ $type }) => $type === "DisplayNameProperty");
  return name?.$type === "DisplayNameProperty" ? name.value : element.name;
}

function lineEnding(source: string): "\n" | "\r\n" {
  return source.includes("\r\n") ? "\r\n" : "\n";
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function issue(
  code: C4mlSemanticAuthoringIssueCode,
  message: string,
): C4mlSemanticAuthoringIssue {
  return { code, message };
}

function contextInvalid(
  code: C4mlSemanticAuthoringIssueCode,
  message: string,
): C4mlSemanticAuthoringContextResult {
  return { valid: false, context: undefined, issues: [issue(code, message)] };
}

function proposalInvalid(
  code: C4mlSemanticAuthoringIssueCode,
  message: string,
): C4mlSemanticEditProposal {
  return { valid: false, issues: [issue(code, message)] };
}
