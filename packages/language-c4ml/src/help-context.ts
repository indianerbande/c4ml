import { AstUtils, type AstNode } from "langium";

import type { C4mlDocument } from "./generated/ast.js";
import {
  isCodeElementDeclaration,
  isComponentDeclaration,
  isContainerDeclaration,
  isContainerInstanceDeclaration,
  isDeploymentNodeDeclaration,
  isDeploymentRelationshipDeclaration,
  isDeploymentsBlock,
  isEnvironmentDeclaration,
  isInfrastructureNodeDeclaration,
  isInteractionDeclaration,
  isLayoutBlock,
  isModelBlock,
  isPersonDeclaration,
  isPlacementConstraintDeclaration,
  isPlacementPinDeclaration,
  isRelationshipDeclaration,
  isRelationsBlock,
  isRouteCorridorDeclaration,
  isRouteDeclaration,
  isSoftwareSystemDeclaration,
  isSoftwareSystemInstanceDeclaration,
  isViewDeclaration,
} from "./generated/ast.js";
import { c4mlDraftLanguageVersion } from "./language.js";
import {
  createC4mlDraftServices,
  type C4mlDraftServices,
} from "./services.js";

let helpContextServices: C4mlDraftServices | undefined;

export const c4mlHelpTopicIds = [
  "getting-started",
  "model",
  "people",
  "systems",
  "containers",
  "components-code",
  "relationships",
  "views",
  "deployments",
  "layout",
  "routes",
  "export",
] as const;

export type C4mlHelpTopicId = (typeof c4mlHelpTopicIds)[number];

export interface C4mlHelpContext {
  readonly languageVersion: typeof c4mlDraftLanguageVersion;
  readonly offset: number;
  readonly topicId: C4mlHelpTopicId;
}

export function helpContextAtC4mlDraft(
  source: string,
  offset: number,
): C4mlHelpContext {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > source.length) {
    throw new RangeError("Help offset must be inside the source text.");
  }

  helpContextServices ??= createC4mlDraftServices();
  const services = helpContextServices;
  const root = services.language.parser.LangiumParser.parse<C4mlDocument>(
    source,
  ).value;
  let topicId: C4mlHelpTopicId = "getting-started";
  let ownerLength = Number.POSITIVE_INFINITY;

  for (const node of [root, ...AstUtils.streamAllContents(root)]) {
    const candidate = topicForNode(node);
    const cst = node.$cstNode;
    if (
      candidate === undefined ||
      cst === undefined ||
      cst.offset > offset ||
      offset > cst.end
    ) {
      continue;
    }
    const length = cst.end - cst.offset;
    if (length < ownerLength) {
      topicId = candidate;
      ownerLength = length;
    }
  }

  return { languageVersion: c4mlDraftLanguageVersion, offset, topicId };
}

function topicForNode(node: AstNode): C4mlHelpTopicId | undefined {
  if (isRouteDeclaration(node) || isRouteCorridorDeclaration(node)) {
    return "routes";
  }
  if (
    isPlacementConstraintDeclaration(node) ||
    isPlacementPinDeclaration(node)
  ) {
    return "layout";
  }
  if (isLayoutBlock(node)) {
    return "layout";
  }
  if (isPersonDeclaration(node)) {
    return "people";
  }
  if (isSoftwareSystemDeclaration(node)) {
    return "systems";
  }
  if (isContainerDeclaration(node)) {
    return "containers";
  }
  if (isComponentDeclaration(node) || isCodeElementDeclaration(node)) {
    return "components-code";
  }
  if (isRelationshipDeclaration(node) || isInteractionDeclaration(node)) {
    return "relationships";
  }
  if (isViewDeclaration(node)) {
    return "views";
  }
  if (
    isDeploymentsBlock(node) ||
    isEnvironmentDeclaration(node) ||
    isDeploymentNodeDeclaration(node) ||
    isInfrastructureNodeDeclaration(node) ||
    isSoftwareSystemInstanceDeclaration(node) ||
    isContainerInstanceDeclaration(node) ||
    isDeploymentRelationshipDeclaration(node)
  ) {
    return "deployments";
  }
  if (isRelationsBlock(node)) {
    return "relationships";
  }
  if (isModelBlock(node)) {
    return "model";
  }
  return undefined;
}
