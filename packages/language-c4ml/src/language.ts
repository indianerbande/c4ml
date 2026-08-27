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
  type Diagnostic,
  type RelatedDiagnosticInformation,
  type ResolvedView,
  type SourceReference,
  type StaticElement,
} from "@c4ml/compiler-core";

import type {
  C4mlDocument,
  ClassificationProperty,
  DisplayNameProperty,
  ElementDeclaration,
  FlowProperty,
  RelationshipDeclaration,
  RelationshipFromProperty,
  RelationshipIntentProperty,
  RelationshipToProperty,
  ResponsibilityProperty,
  SystemContextView as DraftSystemContextView,
  ViewAudienceProperty,
  ViewLegendProperty,
  ViewPurposeProperty,
  ViewScopeProperty,
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
  const views = document.views
    .map((view) => lowerSystemContextView(view, file, diagnostics))
    .filter((view): view is ArchitectureView => view !== undefined);

  if (hasErrors(diagnostics)) {
    return undefined;
  }
  return {
    model: { elements, relationships },
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
  const classification = requiredProperty<ClassificationProperty>(
    declaration.properties,
    "ClassificationProperty",
    "classification",
    declaration,
    file,
    diagnostics,
  );
  if (
    displayName === undefined ||
    responsibility === undefined ||
    classification === undefined
  ) {
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
  if (from === undefined || to === undefined || intent === undefined) {
    return undefined;
  }

  return {
    id: declaration.name,
    sourceId: from.value.ref!.name,
    targetId: to.value.ref!.name,
    description: intent.value,
    source: sourceReference(declaration, file),
  };
}

function lowerSystemContextView(
  declaration: DraftSystemContextView,
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
  const scope = requiredProperty<ViewScopeProperty>(
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
    scope === undefined ||
    title === undefined ||
    purpose === undefined ||
    audience === undefined ||
    legend === undefined ||
    (declaration.layout !== undefined && flow === undefined)
  ) {
    return undefined;
  }

  return {
    id: declaration.name,
    kind: type.value,
    softwareSystemId: scope.value.ref!.name,
    title: title.value,
    purpose: purpose.value,
    legend: { mode: legend.value },
    ...(flow === undefined ? {} : { layout: { direction: flow.value } }),
    source: sourceReference(declaration, file),
  };
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
