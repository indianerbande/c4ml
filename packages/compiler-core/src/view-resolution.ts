import {
  createDiagnostic,
  hasErrors,
  sortDiagnostics,
  type Diagnostic,
} from "./diagnostics.js";
import { resolveVisualGroups } from "./group-resolution.js";
import {
  type ArchitectureModel,
  type Container,
  type DeploymentInstance,
  type DeploymentModel,
  type ModelItem,
  type Relationship,
  type StaticElement,
} from "./model.js";
import { compareText } from "./ordering.js";
import { validateArchitectureModel } from "./semantic-validation.js";
import { sourceOf, type SourceBacked } from "./source.js";
import {
  type ArchitectureView,
  type DeploymentView,
  type DynamicInteraction,
  type DynamicView,
  type ResolvedDynamicInteraction,
  type ResolvedView,
  type ViewBase,
  type ViewGuidance,
  type ViewKind,
  type ViewLegend,
  type ViewSelection,
} from "./views.js";

export interface ViewResolutionResult {
  readonly views: readonly ResolvedView[];
  readonly diagnostics: readonly Diagnostic[];
  readonly valid: boolean;
}

interface ModelIndex {
  readonly elementById: ReadonlyMap<string, StaticElement>;
  readonly relationshipById: ReadonlyMap<string, Relationship>;
}

interface StaticScope {
  readonly elements: readonly StaticElement[];
  readonly relationships: readonly Relationship[];
  readonly requiredElementIds: ReadonlySet<string>;
}

const guidanceByKind: Readonly<Record<ViewKind, ViewGuidance>> = {
  "system-landscape": {
    audience: [
      "technical and non-technical people inside and outside the organization or development team",
    ],
    recommendation:
      "Recommended particularly for larger organizations and portfolios.",
  },
  "system-context": {
    audience: [
      "everybody, technical and non-technical, inside and outside the development team",
    ],
    recommendation: "Recommended for every software development team.",
  },
  container: {
    audience: [
      "architects",
      "developers",
      "operations and support staff",
    ],
    recommendation: "Recommended for every software development team.",
  },
  component: {
    audience: ["software architects", "developers"],
    recommendation: "Situational; create only when it adds value.",
  },
  code: {
    audience: ["software architects", "developers"],
    recommendation:
      "Use for important or complex components, preferably generated on demand.",
  },
  dynamic: {
    audience: [
      "technical and non-technical people inside and outside the development team",
    ],
    recommendation:
      "Use sparingly for important or complicated runtime interactions.",
  },
  deployment: {
    audience: [
      "software and infrastructure architects",
      "developers",
      "operations and support staff",
    ],
    recommendation: "Recommended.",
  },
};

export function viewGuidance(kind: ViewKind): ViewGuidance {
  return guidanceByKind[kind];
}

export function resolveArchitectureView(
  model: ArchitectureModel,
  view: ArchitectureView,
): ViewResolutionResult {
  return resolveArchitectureViews(model, [view]);
}

export function resolveArchitectureViews(
  model: ArchitectureModel,
  views: readonly ArchitectureView[],
): ViewResolutionResult {
  const modelValidation = validateArchitectureModel(model);
  const diagnostics = [...modelValidation.diagnostics];
  if (!modelValidation.valid) {
    return {
      views: [],
      diagnostics: sortDiagnostics(diagnostics),
      valid: false,
    };
  }

  const index: ModelIndex = {
    elementById: new Map(
      model.elements.map((element) => [element.id, element]),
    ),
    relationshipById: new Map(
      model.relationships.map((relationship) => [relationship.id, relationship]),
    ),
  };
  const resolved: ResolvedView[] = [];
  const viewById = new Map<string, ArchitectureView>();

  for (const view of stableById(views)) {
    const first = viewById.get(view.id);
    if (first !== undefined) {
      diagnostics.push(
        createDiagnostic({
          code: "C4ML-VIEW-001",
          severity: "error",
          message: `Duplicate view identifier ${displayId(view.id)}.`,
          source: sourceOf(view),
          related: [
            {
              message: "The first declaration is here.",
              source: sourceOf(first),
            },
          ],
          correction: "Assign a stable, unique view identifier.",
        }),
      );
      continue;
    }
    viewById.set(view.id, view);

    const diagnosticCount = diagnostics.length;
    validateViewMetadata(view, diagnostics);
    const candidate = resolveOne(model, index, view, diagnostics);
    const addedDiagnostics = diagnostics.slice(diagnosticCount);
    if (candidate !== undefined && !hasErrors(addedDiagnostics)) {
      resolved.push(candidate);
    }
  }

  const sorted = sortDiagnostics(diagnostics);
  return {
    views: stableById(resolved),
    diagnostics: sorted,
    valid: !hasErrors(sorted),
  };
}

function resolveOne(
  model: ArchitectureModel,
  index: ModelIndex,
  view: ArchitectureView,
  diagnostics: Diagnostic[],
): ResolvedView | undefined {
  if (view.kind === "dynamic") {
    return resolveVisualGroups(
      view,
      resolveDynamicView(model, index, view, diagnostics),
      diagnostics,
    );
  }
  if (view.kind === "deployment") {
    const deploymentView = resolveDeploymentView(
      model,
      index,
      view,
      diagnostics,
    );
    return deploymentView === undefined
      ? undefined
      : resolveVisualGroups(view, deploymentView, diagnostics);
  }

  const scope = resolveStaticScope(model, index, view, diagnostics);
  if (scope === undefined) {
    return undefined;
  }
  const selected = selectStaticScope(view, index, scope, diagnostics);
  return resolveVisualGroups(
    view,
    resolvedView(
      view,
      describeScope(view, index),
      selected.elements,
      selected.relationships,
    ),
    diagnostics,
  );
}

