import {
  URI,
  type AstNode,
} from "langium";

import {
  createDiagnostic,
  hasErrors,
  placementGapDu,
  placementStepDu,
  resolveArchitectureViews,
  sortDiagnostics,
  type ArchitectureModel,
  type ArchitectureView,
  type DiagramPlacementOptions,
  type DiagramRoutingOptions,
  type DeploymentModel,
  type Diagnostic,
  type Point,
  type PlacementConstraint,
  type RelatedDiagnosticInformation,
  type RelativePlacementRelation,
  type ResolvedView,
  type RouteControl,
  type RouteCorridor,
  type RouteAnchor,
  type RouteAvoidanceRegion,
  type RouteGuidance,
  type SourceReference,
  type StaticElement,
  type ArchitectureProjectInput,
  validateArchitectureProjectInput,
} from "@c4ml/compiler-core";

import type {
  AvoidanceAroundProperty,
  AvoidanceBoundsProperty,
  AvoidancePaddingProperty,
  AvoidanceStrengthProperty,
  C4mlDocument,
  ClassificationProperty,
  CodeElementDeclaration,
  CodeKindProperty,
  ComponentDeclaration,
  CorridorCoordinateProperty,
  CorridorLaneGapProperty,
  CorridorLanesProperty,
  CorridorOrientationProperty,
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
  PlacementConstraintDeclaration,
  PlacementAdjustDeclaration,
  PlacementAlignDeclaration,
  PlacementAnchorProperty,
  PlacementDistance,
  PlacementDistributeDeclaration,
  PlacementIntentGapProperty,
  PlacementMoveProperty,
  PlacementMoveXProperty,
  PlacementMoveYProperty,
  PlacementPlaceDeclaration,
  PlacementRelativeToProperty,
  SignedPlacementDistance,
  PlacementGapProperty,
  PlacementPinDeclaration,
  PlacementStrengthProperty,
  PlacementXProperty,
  PlacementYProperty,
  RelationshipDeclaration,
  RelationshipFromProperty,
  RelationshipIntentProperty,
  ProtocolProperty,
  RelationshipToProperty,
  ResponsibilityProperty,
  RouteCorridorDeclaration,
  RouteCorridorSelectionProperty,
  RouteAnchorLiteral,
  RouteAvoidanceDeclaration,
  RouteAvoidProperty,
  RouteGuideProperty,
  RouteDeclaration,
  RouteLabelSegmentProperty,
  RouteLabelShiftProperty,
  RouteLaneProperty,
  RoutePointsProperty,
  RoutePolicyProperty,
  RouteSourcePortProperty,
  RouteStyleProperty,
  RouteTargetPortProperty,
  RouteViaProperty,
  SignedInteger,
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
  readonly placementByViewId?: Readonly<Record<string, DiagramPlacementOptions>>;
  readonly routingByViewId?: Readonly<Record<string, DiagramRoutingOptions>>;
  readonly resolvedViews?: readonly ResolvedView[];
}

export interface C4mlProjectDraftResult extends C4mlDraftResult {
  readonly projectId: string;
  readonly documentUris: readonly string[];
}

interface LoweredDocument {
  readonly model: ArchitectureModel;
  readonly views: readonly ArchitectureView[];
  readonly placementByViewId: Readonly<Record<string, DiagramPlacementOptions>>;
  readonly routingByViewId: Readonly<Record<string, DiagramRoutingOptions>>;
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
      fromLangiumDiagnostic(diagnostic, document.textDocument, file, source),
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

  const compositionDiagnostics = validateProjectComposition(lowered, file);
  const resolution = resolveArchitectureViews(lowered.model, lowered.views);
  const diagnostics = sortDiagnostics([
    ...syntaxDiagnostics,
    ...loweringDiagnostics,
    ...compositionDiagnostics,
    ...resolution.diagnostics,
  ]);
  return {
    languageVersion: c4mlDraftLanguageVersion,
    valid: !hasErrors(diagnostics),
    diagnostics,
    model: lowered.model,
    views: lowered.views,
    placementByViewId: lowered.placementByViewId,
    routingByViewId: lowered.routingByViewId,
    resolvedViews: resolution.views,
  };
}

