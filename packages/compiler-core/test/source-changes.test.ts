import { describe, expect, it } from "vitest";

import {
  applySourceChangeSet,
  createProposedSourceChangeSet,
  createSourceRevision,
  previewSourceChangeSet,
  type ProposedSourceChangeSet,
} from "../src/index.js";

describe("portable source change sets", () => {
  it("creates a deterministic revision and applies canonical non-overlapping edits", () => {
    const source = "model {\n  person grower\n}\n";
    const nameStart = source.indexOf("grower");
    const nameEnd = nameStart + "grower".length;
    const changeSet = createProposedSourceChangeSet(source, {
      id: "add-responsibility",
      intent: {
        id: "authoring:add-responsibility",
        kind: "architecture",
        summary: "Add the Grower responsibility.",
      },
      affectedIds: ["grower", "garden", "grower"],
      edits: [
        {
          startOffset: nameEnd,
          endOffset: nameEnd,
          text: " {\n    responsibility = \"Plans gardens.\"\n  }",
        },
        { startOffset: nameStart, endOffset: nameEnd, text: "gardener" },
      ],
    });

    expect(changeSet.baseRevision).toEqual(createSourceRevision(source));
    expect(changeSet.affectedIds).toEqual(["garden", "grower"]);
    expect(changeSet.edits.map(({ startOffset }) => startOffset)).toEqual([
      nameStart,
      nameEnd,
    ]);
    expect(applySourceChangeSet(source, changeSet)).toMatchObject({
      valid: true,
      source:
        "model {\n  person gardener {\n    responsibility = \"Plans gardens.\"\n  }\n}\n",
    });
  });

  it("rejects a stale source revision without changing either source", () => {
    const source = "view garden {}";
    const changeSet = createProposedSourceChangeSet(source, {
      id: "rename-view",
      intent: {
        id: "authoring:rename",
        kind: "architecture",
        summary: "Rename the view.",
      },
      affectedIds: ["garden"],
      edits: [{ startOffset: 5, endOffset: 11, text: "signal-garden" }],
    });

    const result = applySourceChangeSet(`${source}\n`, changeSet);

    expect(result).toEqual({
      valid: false,
      issues: [{
        code: "C4ML-SOURCE-CHANGE-002",
        message: "The proposed source change was created for another source revision.",
      }],
    });
    expect(source).toBe("view garden {}");
  });

  it("rejects overlapping edits with a stable issue", () => {
    const source = "abcdef";
    const changeSet: ProposedSourceChangeSet = {
      version: 1,
      id: "overlap",
      baseRevision: createSourceRevision(source),
      intent: { id: "layout:nudge", kind: "layout", summary: "Nudge an item." },
      affectedIds: ["item"],
      edits: [
        { startOffset: 1, endOffset: 4, text: "x" },
        { startOffset: 3, endOffset: 5, text: "y" },
      ],
    };

    expect(applySourceChangeSet(source, changeSet)).toMatchObject({
      valid: false,
      issues: [{ code: "C4ML-SOURCE-CHANGE-005", editIndex: 1 }],
    });
  });

  it("previews candidate evaluation without mutating the active source", async () => {
    const source = "pin garden { x = 100du }";
    const startOffset = source.indexOf("100");
    const changeSet = createProposedSourceChangeSet(source, {
      id: "nudge-garden",
      intent: { id: "layout:nudge", kind: "layout", summary: "Move Garden right." },
      affectedIds: ["garden"],
      edits: [{ startOffset, endOffset: startOffset + 3, text: "116" }],
    });

    const preview = await previewSourceChangeSet(
      source,
      changeSet,
      (candidate) => ({ accepted: candidate.includes("116du") }),
    );

    expect(preview).toMatchObject({
      valid: true,
      source: "pin garden { x = 116du }",
      evaluation: { accepted: true },
    });
    expect(source).toBe("pin garden { x = 100du }");
  });
});
