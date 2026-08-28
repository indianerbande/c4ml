import {
  URI,
  type AstNode,
} from "langium";

import {
  createDiagnostic,
  hasErrors,
  resolveArchitectureViews,
  sortDiagnostics,
  type ArchitectureModel,
  type ArchitectureView,
  type DeploymentModel,
  type Diagnostic,
  type RelatedDiagnosticInformation,
  type ResolvedView,
  type SourceReference,
  type StaticElement,
} from "@c4ml/compiler-core";

import type {
  C4mlDocument,
  ClassificationProperty,
  CodeElementDeclaration,
  CodeKindProperty,
  ComponentDeclaration,
  ContainerDeclaration,
  ContainerInstanceDeclaration,
  DeploymentNodeDeclaration,
  DeploymentRelationshipDeclaration,
  DeploymentRelationshipFromProperty,
  DeploymentRelationshipIntentProperty,
  DeploymentRelationshipToProperty,
  DeploymentStaticRelationshipProperty,
  DisplayNameProperty,
  ElementDeclaration,
  EnvironmentDeclaration,
  FlowProperty,
  InteractionDeclaration,
  InteractionFromProperty,
  InteractionIntentProperty,
  InteractionOrderProperty,
  InteractionParallelProperty,
  InteractionRelationshipProperty,
  InteractionToProperty,
  InfrastructureNodeDeclaration,
  LanguageProperty,
  RelationshipDeclaration,
  RelationshipFromProperty,
  RelationshipIntentProperty,
  ProtocolProperty,
  RelationshipToProperty,
  ResponsibilityProperty,
  SoftwareSystemInstanceDeclaration,
  TechnologyProperty,
  ViewAllowMixedLevelsProperty,
  ViewAudienceProperty,
  ViewDeclaration,
  ViewDisplayProperty,
  ViewEnvironmentProperty,
  ViewLegendProperty,
  ViewPurposeProperty,
  ViewScopeProperty,
  ViewSystemsProperty,
  ViewTitleProperty,
  ViewTypeProperty,
} from "./generated/ast.js";
import { createC4mlDraftServices } from "./services.js";

export const c4mlDraftLanguageVersion = "draft-1" as const;

export interface ParseC4mlDraftOptions {
  readonly file?: string;
}

export interface C4mlDraftResult {
  readonly languageVersion: typeof c4mlDraftLanguageVersion;
  readonly valid: boolean;
  readonly diagnostics: readonly Diagnostic[];
  readonly model?: ArchitectureModel;
  readonly views?: readonly ArchitectureView[];
  readonly resolvedViews?: readonly ResolvedView[];
}

interface LoweredDocument {
  readonly model: ArchitectureModel;
  readonly views: readonly ArchitectureView[];
}

interface LangiumDiagnosticLike {
  readonly data?: unknown;
  readonly message: string | { readonly value: string };
  readonly range: {
    readonly start: { readonly line: number; readonly character: number };
    readonly end: { readonly line: number; readonly character: number };
  };
  readonly severity?: number;
}

