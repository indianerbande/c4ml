import { c4mlDraftLanguageVersion } from "./language.js";
import {
  applyProjectSourceChangeSet,
  createProposedProjectSourceChangeSet,
  type ArchitectureProjectInput,
  type ProposedProjectSourceChangeSet,
} from "@c4ml/compiler-core";
import { URI } from "langium";

import type { C4mlDocument } from "./generated/ast.js";
import { createC4mlDraftServices } from "./services.js";

export type C4mlDraftClassification = "external" | "internal";
export type C4mlDraftFlowDirection = "down" | "left" | "right" | "up";
export type C4mlArchitectureWizardViewKind = "container" | "system-context";

export interface C4mlArchitecturePartAnswer {
  readonly id: string;
  readonly name: string;
  readonly responsibility: string;
  readonly technology: string;
}

export interface C4mlArchitectureConnectionAnswer {
  readonly id: string;
  readonly fromId: string;
  readonly toId: string;
  readonly intent: string;
  readonly protocol: string;
}

export interface C4mlSystemContextWizardAnswers {
  readonly viewKind: C4mlArchitectureWizardViewKind;
  readonly personId: string;
  readonly personName: string;
  readonly personResponsibility: string;
  readonly personClassification: C4mlDraftClassification;
  readonly systemId: string;
  readonly systemName: string;
  readonly systemResponsibility: string;
  readonly systemClassification: C4mlDraftClassification;
  readonly relationshipId: string;
  readonly relationshipIntent: string;
  readonly entryPartId: string;
  readonly parts: readonly C4mlArchitecturePartAnswer[];
  readonly connections: readonly C4mlArchitectureConnectionAnswer[];
  readonly viewId: string;
  readonly viewTitle: string;
  readonly viewPurpose: string;
  readonly flow: C4mlDraftFlowDirection;
}

type C4mlTopLevelWizardField = keyof Omit<
  C4mlSystemContextWizardAnswers,
  "connections" | "parts"
>;

export type C4mlSystemContextWizardField =
  | C4mlTopLevelWizardField
  | `connections.${number}.${keyof C4mlArchitectureConnectionAnswer}`
  | `parts.${number}.${keyof C4mlArchitecturePartAnswer}`;

export interface C4mlWizardIssue {
  readonly field: C4mlSystemContextWizardField;
  readonly code:
    | "C4ML-WIZARD-001"
    | "C4ML-WIZARD-002"
    | "C4ML-WIZARD-003";
  readonly message: string;
}

export interface C4mlSystemContextWizardResult {
  readonly languageVersion: typeof c4mlDraftLanguageVersion;
  readonly valid: boolean;
  readonly source: string | undefined;
  readonly issues: readonly C4mlWizardIssue[];
}

export type C4mlWizardExtensionIssueCode =
  | "C4ML-WIZARD-101"
  | "C4ML-WIZARD-102"
  | "C4ML-WIZARD-103"
  | "C4ML-WIZARD-104";

export interface C4mlWizardExtensionIssue {
  readonly code: C4mlWizardExtensionIssueCode;
  readonly message: string;
}

export type C4mlWizardExtensionProposal =
  | {
      readonly valid: true;
      readonly changeSet: ProposedProjectSourceChangeSet;
      readonly documentUri: string;
      readonly proposedText: string;
      readonly issues: readonly [];
    }
  | {
      readonly valid: false;
      readonly issues: readonly C4mlWizardExtensionIssue[];
    };

