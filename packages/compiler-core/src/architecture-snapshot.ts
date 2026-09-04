import type { Diagnostic } from "./diagnostics.js";
import { compareText } from "./ordering.js";
import type { DiagramPlacementOptions } from "./placement.js";
import type { DiagramRoutingOptions } from "./routing.js";
import { validateArchitectureModel } from "./semantic-validation.js";
import type {
  ArchitectureModel,
  ContainerInstance,
  DeploymentInstance,
  SoftwareSystemInstance,
  StaticElement,
} from "./model.js";
import { resolveArchitectureViews, type ViewResolutionResult } from "./view-resolution.js";
import type {
  ArchitectureView,
  ResolvedView,
  ResolvedVisualGroupMember,
  ViewKind,
} from "./views.js";

export const architectureSnapshotVersion = 1 as const;

export type CanonicalValue =
  | boolean
  | null
  | number
  | string
  | readonly CanonicalValue[]
  | CanonicalObject;

export interface CanonicalObject {
  readonly [key: string]: CanonicalValue;
}

export interface SnapshotLink {
  readonly label: string;
  readonly url: string;
}

export interface SnapshotElement {
  readonly id: string;
  readonly kind: StaticElement["kind"];
  readonly name: string;
  readonly description: string;
  readonly parentId?: string;
  readonly classification?: "external" | "internal";
  readonly technology?: string;
  readonly tags: readonly string[];
  readonly links: readonly SnapshotLink[];
  readonly metadata?: CanonicalObject;
  readonly codeKind?: string;
  readonly language?: string;
  readonly namespace?: string;
  readonly signature?: string;
}

export interface SnapshotRelationship {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly description: string;
  readonly technology?: string;
  readonly protocol?: string;
  readonly tags: readonly string[];
  readonly url?: string;
}

export interface SnapshotDeploymentEnvironment {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}

export interface SnapshotDeploymentNode {
  readonly id: string;
  readonly environmentId: string;
  readonly parentNodeId?: string;
  readonly name: string;
  readonly description: string;
  readonly technology: string;
}

export interface SnapshotInfrastructureNode {
  readonly id: string;
  readonly environmentId: string;
  readonly nodeId: string;
  readonly name: string;
  readonly description: string;
  readonly technology: string;
}

export interface SnapshotDeploymentInstance {
  readonly id: string;
  readonly kind: DeploymentInstance["kind"];
  readonly environmentId: string;
  readonly nodeId: string;
  readonly staticElementId: string;
}

export interface SnapshotDeploymentRelationship {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly description: string;
  readonly staticRelationshipId?: string;
  readonly technology?: string;
}

export interface SnapshotDeployment {
  readonly environments: readonly SnapshotDeploymentEnvironment[];
  readonly nodes: readonly SnapshotDeploymentNode[];
  readonly infrastructureNodes: readonly SnapshotInfrastructureNode[];
  readonly instances: readonly SnapshotDeploymentInstance[];
  readonly relationships: readonly SnapshotDeploymentRelationship[];
}

export interface SnapshotInteraction {
  readonly id: string;
  readonly order: number;
  readonly parallelGroup?: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly description: string;
  readonly relationshipId: string;
}

export interface SnapshotGroupMember {
  readonly kind: ResolvedVisualGroupMember["kind"];
  readonly id: string;
}

export interface SnapshotGroup {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly members: readonly SnapshotGroupMember[];
  readonly presentation?: CanonicalObject;
  readonly layout: CanonicalObject;
}

export interface SnapshotView {
  readonly id: string;
  readonly kind: ViewKind;
  readonly title: string;
  readonly purpose: string;
  readonly scope: string;
  readonly scopeIdentity?: CanonicalObject;
  readonly audience: readonly string[];
  readonly recommendation: string;
  readonly legend: CanonicalObject;
  readonly elementIds: readonly string[];
  readonly relationshipIds: readonly string[];
  readonly interactions: readonly SnapshotInteraction[];
  readonly groups: readonly SnapshotGroup[];
  readonly dynamicDisplay?: "collaboration" | "sequence";
  readonly deploymentEnvironmentId?: string;
  readonly deploymentNodeIds: readonly string[];
  readonly infrastructureNodeIds: readonly string[];
  readonly deploymentInstanceIds: readonly string[];
  readonly deploymentRelationshipIds: readonly string[];
  readonly presentation?: CanonicalObject;
  readonly layout?: CanonicalObject;
  readonly placement?: CanonicalObject;
  readonly routing?: CanonicalObject;
}