function validateViewMetadata(
  view: ArchitectureView,
  diagnostics: Diagnostic[],
): void {
  if (isBlank(view.id)) {
    addViewDiagnostic(
      diagnostics,
      view,
      "C4ML-VIEW-002",
      "A view has an empty stable identifier.",
      "Assign a non-empty stable identifier.",
    );
  }
  if (isBlank(view.title)) {
    addViewDiagnostic(
      diagnostics,
      view,
      "C4ML-VIEW-003",
      `View ${displayId(view.id)} has no title.`,
      "Name the diagram type and scope in the title.",
    );
  }
  if (isBlank(view.purpose)) {
    addViewDiagnostic(
      diagnostics,
      view,
      "C4ML-VIEW-004",
      `View ${displayId(view.id)} has no purpose.`,
      "Describe why this view exists.",
    );
  }
  if (view.audience !== undefined && view.audience.some(isBlank)) {
    addViewDiagnostic(
      diagnostics,
      view,
      "C4ML-VIEW-005",
      `View ${displayId(view.id)} has empty audience metadata.`,
      "Omit the override to use the default or name an intended audience.",
    );
  }
  if (
    view.legend?.mode === "authored" &&
    (view.legend.entries === undefined || view.legend.entries.length === 0)
  ) {
    addViewDiagnostic(
      diagnostics,
      view,
      "C4ML-VIEW-006",
      `View ${displayId(view.id)} declares an empty authored legend.`,
      "Add at least one legend entry or use a generated legend.",
    );
  }
}

function resolveStaticScope(
  model: ArchitectureModel,
  index: ModelIndex,
  view: Exclude<ArchitectureView, DynamicView | DeploymentView>,
  diagnostics: Diagnostic[],
): StaticScope | undefined {
  if (view.kind === "system-landscape") {
    if (isBlank(view.scope)) {
      addViewDiagnostic(
        diagnostics,
        view,
        "C4ML-VIEW-010",
        `System Landscape view ${displayId(view.id)} has no named scope.`,
        "Name the organization, portfolio, or other collection in scope.",
      );
    }
    const elements = model.elements.filter(
      (element) =>
        element.kind === "person" || element.kind === "software-system",
    );
    const elementIds = idsOf(elements);
    return {
      elements: stableById(elements),
      relationships: relationshipsInside(model.relationships, elementIds),
      requiredElementIds: new Set(),
    };
  }

  const scopeId =
    view.kind === "component"
      ? view.containerId
      : view.kind === "code"
        ? view.componentId
        : view.softwareSystemId;
  const expectedKind =
    view.kind === "component"
      ? "container"
      : view.kind === "code"
        ? "component"
        : "software-system";
  const scopeElement = index.elementById.get(scopeId);
  if (scopeElement?.kind !== expectedKind) {
    addViewDiagnostic(
      diagnostics,
      view,
      "C4ML-VIEW-010",
      `${view.kind} view ${displayId(view.id)} does not resolve to a ${expectedKind} scope.`,
      `Reference an existing ${expectedKind}.`,
    );
    return undefined;
  }

  if (view.kind === "system-context") {
    const allowed = new Set<string>([scopeElement.id]);
    for (const relationship of model.relationships) {
      const otherId = otherEndpoint(relationship, scopeElement.id);
      const other = otherId === undefined ? undefined : index.elementById.get(otherId);
      if (
        other !== undefined &&
        (other.kind === "person" || other.kind === "software-system")
      ) {
        allowed.add(other.id);
      }
    }
    return {
      elements: elementsForIds(index, allowed),
      relationships: stableById(
        model.relationships.filter(
          (relationship) =>
            (relationship.sourceId === scopeElement.id ||
              relationship.targetId === scopeElement.id) &&
            allowed.has(relationship.sourceId) &&
            allowed.has(relationship.targetId),
        ),
      ),
      requiredElementIds: new Set([scopeElement.id]),
    };
  }

  if (view.kind === "container") {
    const primary = model.elements.filter(
      (element): element is Container =>
        element.kind === "container" &&
        element.softwareSystemId === scopeElement.id,
    );
    return connectedStaticScope(model, index, primary, (element) => {
      return element.kind === "person" || element.kind === "software-system";
    });
  }

  if (view.kind === "component") {
    if (scopeElement.kind !== "container") {
      return undefined;
    }
    const primary = model.elements.filter(
      (element) =>
        element.kind === "component" && element.containerId === scopeElement.id,
    );
    const owningSystemId = scopeElement.softwareSystemId;
    return connectedStaticScope(model, index, primary, (element) => {
      return (
        element.kind === "person" ||
        element.kind === "software-system" ||
        (element.kind === "container" &&
          element.softwareSystemId === owningSystemId)
      );
    });
  }

  const primary = model.elements.filter(
    (element) =>
      element.kind === "code-element" && element.componentId === scopeElement.id,
  );
  const primaryIds = idsOf(primary);
  return {
    elements: stableById(primary),
    relationships: relationshipsInside(model.relationships, primaryIds),
    requiredElementIds: new Set(),
  };
}