export const defaultSystemContextWizardAnswers: C4mlSystemContextWizardAnswers = {
  viewKind: "system-context",
  personId: "customer",
  personName: "Customer",
  personResponsibility:
    "Finds products, places orders, and checks delivery status.",
  personClassification: "external",
  systemId: "online-shop",
  systemName: "Online Shop",
  systemResponsibility:
    "Presents products, accepts orders, and provides order status.",
  systemClassification: "internal",
  relationshipId: "customer-uses-online-shop",
  relationshipIntent: "Browses products, places orders, and checks order status.",
  entryPartId: "shop-web-interface",
  parts: [
    {
      id: "shop-web-interface",
      name: "Shop Web Interface",
      responsibility:
        "Lets customers browse products, manage a cart, and place orders.",
      technology: "Web application",
    },
    {
      id: "admin-interface",
      name: "Admin Interface",
      responsibility: "Lets staff manage products, inventory, and orders.",
      technology: "Web application",
    },
    {
      id: "shop-service",
      name: "Shop Service",
      responsibility: "Processes product requests, carts, and orders.",
      technology: "Application service",
    },
    {
      id: "order-events",
      name: "Order Events",
      responsibility: "Distributes order events to downstream processes.",
      technology: "Apache Kafka",
    },
    {
      id: "shop-database",
      name: "Shop Database",
      responsibility:
        "Stores products, customer accounts, and order status.",
      technology: "PostgreSQL",
    },
    {
      id: "product-media",
      name: "Product Media",
      responsibility: "Stores product images and downloadable documents.",
      technology: "S3-compatible object storage",
    },
  ],
  connections: [
    {
      id: "shop-interface-requests-service",
      fromId: "shop-web-interface",
      toId: "shop-service",
      intent: "Requests products and submits orders",
      protocol: "HTTPS/JSON",
    },
    {
      id: "admin-interface-requests-service",
      fromId: "admin-interface",
      toId: "shop-service",
      intent: "Manages products, inventory, and orders",
      protocol: "HTTPS/JSON",
    },
    {
      id: "service-publishes-order-events",
      fromId: "shop-service",
      toId: "order-events",
      intent: "Publishes order events",
      protocol: "Kafka protocol",
    },
    {
      id: "service-reads-shop-database",
      fromId: "shop-service",
      toId: "shop-database",
      intent: "Reads and stores products, customers, and orders",
      protocol: "PostgreSQL protocol",
    },
    {
      id: "service-reads-product-media",
      fromId: "shop-service",
      toId: "product-media",
      intent: "Reads product images and documents",
      protocol: "S3 API",
    },
  ],
  viewId: "online-shop-context",
  viewTitle: "System Context — Online Shop",
  viewPurpose: "Show how customers use the Online Shop.",
  flow: "right",
};

const topLevelIdentifierFields: readonly C4mlTopLevelWizardField[] = [
  "personId",
  "systemId",
  "relationshipId",
  "viewId",
];

const topLevelTextFields: readonly C4mlTopLevelWizardField[] = [
  "personName",
  "personResponsibility",
  "systemName",
  "systemResponsibility",
  "relationshipIntent",
  "viewTitle",
  "viewPurpose",
];

export function generateSystemContextDraft(
  answers: C4mlSystemContextWizardAnswers,
): C4mlSystemContextWizardResult {
  const issues = validateAnswers(answers);
  if (issues.length > 0) {
    return {
      languageVersion: c4mlDraftLanguageVersion,
      valid: false,
      source: undefined,
      issues,
    };
  }

  const source = [
    `c4ml ${c4mlDraftLanguageVersion}`,
    "",
    "model {",
    ...wizardModelLines(answers),
    "}",
    "",
    "relations {",
    ...wizardRelationLines(answers),
    "}",
    "",
    ...wizardViewLines(answers),
    "",
  ].join("\n");

  return {
    languageVersion: c4mlDraftLanguageVersion,
    valid: true,
    source,
    issues: [],
  };
}

export async function proposeC4mlWizardExtension(
  project: ArchitectureProjectInput,
  documentUri: string,
  answers: C4mlSystemContextWizardAnswers,
): Promise<C4mlWizardExtensionProposal> {
  const generated = generateSystemContextDraft(answers);
  if (!generated.valid) {
    return extensionInvalid(
      "C4ML-WIZARD-101",
      "The assistant answers must be valid before an existing document can be extended.",
    );
  }
  const parsed = await parseWizardProject(project);
  if (parsed === undefined) {
    return extensionInvalid(
      "C4ML-WIZARD-101",
      "The assistant can extend only a valid C4ML project.",
    );
  }
  const target = parsed.find(({ uri }) => uri === documentUri);
  if (target === undefined) {
    return extensionInvalid(
      "C4ML-WIZARD-102",
      `The target document "${documentUri}" is not part of the active project.`,
    );
  }
  if (target.ast.model?.$cstNode === undefined || target.ast.relations?.$cstNode === undefined) {
    return extensionInvalid(
      "C4ML-WIZARD-102",
      "Safe assistant extension currently requires model and relations blocks in the target document.",
    );
  }
  const existingIds = new Set(
    parsed.flatMap(({ ast }) => [
      ...(ast.model?.elements.map(({ name }) => name) ?? []),
      ...(ast.relations?.relationships.map(({ name }) => name) ?? []),
      ...ast.views.map(({ name }) => name),
    ]),
  );
  const requestedIds = wizardIds(answers);
  const duplicate = requestedIds.find((id) => existingIds.has(id));
  if (duplicate !== undefined) {
    return extensionInvalid(
      "C4ML-WIZARD-103",
      `The stable identifier "${duplicate}" already exists in the active project.`,
    );
  }
  const eol = lineEnding(target.source);
  const modelEdit = insertWizardLines(
    target.source,
    target.ast.model.$cstNode,
    wizardModelLines(answers),
  );
  const relationsEdit = insertWizardLines(
    target.source,
    target.ast.relations.$cstNode,
    wizardRelationLines(answers),
  );
  if (modelEdit === undefined || relationsEdit === undefined) {
    return extensionInvalid(
      "C4ML-WIZARD-104",
      "C4ML could not locate stable insertion points for the assistant result.",
    );
  }
  const viewText = wizardViewLines(answers).join(eol);
  const viewEdit = {
    startOffset: target.source.length,
    endOffset: target.source.length,
    text: `${target.source.endsWith(eol) ? eol : `${eol}${eol}`}${viewText}${eol}`,
  };
  const changeSet = createProposedProjectSourceChangeSet(project, {
    id: `wizard-extend-${answers.viewId}`,
    intent: {
      id: "wizard-extend-existing-document",
      kind: "architecture",
      summary: `Extend ${documentUri} with assistant-generated architecture`,
    },
    affectedIds: requestedIds,
    edits: [modelEdit, relationsEdit, viewEdit].map((edit) => ({
      documentUri,
      ...edit,
    })),
  });
  const application = applyProjectSourceChangeSet(project, changeSet);
  if (!application.valid) {
    return extensionInvalid(
      "C4ML-WIZARD-104",
      "The assistant extension could not be applied atomically.",
    );
  }
  const proposedText = application.project.documents.find(
    ({ uri }) => uri === documentUri,
  )?.text;
  if (proposedText === undefined) {
    return extensionInvalid(
      "C4ML-WIZARD-104",
      "The assistant extension did not produce the target document.",
    );
  }
  return { valid: true, changeSet, documentUri, proposedText, issues: [] };
}

