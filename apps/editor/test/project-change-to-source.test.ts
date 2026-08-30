import { describe, expect, it } from "vitest";

import {
  createArchitectureProjectInput,
  createProposedProjectSourceChangeSet,
} from "@c4ml/compiler-core";

import { projectChangeToSourceChange } from "../src/app/project-change-to-source.js";

describe("project change to source adapter", () => {
  const source = "view context { flow = right }";
  const project = createArchitectureProjectInput({
    id: "garden",
    documents: [{ uri: "views/context.c4ml", text: source }],
  });

  it("preserves intent and narrows document-addressed edits", () => {
    const projectChange = createProposedProjectSourceChangeSet(project, {
      id: "move-garden",
      intent: { id: "placement", kind: "layout", summary: "Move Garden." },
      affectedIds: ["garden"],
      edits: [
        {
          documentUri: "views/context.c4ml",
          startOffset: source.indexOf("right"),
          endOffset: source.indexOf("right") + 5,
          text: "down",
        },
      ],
    });

    const result = projectChangeToSourceChange(
      projectChange,
      "views/context.c4ml",
      source,
    );

    expect(result).toMatchObject({
      valid: true,
      changeSet: {
        id: "move-garden",
        intent: { kind: "layout" },
        affectedIds: ["garden"],
        edits: [{ text: "down" }],
      },
    });
  });

  it("refuses to split one transaction across Monaco models", () => {
    const other = "view container {}";
    const multiProject = createArchitectureProjectInput({
      id: "garden",
      documents: [
        { uri: "views/context.c4ml", text: source },
        { uri: "views/container.c4ml", text: other },
      ],
    });
    const projectChange = createProposedProjectSourceChangeSet(multiProject, {
      id: "two-files",
      intent: { id: "placement", kind: "layout", summary: "Move two nodes." },
      affectedIds: ["garden", "api"],
      edits: [
        { documentUri: "views/context.c4ml", startOffset: 0, endOffset: 0, text: "// one\n" },
        { documentUri: "views/container.c4ml", startOffset: 0, endOffset: 0, text: "// two\n" },
      ],
    });

    expect(
      projectChangeToSourceChange(
        projectChange,
        "views/context.c4ml",
        source,
      ),
    ).toEqual({ valid: false, reason: "different-document" });
  });
});
