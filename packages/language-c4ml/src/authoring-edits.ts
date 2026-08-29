import {
  createProposedSourceChangeSet,
  type ProposedSourceChangeSet,
  type SourceChangeIntent,
} from "@c4ml/compiler-core";
import { URI } from "langium";

import type { C4mlDocument, ElementDeclaration } from "./generated/ast.js";
import { createC4mlDraftServices } from "./services.js";

export type C4mlElementAuthoringKind =
  "code" | "component" | "container" | "person" | "system";

export type C4mlElementTextProperty =
  "classification" | "name" | "responsibility" | "technology";

export interface C4mlElementPropertyChangeRequest {
  readonly id: string;
  readonly elementKind: C4mlElementAuthoringKind;
  readonly elementId: string;
  readonly property: C4mlElementTextProperty;
  readonly value: string;
  readonly intent: SourceChangeIntent;
}

export type C4mlAuthoringIssueCode =
  | "C4ML-AUTHORING-001"
  | "C4ML-AUTHORING-002"
  | "C4ML-AUTHORING-003"
  | "C4ML-AUTHORING-004";

export interface C4mlAuthoringIssue {
  readonly code: C4mlAuthoringIssueCode;
  readonly message: string;
}

export type C4mlElementPropertyChangeProposal =
  | {
      readonly valid: true;
      readonly changeSet: ProposedSourceChangeSet;
      readonly issues: readonly [];
    }
  | {
      readonly valid: false;
      readonly issues: readonly C4mlAuthoringIssue[];
    };

const declarationTypeByKind: Readonly<
  Record<C4mlElementAuthoringKind, ElementDeclaration["$type"]>
> = {
  code: "CodeElementDeclaration",
  component: "ComponentDeclaration",
  container: "ContainerDeclaration",
  person: "PersonDeclaration",
  system: "SoftwareSystemDeclaration",
};

const propertyTypeByName: Readonly<
  Record<
    C4mlElementTextProperty,
    | "ClassificationProperty"
    | "DisplayNameProperty"
    | "ResponsibilityProperty"
    | "TechnologyProperty"
  >
> = {
  classification: "ClassificationProperty",
  name: "DisplayNameProperty",
  responsibility: "ResponsibilityProperty",
  technology: "TechnologyProperty",
};

export async function proposeC4mlElementPropertyChange(
  source: string,
  request: C4mlElementPropertyChangeRequest,
): Promise<C4mlElementPropertyChangeProposal> {
  const services = createC4mlDraftServices();
  const document = services.shared.workspace.LangiumDocumentFactory.fromString(
    source,
    URI.parse("c4ml:///authoring.c4ml"),
  );
  services.shared.workspace.LangiumDocuments.addDocument(document);
  await services.shared.workspace.DocumentBuilder.build([document], {
    validation: true,
  });
  if ((document.diagnostics ?? []).some(({ severity }) => severity === 1)) {
    return invalid(
      "C4ML-AUTHORING-001",
      "Syntax-aware changes require a valid C4ML source document.",
    );
  }

  const model = (document.parseResult.value as C4mlDocument).model;
  const element = model?.elements.find(
    (candidate) =>
      candidate.$type === declarationTypeByKind[request.elementKind] &&
      candidate.name === request.elementId,
  );
  if (element === undefined) {
    return invalid(
      "C4ML-AUTHORING-002",
      `No ${request.elementKind} declaration with stable identifier "${request.elementId}" exists.`,
    );
  }

  const property = element.properties.find(
    (candidate) => candidate.$type === propertyTypeByName[request.property],
  );
  if (property === undefined) {
    return invalid(
      "C4ML-AUTHORING-003",
      `${request.elementKind} "${request.elementId}" has no ${request.property} property to replace.`,
    );
  }
  const propertyNode = property.$cstNode;
  const valueRange =
    propertyNode === undefined ? undefined : propertyValueRange(propertyNode);
  if (valueRange === undefined) {
    return invalid(
      "C4ML-AUTHORING-004",
      `The ${request.property} value has no stable source range.`,
    );
  }
  const replacement = replacementText(request.property, request.value);
  if (replacement === undefined) {
    return invalid(
      "C4ML-AUTHORING-004",
      "Classification must be either internal or external.",
    );
  }

  return {
    valid: true,
    changeSet: createProposedSourceChangeSet(source, {
      id: request.id,
      intent: request.intent,
      affectedIds: [request.elementId],
      edits: [
        {
          startOffset: valueRange.startOffset,
          endOffset: valueRange.endOffset,
          text: replacement,
        },
      ],
    }),
    issues: [],
  };
}

function propertyValueRange(node: {
  readonly offset: number;
  readonly end: number;
  readonly text: string;
}): { readonly startOffset: number; readonly endOffset: number } | undefined {
  const equals = node.text.indexOf("=");
  if (equals < 0) {
    return undefined;
  }
  let relativeStart = equals + 1;
  while (/\s/u.test(node.text[relativeStart] ?? "")) {
    relativeStart += 1;
  }
  return relativeStart >= node.text.length
    ? undefined
    : { startOffset: node.offset + relativeStart, endOffset: node.end };
}

function replacementText(
  property: C4mlElementTextProperty,
  value: string,
): string | undefined {
  if (property === "classification") {
    return value === "internal" || value === "external" ? value : undefined;
  }
  return JSON.stringify(value);
}

function invalid(
  code: C4mlAuthoringIssueCode,
  message: string,
): C4mlElementPropertyChangeProposal {
  return { valid: false, issues: [{ code, message }] };
}