function wizardModelLines(
  answers: C4mlSystemContextWizardAnswers,
): string[] {
  return [
    ...declaration("person", answers.personId, [
      ["name", quote(answers.personName)],
      ["responsibility", quote(answers.personResponsibility)],
      ["classification", answers.personClassification],
    ]),
    "",
    ...declaration("system", answers.systemId, [
      ["name", quote(answers.systemName)],
      ["responsibility", quote(answers.systemResponsibility)],
      ["classification", answers.systemClassification],
    ]),
    ...(answers.viewKind === "container"
      ? answers.parts.flatMap((part) => [
          "",
          ...declaration("container", `${part.id} inside ${answers.systemId}`, [
            ["name", quote(part.name)],
            ["responsibility", quote(part.responsibility)],
            ["technology", quote(part.technology)],
          ]),
        ])
      : []),
  ];
}

function wizardRelationLines(
  answers: C4mlSystemContextWizardAnswers,
): string[] {
  return [
    ...declaration("relation", answers.relationshipId, [
      ["from", answers.personId],
      ["to", answers.viewKind === "container" ? answers.entryPartId : answers.systemId],
      ["intent", quote(answers.relationshipIntent)],
    ]),
    ...(answers.viewKind === "container"
      ? answers.connections.flatMap((connection) => [
          "",
          ...declaration("relation", connection.id, [
            ["from", connection.fromId],
            ["to", connection.toId],
            ["intent", quote(connection.intent)],
            ["protocol", quote(connection.protocol)],
          ]),
        ])
      : []),
  ];
}

function wizardViewLines(answers: C4mlSystemContextWizardAnswers): string[] {
  return [
    `view ${answers.viewId} {`,
    `  type = ${answers.viewKind}`,
    `  scope = ${answers.systemId}`,
    `  title = ${quote(answers.viewTitle)}`,
    `  purpose = ${quote(answers.viewPurpose)}`,
    "  audience = default",
    "  legend = generated",
    "",
    "  layout {",
    `    flow = ${answers.flow}`,
    "  }",
    "}",
  ];
}

function wizardIds(answers: C4mlSystemContextWizardAnswers): string[] {
  return [
    answers.personId,
    answers.systemId,
    ...(answers.viewKind === "container" ? answers.parts.map(({ id }) => id) : []),
    answers.relationshipId,
    ...(answers.viewKind === "container" ? answers.connections.map(({ id }) => id) : []),
    answers.viewId,
  ];
}

function insertWizardLines(
  source: string,
  node: { readonly offset: number; readonly text: string },
  lines: readonly string[],
): { readonly startOffset: number; readonly endOffset: number; readonly text: string } | undefined {
  const relativeClose = node.text.lastIndexOf("}");
  if (relativeClose < 0) return undefined;
  const closeOffset = node.offset + relativeClose;
  const eol = lineEnding(source);
  const leading = source.slice(0, closeOffset).endsWith("\n") ? "" : eol;
  return {
    startOffset: closeOffset,
    endOffset: closeOffset,
    text: `${leading}${lines.join(eol)}${eol}`,
  };
}