function connectedStaticScope(
  model: ArchitectureModel,
  index: ModelIndex,
  primary: readonly StaticElement[],
  supports: (element: StaticElement) => boolean,
): StaticScope {
  const primaryIds = idsOf(primary);
  const allowed = new Set(primaryIds);
  for (const relationship of model.relationships) {
    const sourcePrimary = primaryIds.has(relationship.sourceId);
    const targetPrimary = primaryIds.has(relationship.targetId);
    if (!sourcePrimary && !targetPrimary) {
      continue;
    }
    const otherId = sourcePrimary
      ? relationship.targetId
      : relationship.sourceId;
    const other = index.elementById.get(otherId);
    if (other !== undefined && supports(other)) {
      allowed.add(other.id);
    }
  }
  return {
    elements: elementsForIds(index, allowed),
    relationships: stableById(
      model.relationships.filter(
        (relationship) =>
          (primaryIds.has(relationship.sourceId) ||
            primaryIds.has(relationship.targetId)) &&
          allowed.has(relationship.sourceId) &&
          allowed.has(relationship.targetId),
      ),
    ),
    requiredElementIds: new Set(),
  };
}

function selectStaticScope(
  view: ArchitectureView,
  index: ModelIndex,
  scope: StaticScope,
  diagnostics: Diagnostic[],
): Pick<ResolvedView, "elements" | "relationships"> {
  const allowedElementIds = idsOf(scope.elements);
  const selectedElementIds = selectIds(
    view,
    view.selection,
    allowedElementIds,
    scope.requiredElementIds,
    index.elementById,
    diagnostics,
  );
  const allowedRelationships = new Map(
    scope.relationships.map((relationship) => [relationship.id, relationship]),
  );
  const selectedRelationships = selectRelationships(
    view,
    view.selection,
    allowedRelationships,
    selectedElementIds,
    index.relationshipById,
    diagnostics,
  );
  return {
    elements: elementsForIds(index, selectedElementIds),
    relationships: selectedRelationships,
  };
}

function selectIds(
  view: ArchitectureView,
  selection: ViewSelection | undefined,
  allowedIds: ReadonlySet<string>,
  requiredIds: ReadonlySet<string>,
  knownItems: ReadonlyMap<string, SourceBacked>,
  diagnostics: Diagnostic[],
): Set<string> {
  const included = selection?.includeElementIds;
  const excluded = new Set(selection?.excludeElementIds ?? []);
  const result = new Set(included === undefined ? allowedIds : []);

  for (const id of included ?? []) {
    if (!allowedIds.has(id)) {
      invalidSelectionId(view, id, "included element", knownItems, diagnostics);
    } else {
      result.add(id);
    }
  }
  for (const id of excluded) {
    if (!allowedIds.has(id)) {
      invalidSelectionId(view, id, "excluded element", knownItems, diagnostics);
    }
    result.delete(id);
  }
  for (const id of requiredIds) {
    if (!result.has(id)) {
      addViewDiagnostic(
        diagnostics,
        view,
        "C4ML-VIEW-014",
        `View ${displayId(view.id)} removes required focal element ${displayId(id)}.`,
        "Keep the focal element visible.",
      );
    }
  }
  for (const id of included ?? []) {
    if (excluded.has(id)) {
      addViewDiagnostic(
        diagnostics,
        view,
        "C4ML-VIEW-013",
        `View ${displayId(view.id)} both includes and excludes ${displayId(id)}.`,
        "Choose one selection operation for the identifier.",
      );
    }
  }
  return result;
}

function selectRelationships(
  view: ArchitectureView,
  selection: ViewSelection | undefined,
  allowed: ReadonlyMap<string, Relationship>,
  selectedElementIds: ReadonlySet<string>,
  known: ReadonlyMap<string, Relationship>,
  diagnostics: Diagnostic[],
): Relationship[] {
  const included = selection?.includeRelationshipIds;
  const excluded = new Set(selection?.excludeRelationshipIds ?? []);
  const selectedIds = new Set(included === undefined ? allowed.keys() : []);

  for (const id of included ?? []) {
    const relationship = allowed.get(id);
    if (
      relationship === undefined ||
      !selectedElementIds.has(relationship.sourceId) ||
      !selectedElementIds.has(relationship.targetId)
    ) {
      invalidRelationshipSelection(view, id, known, diagnostics);
    } else {
      selectedIds.add(id);
    }
  }
  for (const id of excluded) {
    if (!allowed.has(id)) {
      invalidRelationshipSelection(view, id, known, diagnostics);
    }
    selectedIds.delete(id);
  }
  for (const id of included ?? []) {
    if (excluded.has(id)) {
      addViewDiagnostic(
        diagnostics,
        view,
        "C4ML-VIEW-013",
        `View ${displayId(view.id)} both includes and excludes relationship ${displayId(id)}.`,
        "Choose one selection operation for the identifier.",
      );
    }
  }

  return stableById(
    [...selectedIds]
      .map((id) => allowed.get(id))
      .filter((item): item is Relationship => item !== undefined)
      .filter(
        (relationship) =>
          selectedElementIds.has(relationship.sourceId) &&
          selectedElementIds.has(relationship.targetId),
      ),
  );
}