export async function parseC4mlDraft(
  source: string,
  options: ParseC4mlDraftOptions = {},
): Promise<C4mlDraftResult> {
  const file = options.file ?? "<memory>";
  const services = createC4mlDraftServices();
  const document = services.shared.workspace.LangiumDocumentFactory.fromString(
    source,
    URI.parse("c4ml:///document.c4ml"),
  );
  services.shared.workspace.LangiumDocuments.addDocument(document);
  await services.shared.workspace.DocumentBuilder.build([document], {
    validation: true,
  });

  const syntaxDiagnostics = sortDiagnostics(
    (document.diagnostics ?? []).map((diagnostic) =>
      fromLangiumDiagnostic(diagnostic, document.textDocument, file),
    ),
  );
  if (hasErrors(syntaxDiagnostics)) {
    return {
      languageVersion: c4mlDraftLanguageVersion,
      valid: false,
      diagnostics: syntaxDiagnostics,
    };
  }

  const loweringDiagnostics: Diagnostic[] = [];
  const lowered = lowerDocument(
    document.parseResult.value as C4mlDocument,
    file,
    loweringDiagnostics,
  );
  if (lowered === undefined || hasErrors(loweringDiagnostics)) {
    return {
      languageVersion: c4mlDraftLanguageVersion,
      valid: false,
      diagnostics: sortDiagnostics([
        ...syntaxDiagnostics,
        ...loweringDiagnostics,
      ]),
    };
  }

  const resolution = resolveArchitectureViews(lowered.model, lowered.views);
  const diagnostics = sortDiagnostics([
    ...syntaxDiagnostics,
    ...loweringDiagnostics,
    ...resolution.diagnostics,
  ]);
  return {
    languageVersion: c4mlDraftLanguageVersion,
    valid: !hasErrors(diagnostics),
    diagnostics,
    model: lowered.model,
    views: lowered.views,
    resolvedViews: resolution.views,
  };
}

function lowerDocument(
  document: C4mlDocument,
  file: string,
  diagnostics: Diagnostic[],
): LoweredDocument | undefined {
  const elements = document.model.elements
    .map((element) => lowerElement(element, file, diagnostics))
    .filter((element): element is StaticElement => element !== undefined);
  const relationships = document.relations.relationships
    .map((relationship) =>
      lowerRelationship(relationship, file, diagnostics),
    )
    .filter((relationship) => relationship !== undefined);
  const deployment =
    document.deployment === undefined
      ? undefined
      : lowerDeployment(document.deployment.environments, file, diagnostics);
  const views = document.views
    .map((view) => lowerView(view, file, diagnostics))
    .filter((view): view is ArchitectureView => view !== undefined);

  if (hasErrors(diagnostics)) {
    return undefined;
  }
  return {
    model: {
      elements,
      relationships,
      ...(deployment === undefined ? {} : { deployment }),
    },
    views,
  };
}

function lowerElement(
  declaration: ElementDeclaration,
  file: string,
  diagnostics: Diagnostic[],
): StaticElement | undefined {
  const displayName = requiredProperty<DisplayNameProperty>(
    declaration.properties,
    "DisplayNameProperty",
    "name",
    declaration,
    file,
    diagnostics,
  );
  const responsibility = requiredProperty<ResponsibilityProperty>(
    declaration.properties,
    "ResponsibilityProperty",
    "responsibility",
    declaration,
    file,
    diagnostics,
  );
  if (displayName === undefined || responsibility === undefined) {
    return undefined;
  }

  switch (declaration.$type) {
    case "PersonDeclaration":
    case "SoftwareSystemDeclaration": {
      const classification = requiredProperty<ClassificationProperty>(
        declaration.properties,
        "ClassificationProperty",
        "classification",
        declaration,
        file,
        diagnostics,
      );
      if (classification === undefined) {
        return undefined;
      }
      return {
        id: declaration.name,
        kind:
          declaration.$type === "PersonDeclaration"
            ? "person"
            : "software-system",
        name: displayName.value,
        description: responsibility.value,
        classification: classification.value,
        source: sourceReference(declaration, file),
      };
    }
    case "ContainerDeclaration":
      return lowerContainer(
        declaration,
        displayName,
        responsibility,
        file,
        diagnostics,
      );
    case "ComponentDeclaration":
      return lowerComponent(
        declaration,
        displayName,
        responsibility,
        file,
        diagnostics,
      );
    case "CodeElementDeclaration":
      return lowerCodeElement(
        declaration,
        displayName,
        responsibility,
        file,
        diagnostics,
      );
  }
}