export async function parseC4mlProjectDraft(
  project: ArchitectureProjectInput,
): Promise<C4mlProjectDraftResult> {
  const projectIssues = validateArchitectureProjectInput(project);
  if (projectIssues.length > 0) {
    return {
      languageVersion: c4mlDraftLanguageVersion,
      projectId: project.id,
      documentUris: project.documents.map(({ uri }) => uri),
      valid: false,
      diagnostics: projectIssues.map((issue) =>
        createDiagnostic({
          severity: "error",
          code: issue.code,
          message: issue.message,
          source: projectSource(issue.uri ?? "<project>"),
        }),
      ),
    };
  }

  const services = createC4mlDraftServices();
  const documents = project.documents.map((sourceDocument) => {
    const document = services.shared.workspace.LangiumDocumentFactory.fromString(
      sourceDocument.text,
      URI.from({ scheme: "c4ml-project", path: `/${sourceDocument.uri}` }),
    );
    services.shared.workspace.LangiumDocuments.addDocument(document);
    return { sourceDocument, document };
  });
  await services.shared.workspace.DocumentBuilder.build(
    documents.map(({ document }) => document),
    { validation: true },
  );

  const syntaxDiagnostics = sortDiagnostics(
    documents.flatMap(({ sourceDocument, document }) =>
      (document.diagnostics ?? []).map((diagnostic) =>
        fromLangiumDiagnostic(
          diagnostic,
          document.textDocument,
          sourceDocument.uri,
          sourceDocument.text,
        ),
      ),
    ),
  );
  if (hasErrors(syntaxDiagnostics)) {
    return projectResult(project, {
      valid: false,
      diagnostics: syntaxDiagnostics,
    });
  }

  const loweringDiagnostics: Diagnostic[] = [];
  const loweredDocuments = documents.flatMap(({ sourceDocument, document }) => {
    const lowered = lowerDocument(
      document.parseResult.value as C4mlDocument,
      sourceDocument.uri,
      loweringDiagnostics,
    );
    return lowered === undefined ? [] : [lowered];
  });
  if (
    loweredDocuments.length !== documents.length ||
    hasErrors(loweringDiagnostics)
  ) {
    return projectResult(project, {
      valid: false,
      diagnostics: sortDiagnostics([
        ...syntaxDiagnostics,
        ...loweringDiagnostics,
      ]),
    });
  }

  const lowered = mergeLoweredDocuments(loweredDocuments);
  const compositionDiagnostics = validateProjectComposition(
    lowered,
    project.documents[0]!.uri,
  );
  const resolution = resolveArchitectureViews(lowered.model, lowered.views);
  const diagnostics = sortDiagnostics([
    ...syntaxDiagnostics,
    ...loweringDiagnostics,
    ...compositionDiagnostics,
    ...resolution.diagnostics,
  ]);
  return projectResult(project, {
    valid: !hasErrors(diagnostics),
    diagnostics,
    model: lowered.model,
    views: lowered.views,
    placementByViewId: lowered.placementByViewId,
    routingByViewId: lowered.routingByViewId,
    resolvedViews: resolution.views,
  });
}

function projectResult(
  project: ArchitectureProjectInput,
  result: Omit<C4mlDraftResult, "languageVersion">,
): C4mlProjectDraftResult {
  return {
    languageVersion: c4mlDraftLanguageVersion,
    projectId: project.id,
    documentUris: project.documents.map(({ uri }) => uri),
    ...result,
  };
}

function projectSource(file: string): SourceReference {
  const position = { offset: 0, line: 0, column: 0 };
  return { file, range: { start: position, end: position } };
}

function validateProjectComposition(
  project: LoweredDocument,
  sourceFile: string,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  if (project.model.elements.length === 0) {
    diagnostics.push(
      createDiagnostic({
        severity: "error",
        code: "C4ML-LANG-201",
        message: "A complete C4ML project requires at least one architecture element.",
        source: projectSource(sourceFile),
      }),
    );
  }
  if (project.views.length === 0) {
    diagnostics.push(
      createDiagnostic({
        severity: "error",
        code: "C4ML-LANG-202",
        message: "A complete C4ML project requires at least one diagram view.",
        source: projectSource(sourceFile),
      }),
    );
  }
  return diagnostics;
}

function mergeLoweredDocuments(
  documents: readonly LoweredDocument[],
): LoweredDocument {
  const deployments = documents.flatMap(({ model }) =>
    model.deployment === undefined ? [] : [model.deployment],
  );
  return {
    model: {
      elements: documents.flatMap(({ model }) => model.elements),
      relationships: documents.flatMap(({ model }) => model.relationships),
      ...(deployments.length === 0
        ? {}
        : {
            deployment: {
              environments: deployments.flatMap(({ environments }) => environments),
              nodes: deployments.flatMap(({ nodes }) => nodes),
              infrastructureNodes: deployments.flatMap(
                ({ infrastructureNodes }) => infrastructureNodes,
              ),
              instances: deployments.flatMap(({ instances }) => instances),
              relationships: deployments.flatMap(({ relationships }) => relationships),
            },
          }),
    },
    views: documents.flatMap(({ views }) => views),
    placementByViewId: Object.assign(
      {},
      ...documents.map(({ placementByViewId }) => placementByViewId),
    ),
    routingByViewId: Object.assign(
      {},
      ...documents.map(({ routingByViewId }) => routingByViewId),
    ),
  };
}

