import {
  createDiagnostic,
  sortDiagnostics,
  type Diagnostic,
} from "./diagnostics.js";
import {
  isContainer,
  type ArchitectureModel,
  type DeploymentInstance,
  type DeploymentModel,
  type ModelItem,
  type NamedModelItem,
  type Relationship,
  type StaticElement,
} from "./model.js";
import { compareText } from "./ordering.js";
import { sourceOf, type SourceBacked } from "./source.js";

export interface ModelValidationResult {
  readonly diagnostics: readonly Diagnostic[];
  readonly valid: boolean;
}

export function validateArchitectureModel(
  model: ArchitectureModel,
): ModelValidationResult {
  const diagnostics: Diagnostic[] = [];
  const elements = stableById(model.elements);
  const relationships = stableById(model.relationships);
  const elementById = indexUnique(
    elements,
    "C4ML-SEM-002",
    "static element",
    diagnostics,
  );

  for (const element of elements) {
    validateNamedItem(element, "element", diagnostics);
    validateElementOwnership(element, elementById, diagnostics);
    if (
      (element.kind === "container" || element.kind === "component") &&
      isBlank(element.technology)
    ) {
      diagnostics.push(
        createDiagnostic({
          code: "C4ML-SEM-009",
          severity: "error",
          message: `${element.kind} ${displayId(element.id)} has no technology.`,
          source: sourceOf(element),
          correction: "Declare the implementation technology.",
        }),
      );
    }
    if (element.kind === "code-element" && isBlank(element.codeKind)) {
      diagnostics.push(
        createDiagnostic({
          code: "C4ML-SEM-010",
          severity: "error",
          message: `Code element ${displayId(element.id)} has no code kind.`,
          source: sourceOf(element),
          correction: "Declare a code-level construct kind.",
        }),
      );
    }
  }

  const relationshipById = indexUnique(
    relationships,
    "C4ML-SEM-011",
    "relationship",
    diagnostics,
  );
  for (const relationship of relationships) {
    validateRelationship(relationship, elementById, diagnostics);
  }

  if (model.deployment !== undefined) {
    validateDeployment(
      model.deployment,
      elementById,
      relationshipById,
      diagnostics,
    );
  }

  const sorted = sortDiagnostics(diagnostics);
  return {
    diagnostics: sorted,
    valid: !sorted.some((diagnostic) => diagnostic.severity === "error"),
  };
}

function validateNamedItem(
  item: NamedModelItem,
  label: string,
  diagnostics: Diagnostic[],
): void {
  validateId(item, label, diagnostics);
  if (isBlank(item.name)) {
    diagnostics.push(
      createDiagnostic({
        code: "C4ML-SEM-003",
        severity: "error",
        message: `${capitalize(label)} ${displayId(item.id)} has no name.`,
        source: sourceOf(item),
        correction: "Provide a human-readable name.",
      }),
    );
  }
  if (isBlank(item.description)) {
    diagnostics.push(
      createDiagnostic({
        code: "C4ML-SEM-004",
        severity: "error",
        message: `${capitalize(label)} ${displayId(item.id)} has no description.`,
        source: sourceOf(item),
        correction: "Describe the responsibility concisely.",
      }),
    );
  }
}

function validateId(
  item: ModelItem,
  label: string,
  diagnostics: Diagnostic[],
): void {
  if (isBlank(item.id)) {
    diagnostics.push(
      createDiagnostic({
        code: "C4ML-SEM-001",
        severity: "error",
        message: `${capitalize(label)} has an empty stable identifier.`,
        source: sourceOf(item),
        correction: "Assign a non-empty stable identifier.",
      }),
    );
  }
}

function validateElementOwnership(
  element: StaticElement,
  elementById: ReadonlyMap<string, StaticElement>,
  diagnostics: Diagnostic[],
): void {
  if (element.kind === "container") {
    validateOwner(
      element,
      element.softwareSystemId,
      "software-system",
      "C4ML-SEM-006",
      elementById,
      diagnostics,
    );
  } else if (element.kind === "component") {
    validateOwner(
      element,
      element.containerId,
      "container",
      "C4ML-SEM-007",
      elementById,
      diagnostics,
    );
  } else if (element.kind === "code-element") {
    validateOwner(
      element,
      element.componentId,
      "component",
      "C4ML-SEM-008",
      elementById,
      diagnostics,
    );
  }
}