function lowerContainer(
  declaration: ContainerDeclaration,
  displayName: DisplayNameProperty,
  responsibility: ResponsibilityProperty,
  file: string,
  diagnostics: Diagnostic[],
): StaticElement | undefined {
  const technology = requiredProperty<TechnologyProperty>(
    declaration.properties,
    "TechnologyProperty",
    "technology",
    declaration,
    file,
    diagnostics,
  );
  if (technology === undefined) {
    return undefined;
  }
  return {
    id: declaration.name,
    kind: "container",
    softwareSystemId: declaration.owner.ref!.name,
    name: displayName.value,
    description: responsibility.value,
    technology: technology.value,
    source: sourceReference(declaration, file),
  };
}

function lowerComponent(
  declaration: ComponentDeclaration,
  displayName: DisplayNameProperty,
  responsibility: ResponsibilityProperty,
  file: string,
  diagnostics: Diagnostic[],
): StaticElement | undefined {
  const technology = requiredProperty<TechnologyProperty>(
    declaration.properties,
    "TechnologyProperty",
    "technology",
    declaration,
    file,
    diagnostics,
  );
  if (technology === undefined) {
    return undefined;
  }
  return {
    id: declaration.name,
    kind: "component",
    containerId: declaration.owner.ref!.name,
    name: displayName.value,
    description: responsibility.value,
    technology: technology.value,
    source: sourceReference(declaration, file),
  };
}

function lowerCodeElement(
  declaration: CodeElementDeclaration,
  displayName: DisplayNameProperty,
  responsibility: ResponsibilityProperty,
  file: string,
  diagnostics: Diagnostic[],
): StaticElement | undefined {
  const codeKind = requiredProperty<CodeKindProperty>(
    declaration.properties,
    "CodeKindProperty",
    "code-kind",
    declaration,
    file,
    diagnostics,
  );
  const language = optionalProperty<LanguageProperty>(
    declaration.properties,
    "LanguageProperty",
    "language",
    declaration,
    file,
    diagnostics,
  );
  if (codeKind === undefined) {
    return undefined;
  }
  return {
    id: declaration.name,
    kind: "code-element",
    componentId: declaration.owner.ref!.name,
    codeKind: codeKind.value,
    name: displayName.value,
    description: responsibility.value,
    ...(language === undefined ? {} : { language: language.value }),
    source: sourceReference(declaration, file),
  };
}

function lowerRelationship(
  declaration: RelationshipDeclaration,
  file: string,
  diagnostics: Diagnostic[],
) {
  const from = requiredProperty<RelationshipFromProperty>(
    declaration.properties,
    "RelationshipFromProperty",
    "from",
    declaration,
    file,
    diagnostics,
  );
  const to = requiredProperty<RelationshipToProperty>(
    declaration.properties,
    "RelationshipToProperty",
    "to",
    declaration,
    file,
    diagnostics,
  );
  const intent = requiredProperty<RelationshipIntentProperty>(
    declaration.properties,
    "RelationshipIntentProperty",
    "intent",
    declaration,
    file,
    diagnostics,
  );
  const technology = optionalProperty<TechnologyProperty>(
    declaration.properties,
    "TechnologyProperty",
    "technology",
    declaration,
    file,
    diagnostics,
  );
  const protocol = optionalProperty<ProtocolProperty>(
    declaration.properties,
    "ProtocolProperty",
    "protocol",
    declaration,
    file,
    diagnostics,
  );
  if (from === undefined || to === undefined || intent === undefined) {
    return undefined;
  }

  return {
    id: declaration.name,
    sourceId: from.value.ref!.name,
    targetId: to.value.ref!.name,
    description: intent.value,
    ...(technology === undefined ? {} : { technology: technology.value }),
    ...(protocol === undefined ? {} : { protocol: protocol.value }),
    source: sourceReference(declaration, file),
  };
}

