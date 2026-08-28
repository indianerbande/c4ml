import type {
  CompilerWorkerDiagnostic,
  CompletionWorkerCandidate,
} from "./compiler-worker.protocol.js";

export type SourceEditorCompletionProvider = (
  source: string,
  offset: number,
) => Promise<readonly CompletionWorkerCandidate[]>;

export interface SourceEditorRange {
  readonly startLineNumber: number;
  readonly startColumn: number;
  readonly endLineNumber: number;
  readonly endColumn: number;
}

export interface SourceEditorCompletion {
  readonly id: string;
  readonly label: string;
  readonly kind: CompletionWorkerCandidate["kind"];
  readonly detail: string;
  readonly documentation: string | undefined;
  readonly insertText: string;
  readonly range: SourceEditorRange;
}

export interface SourceEditorMarker {
  readonly code: string;
  readonly severity: CompilerWorkerDiagnostic["severity"];
  readonly message: string;
  readonly correction: string | undefined;
  readonly range: SourceEditorRange;
}

export function sourceEditorCompletion(
  candidate: CompletionWorkerCandidate,
): SourceEditorCompletion {
  return {
    id: candidate.id,
    label: candidate.label,
    kind: candidate.kind,
    detail: candidate.detail,
    documentation: candidate.documentation,
    insertText: candidate.edit.text,
    range: {
      startLineNumber: candidate.edit.range.start.line + 1,
      startColumn: candidate.edit.range.start.column + 1,
      endLineNumber: candidate.edit.range.end.line + 1,
      endColumn: candidate.edit.range.end.column + 1,
    },
  };
}

export function sourceEditorMarkers(
  diagnostics: readonly CompilerWorkerDiagnostic[],
): readonly SourceEditorMarker[] {
  return diagnostics.flatMap((diagnostic) => {
    if (diagnostic.source === undefined) {
      return [];
    }
    return [
      {
        code: diagnostic.code,
        severity: diagnostic.severity,
        message: diagnostic.message,
        correction: diagnostic.correction,
        range: {
          startLineNumber: diagnostic.source.start.line + 1,
          startColumn: diagnostic.source.start.column + 1,
          endLineNumber: diagnostic.source.end.line + 1,
          endColumn: diagnostic.source.end.column + 1,
        },
      },
    ];
  });
}