function validateOwner(
  element: StaticElement,
  ownerId: string,
  expectedKind: StaticElement["kind"],
  code: string,
  elementById: ReadonlyMap<string, StaticElement>,
  diagnostics: Diagnostic[],
): void {
  const owner = elementById.get(ownerId);
  if (owner?.kind === expectedKind) {
    return;
  }

  diagnostics.push(
    createDiagnostic({
      code,
      severity: "error",
      message:
        owner === undefined
          ? `${element.kind} ${displayId(element.id)} references unknown owner ${displayId(ownerId)}.`
          : `${element.kind} ${displayId(element.id)} cannot be owned by ${owner.kind} ${displayId(owner.id)}.`,
      source: sourceOf(element),
      ...(owner === undefined
        ? {}
        : {
            related: [
              {
                message: "The referenced owner is declared here.",
                source: sourceOf(owner),
              },
            ],
          }),
      correction: `Reference an existing ${expectedKind}.`,
    }),
  );
}

function validateRelationship(
  relationship: Relationship,
  elementById: ReadonlyMap<string, StaticElement>,
  diagnostics: Diagnostic[],
): void {
  validateId(relationship, "relationship", diagnostics);
  const source = elementById.get(relationship.sourceId);
  const target = elementById.get(relationship.targetId);

  if (source === undefined || target === undefined) {
    const missing = [
      ...(source === undefined ? [relationship.sourceId] : []),
      ...(target === undefined ? [relationship.targetId] : []),
    ];
    diagnostics.push(
      createDiagnostic({
        code: "C4ML-SEM-012",
        severity: "error",
        message: `Relationship ${displayId(relationship.id)} has unknown endpoint(s): ${missing.map(displayId).join(", ")}.`,
        source: sourceOf(relationship),
        correction: "Reference existing static elements.",
      }),
    );
  }

  if (isBlank(relationship.description)) {
    diagnostics.push(
      createDiagnostic({
        code: "C4ML-SEM-013",
        severity: "error",
        message: `Relationship ${displayId(relationship.id)} has no description.`,
        source: sourceOf(relationship),
        correction: "Describe the intent in the relationship direction.",
      }),
    );
  } else if (relationship.description.trim().toLowerCase() === "uses") {
    diagnostics.push(
      createDiagnostic({
        code: "C4ML-SEM-014",
        severity: "warning",
        message: `Relationship ${displayId(relationship.id)} uses the vague description "Uses".`,
        source: sourceOf(relationship),
        correction: "State the concrete intent or data flow.",
      }),
    );
  }

  if (
    source !== undefined &&
    target !== undefined &&
    isContainer(source) &&
    isContainer(target) &&
    isBlank(relationship.technology) &&
    isBlank(relationship.protocol)
  ) {
    diagnostics.push(
      createDiagnostic({
        code: "C4ML-SEM-015",
        severity: "error",
        message: `Container relationship ${displayId(relationship.id)} has no technology or protocol.`,
        source: sourceOf(relationship),
        correction: "Declare the communication technology or protocol.",
      }),
    );
  }
}