function lowerDeployment(
  declarations: readonly EnvironmentDeclaration[],
  file: string,
  diagnostics: Diagnostic[],
): DeploymentModel {
  const environments: DeploymentModel["environments"][number][] = [];
  const nodes: DeploymentModel["nodes"][number][] = [];
  const infrastructureNodes: DeploymentModel["infrastructureNodes"][number][] = [];
  const instances: DeploymentModel["instances"][number][] = [];
  const relationships: DeploymentModel["relationships"][number][] = [];

  for (const declaration of declarations) {
    const displayName = requiredProperty<DisplayNameProperty>(
      declaration.properties,
      "DisplayNameProperty",
      "name",
      declaration,
      file,
      diagnostics,
    );
    const responsibility = requiredProperty<ResponsibilityProperty>(
      declaration.properties,
      "ResponsibilityProperty",
      "responsibility",
      declaration,
      file,
      diagnostics,
    );
    if (displayName !== undefined && responsibility !== undefined) {
      environments.push({
        id: declaration.name,
        kind: "deployment-environment",
        name: displayName.value,
        description: responsibility.value,
        source: sourceReference(declaration, file),
      });
    }

    for (const item of declaration.items) {
      switch (item.$type) {
        case "DeploymentNodeDeclaration": {
          const node = lowerDeploymentNode(item, file, diagnostics);
          if (node !== undefined) {
            nodes.push(node);
          }
          break;
        }
        case "InfrastructureNodeDeclaration": {
          const infrastructure = lowerInfrastructureNode(
            item,
            file,
            diagnostics,
          );
          if (infrastructure !== undefined) {
            infrastructureNodes.push(infrastructure);
          }
          break;
        }
        case "SoftwareSystemInstanceDeclaration":
          instances.push(lowerSoftwareSystemInstance(item, file));
          break;
        case "ContainerInstanceDeclaration":
          instances.push(lowerContainerInstance(item, file));
          break;
        case "DeploymentRelationshipDeclaration": {
          const relationship = lowerDeploymentRelationship(
            item,
            file,
            diagnostics,
          );
          if (relationship !== undefined) {
            relationships.push(relationship);
          }
          break;
        }
      }
    }
  }

  return { environments, nodes, infrastructureNodes, instances, relationships };
}

function lowerDeploymentNode(
  declaration: DeploymentNodeDeclaration,
  file: string,
  diagnostics: Diagnostic[],
): DeploymentModel["nodes"][number] | undefined {
  const properties = lowerNamedDeploymentProperties(
    declaration,
    file,
    diagnostics,
  );
  if (properties === undefined) {
    return undefined;
  }
  return {
    id: declaration.name,
    kind: "deployment-node",
    environmentId: declaration.$container.name,
    ...(declaration.parent === undefined
      ? {}
      : { parentNodeId: declaration.parent.ref!.name }),
    ...properties,
    source: sourceReference(declaration, file),
  };
}

function lowerInfrastructureNode(
  declaration: InfrastructureNodeDeclaration,
  file: string,
  diagnostics: Diagnostic[],
): DeploymentModel["infrastructureNodes"][number] | undefined {
  const properties = lowerNamedDeploymentProperties(
    declaration,
    file,
    diagnostics,
  );
  if (properties === undefined) {
    return undefined;
  }
  return {
    id: declaration.name,
    kind: "infrastructure-node",
    environmentId: declaration.$container.name,
    nodeId: declaration.node.ref!.name,
    ...properties,
    source: sourceReference(declaration, file),
  };
}

function lowerNamedDeploymentProperties(
  declaration: DeploymentNodeDeclaration | InfrastructureNodeDeclaration,
  file: string,
  diagnostics: Diagnostic[],
): { readonly name: string; readonly description: string; readonly technology: string } | undefined {
  const displayName = requiredProperty<DisplayNameProperty>(
    declaration.properties,
    "DisplayNameProperty",
    "name",
    declaration,
    file,
    diagnostics,
  );
  const responsibility = requiredProperty<ResponsibilityProperty>(
    declaration.properties,
    "ResponsibilityProperty",
    "responsibility",
    declaration,
    file,
    diagnostics,
  );
  const technology = requiredProperty<TechnologyProperty>(
    declaration.properties,
    "TechnologyProperty",
    "technology",
    declaration,
    file,
    diagnostics,
  );
  return displayName === undefined ||
    responsibility === undefined ||
    technology === undefined
    ? undefined
    : {
        name: displayName.value,
        description: responsibility.value,
        technology: technology.value,
      };
}

