import type { SourceReference } from "./source.js";
import { compareText } from "./ordering.js";

export type DiagnosticSeverity = "error" | "information" | "warning";

export interface RelatedDiagnosticInformation {
  readonly message: string;
  readonly source: SourceReference;
}

export interface Diagnostic {
  readonly code: string;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly source: SourceReference;
  readonly related: readonly RelatedDiagnosticInformation[];
  readonly correction?: string;
}

export interface DiagnosticInput {
  readonly code: string;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly source: SourceReference;
  readonly related?: readonly RelatedDiagnosticInformation[];
  readonly correction?: string;
}

export function createDiagnostic(input: DiagnosticInput): Diagnostic {
  return {
    code: input.code,
    severity: input.severity,
    message: input.message,
    source: input.source,
    related: input.related ?? [],
    ...(input.correction === undefined
      ? {}
      : { correction: input.correction }),
  };
}

export function hasErrors(diagnostics: readonly Diagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}

export function sortDiagnostics(
  diagnostics: readonly Diagnostic[],
): Diagnostic[] {
  return [...diagnostics].sort((left, right) => {
    return (
      compareText(left.source.file, right.source.file) ||
      left.source.range.start.offset - right.source.range.start.offset ||
      compareText(left.code, right.code) ||
      compareText(left.message, right.message)
    );
  });
}