function resolveDynamicView(
  model: ArchitectureModel,
  index: ModelIndex,
  view: DynamicView,
  diagnostics: Diagnostic[],
): ResolvedView {
  if (isBlank(view.scenario)) {
    addViewDiagnostic(
      diagnostics,
      view,
      "C4ML-DYN-001",
      `Dynamic view ${displayId(view.id)} has no scenario.`,
      "Name the feature, story, use case, or scenario.",
    );
  }

  const interactionById = new Map<string, DynamicInteraction>();
  const interactions = stableInteractions(view.interactions);
  const resolvedInteractions: ResolvedDynamicInteraction[] = [];
  const endpointIds = new Set<string>();
  const abstractionKinds = new Set<string>();

  for (const interaction of interactions) {
    validateDynamicInteractionIdentity(interaction, interactionById, diagnostics);
    validateDynamicOrder(interaction, diagnostics);
    if (isBlank(interaction.description)) {
      addDynamicDiagnostic(
        diagnostics,
        interaction,
        "C4ML-DYN-004",
        `Dynamic interaction ${displayId(interaction.id)} has no description.`,
        "Describe the communication in its direction.",
      );
    }
    const source = index.elementById.get(interaction.sourceId);
    const target = index.elementById.get(interaction.targetId);
    if (!isDynamicElement(source) || !isDynamicElement(target)) {
      addDynamicDiagnostic(
        diagnostics,
        interaction,
        "C4ML-DYN-005",
        `Dynamic interaction ${displayId(interaction.id)} has an unknown or unsupported endpoint.`,
        "Reference Software Systems, Containers, or Components.",
      );
      continue;
    }
    endpointIds.add(source.id);
    endpointIds.add(target.id);
    abstractionKinds.add(source.kind);
    abstractionKinds.add(target.kind);

    const relationship = resolveInteractionRelationship(
      interaction,
      index,
      diagnostics,
    );
    if (relationship !== undefined) {
      resolvedInteractions.push({ ...interaction, relationship });
    }
  }
  validateParallelOrders(interactions, diagnostics);
  if (abstractionKinds.size > 1 && view.allowMixedLevels !== true) {
    diagnostics.push(
      createDiagnostic({
        code: "C4ML-DYN-008",
        severity: "warning",
        message: `Dynamic view ${displayId(view.id)} mixes C4 abstraction levels.`,
        source: sourceOf(view),
        correction:
          "Use one coherent level or explicitly acknowledge the mixed-level scenario.",
      }),
    );
  }

  const selectedEndpointIds = selectIds(
    view,
    view.selection,
    endpointIds,
    endpointIds,
    index.elementById,
    diagnostics,
  );
  const interactionRelationshipById = new Map(
    resolvedInteractions.map(({ relationship }) => [
      relationship.id,
      relationship,
    ]),
  );
  const selectedRelationships = selectRelationships(
    view,
    view.selection,
    interactionRelationshipById,
    selectedEndpointIds,
    index.relationshipById,
    diagnostics,
  );
  const selectedRelationshipIds = idsOf(selectedRelationships);
  for (const interaction of resolvedInteractions) {
    if (!selectedRelationshipIds.has(interaction.relationship.id)) {
      addDynamicDiagnostic(
        diagnostics,
        interaction,
        "C4ML-DYN-009",
        `Dynamic interaction ${displayId(interaction.id)} loses its static relationship through view selection.`,
        "Keep every interaction relationship visible.",
      );
    }
  }

  return resolvedView(
    view,
    view.scenario,
    elementsForIds(index, selectedEndpointIds),
    selectedRelationships,
    resolvedInteractions,
  );
}

function validateDynamicInteractionIdentity(
  interaction: DynamicInteraction,
  interactionById: Map<string, DynamicInteraction>,
  diagnostics: Diagnostic[],
): void {
  if (isBlank(interaction.id)) {
    addDynamicDiagnostic(
      diagnostics,
      interaction,
      "C4ML-DYN-002",
      "A Dynamic interaction has an empty stable identifier.",
      "Assign an identifier unique within the Dynamic View.",
    );
    return;
  }
  const first = interactionById.get(interaction.id);
  if (first !== undefined) {
    diagnostics.push(
      createDiagnostic({
        code: "C4ML-DYN-002",
        severity: "error",
        message: `Duplicate Dynamic interaction identifier ${displayId(interaction.id)}.`,
        source: sourceOf(interaction),
        related: [
          {
            message: "The first interaction is here.",
            source: sourceOf(first),
          },
        ],
        correction: "Assign an identifier unique within the Dynamic View.",
      }),
    );
  } else {
    interactionById.set(interaction.id, interaction);
  }
}

function validateDynamicOrder(
  interaction: DynamicInteraction,
  diagnostics: Diagnostic[],
): void {
  if (!Number.isSafeInteger(interaction.order) || interaction.order <= 0) {
    addDynamicDiagnostic(
      diagnostics,
      interaction,
      "C4ML-DYN-003",
      `Dynamic interaction ${displayId(interaction.id)} has invalid order ${interaction.order}.`,
      "Use a positive integer order.",
    );
  }
}

