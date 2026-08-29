import {
  AstUtils,
  DefaultScopeProvider,
  type AstNode,
  type LangiumCoreServices,
  type ReferenceInfo,
  type Scope,
} from "langium";

import {
  type C4mlDocument,
  type EnvironmentDeclaration,
  type LayoutBlock,
  isComponentDeclaration,
  isContainerDeclaration,
  isC4mlDocument,
  isDeploymentEndpointDeclaration,
  isDeploymentNodeDeclaration,
  isEnvironmentDeclaration,
  isLayoutBlock,
  isSoftwareSystemDeclaration,
  isViewDeclaration,
  isViewTypeProperty,
} from "./generated/ast.js";

export class C4mlDraftScopeProvider extends DefaultScopeProvider {
  constructor(services: LangiumCoreServices) {
    super(services);
  }

  override getScope(context: ReferenceInfo): Scope {
    if (
      context.property !== "value" &&
      context.property !== "values" &&
      context.property !== "element" &&
      context.property !== "system" &&
      context.property !== "container" &&
      context.property !== "node" &&
      context.property !== "parent" &&
      context.property !== "relationship" &&
      context.property !== "subject" &&
      context.property !== "target"
    ) {
      return super.getScope(context);
    }
    const root = AstUtils.getDocument(context.container).parseResult.value;
    if (!isC4mlDocument(root)) {
      return super.getScope(context);
    }

    const referenceType = this.reflection.getReferenceType(context);
    if (referenceType === "RelationshipDeclaration") {
      return this.createScopeForNodes(
        root.relations.relationships,
        super.getScope(context),
      );
    }
    if (referenceType === "RouteCorridorDeclaration") {
      return this.createScopeForNodes(
        layoutOf(context.container)?.corridors ?? [],
        super.getScope(context),
      );
    }
    const deployment = root.deployment;
    if (referenceType === "EnvironmentDeclaration") {
      return this.createScopeForNodes(
        deployment?.environments ?? [],
        super.getScope(context),
      );
    }
    if (
      referenceType === "DeploymentNodeDeclaration" ||
      referenceType === "DeploymentEndpointDeclaration"
    ) {
      const environment = environmentOf(context.container);
      const items = environment?.items ?? [];
      const matches =
        referenceType === "DeploymentNodeDeclaration"
          ? items.filter(isDeploymentNodeDeclaration)
          : items.filter(isDeploymentEndpointDeclaration);
      return this.createScopeForNodes(matches, super.getScope(context));
    }
    const elements = this.elementsForReference(
      root.model.elements,
      context,
      referenceType,
    );
    return this.createScopeForNodes(elements, super.getScope(context));
  }

  private elementsForReference(
    elements: C4mlDocument["model"]["elements"],
    context: ReferenceInfo,
    referenceType: string,
  ): C4mlDocument["model"]["elements"] {
    if (referenceType === "SoftwareSystemDeclaration") {
      return elements.filter(isSoftwareSystemDeclaration);
    }
    if (referenceType === "ContainerDeclaration") {
      return elements.filter(isContainerDeclaration);
    }
    if (referenceType === "ComponentDeclaration") {
      return elements.filter(isComponentDeclaration);
    }
    if (context.container.$type !== "ViewScopeProperty") {
      return elements;
    }

    const view = context.container.$container;
    if (!isViewDeclaration(view)) {
      return elements;
    }
    const type = view.properties.find(isViewTypeProperty)?.value;
    switch (type) {
      case "component":
        return elements.filter(isContainerDeclaration);
      case "code":
        return elements.filter(isComponentDeclaration);
      case "container":
      case "system-context":
        return elements.filter(isSoftwareSystemDeclaration);
      case "dynamic":
      case "system-landscape":
        return [];
      default:
        return [];
    }
  }
}

function layoutOf(node: AstNode): LayoutBlock | undefined {
  let current: AstNode | undefined = node;
  while (current !== undefined) {
    if (isLayoutBlock(current)) {
      return current;
    }
    current = current.$container;
  }
  return undefined;
}

function environmentOf(node: AstNode): EnvironmentDeclaration | undefined {
  let current: AstNode | undefined = node;
  while (current !== undefined) {
    if (isEnvironmentDeclaration(current)) {
      return current;
    }
    current = current.$container;
  }
  return undefined;
}
