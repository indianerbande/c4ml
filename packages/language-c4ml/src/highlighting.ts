import type { SourcePosition, SourceRange } from "@c4ml/compiler-core";

import {
  createC4mlDraftServices,
  type C4mlDraftServices,
} from "./services.js";

export type C4mlHighlightKind =
  | "comment"
  | "identifier"
  | "keyword"
  | "number"
  | "operator"
  | "string";

export interface C4mlHighlight {
  readonly kind: C4mlHighlightKind;
  readonly range: SourceRange;
}

const operatorImages = new Set(["{", "}", "[", "]", "(", ")", "=", ",", "-"]);
let highlightingServices: C4mlDraftServices | undefined;

/**
 * Returns editor-neutral syntax spans from the authoritative C4ML lexer.
 * Invalid or incomplete source still yields every token the lexer can recover.
 */
export function highlightC4mlDraft(source: string): readonly C4mlHighlight[] {
  highlightingServices ??= createC4mlDraftServices();
  const result = highlightingServices.language.parser.Lexer.tokenize(source);
  const lineStarts = buildLineStarts(source);

  return [...result.tokens, ...result.hidden]
    .sort((left, right) => left.startOffset - right.startOffset)
    .flatMap((token) => {
      const endOffset = token.endOffset;
      if (endOffset === undefined) {
        return [];
      }
      return splitAcrossLines(
        source,
        token.startOffset,
        endOffset + 1,
        highlightKind(token.tokenType.name, token.image),
        lineStarts,
      );
    });
}

function highlightKind(tokenName: string, image: string): C4mlHighlightKind {
  switch (tokenName) {
    case "ID":
      return "identifier";
    case "INT":
      return "number";
    case "LINE_COMMENT":
      return "comment";
    case "STRING":
      return "string";
    default:
      return operatorImages.has(image) ? "operator" : "keyword";
  }
}

function splitAcrossLines(
  source: string,
  startOffset: number,
  endOffset: number,
  kind: C4mlHighlightKind,
  lineStarts: readonly number[],
): readonly C4mlHighlight[] {
  const highlights: C4mlHighlight[] = [];
  let spanStart = startOffset;

  for (let offset = startOffset; offset < endOffset; offset += 1) {
    const character = source[offset];
    if (character !== "\n" && character !== "\r") {
      continue;
    }
    if (spanStart < offset) {
      highlights.push(toHighlight(kind, spanStart, offset, lineStarts));
    }
    if (character === "\r" && source[offset + 1] === "\n") {
      offset += 1;
    }
    spanStart = offset + 1;
  }

  if (spanStart < endOffset) {
    highlights.push(toHighlight(kind, spanStart, endOffset, lineStarts));
  }
  return highlights;
}

function toHighlight(
  kind: C4mlHighlightKind,
  startOffset: number,
  endOffset: number,
  lineStarts: readonly number[],
): C4mlHighlight {
  return {
    kind,
    range: {
      start: positionAt(startOffset, lineStarts),
      end: positionAt(endOffset, lineStarts),
    },
  };
}

function buildLineStarts(source: string): readonly number[] {
  const starts = [0];
  for (let offset = 0; offset < source.length; offset += 1) {
    if (source[offset] === "\n") {
      starts.push(offset + 1);
    } else if (source[offset] === "\r") {
      starts.push(source[offset + 1] === "\n" ? offset + 2 : offset + 1);
      if (source[offset + 1] === "\n") {
        offset += 1;
      }
    }
  }
  return starts;
}

function positionAt(
  offset: number,
  lineStarts: readonly number[],
): SourcePosition {
  let low = 0;
  let high = lineStarts.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if ((lineStarts[middle] ?? 0) > offset) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }
  const line = Math.max(0, low - 1);
  return {
    offset,
    line,
    column: offset - (lineStarts[line] ?? 0),
  };
}