function lowerSoftwareSystemInstance(
  declaration: SoftwareSystemInstanceDeclaration,
  file: string,
): DeploymentModel["instances"][number] {
  return {
    id: declaration.name,
    kind: "software-system-instance",
    environmentId: declaration.$container.name,
    nodeId: declaration.node.ref!.name,
    softwareSystemId: declaration.system.ref!.name,
    source: sourceReference(declaration, file),
  };
}

function lowerContainerInstance(
  declaration: ContainerInstanceDeclaration,
  file: string,
): DeploymentModel["instances"][number] {
  return {
    id: declaration.name,
    kind: "container-instance",
    environmentId: declaration.$container.name,
    nodeId: declaration.node.ref!.name,
    containerId: declaration.container.ref!.name,
    source: sourceReference(declaration, file),
  };
}

function lowerDeploymentRelationship(
  declaration: DeploymentRelationshipDeclaration,
  file: string,
  diagnostics: Diagnostic[],
): DeploymentModel["relationships"][number] | undefined {
  const from = requiredProperty<DeploymentRelationshipFromProperty>(
    declaration.properties,
    "DeploymentRelationshipFromProperty",
    "from",
    declaration,
    file,
    diagnostics,
  );
  const to = requiredProperty<DeploymentRelationshipToProperty>(
    declaration.properties,
    "DeploymentRelationshipToProperty",
    "to",
    declaration,
    file,
    diagnostics,
  );
  const intent = requiredProperty<DeploymentRelationshipIntentProperty>(
    declaration.properties,
    "DeploymentRelationshipIntentProperty",
    "intent",
    declaration,
    file,
    diagnostics,
  );
  const staticRelationship = optionalProperty<DeploymentStaticRelationshipProperty>(
    declaration.properties,
    "DeploymentStaticRelationshipProperty",
    "relation",
    declaration,
    file,
    diagnostics,
  );
  const technology = optionalProperty<TechnologyProperty>(
    declaration.properties,
    "TechnologyProperty",
    "technology",
    declaration,
    file,
    diagnostics,
  );
  if (from === undefined || to === undefined || intent === undefined) {
    return undefined;
  }
  return {
    id: declaration.name,
    sourceId: from.value.ref!.name,
    targetId: to.value.ref!.name,
    description: intent.value,
    ...(staticRelationship === undefined
      ? {}
      : { staticRelationshipId: staticRelationship.value.ref!.name }),
    ...(technology === undefined ? {} : { technology: technology.value }),
    source: sourceReference(declaration, file),
  };
}