export interface ArchitectureSnapshot {
  readonly version: typeof architectureSnapshotVersion;
  readonly elements: readonly SnapshotElement[];
  readonly relationships: readonly SnapshotRelationship[];
  readonly deployment?: SnapshotDeployment;
  readonly views: readonly SnapshotView[];
}

export interface ArchitectureSnapshotResolution {
  readonly valid: boolean;
  readonly diagnostics: readonly Diagnostic[];
  readonly snapshot?: ArchitectureSnapshot;
}

export interface ArchitectureSnapshotOptions {
  readonly placementByViewId?: Readonly<Record<string, DiagramPlacementOptions>> | undefined;
  readonly routingByViewId?: Readonly<Record<string, DiagramRoutingOptions>> | undefined;
}

export class ArchitectureSnapshotError extends Error {
  constructor(
    readonly code: "C4ML-SNAPSHOT-001" | "C4ML-SNAPSHOT-002",
    message: string,
  ) {
    super(message);
    this.name = "ArchitectureSnapshotError";
  }
}

export function resolveArchitectureSnapshot(
  model: ArchitectureModel,
  views: readonly ArchitectureView[],
  options: ArchitectureSnapshotOptions = {},
): ArchitectureSnapshotResolution {
  const resolution = resolveArchitectureViews(model, views);
  return resolution.valid
    ? {
        valid: true,
        diagnostics: resolution.diagnostics,
        snapshot: createArchitectureSnapshot(model, resolution, views, options),
      }
    : { valid: false, diagnostics: resolution.diagnostics };
}

export function createArchitectureSnapshot(
  model: ArchitectureModel,
  resolution: ViewResolutionResult,
  sourceViews?: readonly ArchitectureView[],
  options: ArchitectureSnapshotOptions = {},
): ArchitectureSnapshot {
  const validation = validateArchitectureModel(model);
  if (!validation.valid || !resolution.valid) {
    throw new ArchitectureSnapshotError(
      "C4ML-SNAPSHOT-001",
      "An architecture snapshot requires a valid model and resolved views.",
    );
  }

  return {
    version: architectureSnapshotVersion,
    elements: stableById(model.elements).map(snapshotElement),
    relationships: stableById(model.relationships).map((relationship) => ({
      id: relationship.id,
      sourceId: relationship.sourceId,
      targetId: relationship.targetId,
      description: relationship.description,
      ...(relationship.technology === undefined
        ? {}
        : { technology: relationship.technology }),
      ...(relationship.protocol === undefined
        ? {}
        : { protocol: relationship.protocol }),
      tags: stableUnique(relationship.tags ?? []),
      ...(relationship.url === undefined ? {} : { url: relationship.url }),
    })),
    ...(model.deployment === undefined
      ? {}
      : { deployment: snapshotDeployment(model.deployment) }),
    views: stableById(resolution.views).map((view) =>
      snapshotView(
        view,
        sourceViews?.find(({ id }) => id === view.id),
        options,
      ),
    ),
  };
}

export function serializeArchitectureSnapshot(snapshot: ArchitectureSnapshot): string {
  return JSON.stringify(snapshot);
}

function snapshotElement(element: StaticElement): SnapshotElement {
  const parentId =
    element.kind === "container"
      ? element.softwareSystemId
      : element.kind === "component"
        ? element.containerId
        : element.kind === "code-element"
          ? element.componentId
          : undefined;
  return {
    id: element.id,
    kind: element.kind,
    name: element.name,
    description: element.description,
    ...(parentId === undefined ? {} : { parentId }),
    ...(element.classification === undefined
      ? {}
      : { classification: element.classification }),
    ...(element.technology === undefined ? {} : { technology: element.technology }),
    tags: stableUnique(element.tags ?? []),
    links: [...(element.links ?? [])]
      .map((link) => ({ ...link }))
      .sort(
        (left, right) =>
          compareText(left.label, right.label) || compareText(left.url, right.url),
      ),
    ...(element.metadata === undefined
      ? {}
      : { metadata: canonicalObject(element.metadata) }),
    ...(element.kind !== "code-element"
      ? {}
      : {
          codeKind: element.codeKind,
          ...(element.language === undefined ? {} : { language: element.language }),
          ...(element.namespace === undefined ? {} : { namespace: element.namespace }),
          ...(element.signature === undefined ? {} : { signature: element.signature }),
        }),
  };
}