function validateParallelOrders(
  interactions: readonly DynamicInteraction[],
  diagnostics: Diagnostic[],
): void {
  const byOrder = new Map<number, DynamicInteraction[]>();
  for (const interaction of interactions) {
    const group = byOrder.get(interaction.order) ?? [];
    group.push(interaction);
    byOrder.set(interaction.order, group);
  }
  for (const group of byOrder.values()) {
    if (group.length < 2) {
      continue;
    }
    const parallelGroups = new Set(
      group.map((interaction) => interaction.parallelGroup?.trim() ?? ""),
    );
    if (parallelGroups.size !== 1 || parallelGroups.has("")) {
      for (const interaction of group) {
        addDynamicDiagnostic(
          diagnostics,
          interaction,
          "C4ML-DYN-007",
          `Order ${interaction.order} is repeated without one shared parallel group.`,
          "Assign the same non-empty parallel group to simultaneous interactions.",
        );
      }
    }
  }
}

function resolveInteractionRelationship(
  interaction: DynamicInteraction,
  index: ModelIndex,
  diagnostics: Diagnostic[],
): Relationship | undefined {
  if (interaction.relationshipId !== undefined) {
    const relationship = index.relationshipById.get(interaction.relationshipId);
    if (
      relationship?.sourceId === interaction.sourceId &&
      relationship.targetId === interaction.targetId
    ) {
      return relationship;
    }
    addDynamicDiagnostic(
      diagnostics,
      interaction,
      "C4ML-DYN-006",
      `Dynamic interaction ${displayId(interaction.id)} does not match its static relationship.`,
      "Reference a static relationship with matching endpoints and direction.",
    );
    return undefined;
  }

  const candidates = [...index.relationshipById.values()].filter(
    (relationship) =>
      relationship.sourceId === interaction.sourceId &&
      relationship.targetId === interaction.targetId,
  );
  if (candidates.length === 1) {
    return candidates[0];
  }
  addDynamicDiagnostic(
    diagnostics,
    interaction,
    "C4ML-DYN-006",
    `Dynamic interaction ${displayId(interaction.id)} cannot derive exactly one static relationship.`,
    "Reference the intended directed static relationship explicitly.",
  );
  return undefined;
}

function resolveDeploymentView(
  model: ArchitectureModel,
  index: ModelIndex,
  view: DeploymentView,
  diagnostics: Diagnostic[],
): ResolvedView | undefined {
  const deployment = model.deployment;
  const environment = deployment?.environments.find(
    (candidate) => candidate.id === view.environmentId,
  );
  if (deployment === undefined || environment === undefined) {
    addViewDiagnostic(
      diagnostics,
      view,
      "C4ML-DVIEW-001",
      `Deployment view ${displayId(view.id)} does not resolve to an environment.`,
      "Reference an existing Deployment Environment.",
    );
    return undefined;
  }

  const systemIds = new Set<string>();
  if (view.softwareSystemIds.length === 0) {
    addViewDiagnostic(
      diagnostics,
      view,
      "C4ML-DVIEW-002",
      `Deployment view ${displayId(view.id)} has no Software System scope.`,
      "Reference one or more Software Systems.",
    );
  }
  for (const id of view.softwareSystemIds) {
    const element = index.elementById.get(id);
    if (element?.kind !== "software-system") {
      addViewDiagnostic(
        diagnostics,
        view,
        "C4ML-DVIEW-002",
        `Deployment view ${displayId(view.id)} references non-system scope ${displayId(id)}.`,
        "Reference existing Software Systems.",
      );
    } else if (systemIds.has(id)) {
      addViewDiagnostic(
        diagnostics,
        view,
        "C4ML-DVIEW-003",
        `Deployment view ${displayId(view.id)} repeats Software System ${displayId(id)}.`,
        "List each Software System once.",
      );
    } else {
      systemIds.add(id);
    }
  }

  const inEnvironment = deployment.instances.filter(
    (instance) => instance.environmentId === environment.id,
  );
  const scopedInstances = inEnvironment.filter((instance) =>
    instanceBelongsToSystems(instance, systemIds, index),
  );
  const instanceIds = idsOf(scopedInstances);
  const placedById = deploymentItemsById(deployment);
  const relevantInfrastructureIds = new Set<string>();
  const connectedIds = new Set(instanceIds);
  let discoveredInfrastructure = true;
  while (discoveredInfrastructure) {
    discoveredInfrastructure = false;
    for (const relationship of deployment.relationships) {
      const sourceConnected = connectedIds.has(relationship.sourceId);
      const targetConnected = connectedIds.has(relationship.targetId);
      if (sourceConnected === targetConnected) {
        continue;
      }
      const otherId = sourceConnected
        ? relationship.targetId
        : relationship.sourceId;
      const other = placedById.get(otherId);
      if (
        other?.kind === "infrastructure-node" &&
        other.environmentId === environment.id &&
        !connectedIds.has(other.id)
      ) {
        connectedIds.add(other.id);
        relevantInfrastructureIds.add(other.id);
        discoveredInfrastructure = true;
      }
    }
  }
  const infrastructure = deployment.infrastructureNodes.filter(
    (item) => relevantInfrastructureIds.has(item.id),
  );
  const visiblePlacedIds = new Set([
    ...instanceIds,
    ...relevantInfrastructureIds,
  ]);
  const relevantRelationships = deployment.relationships.filter(
    (relationship) =>
      visiblePlacedIds.has(relationship.sourceId) &&
      visiblePlacedIds.has(relationship.targetId),
  );

  const nodeById = new Map(deployment.nodes.map((node) => [node.id, node]));
  const nodeIds = new Set<string>();
  for (const item of [...scopedInstances, ...infrastructure]) {
    addNodeAndAncestors(item.nodeId, environment.id, nodeById, nodeIds);
  }
  const nodes = stableById(
    [...nodeIds]
      .map((id) => nodeById.get(id))
      .filter((item): item is DeploymentModel["nodes"][number] =>
        item !== undefined,
      ),
  );

  const deploymentSelection = selectDeploymentItems(
    view,
    deployment,
    nodes,
    infrastructure,
    scopedInstances,
    relevantRelationships,
    diagnostics,
  );
  const selectedStaticIds = new Set<string>(systemIds);
  for (const instance of deploymentSelection.instances) {
    selectedStaticIds.add(staticIdOfInstance(instance));
  }

  return resolvedView(
    view,
    environment.name,
    elementsForIds(index, selectedStaticIds),
    [],
    [],
    {
      environment,
      nodes: deploymentSelection.nodes,
      infrastructure: deploymentSelection.infrastructure,
      instances: deploymentSelection.instances,
      relationships: deploymentSelection.relationships,
    },
  );
}

