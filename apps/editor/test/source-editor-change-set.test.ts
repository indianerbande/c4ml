import { describe, expect, it } from "vitest";

import { createProposedSourceChangeSet } from "@c4ml/compiler-core";

import {
  applySourceChangeSetAsSingleUndo,
  type SourceEditorChangeSetHost,
} from "../src/app/source-editor-change-set.js";

describe("source-editor change-set adapter", () => {
  it("applies every edit in one editor operation bounded by undo stops", () => {
    let source = 'person caretaker { name = "Caretaker" }';
    const original = source;
    const events: string[] = [];
    const beforeOperations: string[] = [];
    const changeSet = createProposedSourceChangeSet(source, {
      id: "rename-caretaker",
      intent: {
        id: "authoring:rename",
        kind: "architecture",
        summary: "Rename the caretaker.",
      },
      affectedIds: ["caretaker"],
      edits: [
        {
          startOffset: source.indexOf("caretaker"),
          endOffset: source.indexOf("caretaker") + "caretaker".length,
          text: "coordinator",
        },
        {
          startOffset: source.indexOf('"Caretaker"'),
          endOffset: source.indexOf('"Caretaker"') + '"Caretaker"'.length,
          text: '"Coordinator"',
        },
      ],
    });
    const host: SourceEditorChangeSetHost = {
      source: () => source,
      pushUndoStop: () => events.push("stop"),
      executeEdits: (edits) => {
        events.push("execute");
        beforeOperations.push(source);
        for (const edit of [...edits].reverse()) {
          source =
            source.slice(0, edit.startOffset) +
            edit.text +
            source.slice(edit.endOffset);
        }
        return true;
      },
    };

    const application = applySourceChangeSetAsSingleUndo(changeSet, host);

    expect(application).toMatchObject({ applied: true, source });
    expect(events).toEqual(["stop", "execute", "stop"]);
    expect(beforeOperations).toEqual([original]);
    expect(source).toBe('person coordinator { name = "Coordinator" }');
    source = beforeOperations.pop()!;
    expect(source).toBe(original);
  });

  it("rejects a stale change before touching the editor undo stack", () => {
    const original = "system garden {}";
    const changeSet = createProposedSourceChangeSet(original, {
      id: "rename",
      intent: {
        id: "authoring:rename",
        kind: "architecture",
        summary: "Rename Garden.",
      },
      affectedIds: ["garden"],
      edits: [{ startOffset: 7, endOffset: 13, text: "park" }],
    });
    const events: string[] = [];
    const result = applySourceChangeSetAsSingleUndo(changeSet, {
      source: () => `${original}\n`,
      pushUndoStop: () => events.push("stop"),
      executeEdits: () => {
        events.push("execute");
        return true;
      },
    });

    expect(result).toMatchObject({
      applied: false,
      reason: "invalid",
      issues: [{ code: "C4ML-SOURCE-CHANGE-002" }],
    });
    expect(events).toEqual([]);
  });
});