function lowerView(
  declaration: ViewDeclaration,
  file: string,
  diagnostics: Diagnostic[],
): ArchitectureView | undefined {
  const type = requiredProperty<ViewTypeProperty>(
    declaration.properties,
    "ViewTypeProperty",
    "type",
    declaration,
    file,
    diagnostics,
  );
  const scope =
    type?.value === "deployment"
      ? optionalProperty<ViewScopeProperty>(
          declaration.properties,
          "ViewScopeProperty",
          "scope",
          declaration,
          file,
          diagnostics,
        )
      : requiredProperty<ViewScopeProperty>(
          declaration.properties,
          "ViewScopeProperty",
          "scope",
          declaration,
          file,
          diagnostics,
        );
  const title = requiredProperty<ViewTitleProperty>(
    declaration.properties,
    "ViewTitleProperty",
    "title",
    declaration,
    file,
    diagnostics,
  );
  const purpose = requiredProperty<ViewPurposeProperty>(
    declaration.properties,
    "ViewPurposeProperty",
    "purpose",
    declaration,
    file,
    diagnostics,
  );
  const audience = requiredProperty<ViewAudienceProperty>(
    declaration.properties,
    "ViewAudienceProperty",
    "audience",
    declaration,
    file,
    diagnostics,
  );
  const legend = requiredProperty<ViewLegendProperty>(
    declaration.properties,
    "ViewLegendProperty",
    "legend",
    declaration,
    file,
    diagnostics,
  );
  const flow =
    declaration.layout === undefined
      ? undefined
      : requiredProperty<FlowProperty>(
          declaration.layout.properties,
          "FlowProperty",
          "flow",
          declaration.layout,
          file,
          diagnostics,
        );
  if (
    type === undefined ||
    (type?.value !== "deployment" && scope === undefined) ||
    title === undefined ||
    purpose === undefined ||
    audience === undefined ||
    legend === undefined ||
    (declaration.layout !== undefined && flow === undefined)
  ) {
    return undefined;
  }

  const base = {
    id: declaration.name,
    title: title.value,
    purpose: purpose.value,
    legend: { mode: legend.value },
    ...(flow === undefined ? {} : { layout: { direction: flow.value } }),
    source: sourceReference(declaration, file),
  };
  if (type.value === "deployment") {
    return lowerDeploymentView(declaration, base, file, diagnostics);
  }
  if (type.value === "dynamic") {
    return lowerDynamicView(
      declaration,
      scope!,
      base,
      file,
      diagnostics,
    );
  }
  if (type.value === "system-landscape") {
    if (scope!.text === undefined) {
      invalidViewScope(
        scope!,
        "System Landscape scope must be a quoted organization or portfolio name.",
        file,
        diagnostics,
      );
      return undefined;
    }
    return { ...base, kind: "system-landscape", scope: scope!.text };
  }

  const scopeId = scope!.element?.ref?.name;
  if (scopeId === undefined) {
    invalidViewScope(
      scope!,
      `${type.value} scope must reference an architecture element.`,
      file,
      diagnostics,
    );
    return undefined;
  }
  switch (type.value) {
    case "system-context":
    case "container":
      return { ...base, kind: type.value, softwareSystemId: scopeId };
    case "component":
      return { ...base, kind: type.value, containerId: scopeId };
    case "code":
      return { ...base, kind: type.value, componentId: scopeId };
  }
}

function lowerDynamicView(
  declaration: ViewDeclaration,
  scope: ViewScopeProperty,
  base: Omit<ArchitectureView, "kind">,
  file: string,
  diagnostics: Diagnostic[],
): ArchitectureView | undefined {
  const display = requiredProperty<ViewDisplayProperty>(
    declaration.properties,
    "ViewDisplayProperty",
    "display",
    declaration,
    file,
    diagnostics,
  );
  const allowMixedLevels = optionalProperty<ViewAllowMixedLevelsProperty>(
    declaration.properties,
    "ViewAllowMixedLevelsProperty",
    "allow-mixed-levels",
    declaration,
    file,
    diagnostics,
  );
  if (scope.text === undefined) {
    invalidViewScope(
      scope,
      "Dynamic scope must be a quoted scenario name.",
      file,
      diagnostics,
    );
  }
  const interactions = declaration.interactions
    .map((interaction) => lowerInteraction(interaction, file, diagnostics))
    .filter((interaction) => interaction !== undefined);
  if (display === undefined || scope.text === undefined || hasErrors(diagnostics)) {
    return undefined;
  }
  return {
    ...base,
    kind: "dynamic",
    scenario: scope.text,
    display: display.value,
    interactions,
    ...(allowMixedLevels === undefined
      ? {}
      : { allowMixedLevels: allowMixedLevels.value }),
  };
}

