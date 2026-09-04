import { describe, expect, it } from "vitest";

import { SourceEditorActivationGate } from "../src/app/source-editor-activation-gate.js";

describe("source editor activation gate", () => {
  it("resolves immediately for the presented document", async () => {
    const gate = new SourceEditorActivationGate();
    gate.activated("model/systems.c4ml");

    await expect(gate.whenActive("model/systems.c4ml")).resolves.toBe(true);
  });

  it("holds callers until the requested document is presented", async () => {
    const gate = new SourceEditorActivationGate();
    gate.activated("model/systems.c4ml");
    let settled: boolean | undefined;
    const waiting = gate.whenActive("views/context.c4ml").then((active) => {
      settled = active;
      return active;
    });
    await Promise.resolve();

    expect(settled).toBeUndefined();

    gate.activated("views/context.c4ml");

    await expect(waiting).resolves.toBe(true);
  });

  it("releases callers with false when another document wins or the editor closes", async () => {
    const gate = new SourceEditorActivationGate();
    const lost = gate.whenActive("views/context.c4ml");
    gate.activated("model/systems.c4ml");

    await expect(lost).resolves.toBe(false);

    const abandoned = gate.whenActive("views/context.c4ml");
    gate.close();

    await expect(abandoned).resolves.toBe(false);
    await expect(gate.whenActive("model/systems.c4ml")).resolves.toBe(false);
  });
});
