import { c4mlDraftLanguageVersion } from "./language.js";

export type C4mlDraftClassification = "external" | "internal";
export type C4mlDraftFlowDirection = "down" | "left" | "right" | "up";

export interface C4mlSystemContextWizardAnswers {
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
  readonly viewId: string;
  readonly viewTitle: string;
  readonly viewPurpose: string;
  readonly flow: C4mlDraftFlowDirection;
}

export type C4mlSystemContextWizardField =
  keyof C4mlSystemContextWizardAnswers;

export interface C4mlWizardIssue {
  readonly field: C4mlSystemContextWizardField;
  readonly code: "C4ML-WIZARD-001" | "C4ML-WIZARD-002";
  readonly message: string;
}

export interface C4mlSystemContextWizardResult {
  readonly languageVersion: typeof c4mlDraftLanguageVersion;
  readonly valid: boolean;
  readonly source: string | undefined;
  readonly issues: readonly C4mlWizardIssue[];
}

export const defaultSystemContextWizardAnswers: C4mlSystemContextWizardAnswers = {
  personId: "observer",
  personName: "Field Observer",
  personResponsibility: "Reviews field notes and records follow-up decisions.",
  personClassification: "external",
  systemId: "field-notes",
  systemName: "Field Notes",
  systemResponsibility: "Keeps observations and makes reviewed notes available.",
  systemClassification: "internal",
  relationshipId: "observer-reads-notes",
  relationshipIntent: "Reads reviewed notes and records follow-up decisions.",
  viewId: "field-notes-context",
  viewTitle: "System Context — Field Notes",
  viewPurpose: "Show who uses Field Notes and why.",
  flow: "right",
};

const identifierFields: readonly C4mlSystemContextWizardField[] = [
  "personId",
  "systemId",
  "relationshipId",
  "viewId",
];

const textFields: readonly C4mlSystemContextWizardField[] = [
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
    `  person ${answers.personId} {`,
    `    name = ${quote(answers.personName)}`,
    `    responsibility = ${quote(answers.personResponsibility)}`,
    `    classification = ${answers.personClassification}`,
    "  }",
    "",
    `  system ${answers.systemId} {`,
    `    name = ${quote(answers.systemName)}`,
    `    responsibility = ${quote(answers.systemResponsibility)}`,
    `    classification = ${answers.systemClassification}`,
    "  }",
    "}",
    "",
    "relations {",
    `  relation ${answers.relationshipId} {`,
    `    from = ${answers.personId}`,
    `    to = ${answers.systemId}`,
    `    intent = ${quote(answers.relationshipIntent)}`,
    "  }",
    "}",
    "",
    `view ${answers.viewId} {`,
    "  type = system-context",
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
  for (const field of identifierFields) {
    const value = answers[field];
    if (!/^[_A-Za-z][\-_A-Za-z0-9]*$/.test(value)) {
      issues.push({
        field,
        code: "C4ML-WIZARD-001",
        message: `${field} must be a stable C4ML identifier.`,
      });
    }
  }
  for (const field of textFields) {
    if (answers[field].trim().length === 0) {
      issues.push({
        field,
        code: "C4ML-WIZARD-002",
        message: `${field} must not be empty.`,
      });
    }
  }
  return issues;
}

function quote(value: string): string {
  return JSON.stringify(value);
}