function lowerDeploymentView(
  declaration: ViewDeclaration,
  base: Omit<ArchitectureView, "kind">,
  file: string,
  diagnostics: Diagnostic[],
): ArchitectureView | undefined {
  const environment = requiredProperty<ViewEnvironmentProperty>(
    declaration.properties,
    "ViewEnvironmentProperty",
    "environment",
    declaration,
    file,
    diagnostics,
  );
  const systems = requiredProperty<ViewSystemsProperty>(
    declaration.properties,
    "ViewSystemsProperty",
    "systems",
    declaration,
    file,
    diagnostics,
  );
  if (environment === undefined || systems === undefined) {
    return undefined;
  }
  return {
    ...base,
    kind: "deployment",
    environmentId: environment.value.ref!.name,
    softwareSystemIds: systems.values.map(({ ref }) => ref!.name),
  };
}

function lowerInteraction(
  declaration: InteractionDeclaration,
  file: string,
  diagnostics: Diagnostic[],
) {
  const order = requiredProperty<InteractionOrderProperty>(
    declaration.properties,
    "InteractionOrderProperty",
    "order",
    declaration,
    file,
    diagnostics,
  );
  const parallel = optionalProperty<InteractionParallelProperty>(
    declaration.properties,
    "InteractionParallelProperty",
    "parallel",
    declaration,
    file,
    diagnostics,
  );
  const from = requiredProperty<InteractionFromProperty>(
    declaration.properties,
    "InteractionFromProperty",
    "from",
    declaration,
    file,
    diagnostics,
  );
  const to = requiredProperty<InteractionToProperty>(
    declaration.properties,
    "InteractionToProperty",
    "to",
    declaration,
    file,
    diagnostics,
  );
  const intent = requiredProperty<InteractionIntentProperty>(
    declaration.properties,
    "InteractionIntentProperty",
    "intent",
    declaration,
    file,
    diagnostics,
  );
  const relationship = requiredProperty<InteractionRelationshipProperty>(
    declaration.properties,
    "InteractionRelationshipProperty",
    "relation",
    declaration,
    file,
    diagnostics,
  );
  if (
    order === undefined ||
    from === undefined ||
    to === undefined ||
    intent === undefined ||
    relationship === undefined
  ) {
    return undefined;
  }
  return {
    id: declaration.name,
    order: order.value,
    sourceId: from.value.ref!.name,
    targetId: to.value.ref!.name,
    description: intent.value,
    relationshipId: relationship.value.ref!.name,
    ...(parallel === undefined ? {} : { parallelGroup: parallel.value }),
    source: sourceReference(declaration, file),
  };
}

function invalidViewScope(
  scope: ViewScopeProperty,
  message: string,
  file: string,
  diagnostics: Diagnostic[],
): void {
  diagnostics.push(
    createDiagnostic({
      code: "C4ML-LANG-103",
      severity: "error",
      message,
      source: sourceReference(scope, file),
      correction: "Use the scope form required by the selected view type.",
    }),
  );
}

function optionalProperty<T extends AstNode>(
  properties: readonly AstNode[],
  type: T["$type"],
  label: string,
  owner: AstNode & { readonly name?: string },
  file: string,
  diagnostics: Diagnostic[],
): T | undefined {
  const matches = properties.filter(
    (property): property is T => property.$type === type,
  );
  if (matches.length > 1) {
    const first = matches[0]!;
    const related: RelatedDiagnosticInformation[] = [
      {
        message: `The first ${label} property is here.`,
        source: sourceReference(first, file),
      },
    ];
    for (const duplicate of matches.slice(1)) {
      diagnostics.push(
        createDiagnostic({
          code: "C4ML-LANG-102",
          severity: "error",
          message: `${displayOwner(owner)} declares ${label} more than once.`,
          source: sourceReference(duplicate, file),
          related,
          correction: `Keep at most one ${label} property.`,
        }),
      );
    }
  }
  return matches[0];
}

