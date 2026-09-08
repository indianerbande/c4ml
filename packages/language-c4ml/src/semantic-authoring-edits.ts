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
  EnvironmentDeclaration,
  RelationshipDeclaration,
  ViewDeclaration,
} from "./generated/ast.js";
import { createC4mlDraftServices } from "./services.js";
import { parseC4mlProjectDraft } from "./language.js";

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

export type C4mlSemanticDeploymentItemKind =
  | "container-instance"
  | "deployment-node"
  | "infrastructure-node"
  | "software-system-instance";

export interface C4mlSemanticDeploymentNodeOption {
  readonly id: string;
  readonly label: string;
}

export interface C4mlSemanticDeploymentElementOption {
  readonly id: string;
  readonly label: string;
  readonly kind: "container" | "software-system";
}

export interface C4mlSemanticDeploymentAuthoringContext {
  readonly environmentId: string;
  readonly environmentLabel: string;
  readonly createActions: readonly C4mlSemanticDeploymentItemKind[];
  readonly nodes: readonly C4mlSemanticDeploymentNodeOption[];
  readonly elements: readonly C4mlSemanticDeploymentElementOption[];
}

export interface C4mlSemanticDynamicRelationshipOption {
  readonly id: string;
  readonly sourceId: string;
  readonly sourceLabel: string;
  readonly targetId: string;
  readonly targetLabel: string;
  readonly intent: string;
}

export interface C4mlSemanticDynamicAuthoringContext {
  readonly nextOrder: number;
  readonly relationships: readonly C4mlSemanticDynamicRelationshipOption[];
}

export interface C4mlSemanticAuthoringContext {
  readonly viewId: string | undefined;
  readonly viewKind: C4mlSemanticViewKind | undefined;
  readonly viewTitle?: string;
  readonly viewPurpose?: string;
  readonly diagramOptions?: readonly C4mlDiagramCreateOption[];
  readonly scopeId?: string;
  readonly createActions: readonly C4mlSemanticCreateAction[];
  readonly elements: readonly C4mlSemanticAuthoringElement[];
  readonly connectionOptions: readonly C4mlSemanticConnectionOption[];
  readonly viewElements?: readonly (C4mlSemanticAuthoringElement & {
    readonly visible: boolean;
    readonly canShow: boolean;
    readonly canHide: boolean;
    readonly explicitlyShown: boolean;
    readonly suitableViews: readonly string[];
  })[];
  readonly deployment?: C4mlSemanticDeploymentAuthoringContext;
  readonly dynamic?: C4mlSemanticDynamicAuthoringContext;
}

export interface C4mlDiagramCreateOption {
  readonly id: string;
  readonly kind: "system-landscape" | "system-context" | "container" | "component" | "code";
  readonly scopeId?: string;
  readonly scopeLabel?: string;
}

export type C4mlSemanticEditOperation =
  | { readonly kind: "create-view"; readonly optionId: string; readonly viewId: string;
      readonly title: string; readonly purpose: string; readonly scopeName: string }
  | {
      readonly kind: "create-system-with-container-view";
      readonly systemId: string;
      readonly name: string;
      readonly responsibility: string;
      readonly classification: "external" | "internal";
      readonly viewId: string;
      readonly title: string;
      readonly purpose: string;
    }
  | { readonly kind: "update-view"; readonly title: string; readonly purpose: string }
  | { readonly kind: "delete-view" }
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
      readonly showInView?: boolean;
    }
  | {
      readonly kind: "create-relationship";
      readonly relationshipId: string;
      readonly sourceId: string;
      readonly targetId: string;
      readonly intent: string;
      readonly technology?: string;
      readonly protocol?: string;
      readonly showInView?: boolean;
    }
  | { readonly kind: "show-element"; readonly elementId: string }
  | { readonly kind: "hide-element"; readonly elementId: string }
  | { readonly kind: "delete-element"; readonly elementId: string }
  | {
      readonly kind: "create-deployment-item";
      readonly itemKind: C4mlSemanticDeploymentItemKind;
      readonly itemId: string;
      readonly name?: string;
      readonly responsibility?: string;
      readonly technology?: string;
      readonly parentNodeId?: string;
      readonly nodeId?: string;
      readonly elementId?: string;
    }
  | {
      readonly kind: "create-dynamic-interaction";
      readonly interactionId: string;
      readonly order: number;
      readonly relationshipId: string;
      readonly intent: string;
      readonly parallelGroup?: string;
    };

