import { describe, expect, it } from "vitest";
import { applySourceEditorProjectEdit } from "../src/app/source-editor-project-edit.js";

function entry(before: string) {
  return {
    before, after: `${before}!`, value: before, revision: 0, writes: 0,
    read() { return this.value; },
    version() { return this.revision; },
    apply() { this.value = this.after; this.revision++; this.writes++; },
    undo() { this.value = this.before; this.revision++; },
    redo() { this.value = this.after; this.revision++; },
  };
}

describe("project editor batch", () => {
  it("changes and undoes all models together", () => {
    const entries = [entry("model"), entry("view")];
    const application = applySourceEditorProjectEdit(entries);
    expect(entries.map((e) => e.value)).toEqual(["model!", "view!"]);
    expect(application?.undo()).toBe(true);
    expect(entries.map((e) => e.value)).toEqual(["model", "view"]);
    expect(application?.undo()).toBe(false);
    expect(application?.redo()).toBe(true);
    expect(entries.map((e) => e.value)).toEqual(["model!", "view!"]);
    expect(application?.redo()).toBe(false);
  });
  it("rejects a stale model before any write and foreign history before any undo", () => {
    const entries = [entry("model"), entry("view")];
    entries[1]!.value = "foreign";
    expect(applySourceEditorProjectEdit(entries)).toBeUndefined();
    expect(entries.map((e) => e.writes)).toEqual([0, 0]);
    entries[1]!.value = "view";
    const application = applySourceEditorProjectEdit(entries);
    entries[1]!.revision++;
    expect(application?.undo()).toBe(false);
    expect(entries.map((e) => e.value)).toEqual(["model!", "view!"]);
    expect(application?.synchronize()).toBe(true);
    expect(application?.undo()).toBe(true);
  });
  it("rolls back a later rejected edit without leaving a partial project", () => {
    const entries = [entry("model"), entry("view")];
    entries[1]!.apply = () => { throw new Error("rejected"); };
    expect(applySourceEditorProjectEdit(entries)).toBeUndefined();
    expect(entries.map((e) => e.value)).toEqual(["model", "view"]);
  });
});
