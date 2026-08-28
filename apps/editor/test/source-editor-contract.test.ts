import { describe, expect, it } from "vitest";

import {
  sourceEditorCompletion,
  sourceEditorMarkers,
} from "../src/app/source-editor.contract.js";

describe("C4ML source-editor contract", () => {
  it("preserves an exact worker completion edit while converting positions", () => {
    expect(
      sourceEditorCompletion({
        id: "draft-1:ViewTypeProperty:value:deployment",
        label: "deployment",
        kind: "value",
        detail: "Value allowed for the current property",
        documentation: "Selects a C4 Deployment View.",
        edit: {
          text: "deployment",
          range: {
            start: { offset: 18, line: 2, column: 9 },
            end: { offset: 21, line: 2, column: 12 },
          },
        },
      }),
    ).toEqual({
      id: "draft-1:ViewTypeProperty:value:deployment",
      label: "deployment",
      kind: "value",
      detail: "Value allowed for the current property",
      documentation: "Selects a C4 Deployment View.",
      insertText: "deployment",
      range: {
        startLineNumber: 3,
        startColumn: 10,
        endLineNumber: 3,
        endColumn: 13,
      },
    });
  });

  it("maps source diagnostics and ignores diagnostics without a source range", () => {
    expect(
      sourceEditorMarkers([
        {
          code: "C4ML-LANG-003",
          severity: "error",
          message: "Unknown element.",
          correction: "Reference a declared element.",
          source: {
            file: "editor.c4ml",
            start: { offset: 40, line: 4, column: 3 },
            end: { offset: 47, line: 4, column: 10 },
          },
        },
        {
          code: "C4ML-EDITOR-001",
          severity: "error",
          message: "Worker stopped.",
          correction: undefined,
          source: undefined,
        },
      ]),
    ).toEqual([
      {
        code: "C4ML-LANG-003",
        severity: "error",
        message: "Unknown element.",
        correction: "Reference a declared element.",
        range: {
          startLineNumber: 5,
          startColumn: 4,
          endLineNumber: 5,
          endColumn: 11,
        },
      },
    ]);
  });
});
