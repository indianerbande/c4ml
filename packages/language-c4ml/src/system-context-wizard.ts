import { c4mlDraftLanguageVersion } from "./language.js";

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

export const defaultSystemContextWizardAnswers: C4mlSystemContextWizardAnswers = {
  viewKind: "system-context",
  personId: "observer",
  personName: "Field Observer",
  personResponsibility: "Reviews field notes and records follow-up decisions.",
  personClassification: "external",
  systemId: "field-notes",
  systemName: "Field Notes",
  systemResponsibility: "Keeps observations and makes reviewed notes available.",
  systemClassification: "internal",
  relationshipId: "observer-uses-field-notes",
  relationshipIntent: "Reads reviewed notes and records follow-up decisions.",
  entryPartId: "field-notes-ui",
  parts: [
    {
      id: "field-notes-ui",
      name: "Field Notes Interface",
      responsibility: "Presents reviewed notes and accepts follow-up decisions.",
      technology: "Web application",
    },
    {
      id: "field-notes-service",
      name: "Field Notes Service",
      responsibility: "Processes observations and follow-up decisions.",
      technology: "Application service",
    },
    {
      id: "field-notes-store",
      name: "Field Notes Store",
      responsibility: "Stores observations, notes, and decisions.",
      technology: "Database",
    },
  ],
  connections: [
    {
      id: "interface-requests-service",
      fromId: "field-notes-ui",
      toId: "field-notes-service",
      intent: "Requests and updates reviewed field notes",
      protocol: "HTTPS/JSON",
    },
    {
      id: "service-writes-store",
      fromId: "field-notes-service",
      toId: "field-notes-store",
      intent: "Stores observations and decisions",
      protocol: "Database protocol",
    },
  ],
  viewId: "field-notes-context",
  viewTitle: "System Context — Field Notes",
  viewPurpose: "Show who uses Field Notes and why.",
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
          ...declaration(`container`, `${part.id} inside ${answers.systemId}`, [
            ["name", quote(part.name)],
            ["responsibility", quote(part.responsibility)],
            ["technology", quote(part.technology)],
          ]),
        ])
      : []),
    "}",
    "",
    "relations {",
    ...declaration("relation", answers.relationshipId, [
      ["from", answers.personId],
      [
        "to",
        answers.viewKind === "container"
          ? answers.entryPartId
          : answers.systemId,
      ],
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
    "}",
    "",
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
    "",
  ].join("\n");

  return {
    languageVersion: c4mlDraftLanguageVersion,
    valid: true,
    source,
    issues: [],
  };
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