function requiredProperty<T extends AstNode>(
  properties: readonly AstNode[],
  type: T["$type"],
  label: string,
  owner: AstNode & { readonly name?: string },
  file: string,
  diagnostics: Diagnostic[],
): T | undefined {
  const matches = properties.filter(
    (property): property is T => property.$type === type,
  );
  if (matches.length === 0) {
    diagnostics.push(
      createDiagnostic({
        code: "C4ML-LANG-101",
        severity: "error",
        message: `${displayOwner(owner)} has no ${label} property.`,
        source: sourceReference(owner, file),
        correction: `Declare exactly one ${label} property.`,
      }),
    );
    return undefined;
  }
  if (matches.length > 1) {
    const first = matches[0]!;
    const related: RelatedDiagnosticInformation[] = [
      {
        message: `The first ${label} property is here.`,
        source: sourceReference(first, file),
      },
    ];
    for (const duplicate of matches.slice(1)) {
      diagnostics.push(
        createDiagnostic({
          code: "C4ML-LANG-102",
          severity: "error",
          message: `${displayOwner(owner)} declares ${label} more than once.`,
          source: sourceReference(duplicate, file),
          related,
          correction: `Keep exactly one ${label} property.`,
        }),
      );
    }
  }
  return matches[0];
}

function displayOwner(owner: AstNode & { readonly name?: string }): string {
  return owner.name === undefined
    ? owner.$type
    : `${owner.$type} "${owner.name}"`;
}

function fromLangiumDiagnostic(
  diagnostic: LangiumDiagnosticLike,
  textDocument: {
    offsetAt(position: { readonly line: number; readonly character: number }): number;
  },
  file: string,
): Diagnostic {
  const langiumCode = diagnosticCode(diagnostic.data);
  const source = {
    file,
    range: {
      start: {
        offset: textDocument.offsetAt(diagnostic.range.start),
        line: diagnostic.range.start.line,
        column: diagnostic.range.start.character,
      },
      end: {
        offset: textDocument.offsetAt(diagnostic.range.end),
        line: diagnostic.range.end.line,
        column: diagnostic.range.end.character,
      },
    },
  };
  return createDiagnostic({
    code: stableSyntaxCode(langiumCode),
    severity: diagnosticSeverity(diagnostic.severity),
    message:
      typeof diagnostic.message === "string"
        ? diagnostic.message
        : diagnostic.message.value,
    source,
    correction:
      langiumCode === "linking-error"
        ? "Reference an identifier declared in the current document."
        : "Correct the source syntax at the reported range.",
  });
}

function diagnosticCode(data: unknown): string | undefined {
  if (
    typeof data === "object" &&
    data !== null &&
    "code" in data &&
    typeof data.code === "string"
  ) {
    return data.code;
  }
  return undefined;
}

function stableSyntaxCode(code: string | undefined): string {
  switch (code) {
    case "lexing-error":
      return "C4ML-LANG-001";
    case "parsing-error":
      return "C4ML-LANG-002";
    case "linking-error":
      return "C4ML-LANG-003";
    default:
      return "C4ML-LANG-004";
  }
}

function diagnosticSeverity(
  severity: number | undefined,
): "error" | "information" | "warning" {
  if (severity === 2) {
    return "warning";
  }
  if (severity === 3 || severity === 4) {
    return "information";
  }
  return "error";
}

function sourceReference(node: AstNode, file: string): SourceReference {
  const cst = node.$cstNode;
  if (cst === undefined) {
    const start = { offset: 0, line: 0, column: 0 };
    return { file, range: { start, end: start } };
  }
  return {
    file,
    range: {
      start: {
        offset: cst.offset,
        line: cst.range.start.line,
        column: cst.range.start.character,
      },
      end: {
        offset: cst.end,
        line: cst.range.end.line,
        column: cst.range.end.character,
      },
    },
  };
}