async function parseWizardProject(project: ArchitectureProjectInput) {
  const services = createC4mlDraftServices();
  const documents = project.documents.map((sourceDocument) => {
    const document = services.shared.workspace.LangiumDocumentFactory.fromString(
      sourceDocument.text,
      URI.from({ scheme: "c4ml-wizard", path: `/${sourceDocument.uri}` }),
    );
    services.shared.workspace.LangiumDocuments.addDocument(document);
    return { sourceDocument, document };
  });
  await services.shared.workspace.DocumentBuilder.build(
    documents.map(({ document }) => document),
    { validation: true },
  );
  if (documents.some(({ document }) =>
    (document.diagnostics ?? []).some(({ severity }) => severity === 1))) {
    return undefined;
  }
  return documents.map(({ sourceDocument, document }) => ({
    uri: sourceDocument.uri,
    source: sourceDocument.text,
    ast: document.parseResult.value as C4mlDocument,
  }));
}

function lineEnding(source: string): "\n" | "\r\n" {
  return source.includes("\r\n") ? "\r\n" : "\n";
}

function extensionInvalid(
  code: C4mlWizardExtensionIssueCode,
  message: string,
): C4mlWizardExtensionProposal {
  return { valid: false, issues: [{ code, message }] };
}

function validateAnswers(
  answers: C4mlSystemContextWizardAnswers,
): readonly C4mlWizardIssue[] {
  const issues: C4mlWizardIssue[] = [];
  for (const field of topLevelIdentifierFields) {
    addIdentifierIssue(issues, field, String(answers[field]));
  }
  for (const field of topLevelTextFields) {
    addTextIssue(issues, field, String(answers[field]));
  }
  if (answers.viewKind !== "container") {
    return issues;
  }
  if (answers.parts.length === 0) {
    issues.push({
      field: "entryPartId",
      code: "C4ML-WIZARD-003",
      message: "Add at least one separately running part.",
    });
    return issues;
  }

  const elementIds = new Set([answers.personId, answers.systemId]);
  answers.parts.forEach((part, index) => {
    const field = (name: keyof C4mlArchitecturePartAnswer) =>
      `parts.${index}.${name}` as const;
    addIdentifierIssue(issues, field("id"), part.id);
    addTextIssue(issues, field("name"), part.name);
    addTextIssue(issues, field("responsibility"), part.responsibility);
    addTextIssue(issues, field("technology"), part.technology);
    if (elementIds.has(part.id)) {
      addReferenceIssue(issues, field("id"), `The identifier ${part.id} is already used.`);
    }
    elementIds.add(part.id);
  });

  const partIds = new Set(answers.parts.map(({ id }) => id));
  if (!partIds.has(answers.entryPartId)) {
    addReferenceIssue(
      issues,
      "entryPartId",
      "Choose one of the listed runnable parts as the first contact.",
    );
  }
  const relationshipIds = new Set([answers.relationshipId]);
  answers.connections.forEach((connection, index) => {
    const field = (name: keyof C4mlArchitectureConnectionAnswer) =>
      `connections.${index}.${name}` as const;
    addIdentifierIssue(issues, field("id"), connection.id);
    addTextIssue(issues, field("intent"), connection.intent);
    addTextIssue(issues, field("protocol"), connection.protocol);
    if (relationshipIds.has(connection.id)) {
      addReferenceIssue(
        issues,
        field("id"),
        `The connection identifier ${connection.id} is already used.`,
      );
    }
    relationshipIds.add(connection.id);
    if (!partIds.has(connection.fromId)) {
      addReferenceIssue(issues, field("fromId"), "Choose a listed source part.");
    }
    if (!partIds.has(connection.toId)) {
      addReferenceIssue(issues, field("toId"), "Choose a listed target part.");
    }
    if (connection.fromId === connection.toId) {
      addReferenceIssue(
        issues,
        field("toId"),
        "Source and target must be different parts.",
      );
    }
  });
  return issues;
}

function declaration(
  kind: string,
  id: string,
  properties: readonly (readonly [string, string])[],
): string[] {
  return [
    `  ${kind} ${id} {`,
    ...properties.map(([name, value]) => `    ${name} = ${value}`),
    "  }",
  ];
}

function addIdentifierIssue(
  issues: C4mlWizardIssue[],
  field: C4mlSystemContextWizardField,
  value: string,
): void {
  if (!/^[_A-Za-z][\-_A-Za-z0-9]*$/.test(value)) {
    issues.push({
      field,
      code: "C4ML-WIZARD-001",
      message: "Use letters, numbers, hyphens, or underscores; start with a letter.",
    });
  }
}

function addTextIssue(
  issues: C4mlWizardIssue[],
  field: C4mlSystemContextWizardField,
  value: string,
): void {
  if (value.trim().length === 0) {
    issues.push({
      field,
      code: "C4ML-WIZARD-002",
      message: "Please add a short answer.",
    });
  }
}

function addReferenceIssue(
  issues: C4mlWizardIssue[],
  field: C4mlSystemContextWizardField,
  message: string,
): void {
  issues.push({ field, code: "C4ML-WIZARD-003", message });
}

function quote(value: string): string {
  return JSON.stringify(value);
}