function validateDeployment(
  deployment: DeploymentModel,
  elementById: ReadonlyMap<string, StaticElement>,
  relationshipById: ReadonlyMap<string, Relationship>,
  diagnostics: Diagnostic[],
): void {
  const environments = stableById(deployment.environments);
  const nodes = stableById(deployment.nodes);
  const infrastructureNodes = stableById(deployment.infrastructureNodes);
  const instances = stableById(deployment.instances);
  const relationships = stableById(deployment.relationships);

  const environmentById = indexUnique(
    environments,
    "C4ML-DEP-001",
    "deployment environment",
    diagnostics,
  );
  const nodeById = indexUnique(
    nodes,
    "C4ML-DEP-002",
    "deployment node",
    diagnostics,
  );
  const placedItems = [...infrastructureNodes, ...instances];
  const placedItemById = indexUnique(
    stableById(placedItems),
    "C4ML-DEP-003",
    "deployment item",
    diagnostics,
  );
  indexUnique(
    relationships,
    "C4ML-DEP-004",
    "deployment relationship",
    diagnostics,
  );

  for (const environment of environments) {
    validateNamedItem(environment, "deployment environment", diagnostics);
  }

  for (const node of nodes) {
    validateNamedItem(node, "deployment node", diagnostics);
    if (isBlank(node.technology)) {
      diagnostics.push(
        createDiagnostic({
          code: "C4ML-DEP-005",
          severity: "error",
          message: `Deployment node ${displayId(node.id)} has no technology.`,
          source: sourceOf(node),
          correction: "Declare the node technology.",
        }),
      );
    }
    validateEnvironmentReference(
      node,
      node.environmentId,
      environmentById,
      diagnostics,
    );
    if (node.parentNodeId !== undefined) {
      const parent = nodeById.get(node.parentNodeId);
      if (parent === undefined || parent.environmentId !== node.environmentId) {
        diagnostics.push(
          createDiagnostic({
            code: "C4ML-DEP-006",
            severity: "error",
            message: `Deployment node ${displayId(node.id)} has an unknown or cross-environment parent ${displayId(node.parentNodeId)}.`,
            source: sourceOf(node),
            correction: "Reference a parent node in the same environment.",
          }),
        );
      }
    }
  }
  validateDeploymentNodeCycles(nodes, nodeById, diagnostics);

  for (const infrastructure of infrastructureNodes) {
    validateNamedItem(infrastructure, "infrastructure node", diagnostics);
    if (isBlank(infrastructure.technology)) {
      diagnostics.push(
        createDiagnostic({
          code: "C4ML-DEP-007",
          severity: "error",
          message: `Infrastructure node ${displayId(infrastructure.id)} has no technology.`,
          source: sourceOf(infrastructure),
          correction: "Declare the infrastructure technology.",
        }),
      );
    }
    validatePlacement(
      infrastructure,
      infrastructure.environmentId,
      infrastructure.nodeId,
      environmentById,
      nodeById,
      diagnostics,
    );
  }

  for (const instance of instances) {
    validateId(instance, "deployment instance", diagnostics);
    validatePlacement(
      instance,
      instance.environmentId,
      instance.nodeId,
      environmentById,
      nodeById,
      diagnostics,
    );
    const staticElementId = staticIdOfInstance(instance);
    const staticElement = elementById.get(staticElementId);
    const expectedKind =
      instance.kind === "software-system-instance"
        ? "software-system"
        : "container";
    if (staticElement?.kind !== expectedKind) {
      diagnostics.push(
        createDiagnostic({
          code: "C4ML-DEP-010",
          severity: "error",
          message: `${instance.kind} ${displayId(instance.id)} does not resolve to a ${expectedKind}.`,
          source: sourceOf(instance),
          correction: `Reference an existing ${expectedKind}.`,
        }),
      );
    }
  }

  for (const relationship of relationships) {
    validateId(relationship, "deployment relationship", diagnostics);
    if (isBlank(relationship.description)) {
      diagnostics.push(
        createDiagnostic({
          code: "C4ML-DEP-011",
          severity: "error",
          message: `Deployment relationship ${displayId(relationship.id)} has no description.`,
          source: sourceOf(relationship),
          correction: "Describe the environment-specific communication.",
        }),
      );
    }
    const source = placedItemById.get(relationship.sourceId);
    const target = placedItemById.get(relationship.targetId);
    if (source === undefined || target === undefined) {
      diagnostics.push(
        createDiagnostic({
          code: "C4ML-DEP-012",
          severity: "error",
          message: `Deployment relationship ${displayId(relationship.id)} has an unknown endpoint.`,
          source: sourceOf(relationship),
          correction: "Reference an instance or infrastructure node.",
        }),
      );
      continue;
    }
    if (source.environmentId !== target.environmentId) {
      diagnostics.push(
        createDiagnostic({
          code: "C4ML-DEP-013",
          severity: "error",
          message: `Deployment relationship ${displayId(relationship.id)} crosses environments.`,
          source: sourceOf(relationship),
          correction: "Keep a deployment relationship within one environment.",
        }),
      );
    }
    validateStaticDeploymentRelationship(
      relationship,
      source,
      target,
      relationshipById,
      diagnostics,
    );
  }
}

function validateEnvironmentReference(
  item: SourceBacked,
  environmentId: string,
  environmentById: ReadonlyMap<string, NamedModelItem>,
  diagnostics: Diagnostic[],
): void {
  if (!environmentById.has(environmentId)) {
    diagnostics.push(
      createDiagnostic({
        code: "C4ML-DEP-008",
        severity: "error",
        message: `Deployment item references unknown environment ${displayId(environmentId)}.`,
        source: sourceOf(item),
        correction: "Reference an existing deployment environment.",
      }),
    );
  }
}

function validatePlacement(
  item: SourceBacked,
  environmentId: string,
  nodeId: string,
  environmentById: ReadonlyMap<string, NamedModelItem>,
  nodeById: ReadonlyMap<string, NamedModelItem & { readonly environmentId: string }>,
  diagnostics: Diagnostic[],
): void {
  validateEnvironmentReference(
    item,
    environmentId,
    environmentById,
    diagnostics,
  );
  const node = nodeById.get(nodeId);
  if (node === undefined || node.environmentId !== environmentId) {
    diagnostics.push(
      createDiagnostic({
        code: "C4ML-DEP-009",
        severity: "error",
        message: `Deployment item has unknown or cross-environment placement ${displayId(nodeId)}.`,
        source: sourceOf(item),
        correction: "Place the item in a node from the same environment.",
      }),
    );
  }
}

