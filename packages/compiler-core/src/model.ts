import type { SourceBacked } from "./source.js";

export type ElementKind =
  | "code-element"
  | "component"
  | "container"
  | "person"
  | "software-system";

export type ElementClassification = "external" | "internal";

export type SemanticElementKind =
  | ElementKind
  | "container-instance"
  | "infrastructure-node"
  | "software-system-instance";

export interface DocumentationLink {
  readonly label: string;
  readonly url: string;
}

export interface ModelItem extends SourceBacked {
  readonly id: string;
}

export interface NamedModelItem extends ModelItem {
  readonly name: string;
  readonly description: string;
}

export interface StaticElementBase extends NamedModelItem {
  readonly kind: ElementKind;
  readonly classification?: ElementClassification;
  readonly technology?: string;
  readonly tags?: readonly string[];
  readonly links?: readonly DocumentationLink[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface Person extends StaticElementBase {
  readonly kind: "person";
}

export interface SoftwareSystem extends StaticElementBase {
  readonly kind: "software-system";
}

export interface Container extends StaticElementBase {
  readonly kind: "container";
  readonly softwareSystemId: string;
  readonly technology: string;
}

export interface Component extends StaticElementBase {
  readonly kind: "component";
  readonly containerId: string;
  readonly technology: string;
}

export interface CodeElement extends StaticElementBase {
  readonly kind: "code-element";
  readonly componentId: string;
  readonly codeKind: string;
  readonly language?: string;
  readonly namespace?: string;
  readonly signature?: string;
}

export type StaticElement =
  | Person
  | SoftwareSystem
  | Container
  | Component
  | CodeElement;

export interface Relationship extends ModelItem {
  readonly sourceId: string;
  readonly targetId: string;
  readonly description: string;
  readonly technology?: string;
  readonly protocol?: string;
  readonly tags?: readonly string[];
  readonly url?: string;
}

export interface DeploymentEnvironment extends NamedModelItem {
  readonly kind: "deployment-environment";
}

export interface DeploymentNode extends NamedModelItem {
  readonly kind: "deployment-node";
  readonly environmentId: string;
  readonly parentNodeId?: string;
  readonly technology: string;
}

export interface InfrastructureNode extends NamedModelItem {
  readonly kind: "infrastructure-node";
  readonly environmentId: string;
  readonly nodeId: string;
  readonly technology: string;
}

export interface SoftwareSystemInstance extends ModelItem {
  readonly kind: "software-system-instance";
  readonly environmentId: string;
  readonly nodeId: string;
  readonly softwareSystemId: string;
}

export interface ContainerInstance extends ModelItem {
  readonly kind: "container-instance";
  readonly environmentId: string;
  readonly nodeId: string;
  readonly containerId: string;
}

export type DeploymentInstance =
  | SoftwareSystemInstance
  | ContainerInstance;

export interface DeploymentRelationship extends ModelItem {
  readonly sourceId: string;
  readonly targetId: string;
  readonly description: string;
  readonly staticRelationshipId?: string;
  readonly technology?: string;
}

export interface DeploymentModel {
  readonly environments: readonly DeploymentEnvironment[];
  readonly nodes: readonly DeploymentNode[];
  readonly infrastructureNodes: readonly InfrastructureNode[];
  readonly instances: readonly DeploymentInstance[];
  readonly relationships: readonly DeploymentRelationship[];
}

export interface ArchitectureModel {
  readonly elements: readonly StaticElement[];
  readonly relationships: readonly Relationship[];
  readonly deployment?: DeploymentModel;
}

export function isPerson(element: StaticElement): element is Person {
  return element.kind === "person";
}

export function isSoftwareSystem(
  element: StaticElement,
): element is SoftwareSystem {
  return element.kind === "software-system";
}

export function isContainer(element: StaticElement): element is Container {
  return element.kind === "container";
}

export function isComponent(element: StaticElement): element is Component {
  return element.kind === "component";
}

export function isCodeElement(element: StaticElement): element is CodeElement {
  return element.kind === "code-element";
}
