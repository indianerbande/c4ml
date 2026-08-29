import type {
  CompilerWorkerDiagnostic,
  CompletionWorkerCandidate,
  HighlightWorkerSpan,
} from "./compiler-worker.protocol.js";

export type SourceEditorCompletionProvider = (
  source: string,
  offset: number,
) => Promise<readonly CompletionWorkerCandidate[]>;

export type SourceEditorHighlightProvider = (
  source: string,
) => Promise<readonly HighlightWorkerSpan[]>;

export const sourceEditorSemanticTokenTypes = [
  "comment",
  "variable",
  "keyword",
  "number",
  "operator",
  "string",
  "declaration",
  "property",
  "value",
] as const;

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

export function sourceEditorSemanticTokens(
  highlights: readonly HighlightWorkerSpan[],
): Uint32Array {
  const typeIndex = new Map<string, number>(
    sourceEditorSemanticTokenTypes.map((type, index) => [type, index]),
  );
  const data: number[] = [];
  let previousLine = 0;
  let previousColumn = 0;

  for (const highlight of highlights) {
    const start = highlight.range.start;
    const end = highlight.range.end;
    if (start.line !== end.line || end.column <= start.column) {
      continue;
    }
    const semanticType =
      highlight.kind === "identifier" ? "variable" : highlight.kind;
    const tokenType = typeIndex.get(semanticType);
    if (tokenType === undefined) {
      continue;
    }
    const deltaLine = start.line - previousLine;
    const deltaColumn =
      deltaLine === 0 ? start.column - previousColumn : start.column;
    data.push(
      deltaLine,
      deltaColumn,
      end.column - start.column,
      tokenType,
      0,
    );
    previousLine = start.line;
    previousColumn = start.column;
  }
  return Uint32Array.from(data);
}