function selectDeploymentItems(
  view: DeploymentView,
  deployment: DeploymentModel,
  nodes: readonly DeploymentModel["nodes"][number][],
  infrastructure: readonly DeploymentModel["infrastructureNodes"][number][],
  instances: readonly DeploymentInstance[],
  relationships: readonly DeploymentModel["relationships"][number][],
  diagnostics: Diagnostic[],
): {
  readonly nodes: readonly DeploymentModel["nodes"][number][];
  readonly infrastructure: readonly DeploymentModel["infrastructureNodes"][number][];
  readonly instances: readonly DeploymentInstance[];
  readonly relationships: readonly DeploymentModel["relationships"][number][];
} {
  const visibleItems = [...nodes, ...infrastructure, ...instances];
  const visibleById = new Map(visibleItems.map((item) => [item.id, item]));
  const allById = new Map<string, SourceBacked>([
    ...deployment.nodes.map((item) => [item.id, item] as const),
    ...deployment.infrastructureNodes.map((item) => [item.id, item] as const),
    ...deployment.instances.map((item) => [item.id, item] as const),
  ]);
  const included = view.selection?.includeElementIds;
  const excluded = new Set(view.selection?.excludeElementIds ?? []);
  const selectedIds = new Set(included === undefined ? visibleById.keys() : []);

  for (const id of included ?? []) {
    if (!visibleById.has(id)) {
      invalidSelectionId(view, id, "included deployment element", allById, diagnostics);
    } else {
      selectedIds.add(id);
    }
  }
  for (const id of excluded) {
    if (!visibleById.has(id)) {
      invalidSelectionId(view, id, "excluded deployment element", allById, diagnostics);
    }
    selectedIds.delete(id);
  }
  for (const id of included ?? []) {
    if (excluded.has(id)) {
      addViewDiagnostic(
        diagnostics,
        view,
        "C4ML-VIEW-013",
        `View ${displayId(view.id)} both includes and excludes ${displayId(id)}.`,
        "Choose one selection operation for the identifier.",
      );
    }
  }

  const selectedInstances = instances.filter((item) => selectedIds.has(item.id));
  const selectedInfrastructure = infrastructure.filter((item) =>
    selectedIds.has(item.id),
  );
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const selectedNodeIds = new Set<string>();
  for (const item of [...selectedInstances, ...selectedInfrastructure]) {
    addNodeAndAncestors(item.nodeId, view.environmentId, nodeById, selectedNodeIds);
  }
  for (const node of nodes) {
    if (selectedIds.has(node.id)) {
      addNodeAndAncestors(node.id, view.environmentId, nodeById, selectedNodeIds);
    }
  }
  for (const id of excluded) {
    if (selectedNodeIds.has(id)) {
      addViewDiagnostic(
        diagnostics,
        view,
        "C4ML-DVIEW-004",
        `Deployment view ${displayId(view.id)} removes node ${displayId(id)} although a visible item requires it.`,
        "Keep the placement node and its ancestors or exclude their visible contents.",
      );
    }
  }
  const selectedPlacedIds = idsOf([
    ...selectedInstances,
    ...selectedInfrastructure,
  ]);
  const relationshipById = new Map(
    relationships.map((relationship) => [relationship.id, relationship]),
  );
  const allRelationships = new Map(
    deployment.relationships.map((relationship) => [relationship.id, relationship]),
  );
  const selectedRelationships = selectDeploymentRelationships(
    view,
    relationshipById,
    allRelationships,
    selectedPlacedIds,
    diagnostics,
  );

  return {
    nodes: stableById(nodes.filter((node) => selectedNodeIds.has(node.id))),
    infrastructure: stableById(selectedInfrastructure),
    instances: stableById(selectedInstances),
    relationships: selectedRelationships,
  };
}