export interface C4mlSemanticEditRequest {
  readonly id: string;
  readonly viewId: string | undefined;
  readonly documentUri?: string;
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
  viewId: string | undefined,
): Promise<C4mlSemanticAuthoringContextResult> {
  const parsed = await parseProject(project);
  if (parsed === undefined) {
    return contextInvalid(
      "C4ML-AUTHORING-201",
      "Semantic authoring requires a valid C4ML project.",
    );
  }
  if (viewId === undefined) {
    const compiled = await parseC4mlProjectDraft(project);
    return compiled.valid
      ? { valid: true, context: modelContext(parsed), issues: [] }
      : contextInvalid("C4ML-AUTHORING-201", "Authoring requires a valid project.");
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
  const context = createContext(parsed, owner, viewKind);
  const compiled = await parseC4mlProjectDraft(project);
  if (!compiled.valid) return contextInvalid("C4ML-AUTHORING-201", "Authoring requires a valid project.");
  const visible = new Set(compiled.resolvedViews?.find(({ id }) => id === viewId)?.elements.map(({ id }) => id));
  const allElements = parsed.flatMap(({ ast }) => ast.model?.elements ?? []);
  const allViews = parsed.flatMap(({ ast }) => ast.views);
  const explicitShow = new Set(owner.view.properties
    .filter((property) => property.$type === "ViewShowProperty")
    .flatMap((property) => property.values.map((value) => value.$refText)));
  const viewElements = allElements.flatMap((element) => {
    const kind = semanticKind(element);
    if (kind === undefined) return [];
    const suitableViews = allViews.filter((view) => {
      const type = viewType(view);
      return type !== undefined && connectionElementsFor(type, viewScope(view), allElements).some(({ id }) => id === element.name);
    }).map(({ name }) => name).sort(compareText);
    const ownerId = elementOwnerId(element);
    return [{ id: element.name, label: elementLabel(element), kind,
      ...(ownerId === undefined ? {} : { ownerId }), visible: visible.has(element.name),
      canShow: context.elements.some(({ id }) => id === element.name),
      canHide: visible.has(element.name) && element.name !== context.scopeId,
      explicitlyShown: explicitShow.has(element.name), suitableViews }];
  }).sort((a, b) => compareText(a.id, b.id));
  return {
    valid: true,
    context: { ...context, viewElements },
    issues: [],
  };
}

export async function proposeC4mlSemanticEdit(
  project: ArchitectureProjectInput,
  request: C4mlSemanticEditRequest,
): Promise<C4mlSemanticEditProposal> {
  const viewOperation = request.operation.kind === "create-view" ||
    request.operation.kind === "update-view" ||
    request.operation.kind === "delete-view" ||
    request.operation.kind === "show-element" ||
    request.operation.kind === "hide-element";
  if (request.intent.kind !== (viewOperation ? "view" : "architecture")) {
    return proposalInvalid(
      "C4ML-AUTHORING-203",
      viewOperation
        ? "Diagram membership changes require a View intent."
        : "Semantic authoring changes require an architecture intent.",
    );
  }
  const parsed = await parseProject(project);
  if (parsed === undefined) {
    return proposalInvalid(
      "C4ML-AUTHORING-201",
      "Semantic authoring requires a valid C4ML project.",
    );
  }
  if (request.viewId === undefined) return proposeModelEdit(project, parsed, request);
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

  const generated = createOperationEdits(parsed, owner, context, request.operation);
  if (generated.length === 0) {
    return proposalInvalid(
      "C4ML-AUTHORING-205",
      "C4ML could not locate a safe source insertion point for this architecture change.",
    );
  }
  const extra = request.operation.kind === "create-element" && request.operation.showInView
    ? createShowEdit(owner, [request.operation.elementId])
    : request.operation.kind === "create-relationship" && request.operation.showInView
      ? createShowEdit(owner, [request.operation.sourceId, request.operation.targetId])
      : undefined;
  const changeSet = createProposedProjectSourceChangeSet(project, {
    id: request.id,
    intent: request.intent,
    affectedIds: affectedIdsFor(request.operation, request.viewId),
    edits: [...generated.map(({ documentUri, edit }) => ({ documentUri, ...edit })),
      ...(extra === undefined ? [] : [{ documentUri: extra.documentUri, ...extra.edit }])],
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
    documentUri: generated[0]!.documentUri,
    proposedText: [...generated, ...(extra === undefined ? [] : [extra])]
      .map(({ documentUri, proposedText }) => `// ${documentUri}\n${proposedText}`).join("\n\n"),
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
  const deployment = viewKind === "deployment"
    ? deploymentContext(documents, owner.view, allElements)
    : undefined;
  const dynamic = viewKind === "dynamic"
    ? dynamicContext(documents, owner.view, allElements)
    : undefined;
  const viewTitle = viewPropertyValue(owner.view, "ViewTitleProperty");
  const viewPurpose = viewPropertyValue(owner.view, "ViewPurposeProperty");
  return {
    viewId: owner.view.name,
    viewKind,
    ...(viewTitle === undefined ? {} : { viewTitle }),
    ...(viewPurpose === undefined ? {} : { viewPurpose }),
    ...(scopeId === undefined ? {} : { scopeId }),
    createActions,
    elements: eligible.sort((left, right) => compareText(left.id, right.id)),
    connectionOptions,
    ...(deployment === undefined ? {} : { deployment }),
    ...(dynamic === undefined ? {} : { dynamic }),
  };
}

function deploymentContext(
  documents: readonly ParsedProjectDocument[],
  view: ViewDeclaration,
  elements: readonly ElementDeclaration[],
): C4mlSemanticDeploymentAuthoringContext | undefined {
  const environmentId = view.properties.find(
    ({ $type }) => $type === "ViewEnvironmentProperty",
  );
  if (environmentId?.$type !== "ViewEnvironmentProperty") return undefined;
  const environment = documents.flatMap(
    ({ ast }) => ast.deployment?.environments ?? [],
  ).find(({ name }) => name === environmentId.value.$refText);
  if (environment === undefined) return undefined;
  const systemsProperty = view.properties.find(
    ({ $type }) => $type === "ViewSystemsProperty",
  );
  const selectedSystems = new Set(
    systemsProperty?.$type === "ViewSystemsProperty"
      ? systemsProperty.values.map(({ $refText }) => $refText)
      : [],
  );
  const deployable = elements.flatMap<C4mlSemanticDeploymentElementOption>((element) => {
    if (element.$type === "SoftwareSystemDeclaration" && selectedSystems.has(element.name)) {
      return [{ id: element.name, label: elementLabel(element), kind: "software-system" as const }];
    }
    if (
      element.$type === "ContainerDeclaration" &&
      selectedSystems.has(element.owner.$refText)
    ) {
      return [{ id: element.name, label: elementLabel(element), kind: "container" as const }];
    }
    return [];
  }).sort((left, right) => compareText(left.id, right.id));
  const nodes = environment.items.flatMap((item) =>
    item.$type === "DeploymentNodeDeclaration"
      ? [{ id: item.name, label: deploymentItemLabel(item) }]
      : [],
  ).sort((left, right) => compareText(left.id, right.id));
  return {
    environmentId: environment.name,
    environmentLabel: environmentLabel(environment),
    createActions: [
      "deployment-node",
      ...(nodes.length === 0 ? [] : ["infrastructure-node" as const]),
      ...(nodes.length === 0 || !deployable.some(({ kind }) => kind === "software-system")
        ? []
        : ["software-system-instance" as const]),
      ...(nodes.length === 0 || !deployable.some(({ kind }) => kind === "container")
        ? []
        : ["container-instance" as const]),
    ],
    nodes,
    elements: deployable,
  };
}

function dynamicContext(
  documents: readonly ParsedProjectDocument[],
  view: ViewDeclaration,
  elements: readonly ElementDeclaration[],
): C4mlSemanticDynamicAuthoringContext {
  const elementById = new Map(elements.map((element) => [element.name, element]));
  const relationships = documents.flatMap(({ ast }) => ast.relations?.relationships ?? [])
    .flatMap((relationship) => {
      const details = relationshipDetails(relationship);
      if (details === undefined) return [];
      const source = elementById.get(details.sourceId);
      const target = elementById.get(details.targetId);
      if (!isDynamicEndpoint(source) || !isDynamicEndpoint(target)) return [];
      return [{
        id: relationship.name,
        sourceId: source.name,
        sourceLabel: elementLabel(source),
        targetId: target.name,
        targetLabel: elementLabel(target),
        intent: details.intent,
      }];
    })
    .sort((left, right) => compareText(left.id, right.id));
  const orders = view.interactions.flatMap((interaction) => {
    const order = interaction.properties.find(({ $type }) => $type === "InteractionOrderProperty");
    return order?.$type === "InteractionOrderProperty" ? [order.value] : [];
  });
  return {
    nextOrder: orders.length === 0 ? 1 : Math.max(...orders) + 1,
    relationships,
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
  if (operation.kind === "create-view") return issue("C4ML-AUTHORING-203", "Create diagrams from the model, not from a View operation.");
  if (operation.kind === "update-view") {
    return operation.title.trim().length > 0 && operation.purpose.trim().length > 0
      ? undefined
      : issue("C4ML-AUTHORING-203", "Diagram title and purpose are required.");
  }
  if (operation.kind === "delete-view") return undefined;
  const elements = documents.flatMap(({ ast }) => ast.model?.elements ?? []);
  const views = documents.flatMap(({ ast }) => ast.views);
  const relationships = documents.flatMap(
    ({ ast }) => ast.relations?.relationships ?? [],
  );
  const deploymentItems = documents.flatMap(({ ast }) =>
    ast.deployment?.environments.flatMap(({ items }) => items) ?? [],
  );
  if (operation.kind === "show-element") {
    return context.elements.some(({ id }) => id === operation.elementId)
      ? undefined
      : issue("C4ML-AUTHORING-203", "This element does not belong to the level or scope of this View. Choose a suitable View.");
  }
  if (operation.kind === "hide-element") {
    return operation.elementId !== context.scopeId &&
      context.elements.some(({ id }) => id === operation.elementId)
      ? undefined
      : issue("C4ML-AUTHORING-203", "The focal element cannot be removed from its own diagram. Choose another visible element.");
  }
  if (operation.kind === "delete-element") {
    return elements.some(({ name }) => name === operation.elementId)
      ? undefined
      : issue("C4ML-AUTHORING-203", "Select an existing architecture element to delete from the model.");
  }
  if (operation.kind === "create-system-with-container-view") {
    if (context.viewKind !== "container") {
      return issue(
        "C4ML-AUTHORING-203",
        "A Software System with its Container diagram can be created from an active Container View.",
      );
    }
    if (!identifierPattern.test(operation.systemId) || !identifierPattern.test(operation.viewId)) {
      return issue(
        "C4ML-AUTHORING-203",
        "The Software System and diagram identifiers must start with a letter and contain only letters, numbers, hyphens, or underscores.",
      );
    }
    if (elements.some(({ name }) => name === operation.systemId)) {
      return issue("C4ML-AUTHORING-204", `Element identifier "${operation.systemId}" is already in use.`);
    }
    if (views.some(({ name }) => name === operation.viewId)) {
      return issue("C4ML-AUTHORING-204", `Diagram identifier "${operation.viewId}" is already in use.`);
    }
    if (
      operation.name.trim().length === 0 ||
      operation.responsibility.trim().length === 0 ||
      operation.title.trim().length === 0 ||
      operation.purpose.trim().length === 0
    ) {
      return issue(
        "C4ML-AUTHORING-203",
        "Software System name, responsibility, diagram title, and diagram purpose are required.",
      );
    }
    if (operation.classification !== "internal" && operation.classification !== "external") {
      return issue("C4ML-AUTHORING-203", "Software Systems require an internal or external classification.");
    }
    return undefined;
  }
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
  if (operation.kind === "create-deployment-item") {
    if (context.deployment === undefined) {
      return issue("C4ML-AUTHORING-203", "Deployment topology can be changed only from an active Deployment View.");
    }
    if (!context.deployment.createActions.includes(operation.itemKind)) {
      return issue("C4ML-AUTHORING-203", `A ${operation.itemKind} cannot be created in this Deployment View context.`);
    }
    if (!identifierPattern.test(operation.itemId)) {
      return issue("C4ML-AUTHORING-203", "The deployment item identifier must start with a letter and contain only letters, numbers, hyphens, or underscores.");
    }
    if (deploymentItems.some(({ name }) => name === operation.itemId)) {
      return issue("C4ML-AUTHORING-204", `Deployment item identifier "${operation.itemId}" is already in use.`);
    }
    const nodeIds = context.deployment.nodes.map(({ id }) => id);
    if (operation.itemKind === "deployment-node") {
      if (!operation.name?.trim() || !operation.responsibility?.trim() || !operation.technology?.trim()) {
        return issue("C4ML-AUTHORING-203", "Deployment Nodes require a name, responsibility, and technology.");
      }
      if (operation.parentNodeId !== undefined && !nodeIds.includes(operation.parentNodeId)) {
        return issue("C4ML-AUTHORING-203", "The selected parent Deployment Node does not belong to this environment.");
      }
      return undefined;
    }
    if (operation.nodeId === undefined || !nodeIds.includes(operation.nodeId)) {
      return issue("C4ML-AUTHORING-203", "Select a Deployment Node from the active environment.");
    }
    if (operation.itemKind === "infrastructure-node") {
      return !operation.name?.trim() ||
        !operation.responsibility?.trim() ||
        !operation.technology?.trim()
        ? issue("C4ML-AUTHORING-203", "Infrastructure Nodes require a name, responsibility, and technology.")
        : undefined;
    }
    const expectedKind = operation.itemKind === "container-instance"
      ? "container"
      : "software-system";
    if (!context.deployment.elements.some(
      ({ id, kind }) => id === operation.elementId && kind === expectedKind,
    )) {
      return issue("C4ML-AUTHORING-203", "The selected architecture element is outside this Deployment View's Software System scope.");
    }
    return undefined;
  }
  if (operation.kind === "create-dynamic-interaction") {
    if (context.dynamic === undefined) {
      return issue("C4ML-AUTHORING-203", "Dynamic interactions can be changed only from an active Dynamic View.");
    }
    if (!identifierPattern.test(operation.interactionId)) {
      return issue("C4ML-AUTHORING-203", "The interaction identifier must start with a letter and contain only letters, numbers, hyphens, or underscores.");
    }
    const view = documents.flatMap(({ ast }) => ast.views)
      .find(({ name }) => name === context.viewId);
    if (view?.interactions.some(({ name }) => name === operation.interactionId)) {
      return issue("C4ML-AUTHORING-204", `Interaction identifier "${operation.interactionId}" is already in use in this Dynamic View.`);
    }
    if (!Number.isSafeInteger(operation.order) || operation.order <= 0) {
      return issue("C4ML-AUTHORING-203", "A Dynamic interaction requires a positive integer order.");
    }
    if (operation.intent.trim().length === 0) {
      return issue("C4ML-AUTHORING-203", "A Dynamic interaction requires a meaningful description.");
    }
    if (!context.dynamic.relationships.some(({ id }) => id === operation.relationshipId)) {
      return issue("C4ML-AUTHORING-203", "Select a directed static relationship that is valid for Dynamic interactions.");
    }
    if (
      operation.parallelGroup !== undefined &&
      !identifierPattern.test(operation.parallelGroup)
    ) {
      return issue("C4ML-AUTHORING-203", "A parallel group must be a stable identifier.");
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

function modelContext(documents: readonly ParsedProjectDocument[]): C4mlSemanticAuthoringContext {
  const elements = documents.flatMap(({ ast }) => ast.model?.elements ?? []);
  const diagramOptions: C4mlDiagramCreateOption[] = [{ id: "system-landscape", kind: "system-landscape" }];
  for (const element of [...elements].sort((a, b) => compareText(a.name, b.name))) {
    const kinds: C4mlDiagramCreateOption["kind"][] = element.$type === "SoftwareSystemDeclaration"
      ? ["system-context", "container"] : element.$type === "ContainerDeclaration"
        ? ["component"] : element.$type === "ComponentDeclaration" ? ["code"] : [];
    for (const kind of kinds) diagramOptions.push({ id: `${kind}:${element.name}`, kind,
      scopeId: element.name, scopeLabel: elementLabel(element) });
  }
  return { viewId: undefined, viewKind: undefined, createActions: [{ kind: "person" }, { kind: "software-system" }],
    elements: connectionElementsFor("system-landscape", undefined, elements), connectionOptions: [], diagramOptions };
}

async function proposeModelEdit(project: ArchitectureProjectInput, documents: readonly ParsedProjectDocument[], request: C4mlSemanticEditRequest): Promise<C4mlSemanticEditProposal> {
  if (!(await parseC4mlProjectDraft(project)).valid) return proposalInvalid("C4ML-AUTHORING-201", "Authoring requires a valid project.");
  const target = request.documentUri === undefined ? documents[0] : documents.find(({ uri }) => uri === request.documentUri);
  if (target === undefined) return proposalInvalid("C4ML-AUTHORING-205", "Select an existing source document.");
  const context = modelContext(documents);
  const operation = request.operation;
  let generated;
  if (operation.kind === "create-element") {
    if (operation.showInView) return proposalInvalid("C4ML-AUTHORING-203", "Create a diagram explicitly before showing an element in it.");
    const failure = validateOperation(documents, context, operation);
    if (failure !== undefined) return proposalInvalid(failure.code, failure.message);
    generated = createElementEdit(documents, { document: target }, operation);
  } else if (operation.kind === "create-view") {
    const option = context.diagramOptions?.find(({ id }) => id === operation.optionId);
    if (option === undefined || !identifierPattern.test(operation.viewId) || !operation.title.trim() || !operation.purpose.trim() || (option.kind === "system-landscape" && !operation.scopeName.trim())) {
      return proposalInvalid("C4ML-AUTHORING-203", "Select a valid diagram, an identifier, a title, a purpose, and its scope.");
    }
    if (documents.some(({ ast }) => ast.views.some(({ name }) => name === operation.viewId))) return proposalInvalid("C4ML-AUTHORING-204", "The diagram identifier is already in use.");
    const show = connectionElementsFor(option.kind, option.scopeId, documents.flatMap(({ ast }) => ast.model?.elements ?? []));
    const eol = lineEnding(target.source);
    const proposedText = [`view ${operation.viewId} {`, `  type = ${option.kind}`,
      `  scope = ${option.scopeId ?? JSON.stringify(operation.scopeName.trim())}`,
      `  title = ${JSON.stringify(operation.title.trim())}`, `  purpose = ${JSON.stringify(operation.purpose.trim())}`,
      "  audience = default", "  legend = generated",
      ...(show.length ? [`  show = [${show.map(({ id }) => id).join(", ")}]`] : []),
      "  layout {", "    flow = right", "  }", "}"].join(eol);
    generated = { documentUri: target.uri, proposedText, edit: { startOffset: target.source.length,
      endOffset: target.source.length, text: `${eol}${eol}${proposedText}${eol}` } };
  } else return proposalInvalid("C4ML-AUTHORING-203", "This operation requires an active diagram.");
  if (generated === undefined) return proposalInvalid("C4ML-AUTHORING-205", "No safe insertion point was found.");
  const changeSet = createProposedProjectSourceChangeSet(project, { id: request.id, intent: request.intent,
    affectedIds: affectedIdsFor(operation, request.viewId), edits: [{ documentUri: generated.documentUri, ...generated.edit }] });
  const applied = applyProjectSourceChangeSet(project, changeSet);
  if (!applied.valid) return proposalInvalid("C4ML-AUTHORING-205", "The change could not be applied atomically.");
  return { valid: true, changeSet, documentUri: generated.documentUri, proposedText: generated.proposedText, issues: [] };
}

function createOperationEdits(
  documents: readonly ParsedProjectDocument[],
  owner: ContextOwner,
  context: C4mlSemanticAuthoringContext,
  operation: C4mlSemanticEditOperation,
): readonly {
  readonly documentUri: string;
  readonly proposedText: string;
  readonly edit: { readonly startOffset: number; readonly endOffset: number; readonly text: string };
}[] {
  switch (operation.kind) {
    case "create-view": return [];
    case "create-system-with-container-view":
      return createSystemWithContainerViewEdits(documents, owner, operation);
    case "update-view":
      return createUpdateViewEdits(owner, operation);
    case "delete-view":
      return optionalEdit(createDeleteViewEdit(owner));
    case "show-element":
      return createShowElementEdits(owner, operation.elementId);
    case "hide-element":
      return optionalEdit(createHideEdit(owner, operation.elementId));
    case "delete-element":
      return createDeleteElementEdits(documents, operation.elementId);
    case "create-element":
      return optionalEdit(createElementEdit(documents, owner, operation));
    case "create-relationship":
      return optionalEdit(createRelationshipEdit(documents, owner, operation));
    case "create-deployment-item":
      return optionalEdit(createDeploymentItemEdit(documents, context, operation));
    case "create-dynamic-interaction":
      return optionalEdit(createDynamicInteractionEdit(owner, context, operation));
  }
}

function affectedIdsFor(
  operation: C4mlSemanticEditOperation,
  viewId?: string,
): readonly string[] {
  switch (operation.kind) {
    case "create-view": return [operation.viewId];
    case "create-system-with-container-view": return [operation.systemId, operation.viewId];
    case "update-view":
    case "delete-view":
      return viewId === undefined ? [] : [viewId];
    case "show-element":
    case "hide-element":
    case "delete-element":
      return [operation.elementId];
    case "create-element":
      return [operation.elementId, ...(operation.ownerId === undefined ? [] : [operation.ownerId])];
    case "create-relationship":
      return [operation.relationshipId, operation.sourceId, operation.targetId];
    case "create-deployment-item":
      return [
        operation.itemId,
        ...(operation.parentNodeId === undefined ? [] : [operation.parentNodeId]),
        ...(operation.nodeId === undefined ? [] : [operation.nodeId]),
        ...(operation.elementId === undefined ? [] : [operation.elementId]),
      ];
    case "create-dynamic-interaction":
      return [operation.interactionId, operation.relationshipId];
  }
}

function createSystemWithContainerViewEdits(
  documents: readonly ParsedProjectDocument[],
  owner: ContextOwner,
  operation: Extract<C4mlSemanticEditOperation, { readonly kind: "create-system-with-container-view" }>,
) {
  const system = createElementEdit(documents, owner, {
    kind: "create-element",
    elementKind: "software-system",
    elementId: operation.systemId,
    name: operation.name,
    responsibility: operation.responsibility,
    classification: operation.classification,
  });
  const eol = lineEnding(owner.document.source);
  const proposedText = [
    `view ${operation.viewId} {`,
    "  type = container",
    `  scope = ${operation.systemId}`,
    `  title = ${JSON.stringify(operation.title.trim())}`,
    `  purpose = ${JSON.stringify(operation.purpose.trim())}`,
    "  audience = default",
    "  legend = generated",
    "  layout {",
    "    flow = right",
    "  }",
    "}",
  ].join(eol);
  const view = {
    documentUri: owner.document.uri,
    proposedText,
    edit: {
      startOffset: owner.document.source.length,
      endOffset: owner.document.source.length,
      text: `${eol}${eol}${proposedText}${eol}`,
    },
  };
  return system === undefined ? [] : [system, view];
}

function createUpdateViewEdits(
  owner: ContextOwner,
  operation: Extract<C4mlSemanticEditOperation, { readonly kind: "update-view" }>,
) {
  const replacements = [
    { type: "ViewTitleProperty", key: "title", value: operation.title.trim() },
    { type: "ViewPurposeProperty", key: "purpose", value: operation.purpose.trim() },
  ] as const;
  return replacements.flatMap(({ type, key, value }) => {
    const property = owner.view.properties.find(({ $type }) => $type === type);
    if (property?.$cstNode === undefined) return [];
    const proposedText = `${key} = ${JSON.stringify(value)}`;
    return [{
      documentUri: owner.document.uri,
      proposedText,
      edit: {
        startOffset: property.$cstNode.offset,
        endOffset: property.$cstNode.end,
        text: proposedText,
      },
    }];
  });
}

function createDeleteViewEdit(owner: ContextOwner) {
  const edit = removeWholeLine(owner.document.source, owner.view.$cstNode);
  return edit === undefined ? undefined : {
    documentUri: owner.document.uri,
    proposedText: `Delete diagram ${owner.view.name}`,
    edit,
  };
}

function createShowElementEdits(owner: ContextOwner, elementId: string) {
  const show = createShowEdit(owner, [elementId]);
  const hide = owner.view.properties.find(
    (property) => property.$type === "ViewHideProperty",
  );
  const removeHide = hide?.$type === "ViewHideProperty"
    ? removeListReference(owner.document.source, hide, elementId)
    : undefined;
  return [
    ...(show === undefined ? [] : [show]),
    ...(removeHide === undefined ? [] : [{
      documentUri: owner.document.uri,
      proposedText: `Remove ${elementId} from the diagram hide list`,
      edit: removeHide,
    }]),
  ];
}

function createShowEdit(owner: ContextOwner, ids: readonly string[]) {
  const show = owner.view.properties.find((property) => property.$type === "ViewShowProperty");
  const additions = [...new Set(ids)].filter((id) => show?.values.some((value) => value.$refText === id) !== true);
  if (additions.length === 0) return undefined;
  const proposedText = `  show = [${[...(show?.values.map((value) => value.$refText) ?? []), ...additions].join(", ")}]`;
  if (show?.$cstNode !== undefined) {
    // Append after the final reference, preserving comments and whitespace in the list.
    const last = show.values.at(-1)?.$refNode;
    if (last === undefined) return undefined;
    return { documentUri: owner.document.uri, proposedText,
      edit: { startOffset: last.end, endOffset: last.end, text: `, ${additions.join(", ")}` } };
  }
  const first = owner.view.properties.find(
    (property) => property.$type !== "ViewHideProperty",
  )?.$cstNode ?? owner.view.properties[0]?.$cstNode;
  if (first === undefined) return undefined;
  const lineStart = owner.document.source.lastIndexOf("\n", first.offset - 1) + 1;
  const prefix = owner.document.source.slice(lineStart, first.offset);
  const indent = /^[\t ]*$/.test(prefix) ? prefix : "  ";
  return { documentUri: owner.document.uri, proposedText,
    edit: { startOffset: first.offset, endOffset: first.offset,
      text: `${proposedText.trimStart()}${lineEnding(owner.document.source)}${indent}` } };
}

function createHideEdit(owner: ContextOwner, elementId: string) {
  const hide = owner.view.properties.find((property) => property.$type === "ViewHideProperty");
  if (hide?.$type === "ViewHideProperty" && hide.values.some((value) => value.$refText === elementId)) {
    return undefined;
  }
  const proposedText = `  hide = [${[
    ...(hide?.$type === "ViewHideProperty" ? hide.values.map((value) => value.$refText) : []),
    elementId,
  ].join(", ")}]`;
  if (hide?.$type === "ViewHideProperty" && hide.$cstNode !== undefined) {
    const last = hide.values.at(-1)?.$refNode;
    if (last === undefined) return undefined;
    return { documentUri: owner.document.uri, proposedText,
      edit: { startOffset: last.end, endOffset: last.end, text: `, ${elementId}` } };
  }
  const first = owner.view.properties[0]?.$cstNode;
  if (first === undefined) return undefined;
  const lineStart = owner.document.source.lastIndexOf("\n", first.offset - 1) + 1;
  const prefix = owner.document.source.slice(lineStart, first.offset);
  const indent = /^[\t ]*$/.test(prefix) ? prefix : "  ";
  return { documentUri: owner.document.uri, proposedText,
    edit: { startOffset: first.offset, endOffset: first.offset,
      text: `${proposedText.trimStart()}${lineEnding(owner.document.source)}${indent}` } };
}

function createDeleteElementEdits(
  documents: readonly ParsedProjectDocument[],
  elementId: string,
) {
  const edits: {
    documentUri: string;
    proposedText: string;
    edit: { startOffset: number; endOffset: number; text: string };
  }[] = [];
  for (const document of documents) {
    const element = document.ast.model?.elements.find(({ name }) => name === elementId);
    if (element?.$cstNode !== undefined) {
      const edit = removeWholeLine(document.source, element.$cstNode);
      if (edit !== undefined) edits.push({ documentUri: document.uri,
        proposedText: `Delete architecture element ${elementId}`,
        edit });
    }
    for (const view of document.ast.views) {
      for (const property of view.properties) {
        if (property.$type !== "ViewShowProperty" && property.$type !== "ViewHideProperty") continue;
        const edit = removeListReference(document.source, property, elementId);
        if (edit !== undefined) edits.push({ documentUri: document.uri,
          proposedText: `Remove ${elementId} from diagram ${view.name}`,
          edit });
      }
    }
  }
  return edits.sort((left, right) =>
    compareText(left.documentUri, right.documentUri) || left.edit.startOffset - right.edit.startOffset);
}

function removeListReference(
  source: string,
  property: Extract<ViewDeclaration["properties"][number],
    { readonly $type: "ViewShowProperty" | "ViewHideProperty" }>,
  elementId: string,
) {
  const index = property.values.findIndex((value) => value.$refText === elementId);
  const current = property.values[index]?.$refNode;
  if (index < 0 || current === undefined) return undefined;
  if (property.values.length === 1) return removeWholeLine(source, property.$cstNode);
  if (index < property.values.length - 1) {
    const comma = source.indexOf(",", current.end);
    if (comma < 0) return undefined;
    return { startOffset: current.offset, endOffset: comma + 1, text: "" };
  }
  const comma = source.lastIndexOf(",", current.offset);
  if (comma < 0) return undefined;
  return { startOffset: comma, endOffset: current.end, text: "" };
}

function removeWholeLine(
  source: string,
  node: { readonly offset: number; readonly end: number } | undefined,
) {
  if (node === undefined) return undefined;
  const lineStart = source.lastIndexOf("\n", Math.max(0, node.offset - 1)) + 1;
  const nextBreak = source.indexOf("\n", node.end);
  const lineEnd = nextBreak < 0 ? source.length : nextBreak + 1;
  const before = source.slice(lineStart, node.offset);
  const after = source.slice(node.end, nextBreak < 0 ? source.length : nextBreak);
  return /^[\t ]*$/.test(before) && /^[\t ]*$/.test(after)
    ? { startOffset: lineStart, endOffset: lineEnd, text: "" }
    : { startOffset: node.offset, endOffset: node.end, text: "" };
}

function optionalEdit<T>(value: T | undefined): readonly T[] {
  return value === undefined ? [] : [value];
}

function createElementEdit(
  documents: readonly ParsedProjectDocument[],
  owner: Pick<ContextOwner, "document">,
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

function createDeploymentItemEdit(
  documents: readonly ParsedProjectDocument[],
  context: C4mlSemanticAuthoringContext,
  operation: Extract<C4mlSemanticEditOperation, { readonly kind: "create-deployment-item" }>,
) {
  const environmentId = context.deployment?.environmentId;
  if (environmentId === undefined) return undefined;
  const target = documents.flatMap((document) =>
    (document.ast.deployment?.environments ?? []).map((environment) => ({ document, environment })),
  ).find(({ environment }) => environment.name === environmentId);
  if (target === undefined) return undefined;
  const proposedText = deploymentItemDeclaration(operation);
  const edit = insertIntoBlock(
    target.document.source,
    target.environment.$cstNode,
    proposedText,
  );
  return edit === undefined
    ? undefined
    : { documentUri: target.document.uri, edit, proposedText };
}

function createDynamicInteractionEdit(
  owner: ContextOwner,
  context: C4mlSemanticAuthoringContext,
  operation: Extract<C4mlSemanticEditOperation, { readonly kind: "create-dynamic-interaction" }>,
) {
  const relationship = context.dynamic?.relationships.find(
    ({ id }) => id === operation.relationshipId,
  );
  if (relationship === undefined) return undefined;
  const proposedText = dynamicInteractionDeclaration(operation, relationship);
  const edit = owner.view.layout?.$cstNode === undefined
    ? insertIntoBlock(owner.document.source, owner.view.$cstNode, proposedText)
    : insertBeforeNode(owner.document.source, owner.view.layout.$cstNode, proposedText);
  return edit === undefined
    ? undefined
    : { documentUri: owner.document.uri, edit, proposedText };
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

function deploymentItemDeclaration(
  operation: Extract<C4mlSemanticEditOperation, { readonly kind: "create-deployment-item" }>,
): string {
  if (operation.itemKind === "software-system-instance") {
    return `    system-instance ${operation.itemId} of ${operation.elementId} on ${operation.nodeId}`;
  }
  if (operation.itemKind === "container-instance") {
    return `    container-instance ${operation.itemId} of ${operation.elementId} on ${operation.nodeId}`;
  }
  const head = operation.itemKind === "deployment-node"
    ? `node ${operation.itemId}${operation.parentNodeId === undefined ? "" : ` inside ${operation.parentNodeId}`}`
    : `infrastructure ${operation.itemId} on ${operation.nodeId}`;
  return [
    `    ${head} {`,
    `      name = ${JSON.stringify(operation.name?.trim() ?? "")}`,
    `      responsibility = ${JSON.stringify(operation.responsibility?.trim() ?? "")}`,
    `      technology = ${JSON.stringify(operation.technology?.trim() ?? "")}`,
    "    }",
  ].join("\n");
}

function dynamicInteractionDeclaration(
  operation: Extract<C4mlSemanticEditOperation, { readonly kind: "create-dynamic-interaction" }>,
  relationship: C4mlSemanticDynamicRelationshipOption,
): string {
  return [
    `  interaction ${operation.interactionId} {`,
    `    order = ${operation.order}`,
    ...(operation.parallelGroup?.trim()
      ? [`    parallel = ${operation.parallelGroup.trim()}`]
      : []),
    `    from = ${relationship.sourceId}`,
    `    to = ${relationship.targetId}`,
    `    intent = ${JSON.stringify(operation.intent.trim())}`,
    `    relation = ${relationship.id}`,
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

function insertBeforeNode(
  source: string,
  node: { readonly offset: number } | undefined,
  declaration: string,
) {
  if (node === undefined) return undefined;
  const eol = lineEnding(source);
  const lineStart = source.lastIndexOf("\n", Math.max(0, node.offset - 1)) + 1;
  return {
    startOffset: lineStart,
    endOffset: lineStart,
    text: `${declaration.replaceAll("\n", eol)}${eol}${eol}`,
  };
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

function viewPropertyValue(
  view: ViewDeclaration,
  type: "ViewPurposeProperty" | "ViewTitleProperty",
): string | undefined {
  const property = view.properties.find(({ $type }) => $type === type);
  return property?.$type === type ? property.value : undefined;
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

function environmentLabel(environment: EnvironmentDeclaration): string {
  const name = environment.properties.find(({ $type }) => $type === "DisplayNameProperty");
  return name?.$type === "DisplayNameProperty" ? name.value : environment.name;
}

function deploymentItemLabel(
  item: Extract<EnvironmentDeclaration["items"][number], { readonly $type: "DeploymentNodeDeclaration" }>,
): string {
  const name = item.properties.find(({ $type }) => $type === "DisplayNameProperty");
  return name?.$type === "DisplayNameProperty" ? name.value : item.name;
}

function relationshipDetails(
  relationship: RelationshipDeclaration,
): { readonly sourceId: string; readonly targetId: string; readonly intent: string } | undefined {
  const from = relationship.properties.find(({ $type }) => $type === "RelationshipFromProperty");
  const to = relationship.properties.find(({ $type }) => $type === "RelationshipToProperty");
  const intent = relationship.properties.find(({ $type }) => $type === "RelationshipIntentProperty");
  return from?.$type === "RelationshipFromProperty" &&
    to?.$type === "RelationshipToProperty" &&
    intent?.$type === "RelationshipIntentProperty"
    ? { sourceId: from.value.$refText, targetId: to.value.$refText, intent: intent.value }
    : undefined;
}

function isDynamicEndpoint(
  element: ElementDeclaration | undefined,
): element is ElementDeclaration {
  return element?.$type === "SoftwareSystemDeclaration" ||
    element?.$type === "ContainerDeclaration" ||
    element?.$type === "ComponentDeclaration";
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