function validateDeploymentNodeCycles(
  nodes: readonly (NamedModelItem & {
    readonly parentNodeId?: string;
  })[],
  nodeById: ReadonlyMap<
    string,
    NamedModelItem & { readonly parentNodeId?: string }
  >,
  diagnostics: Diagnostic[],
): void {
  for (const node of nodes) {
    const visited = new Set<string>([node.id]);
    let parentId = node.parentNodeId;
    while (parentId !== undefined) {
      if (visited.has(parentId)) {
        diagnostics.push(
          createDiagnostic({
            code: "C4ML-DEP-014",
            severity: "error",
            message: `Deployment node containment cycle includes ${displayId(parentId)}.`,
            source: sourceOf(node),
            correction: "Remove the cyclic parent reference.",
          }),
        );
        break;
      }
      visited.add(parentId);
      parentId = nodeById.get(parentId)?.parentNodeId;
    }
  }
}

function validateStaticDeploymentRelationship(
  deploymentRelationship: DeploymentModel["relationships"][number],
  source: DeploymentModel["infrastructureNodes"][number] | DeploymentInstance,
  target: DeploymentModel["infrastructureNodes"][number] | DeploymentInstance,
  relationshipById: ReadonlyMap<string, Relationship>,
  diagnostics: Diagnostic[],
): void {
  if (
    source.kind === "infrastructure-node" ||
    target.kind === "infrastructure-node"
  ) {
    return;
  }

  const sourceStaticId = staticIdOfInstance(source);
  const targetStaticId = staticIdOfInstance(target);
  const matching = [...relationshipById.values()].filter(
    (relationship) =>
      relationship.sourceId === sourceStaticId &&
      relationship.targetId === targetStaticId,
  );
  if (deploymentRelationship.staticRelationshipId === undefined) {
    if (matching.length !== 1) {
      diagnostics.push(
        createDiagnostic({
          code: "C4ML-DEP-015",
          severity: "error",
          message: `Deployment relationship ${displayId(deploymentRelationship.id)} cannot derive one static relationship.`,
          source: sourceOf(deploymentRelationship),
          correction:
            "Reference the corresponding directed static relationship explicitly.",
        }),
      );
    }
    return;
  }

  const staticRelationship = relationshipById.get(
    deploymentRelationship.staticRelationshipId,
  );
  if (
    staticRelationship === undefined ||
    staticRelationship.sourceId !== sourceStaticId ||
    staticRelationship.targetId !== targetStaticId
  ) {
    diagnostics.push(
      createDiagnostic({
        code: "C4ML-DEP-016",
        severity: "error",
        message: `Deployment relationship ${displayId(deploymentRelationship.id)} does not match its static relationship.`,
        source: sourceOf(deploymentRelationship),
        correction: "Reference a static relationship with matching direction.",
      }),
    );
  }
}

function staticIdOfInstance(instance: DeploymentInstance): string {
  return instance.kind === "software-system-instance"
    ? instance.softwareSystemId
    : instance.containerId;
}

function indexUnique<T extends ModelItem>(
  items: readonly T[],
  code: string,
  label: string,
  diagnostics: Diagnostic[],
): Map<string, T> {
  const result = new Map<string, T>();
  for (const item of items) {
    const existing = result.get(item.id);
    if (existing === undefined) {
      result.set(item.id, item);
      continue;
    }
    diagnostics.push(
      createDiagnostic({
        code,
        severity: "error",
        message: `Duplicate ${label} identifier ${displayId(item.id)}.`,
        source: sourceOf(item),
        related: [
          {
            message: "The first declaration is here.",
            source: sourceOf(existing),
          },
        ],
        correction: "Assign globally stable, unique identifiers.",
      }),
    );
  }
  return result;
}

function stableById<T extends { readonly id: string }>(
  items: readonly T[],
): T[] {
  return [...items].sort((left, right) => compareText(left.id, right.id));
}

function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim().length === 0;
}

function displayId(id: string): string {
  return id.length === 0 ? "<empty>" : `"${id}"`;
}

function capitalize(value: string): string {
  return value.length === 0 ? value : value[0]!.toUpperCase() + value.slice(1);
}