function selectDeploymentRelationships(
  view: DeploymentView,
  allowed: ReadonlyMap<string, DeploymentModel["relationships"][number]>,
  known: ReadonlyMap<string, DeploymentModel["relationships"][number]>,
  selectedPlacedIds: ReadonlySet<string>,
  diagnostics: Diagnostic[],
): DeploymentModel["relationships"][number][] {
  const included = view.selection?.includeRelationshipIds;
  const excluded = new Set(view.selection?.excludeRelationshipIds ?? []);
  const selectedIds = new Set(included === undefined ? allowed.keys() : []);
  for (const id of included ?? []) {
    const relationship = allowed.get(id);
    if (
      relationship === undefined ||
      !selectedPlacedIds.has(relationship.sourceId) ||
      !selectedPlacedIds.has(relationship.targetId)
    ) {
      invalidRelationshipSelection(view, id, known, diagnostics);
    } else {
      selectedIds.add(id);
    }
  }
  for (const id of excluded) {
    if (!allowed.has(id)) {
      invalidRelationshipSelection(view, id, known, diagnostics);
    }
    selectedIds.delete(id);
  }
  for (const id of included ?? []) {
    if (excluded.has(id)) {
      addViewDiagnostic(
        diagnostics,
        view,
        "C4ML-VIEW-013",
        `View ${displayId(view.id)} both includes and excludes deployment relationship ${displayId(id)}.`,
        "Choose one selection operation for the identifier.",
      );
    }
  }
  return stableById(
    [...selectedIds]
      .map((id) => allowed.get(id))
      .filter(
        (item): item is DeploymentModel["relationships"][number] =>
          item !== undefined &&
          selectedPlacedIds.has(item.sourceId) &&
          selectedPlacedIds.has(item.targetId),
      ),
  );
}

function resolvedView(
  view: ArchitectureView,
  scope: string,
  elements: readonly StaticElement[],
  relationships: readonly Relationship[],
  interactions: readonly ResolvedDynamicInteraction[] = [],
  deployment?: {
    readonly environment: NonNullable<ResolvedView["deploymentEnvironment"]>;
    readonly nodes: ResolvedView["deploymentNodes"];
    readonly infrastructure: ResolvedView["infrastructureNodes"];
    readonly instances: ResolvedView["deploymentInstances"];
    readonly relationships: ResolvedView["deploymentRelationships"];
  },
): ResolvedView {
  const guidance = viewGuidance(view.kind);
  const audience = view.audience ?? guidance.audience;
  // A generated legend is derived from the resolved content; an authored one
  // keeps its own entries. The source language lowers `legend = generated`
  // to `{ mode: "generated" }` without entries, so the mode decides here, not
  // the mere presence of the legend object.
  const legend =
    view.legend !== undefined && view.legend.mode === "authored"
      ? view.legend
      : {
          ...generatedLegend(
            // A Deployment View draws instances and nodes; its static
            // elements are references only and have no notation of their own.
            deployment === undefined ? elements : [],
            deployment?.nodes ?? [],
            deployment?.infrastructure ?? [],
            deployment?.instances ?? [],
          ),
          ...(view.legend?.title === undefined ? {} : { title: view.legend.title }),
        };
  return {
    id: view.id,
    kind: view.kind,
    title: view.title,
    purpose: view.purpose,
    scope,
    audience: [...audience],
    recommendation: guidance.recommendation,
    legend,
    elements: stableById(elements),
    relationships: stableById(relationships),
    interactions: stableInteractions(interactions),
    groups: [],
    ...(view.kind === "dynamic" ? { dynamicDisplay: view.display } : {}),
    deploymentNodes: stableById(deployment?.nodes ?? []),
    infrastructureNodes: stableById(deployment?.infrastructure ?? []),
    deploymentInstances: stableById(deployment?.instances ?? []),
    deploymentRelationships: stableById(deployment?.relationships ?? []),
    ...(deployment === undefined
      ? {}
      : { deploymentEnvironment: deployment.environment }),
    ...(view.presentation === undefined
      ? {}
      : { presentation: view.presentation }),
    ...(view.layout === undefined ? {} : { layout: view.layout }),
  };
}

function generatedLegend(
  elements: readonly StaticElement[],
  nodes: ResolvedView["deploymentNodes"],
  infrastructure: ResolvedView["infrastructureNodes"],
  instances: ResolvedView["deploymentInstances"],
): ViewLegend {
  const kinds = new Set<string>(elements.map((element) => element.kind));
  if (nodes.length > 0) {
    kinds.add("deployment-node");
  }
  if (infrastructure.length > 0) {
    kinds.add("infrastructure-node");
  }
  for (const instance of instances) {
    kinds.add(instance.kind);
  }
  return {
    mode: "generated",
    title: "Notation",
    entries: [...kinds]
      .sort(compareText)
      .map((kind) => ({
        label: humanize(kind),
        description: `C4 ${humanize(kind)}`,
      })),
  };
}

function describeScope(
  view: Exclude<ArchitectureView, DynamicView | DeploymentView>,
  index: ModelIndex,
): string {
  if (view.kind === "system-landscape") {
    return view.scope;
  }
  const id =
    view.kind === "component"
      ? view.containerId
      : view.kind === "code"
        ? view.componentId
        : view.softwareSystemId;
  return index.elementById.get(id)?.name ?? id;
}