function snapshotDeployment(
  deployment: NonNullable<ArchitectureModel["deployment"]>,
): SnapshotDeployment {
  return {
    environments: stableById(deployment.environments).map((environment) => ({
      id: environment.id,
      name: environment.name,
      description: environment.description,
    })),
    nodes: stableById(deployment.nodes).map((node) => ({
      id: node.id,
      environmentId: node.environmentId,
      ...(node.parentNodeId === undefined ? {} : { parentNodeId: node.parentNodeId }),
      name: node.name,
      description: node.description,
      technology: node.technology,
    })),
    infrastructureNodes: stableById(deployment.infrastructureNodes).map((node) => ({
      id: node.id,
      environmentId: node.environmentId,
      nodeId: node.nodeId,
      name: node.name,
      description: node.description,
      technology: node.technology,
    })),
    instances: stableById(deployment.instances).map(snapshotInstance),
    relationships: stableById(deployment.relationships).map((relationship) => ({
      id: relationship.id,
      sourceId: relationship.sourceId,
      targetId: relationship.targetId,
      description: relationship.description,
      ...(relationship.staticRelationshipId === undefined
        ? {}
        : { staticRelationshipId: relationship.staticRelationshipId }),
      ...(relationship.technology === undefined
        ? {}
        : { technology: relationship.technology }),
    })),
  };
}

function snapshotInstance(instance: DeploymentInstance): SnapshotDeploymentInstance {
  return {
    id: instance.id,
    kind: instance.kind,
    environmentId: instance.environmentId,
    nodeId: instance.nodeId,
    staticElementId: staticElementId(instance),
  };
}

function staticElementId(
  instance: ContainerInstance | SoftwareSystemInstance,
): string {
  return instance.kind === "container-instance"
    ? instance.containerId
    : instance.softwareSystemId;
}

function snapshotView(
  view: ResolvedView,
  sourceView?: ArchitectureView,
  options: ArchitectureSnapshotOptions = {},
): SnapshotView {
  const placement = snapshotPlacement(options.placementByViewId?.[view.id]);
  const routing = snapshotRouting(options.routingByViewId?.[view.id]);
  return {
    id: view.id,
    kind: view.kind,
    title: view.title,
    purpose: view.purpose,
    scope: view.scope,
    ...(sourceView === undefined
      ? {}
      : { scopeIdentity: snapshotViewScopeIdentity(sourceView) }),
    audience: [...view.audience],
    recommendation: view.recommendation,
    legend: canonicalObject(view.legend),
    elementIds: stableIds(view.elements),
    // Authored identities, including those an implied projection stands
    // for, so coverage and comparison reason about declared Relationships.
    relationshipIds: [
      ...new Set(view.relationships.flatMap(({ represents }) => represents)),
    ].sort(compareText),
    interactions: [...view.interactions]
      .map((interaction) => ({
        id: interaction.id,
        order: interaction.order,
        ...(interaction.parallelGroup === undefined
          ? {}
          : { parallelGroup: interaction.parallelGroup }),
        sourceId: interaction.sourceId,
        targetId: interaction.targetId,
        description: interaction.description,
        relationshipId: interaction.relationship.id,
      }))
      .sort(
        (left, right) =>
          left.order - right.order || compareText(left.id, right.id),
      ),
    groups: stableById(view.groups).map((group) => ({
      id: group.id,
      title: group.title,
      ...(group.description === undefined ? {} : { description: group.description }),
      members: group.members
        .map(snapshotGroupMember)
        .sort(
          (left, right) =>
            compareText(left.kind, right.kind) || compareText(left.id, right.id),
        ),
      ...(group.presentation === undefined
        ? {}
        : { presentation: canonicalObject(group.presentation) }),
      layout: canonicalObject(group.layout),
    })),
    ...(view.dynamicDisplay === undefined
      ? {}
      : { dynamicDisplay: view.dynamicDisplay }),
    ...(view.deploymentEnvironment === undefined
      ? {}
      : { deploymentEnvironmentId: view.deploymentEnvironment.id }),
    deploymentNodeIds: stableIds(view.deploymentNodes),
    infrastructureNodeIds: stableIds(view.infrastructureNodes),
    deploymentInstanceIds: stableIds(view.deploymentInstances),
    deploymentRelationshipIds: stableIds(view.deploymentRelationships),
    ...(view.presentation === undefined
      ? {}
      : { presentation: canonicalObject(view.presentation) }),
    ...(view.layout === undefined ? {} : { layout: canonicalObject(view.layout) }),
    ...(placement === undefined ? {} : { placement }),
    ...(routing === undefined ? {} : { routing }),
  };
}

