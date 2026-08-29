import { describe, expect, it } from "vitest";

import { applySourceChangeSet } from "@c4ml/compiler-core";

import { proposeC4mlElementPropertyChange } from "../src/index.js";

const source = `c4ml draft-1

// This comment and the unusual spacing are intentionally preserved.
model {
  person caretaker {
    name = "Garden Caretaker" // keep this comment
    responsibility   =   "Reviews cultivation signals."
    classification = external
  }

  system garden-pulse {
    name = "Garden Pulse"
    responsibility = "Keeps the work plan."
    classification = internal
  }
}

view garden-context {
  type = system-context
  scope = garden-pulse
  title = "Garden context"
  purpose = "Show the unchanged view."
  audience = default
  legend = generated
}
`;

describe("syntax-aware C4ML authoring edits", () => {
  it("replaces one AST-owned property value and preserves every unrelated byte", async () => {
    const proposal = await proposeC4mlElementPropertyChange(source, {
      id: "rename-caretaker",
      elementKind: "person",
      elementId: "caretaker",
      property: "name",
      value: "Garden Coordinator",
      intent: {
        id: "authoring:rename-display-name",
        kind: "architecture",
        summary: "Rename the caretaker display name.",
      },
    });

    expect(proposal.valid).toBe(true);
    if (!proposal.valid) return;
    const application = applySourceChangeSet(source, proposal.changeSet);
    expect(application.valid).toBe(true);
    if (!application.valid) return;
    expect(application.source).toBe(
      source.replace(
        'name = "Garden Caretaker"',
        'name = "Garden Coordinator"',
      ),
    );
    expect(application.source).toContain("// keep this comment");
    expect(application.source).toContain(
      'responsibility   =   "Reviews cultivation signals."',
    );
    expect(application.source).toContain("view garden-context {");
    expect(proposal.changeSet.affectedIds).toEqual(["caretaker"]);
  });

  it("rejects missing owners, missing properties, and invalid classifications", async () => {
    const base = {
      id: "change",
      elementKind: "person" as const,
      property: "name" as const,
      value: "Changed",
      intent: {
        id: "authoring:test",
        kind: "architecture" as const,
        summary: "Test a source change.",
      },
    };
    expect(
      await proposeC4mlElementPropertyChange(source, {
        ...base,
        elementId: "missing",
      }),
    ).toMatchObject({
      valid: false,
      issues: [{ code: "C4ML-AUTHORING-002" }],
    });
    expect(
      await proposeC4mlElementPropertyChange(source, {
        ...base,
        elementId: "caretaker",
        property: "technology",
      }),
    ).toMatchObject({
      valid: false,
      issues: [{ code: "C4ML-AUTHORING-003" }],
    });
    expect(
      await proposeC4mlElementPropertyChange(source, {
        ...base,
        elementId: "caretaker",
        property: "classification",
        value: "sometimes",
      }),
    ).toMatchObject({
      valid: false,
      issues: [{ code: "C4ML-AUTHORING-004" }],
    });
  });
});