function invalidSelectionId(
  view: ArchitectureView,
  id: string,
  label: string,
  known: ReadonlyMap<string, SourceBacked>,
  diagnostics: Diagnostic[],
): void {
  const item = known.get(id);
  diagnostics.push(
    createDiagnostic({
      code: "C4ML-VIEW-011",
      severity: "error",
      message: `View ${displayId(view.id)} has illegal or unknown ${label} ${displayId(id)}.`,
      source: sourceOf(view),
      ...(item === undefined
        ? {}
        : {
            related: [
              {
                message: "The element exists outside this view's C4 scope.",
                source: sourceOf(item),
              },
            ],
          }),
      correction: "Select only elements permitted by the view type and scope.",
    }),
  );
}

function invalidRelationshipSelection<T extends SourceBacked>(
  view: ArchitectureView,
  id: string,
  known: ReadonlyMap<string, T>,
  diagnostics: Diagnostic[],
): void {
  const relationship = known.get(id);
  diagnostics.push(
    createDiagnostic({
      code: "C4ML-VIEW-015",
      severity: "error",
      message: `View ${displayId(view.id)} has an illegal or unknown relationship selection ${displayId(id)}.`,
      source: sourceOf(view),
      ...(relationship === undefined
        ? {}
        : {
            related: [
              {
                message: "The relationship exists outside the selected visible scope.",
                source: sourceOf(relationship),
              },
            ],
          }),
      correction:
        "Select a relationship whose endpoints are visible and permitted in this view.",
    }),
  );
}

function addViewDiagnostic(
  diagnostics: Diagnostic[],
  view: ArchitectureView,
  code: string,
  message: string,
  correction: string,
): void {
  diagnostics.push(
    createDiagnostic({
      code,
      severity: "error",
      message,
      source: sourceOf(view),
      correction,
    }),
  );
}

function addDynamicDiagnostic(
  diagnostics: Diagnostic[],
  interaction: DynamicInteraction,
  code: string,
  message: string,
  correction: string,
): void {
  diagnostics.push(
    createDiagnostic({
      code,
      severity: "error",
      message,
      source: sourceOf(interaction),
      correction,
    }),
  );
}

function instanceBelongsToSystems(
  instance: DeploymentInstance,
  systemIds: ReadonlySet<string>,
  index: ModelIndex,
): boolean {
  if (instance.kind === "software-system-instance") {
    return systemIds.has(instance.softwareSystemId);
  }
  const container = index.elementById.get(instance.containerId);
  return (
    container?.kind === "container" &&
    systemIds.has(container.softwareSystemId)
  );
}

function deploymentItemsById(
  deployment: DeploymentModel,
): Map<
  string,
  DeploymentModel["infrastructureNodes"][number] | DeploymentInstance
> {
  return new Map(
    [...deployment.infrastructureNodes, ...deployment.instances].map((item) => [
      item.id,
      item,
    ]),
  );
}

function addNodeAndAncestors(
  nodeId: string,
  environmentId: string,
  nodeById: ReadonlyMap<string, DeploymentModel["nodes"][number]>,
  target: Set<string>,
): void {
  let current = nodeById.get(nodeId);
  while (current !== undefined && current.environmentId === environmentId) {
    if (target.has(current.id)) {
      return;
    }
    target.add(current.id);
    current =
      current.parentNodeId === undefined
        ? undefined
        : nodeById.get(current.parentNodeId);
  }
}

function staticIdOfInstance(instance: DeploymentInstance): string {
  return instance.kind === "software-system-instance"
    ? instance.softwareSystemId
    : instance.containerId;
}

function isDynamicElement(
  element: StaticElement | undefined,
): element is StaticElement {
  return (
    element?.kind === "software-system" ||
    element?.kind === "container" ||
    element?.kind === "component"
  );
}

function elementsForIds(
  index: ModelIndex,
  ids: ReadonlySet<string>,
): StaticElement[] {
  return stableById(
    [...ids]
      .map((id) => index.elementById.get(id))
      .filter((item): item is StaticElement => item !== undefined),
  );
}

function relationshipsInside(
  relationships: readonly Relationship[],
  elementIds: ReadonlySet<string>,
): Relationship[] {
  return stableById(
    relationships.filter(
      (relationship) =>
        elementIds.has(relationship.sourceId) &&
        elementIds.has(relationship.targetId),
    ),
  );
}

function otherEndpoint(
  relationship: Relationship,
  id: string,
): string | undefined {
  if (relationship.sourceId === id) {
    return relationship.targetId;
  }
  if (relationship.targetId === id) {
    return relationship.sourceId;
  }
  return undefined;
}

function idsOf(items: readonly { readonly id: string }[]): Set<string> {
  return new Set(items.map((item) => item.id));
}

function stableById<T extends { readonly id: string }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => compareText(left.id, right.id));
}

function stableInteractions<T extends DynamicInteraction>(
  interactions: readonly T[],
): T[] {
  return [...interactions].sort(
    (left, right) =>
      left.order - right.order || compareText(left.id, right.id),
  );
}

function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim().length === 0;
}

function displayId(id: string): string {
  return id.length === 0 ? "<empty>" : `"${id}"`;
}

function humanize(value: string): string {
  return value
    .split("-")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}