function snapshotPlacement(
  placement: DiagramPlacementOptions | undefined,
): CanonicalObject | undefined {
  if ((placement?.constraints.length ?? 0) === 0) return undefined;
  return canonicalObject({
    constraints: stableById(placement!.constraints).map(stripSources),
  });
}

function snapshotRouting(
  routing: DiagramRoutingOptions | undefined,
): CanonicalObject | undefined {
  const hasRouting =
    (routing?.controls?.length ?? 0) > 0 ||
    (routing?.avoidanceRegions?.length ?? 0) > 0 ||
    (routing?.corridors?.length ?? 0) > 0;
  if (!hasRouting) return undefined;
  return canonicalObject({
    controls: [...(routing?.controls ?? [])]
      .sort((left, right) => compareText(left.relationshipId, right.relationshipId))
      .map(stripSources),
    avoidanceRegions: stableById(routing?.avoidanceRegions ?? []).map(stripSources),
    corridors: stableById(routing?.corridors ?? []).map(stripSources),
  });
}

function stripSources(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripSources);
  if (typeof value !== "object" || value === null) return value;
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (key !== "source" && item !== undefined) result[key] = stripSources(item);
  }
  return result;
}

function snapshotViewScopeIdentity(view: ArchitectureView): CanonicalObject {
  switch (view.kind) {
    case "code":
      return { componentId: view.componentId };
    case "component":
      return { containerId: view.containerId };
    case "container":
    case "system-context":
      return { softwareSystemId: view.softwareSystemId };
    case "deployment":
      return {
        environmentId: view.environmentId,
        softwareSystemIds: stableUnique(view.softwareSystemIds),
      };
    case "dynamic":
      return { scenario: view.scenario };
    case "system-landscape":
      return { scope: view.scope };
  }
}

function snapshotGroupMember(member: ResolvedVisualGroupMember): SnapshotGroupMember {
  switch (member.kind) {
    case "deployment-instance":
      return { kind: member.kind, id: member.instance.id };
    case "deployment-node":
      return { kind: member.kind, id: member.node.id };
    case "element":
      return { kind: member.kind, id: member.element.id };
    case "group":
      return { kind: member.kind, id: member.groupId };
    case "infrastructure-node":
      return { kind: member.kind, id: member.infrastructureNode.id };
  }
}

function canonicalObject(value: object): CanonicalObject {
  const canonical = canonicalValue(value);
  if (canonical === null || Array.isArray(canonical) || typeof canonical !== "object") {
    throw new ArchitectureSnapshotError(
      "C4ML-SNAPSHOT-002",
      "Expected an object while normalizing architecture data.",
    );
  }
  return canonical as CanonicalObject;
}

function canonicalValue(value: unknown): CanonicalValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new ArchitectureSnapshotError(
        "C4ML-SNAPSHOT-002",
        "Architecture snapshot values must contain only finite numbers.",
      );
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => canonicalValue(item));
  }
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value) as object | null;
    if (prototype !== Object.prototype && prototype !== null) {
      throw new ArchitectureSnapshotError(
        "C4ML-SNAPSHOT-002",
        "Architecture snapshot values must be plain data objects.",
      );
    }
    const result: Record<string, CanonicalValue> = {};
    for (const key of Object.keys(value).sort(compareText)) {
      const item = (value as Record<string, unknown>)[key];
      if (item !== undefined) {
        result[key] = canonicalValue(item);
      }
    }
    return result;
  }
  throw new ArchitectureSnapshotError(
    "C4ML-SNAPSHOT-002",
    "Architecture snapshot values must be JSON-compatible plain data.",
  );
}

function stableById<T extends { readonly id: string }>(values: readonly T[]): T[] {
  return [...values].sort((left, right) => compareText(left.id, right.id));
}

function stableIds(values: readonly { readonly id: string }[]): string[] {
  return stableById(values).map(({ id }) => id);
}

function stableUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort(compareText);
}