function lowerDocument(
  document: C4mlDocument,
  file: string,
  diagnostics: Diagnostic[],
): LoweredDocument | undefined {
  const elements = (document.model?.elements ?? [])
    .map((element) => lowerElement(element, file, diagnostics))
    .filter((element): element is StaticElement => element !== undefined);
  const relationships = (document.relations?.relationships ?? [])
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
  const routingByViewId = Object.fromEntries(
    document.views.flatMap((view) => {
      const routing = lowerViewRouting(view, file, diagnostics);
      return routing === undefined ? [] : [[view.name, routing] as const];
    }),
  );
  const placementByViewId = Object.fromEntries(
    document.views.flatMap((view) => {
      const placement = lowerViewPlacement(view, file, diagnostics);
      return placement === undefined ? [] : [[view.name, placement] as const];
    }),
  );

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
    placementByViewId,
    routingByViewId,
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

function lowerViewRouting(
  declaration: ViewDeclaration,
  file: string,
  diagnostics: Diagnostic[],
): DiagramRoutingOptions | undefined {
  const layout = declaration.layout;
  if (layout === undefined) {
    return undefined;
  }

  const corridors = layout.corridors
    .map((corridor) => lowerRouteCorridor(corridor, file, diagnostics))
    .filter((corridor): corridor is RouteCorridor => corridor !== undefined);
  const controls = layout.routes
    .map((route) => lowerRouteControl(route, file, diagnostics))
    .filter((control): control is RouteControl => control !== undefined);

  const avoidanceRegions = layout.avoidanceRegions
    .map((region) => lowerRouteAvoidance(region, file, diagnostics))
    .filter((region): region is RouteAvoidanceRegion => region !== undefined);

  diagnoseDuplicateRoutingIds(
    layout.avoidanceRegions,
    layout.corridors,
    layout.routes,
    file,
    diagnostics,
  );
  if (
    avoidanceRegions.length === 0 &&
    corridors.length === 0 &&
    controls.length === 0
  ) {
    return undefined;
  }
  return {
    ...(avoidanceRegions.length === 0 ? {} : { avoidanceRegions }),
    corridors,
    controls,
  };
}

function lowerViewPlacement(
  declaration: ViewDeclaration,
  file: string,
  diagnostics: Diagnostic[],
): DiagramPlacementOptions | undefined {
  const layout = declaration.layout;
  if (layout === undefined) {
    return undefined;
  }
  const constraints = [
    ...layout.places.map((place) =>
      lowerPlacementPlace(place, file, diagnostics),
    ),
    ...layout.alignments.map((alignment) =>
      lowerPlacementAlign(alignment, file, diagnostics),
    ),
    ...layout.distributions.map((distribution) =>
      lowerPlacementDistribution(distribution, file, diagnostics),
    ),
    ...layout.adjustments.map((adjustment) =>
      lowerPlacementAdjustment(adjustment, file, diagnostics),
    ),
    ...layout.constraints.map((constraint) =>
      lowerPlacementConstraint(constraint, file, diagnostics),
    ),
    ...layout.pins.map((pin) => lowerPlacementPin(pin, file, diagnostics)),
  ].filter((constraint): constraint is PlacementConstraint => constraint !== undefined);

  diagnoseDuplicateDeclarations(
    [
      ...layout.places,
      ...layout.alignments,
      ...layout.distributions,
      ...layout.adjustments,
      ...layout.constraints,
      ...layout.pins,
    ],
    placementDeclarationId,
    "placement control",
    "C4ML-LANG-120",
    file,
    diagnostics,
  );
  return constraints.length === 0 ? undefined : { constraints };
}

function lowerPlacementPlace(
  declaration: PlacementPlaceDeclaration,
  file: string,
  diagnostics: Diagnostic[],
): PlacementConstraint | undefined {
  const strength = requiredProperty<PlacementStrengthProperty>(
    declaration.properties,
    "PlacementStrengthProperty",
    "strength",
    declaration,
    file,
    diagnostics,
  );
  const gap = requiredProperty<PlacementIntentGapProperty>(
    declaration.properties,
    "PlacementIntentGapProperty",
    "gap",
    declaration,
    file,
    diagnostics,
  );
  const subjectId = declaration.subject.ref?.name;
  const targetId = declaration.target.ref?.name;
  if (strength === undefined || gap === undefined || subjectId === undefined || targetId === undefined) {
    return undefined;
  }
  return {
    id: placementDeclarationId(declaration),
    kind: "relative",
    relation: declaration.relation,
    subjectId,
    targetId,
    gap: placementDistanceDu(gap.value),
    strength: strength.value,
    source: sourceReference(declaration, file),
  };
}

function lowerPlacementAlign(
  declaration: PlacementAlignDeclaration,
  file: string,
  diagnostics: Diagnostic[],
): PlacementConstraint | undefined {
  const strength = requiredProperty<PlacementStrengthProperty>(
    declaration.properties,
    "PlacementStrengthProperty",
    "strength",
    declaration,
    file,
    diagnostics,
  );
  const anchor = requiredProperty<PlacementAnchorProperty>(
    declaration.properties,
    "PlacementAnchorProperty",
    "anchor",
    declaration,
    file,
    diagnostics,
  );
  const nodeIds = declaration.items.map((item) => item.ref?.name);
  const anchorId = anchor?.value.ref?.name;
  if (strength === undefined || anchorId === undefined || nodeIds.some((id) => id === undefined)) {
    return undefined;
  }
  const ids = nodeIds as string[];
  if (ids.length < 2 || new Set(ids).size !== ids.length || !ids.includes(anchorId)) {
    diagnostics.push(createDiagnostic({
      code: "C4ML-LANG-122",
      severity: "error",
      message: `Alignment "${placementDeclarationId(declaration)}" requires at least two unique items and an anchor from that list.`,
      source: sourceReference(declaration, file),
      correction: "List each item once and select one listed item as anchor.",
    }));
    return undefined;
  }
  return {
    id: placementDeclarationId(declaration),
    kind: "align",
    alignment: declaration.alignment,
    nodeIds: ids,
    anchorId,
    strength: strength.value,
    source: sourceReference(declaration, file),
  };
}

function lowerPlacementDistribution(
  declaration: PlacementDistributeDeclaration,
  file: string,
  diagnostics: Diagnostic[],
): PlacementConstraint | undefined {
  const strength = requiredProperty<PlacementStrengthProperty>(
    declaration.properties,
    "PlacementStrengthProperty",
    "strength",
    declaration,
    file,
    diagnostics,
  );
  const gap = requiredProperty<PlacementIntentGapProperty>(
    declaration.properties,
    "PlacementIntentGapProperty",
    "gap",
    declaration,
    file,
    diagnostics,
  );
  const nodeIds = declaration.items.map((item) => item.ref?.name);
  if (strength === undefined || gap === undefined || nodeIds.some((id) => id === undefined)) {
    return undefined;
  }
  const ids = nodeIds as string[];
  if (ids.length < 3 || new Set(ids).size !== ids.length) {
    diagnostics.push(createDiagnostic({
      code: "C4ML-LANG-123",
      severity: "error",
      message: `Distribution "${placementDeclarationId(declaration)}" requires at least three unique ordered items.`,
      source: sourceReference(declaration, file),
      correction: "List three or more items once each, in the intended order.",
    }));
    return undefined;
  }
  return {
    id: placementDeclarationId(declaration),
    kind: "distribute",
    orientation: declaration.orientation,
    nodeIds: ids,
    gap: placementDistanceDu(gap.value),
    strength: strength.value,
    source: sourceReference(declaration, file),
  };
}

function lowerPlacementAdjustment(
  declaration: PlacementAdjustDeclaration,
  file: string,
  diagnostics: Diagnostic[],
): PlacementConstraint | undefined {
  const strength = requiredProperty<PlacementStrengthProperty>(
    declaration.properties,
    "PlacementStrengthProperty",
    "strength",
    declaration,
    file,
    diagnostics,
  );
  const relativeTo = requiredProperty<PlacementRelativeToProperty>(
    declaration.properties,
    "PlacementRelativeToProperty",
    "relative-to",
    declaration,
    file,
    diagnostics,
  );
  const move = optionalProperty<PlacementMoveProperty>(
    declaration.properties,
    "PlacementMoveProperty",
    "move",
    declaration,
    file,
    diagnostics,
  );
  const moveX = optionalProperty<PlacementMoveXProperty>(
    declaration.properties,
    "PlacementMoveXProperty",
    "move-x",
    declaration,
    file,
    diagnostics,
  );
  const moveY = optionalProperty<PlacementMoveYProperty>(
    declaration.properties,
    "PlacementMoveYProperty",
    "move-y",
    declaration,
    file,
    diagnostics,
  );
  const targetId = declaration.target.ref?.name;
  if (strength === undefined || relativeTo === undefined || targetId === undefined) return undefined;
  if ((move === undefined) === (moveX === undefined && moveY === undefined)) {
    diagnostics.push(createDiagnostic({
      code: "C4ML-LANG-124",
      severity: "error",
      message: `Adjustment "${placementDeclarationId(declaration)}" requires either move or move-x/move-y.`,
      source: sourceReference(declaration, file),
      correction: "Use one directional move, or one or both axis offsets.",
    }));
    return undefined;
  }
  let offsetX = moveX === undefined ? undefined : signedPlacementDistanceDu(moveX.value);
  let offsetY = moveY === undefined ? undefined : signedPlacementDistanceDu(moveY.value);
  if (move !== undefined) {
    const amount = placementDistanceDu(move.value);
    if (move.direction === "left") offsetX = -amount;
    if (move.direction === "right") offsetX = amount;
    if (move.direction === "up") offsetY = -amount;
    if (move.direction === "down") offsetY = amount;
  }
  return {
    id: placementDeclarationId(declaration),
    kind: "adjust",
    targetId,
    relativeTo: relativeTo.value,
    ...(offsetX === undefined ? {} : { offsetX }),
    ...(offsetY === undefined ? {} : { offsetY }),
    strength: strength.value,
    source: sourceReference(declaration, file),
  };
}

function placementDistanceDu(value: PlacementDistance): number {
  return value.preset === undefined
    ? value.amount! * (value.unit === "step" ? placementStepDu : 1)
    : placementGapDu[value.preset];
}

function signedPlacementDistanceDu(value: SignedPlacementDistance): number {
  const amount = placementDistanceDu(value.value);
  return value.negative ? -amount : amount;
}

function lowerPlacementConstraint(
  declaration: PlacementConstraintDeclaration,
  file: string,
  diagnostics: Diagnostic[],
): PlacementConstraint | undefined {
  const strength = requiredProperty<PlacementStrengthProperty>(
    declaration.properties,
    "PlacementStrengthProperty",
    "strength",
    declaration,
    file,
    diagnostics,
  );
  const gap = optionalProperty<PlacementGapProperty>(
    declaration.properties,
    "PlacementGapProperty",
    "gap",
    declaration,
    file,
    diagnostics,
  );
  const subjectId = declaration.subject.ref?.name;
  const targetId = declaration.target.ref?.name;
  if (strength === undefined || subjectId === undefined || targetId === undefined) {
    return undefined;
  }
  const id = placementDeclarationId(declaration);
  const relative = isRelativePlacementRelation(declaration.relation);
  if ((relative && gap === undefined) || (!relative && gap !== undefined)) {
    diagnostics.push(
      createDiagnostic({
        code: "C4ML-LANG-121",
        severity: "error",
        message: relative
          ? `Relative placement constraint "${id}" requires gap.`
          : `Alignment constraint "${id}" does not accept gap.`,
        source: sourceReference(declaration, file),
        correction: relative
          ? "Add a finite non-negative gap inside the constraint block."
          : "Remove gap from the alignment constraint.",
      }),
    );
    return undefined;
  }
  const base = {
    id,
    subjectId,
    targetId,
    strength: strength.value,
    source: sourceReference(declaration, file),
  };
  if (relative) {
    return {
      ...base,
      kind: "relative",
      relation: declaration.relation as RelativePlacementRelation,
      gap: gap!.value,
    };
  }
  return {
    ...base,
    kind: "alignment",
    alignment:
      declaration.relation === "align-center-x" ? "center-x" : "center-y",
  };
}

function isRelativePlacementRelation(
  relation: PlacementConstraintDeclaration["relation"],
): relation is RelativePlacementRelation {
  return (
    relation === "above" ||
    relation === "below" ||
    relation === "left-of" ||
    relation === "right-of"
  );
}

function lowerPlacementPin(
  declaration: PlacementPinDeclaration,
  file: string,
  diagnostics: Diagnostic[],
): PlacementConstraint | undefined {
  const x = requiredProperty<PlacementXProperty>(
    declaration.properties,
    "PlacementXProperty",
    "x",
    declaration,
    file,
    diagnostics,
  );
  const y = requiredProperty<PlacementYProperty>(
    declaration.properties,
    "PlacementYProperty",
    "y",
    declaration,
    file,
    diagnostics,
  );
  const strength = requiredProperty<PlacementStrengthProperty>(
    declaration.properties,
    "PlacementStrengthProperty",
    "strength",
    declaration,
    file,
    diagnostics,
  );
  const targetId = declaration.target.ref?.name;
  if (
    x === undefined ||
    y === undefined ||
    strength === undefined ||
    targetId === undefined
  ) {
    return undefined;
  }
  return {
    id: placementDeclarationId(declaration),
    kind: "pin",
    targetId,
    x: x.value,
    y: y.value,
    strength: strength.value,
    source: sourceReference(declaration, file),
  };
}

function placementDeclarationId(
  declaration:
    | PlacementAdjustDeclaration
    | PlacementAlignDeclaration
    | PlacementConstraintDeclaration
    | PlacementDistributeDeclaration
    | PlacementPinDeclaration
    | PlacementPlaceDeclaration,
): string {
  if ("alignment" in declaration) {
    return `align:${declaration.alignment}:${declaration.items.map((item) => item.$refText).join(":")}`;
  }
  if ("orientation" in declaration) {
    return `distribute:${declaration.orientation}:${declaration.items.map((item) => item.$refText).join(":")}`;
  }
  if ("relation" in declaration) {
    return `${declaration.relation}:${declaration.subject.$refText}:${declaration.target.$refText}`;
  }
  if (declaration.$type === "PlacementAdjustDeclaration") {
    return `adjust:${declaration.target.$refText}`;
  }
  return `pin:${declaration.target.$refText}`;
}

function lowerRouteAvoidance(
  declaration: RouteAvoidanceDeclaration,
  file: string,
  diagnostics: Diagnostic[],
): RouteAvoidanceRegion | undefined {
  const strength = requiredProperty<AvoidanceStrengthProperty>(
    declaration.properties,
    "AvoidanceStrengthProperty",
    "strength",
    declaration,
    file,
    diagnostics,
  );
  const bounds = optionalProperty<AvoidanceBoundsProperty>(
    declaration.properties,
    "AvoidanceBoundsProperty",
    "bounds",
    declaration,
    file,
    diagnostics,
  );
  const around = optionalProperty<AvoidanceAroundProperty>(
    declaration.properties,
    "AvoidanceAroundProperty",
    "around",
    declaration,
    file,
    diagnostics,
  );
  const padding = optionalProperty<AvoidancePaddingProperty>(
    declaration.properties,
    "AvoidancePaddingProperty",
    "padding",
    declaration,
    file,
    diagnostics,
  );
  if (strength === undefined) {
    return undefined;
  }
  const absolute =
    bounds !== undefined && around === undefined && padding === undefined;
  const relative =
    bounds === undefined && around !== undefined && padding !== undefined;
  if (!absolute && !relative) {
    diagnostics.push(
      createDiagnostic({
        code: "C4ML-LANG-114",
        severity: "error",
        message: `Avoidance region "${declaration.name}" must use either bounds or around with padding.`,
        source: sourceReference(declaration, file),
        correction:
          "Choose absolute bounds, or reference one model element and provide non-negative padding.",
      }),
    );
    return undefined;
  }
  return {
    id: declaration.name,
    strength: strength.value,
    geometry:
      bounds !== undefined
        ? {
            kind: "absolute",
            bounds: {
              x: signedInteger(bounds.value.x),
              y: signedInteger(bounds.value.y),
              width: bounds.value.width,
              height: bounds.value.height,
            },
          }
        : {
            kind: "node",
            referenceId: around!.value.ref!.name,
            padding: padding!.value,
          },
    source: sourceReference(declaration, file),
  };
}

function lowerRouteCorridor(
  declaration: RouteCorridorDeclaration,
  file: string,
  diagnostics: Diagnostic[],
): RouteCorridor | undefined {
  const orientation = requiredProperty<CorridorOrientationProperty>(
    declaration.properties,
    "CorridorOrientationProperty",
    "orientation",
    declaration,
    file,
    diagnostics,
  );
  const coordinate = requiredProperty<CorridorCoordinateProperty>(
    declaration.properties,
    "CorridorCoordinateProperty",
    "coordinate",
    declaration,
    file,
    diagnostics,
  );
  const lanes = requiredProperty<CorridorLanesProperty>(
    declaration.properties,
    "CorridorLanesProperty",
    "lanes",
    declaration,
    file,
    diagnostics,
  );
  const laneGap = requiredProperty<CorridorLaneGapProperty>(
    declaration.properties,
    "CorridorLaneGapProperty",
    "lane-gap",
    declaration,
    file,
    diagnostics,
  );
  if (
    orientation === undefined ||
    coordinate === undefined ||
    lanes === undefined ||
    laneGap === undefined
  ) {
    return undefined;
  }
  if (lanes.value <= 0 || laneGap.value <= 0) {
    diagnostics.push(
      createDiagnostic({
        code: "C4ML-LANG-112",
        severity: "error",
        message: `Route corridor "${declaration.name}" requires positive lanes and lane-gap values.`,
        source: sourceReference(declaration, file),
        correction: "Use at least one lane and a lane gap greater than zero.",
      }),
    );
    return undefined;
  }
  return {
    id: declaration.name,
    orientation: orientation.value,
    coordinate: signedInteger(coordinate.value),
    lanes: lanes.value,
    laneSpacing: laneGap.value,
    source: sourceReference(declaration, file),
  };
}

function lowerRouteControl(
  declaration: RouteDeclaration,
  file: string,
  diagnostics: Diagnostic[],
): RouteControl | undefined {
  const policy = requiredProperty<RoutePolicyProperty>(
    declaration.properties,
    "RoutePolicyProperty",
    "policy",
    declaration,
    file,
    diagnostics,
  );
  const style = optionalProperty<RouteStyleProperty>(
    declaration.properties,
    "RouteStyleProperty",
    "style",
    declaration,
    file,
    diagnostics,
  );
  const sourcePort = optionalProperty<RouteSourcePortProperty>(
    declaration.properties,
    "RouteSourcePortProperty",
    "source-port",
    declaration,
    file,
    diagnostics,
  );
  const targetPort = optionalProperty<RouteTargetPortProperty>(
    declaration.properties,
    "RouteTargetPortProperty",
    "target-port",
    declaration,
    file,
    diagnostics,
  );
  const via = optionalProperty<RouteViaProperty>(
    declaration.properties,
    "RouteViaProperty",
    "via",
    declaration,
    file,
    diagnostics,
  );
  const guide = optionalProperty<RouteGuideProperty>(
    declaration.properties,
    "RouteGuideProperty",
    "guide",
    declaration,
    file,
    diagnostics,
  );
  const avoid = optionalProperty<RouteAvoidProperty>(
    declaration.properties,
    "RouteAvoidProperty",
    "avoid",
    declaration,
    file,
    diagnostics,
  );
  const corridor = optionalProperty<RouteCorridorSelectionProperty>(
    declaration.properties,
    "RouteCorridorSelectionProperty",
    "corridor",
    declaration,
    file,
    diagnostics,
  );
  const lane = optionalProperty<RouteLaneProperty>(
    declaration.properties,
    "RouteLaneProperty",
    "lane",
    declaration,
    file,
    diagnostics,
  );
  const points = optionalProperty<RoutePointsProperty>(
    declaration.properties,
    "RoutePointsProperty",
    "points",
    declaration,
    file,
    diagnostics,
  );
  const labelSegment = optionalProperty<RouteLabelSegmentProperty>(
    declaration.properties,
    "RouteLabelSegmentProperty",
    "label-segment",
    declaration,
    file,
    diagnostics,
  );
  const labelShift = optionalProperty<RouteLabelShiftProperty>(
    declaration.properties,
    "RouteLabelShiftProperty",
    "label-shift",
    declaration,
    file,
    diagnostics,
  );
  if (policy === undefined) {
    return undefined;
  }

  const invalidCombination = routeCombinationError(policy.value, {
    corridor: corridor !== undefined,
    avoid: avoid !== undefined,
    guide: guide !== undefined,
    lane: lane !== undefined,
    points: points !== undefined,
    sourcePort: sourcePort !== undefined,
    style: style !== undefined,
    targetPort: targetPort !== undefined,
    via: via !== undefined,
  });
  if (invalidCombination !== undefined) {
    diagnostics.push(
      createDiagnostic({
        code: "C4ML-LANG-113",
        severity: "error",
        message: `Route for relationship "${declaration.relationship.ref!.name}" is invalid: ${invalidCombination}`,
        source: sourceReference(declaration, file),
        correction: "Keep only the controls allowed by the selected route policy.",
      }),
    );
    return undefined;
  }

  return {
    relationshipId: declaration.relationship.ref!.name,
    policy: policy.value,
    ...(style === undefined ? {} : { style: style.value }),
    ...(sourcePort === undefined ? {} : { sourcePort: sourcePort.value }),
    ...(targetPort === undefined ? {} : { targetPort: targetPort.value }),
    ...(via === undefined ? {} : { waypoints: pointsOf(via.value.points) }),
    ...(guide === undefined
      ? {}
      : { guidance: guide.items.map(lowerRouteGuidance) }),
    ...(avoid === undefined
      ? {}
      : {
          avoidanceRegionIds: avoid.regions.map((region) => region.ref!.name),
        }),
    ...(corridor === undefined || lane === undefined
      ? {}
      : {
          corridor: {
            corridorId: corridor.value.ref!.name,
            lane: lane.value,
          },
        }),
    ...(points === undefined ? {} : { points: pointsOf(points.value.points) }),
    ...(labelSegment === undefined
      ? {}
      : { labelSegment: labelSegment.value }),
    ...(labelShift === undefined
      ? {}
      : { labelOffset: pointOf(labelShift.value) }),
    source: sourceReference(declaration, file),
  };
}

function lowerRouteGuidance(
  item: RouteGuideProperty["items"][number],
): RouteGuidance {
  return item.$type === "RouteWaypointGuide"
    ? { kind: "waypoint", anchor: lowerRouteAnchor(item.anchor) }
    : {
        kind: "locked-segment",
        start: lowerRouteAnchor(item.start),
        end: lowerRouteAnchor(item.end),
      };
}

function lowerRouteAnchor(anchor: RouteAnchorLiteral): RouteAnchor {
  if (anchor.$type === "RouteCanvasAnchor") {
    return { kind: "canvas", point: pointOf(anchor.point) };
  }
  if (anchor.$type === "RouteElementAnchor") {
    return {
      kind: "node",
      referenceId: anchor.element.ref!.name,
      side: anchor.side,
      ...(anchor.offset === undefined ? {} : { offset: pointOf(anchor.offset) }),
    };
  }
  return {
    kind: anchor.kind,
    ...(anchor.offset === undefined ? {} : { offset: pointOf(anchor.offset) }),
  };
}

function routeCombinationError(
  policy: RoutePolicyProperty["value"],
  present: Readonly<{
    avoid: boolean;
    corridor: boolean;
    guide: boolean;
    lane: boolean;
    points: boolean;
    sourcePort: boolean;
    style: boolean;
    targetPort: boolean;
    via: boolean;
  }>,
): string | undefined {
  if (present.corridor !== present.lane) {
    return "corridor and lane must be declared together.";
  }
  if (policy === "automatic") {
    return present.avoid ||
      present.corridor ||
      present.guide ||
      present.points ||
      present.sourcePort ||
      present.style ||
      present.targetPort ||
      present.via
      ? "automatic policy accepts only label placement controls."
      : undefined;
  }
  if (policy === "guided") {
    if (present.points) {
      return "guided policy uses via, not a complete points list.";
    }
    if (present.guide && (present.corridor || present.via)) {
      return "ordered guide items cannot be combined with a corridor or absolute via points.";
    }
    if (present.corridor && present.via) {
      return "the current guided slice cannot combine a corridor with via points.";
    }
    return undefined;
  }
  if (!present.points) {
    return "fixed policy requires a complete points list.";
  }
  return present.avoid ||
    present.corridor ||
    present.guide ||
    present.sourcePort ||
    present.targetPort ||
    present.via
    ? "fixed policy accepts its complete points list instead of ports, guides, avoidance, via points, or a corridor."
    : undefined;
}

function diagnoseDuplicateRoutingIds(
  avoidanceRegions: readonly RouteAvoidanceDeclaration[],
  corridors: readonly RouteCorridorDeclaration[],
  routes: readonly RouteDeclaration[],
  file: string,
  diagnostics: Diagnostic[],
): void {
  diagnoseDuplicateDeclarations(
    avoidanceRegions,
    (region) => region.name,
    "route avoidance region",
    "C4ML-LANG-115",
    file,
    diagnostics,
  );
  diagnoseDuplicateDeclarations(
    corridors,
    (corridor) => corridor.name,
    "route corridor",
    "C4ML-LANG-110",
    file,
    diagnostics,
  );
  diagnoseDuplicateDeclarations(
    routes,
    (route) => route.relationship.ref?.name ?? route.relationship.$refText,
    "route control for relationship",
    "C4ML-LANG-111",
    file,
    diagnostics,
  );
}

function diagnoseDuplicateDeclarations<T extends AstNode>(
  declarations: readonly T[],
  idOf: (declaration: T) => string,
  label: string,
  code: string,
  file: string,
  diagnostics: Diagnostic[],
): void {
  const firstById = new Map<string, T>();
  for (const declaration of declarations) {
    const id = idOf(declaration);
    const first = firstById.get(id);
    if (first === undefined) {
      firstById.set(id, declaration);
      continue;
    }
    diagnostics.push(
      createDiagnostic({
        code,
        severity: "error",
        message: `Duplicate ${label} "${id}".`,
        source: sourceReference(declaration, file),
        related: [{
          message: `The first ${label} is here.`,
          source: sourceReference(first, file),
        }],
        correction: `Keep one ${label} for "${id}" in this view.`,
      }),
    );
  }
}

function signedInteger(value: SignedInteger): number {
  return value.negative ? -value.value : value.value;
}

function pointOf(value: { readonly x: SignedInteger; readonly y: SignedInteger }): Point {
  return { x: signedInteger(value.x), y: signedInteger(value.y) };
}

function pointsOf(
  values: readonly { readonly x: SignedInteger; readonly y: SignedInteger }[],
): readonly Point[] {
  return values.map(pointOf);
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
  sourceText: string,
): Diagnostic {
  const langiumCode = diagnosticCode(diagnostic.data);
  const startOffset = textDocument.offsetAt(diagnostic.range.start);
  const endOffset = textDocument.offsetAt(diagnostic.range.end);
  const previewConstruct =
    langiumCode === "parsing-error"
      ? plannedPreviewConstructAt(sourceText, startOffset, endOffset)
      : undefined;
  const source = {
    file,
    range: {
      start: {
        offset: startOffset,
        line: diagnostic.range.start.line,
        column: diagnostic.range.start.character,
      },
      end: {
        offset: endOffset,
        line: diagnostic.range.end.line,
        column: diagnostic.range.end.character,
      },
    },
  };
  return createDiagnostic({
    code:
      previewConstruct === undefined
        ? stableSyntaxCode(langiumCode)
        : "C4ML-LANG-005",
    severity: diagnosticSeverity(diagnostic.severity),
    message:
      previewConstruct === undefined
        ? typeof diagnostic.message === "string"
          ? diagnostic.message
          : diagnostic.message.value
        : `${previewConstruct.label} is planned C4ML syntax and is not executable in ${c4mlDraftLanguageVersion}.`,
    source,
    correction:
      previewConstruct === undefined
        ? langiumCode === "linking-error"
          ? "Reference an identifier declared in the current document."
          : "Correct the source syntax at the reported range."
        : previewConstruct.correction,
  });
}

const plannedPreviewConstructs = {
  group: {
    label: "The Visual Group declaration",
    correction:
      "Remove this declaration from executable source and keep the proposed Visual Group intent in a separate language-preview document.",
  },
  presentation: {
    label: "The View presentation block",
    correction:
      "Remove this block from executable source and keep the proposed presentation intent in a separate language-preview document.",
  },
  tags: {
    label: "The element tags property",
    correction:
      "Remove this property from executable source and keep the proposed tag intent in a separate language-preview document.",
  },
} as const;

function plannedPreviewConstructAt(
  source: string,
  startOffset: number,
  endOffset: number,
):
  | (typeof plannedPreviewConstructs)[keyof typeof plannedPreviewConstructs]
  | undefined {
  const reportedText = source.slice(startOffset, endOffset).trim();
  const followingText = source
    .slice(startOffset)
    .match(/^\s*([a-z][a-z-]*)/u)?.[1];
  const keyword = reportedText.match(/^([a-z][a-z-]*)/u)?.[1] ?? followingText;
  if (keyword === undefined || !(keyword in plannedPreviewConstructs)) {
    return undefined;
  }
  return plannedPreviewConstructs[
    keyword as keyof typeof plannedPreviewConstructs
  ];
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
