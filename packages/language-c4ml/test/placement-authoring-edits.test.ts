import { describe, expect, it } from "vitest";

import {
  applyProjectSourceChangeSet,
  createArchitectureProjectInput,
} from "@c4ml/compiler-core";

import { parseC4mlProjectDraft, proposeC4mlPlacementEdit } from "../src/index.js";

const model = `c4ml draft-1

model {
  person gardener {
    name = "Gardener"
    responsibility = "Plans the garden."
    classification = external
  }
  system garden {
    name = "Garden"
    responsibility = "Keeps the plan."
    classification = internal
  }
  system sensor {
    name = "Sensor"
    responsibility = "Reports observations."
    classification = external
  }
}
`;

const view = `c4ml draft-1

view garden-context {
  type = system-context
  scope = garden
  title = "Garden context"
  purpose = "Shows garden planning."
  audience = default
  legend = generated

  layout {
    flow = right
    // This route-adjacent comment must survive placement edits.
  }
}
`;

const project = createArchitectureProjectInput({
  id: "garden-project",
  documents: [
    { uri: "model.c4ml", text: model },
    { uri: "views/context.c4ml", text: view },
  ],
});

describe("syntax-aware placement authoring edits", () => {
  it.each([
    {
      name: "relative intent",
      operation: {
        kind: "relative" as const,
        subjectId: "gardener",
        anchorId: "garden",
        relation: "left-of" as const,
        gap: "normal" as const,
        strength: "hard" as const,
      },
      expected: "place gardener left-of garden",
    },
    {
      name: "automatic-relative nudge",
      operation: {
        kind: "nudge" as const,
        targetId: "garden",
        direction: "up" as const,
        distance: "small" as const,
        strength: "soft" as const,
      },
      expected: "move = up small",
    },
    {
      name: "anchored alignment",
      operation: {
        kind: "align" as const,
        itemIds: ["gardener", "garden"],
        alignment: "top" as const,
        anchorId: "garden",
        strength: "hard" as const,
      },
      expected: "align top [gardener, garden]",
    },
    {
      name: "ordered distribution",
      operation: {
        kind: "distribute" as const,
        itemIds: ["gardener", "garden", "sensor"],
        orientation: "horizontal" as const,
        gap: "small" as const,
        strength: "soft" as const,
      },
      expected: "distribute horizontal [gardener, garden, sensor]",
    },
    {
      name: "exact fallback pin",
      operation: {
        kind: "pin" as const,
        targetId: "garden",
        x: 320,
        y: 96,
        strength: "hard" as const,
      },
      expected: "x = 320 du",
    },
  ])("creates one project-addressed $name change", async ({ operation, expected }) => {
    const proposal = await proposeC4mlPlacementEdit(project, {
      id: `placement-${operation.kind}`,
      viewId: "garden-context",
      intent: {
        id: `layout:${operation.kind}`,
        kind: "layout",
        summary: "Arrange selected garden elements.",
      },
      operation,
    });

    expect(proposal.valid).toBe(true);
    if (!proposal.valid) return;
    expect(proposal.documentUri).toBe("views/context.c4ml");
    expect(proposal.changeSet.edits).toHaveLength(1);
    expect(proposal.proposedText).toContain(expected);
    const application = applyProjectSourceChangeSet(project, proposal.changeSet);
    expect(application.valid).toBe(true);
    if (!application.valid) return;
    const changed = application.project.documents.find(
      ({ uri }) => uri === "views/context.c4ml",
    )!.text;
    expect(changed).toContain(expected);
    expect(changed).toContain("route-adjacent comment");
    expect((await parseC4mlProjectDraft(application.project)).valid).toBe(true);
  });

  it("replaces an obsolete adjustment without disturbing neighboring controls", async () => {
    const adjustedProject = createArchitectureProjectInput({
      id: project.id,
      documents: project.documents.map((document) => ({
        uri: document.uri,
        text:
          document.uri === "views/context.c4ml"
            ? document.text.replace(
                "    // This route-adjacent comment",
                "    adjust garden {\n      relative-to = automatic\n      move = down tiny\n      strength = soft\n    }\n    // This route-adjacent comment",
              )
            : document.text,
      })),
    });
    const proposal = await proposeC4mlPlacementEdit(adjustedProject, {
      id: "nudge-garden",
      viewId: "garden-context",
      intent: { id: "layout:nudge", kind: "layout", summary: "Nudge garden." },
      operation: {
        kind: "nudge",
        targetId: "garden",
        direction: "right",
        distance: "normal",
        strength: "hard",
      },
    });
    expect(proposal.valid).toBe(true);
    if (!proposal.valid) return;
    const application = applyProjectSourceChangeSet(adjustedProject, proposal.changeSet);
    expect(application.valid).toBe(true);
    if (!application.valid) return;
    const changed = application.project.documents.find(
      ({ uri }) => uri === "views/context.c4ml",
    )!.text;
    expect(changed.match(/adjust garden/gu)).toHaveLength(1);
    expect(changed).toContain("move = right normal");
    expect(changed).not.toContain("move = down tiny");
    expect(changed).toContain("route-adjacent comment");
  });

  it("preserves indentation and line separation when replacing an exact pin", async () => {
    const pinnedProject = createArchitectureProjectInput({
      id: project.id,
      documents: project.documents.map((document) => ({
        uri: document.uri,
        text:
          document.uri === "views/context.c4ml"
            ? document.text.replace(
                "    // This route-adjacent comment",
                "    align top [gardener, garden] {\n      anchor = garden\n      strength = soft\n    }\n\n    adjust sensor {\n      relative-to = automatic\n      move = down tiny\n      strength = soft\n    }\n\n    pin garden {\n      x = 320 du\n      y = 96 du\n      strength = hard\n    }\n\n    avoidance garden-clearance {\n      strength = soft\n      around = garden\n      padding = 12\n    }\n    // This route-adjacent comment",
              )
            : document.text,
      })),
    });
    const proposal = await proposeC4mlPlacementEdit(pinnedProject, {
      id: "place-garden",
      viewId: "garden-context",
      intent: { id: "layout:relative", kind: "layout", summary: "Place garden." },
      operation: {
        kind: "relative",
        subjectId: "garden",
        anchorId: "gardener",
        relation: "right-of",
        gap: "small",
        strength: "soft",
      },
    });
    expect(proposal.valid).toBe(true);
    if (!proposal.valid) return;
    const application = applyProjectSourceChangeSet(pinnedProject, proposal.changeSet);
    expect(application.valid).toBe(true);
    if (!application.valid) return;
    const changed = application.project.documents.find(
      ({ uri }) => uri === "views/context.c4ml",
    )!.text;
    expect(changed).toContain(
      "    place garden right-of gardener {\n      gap = small\n      strength = soft\n    }\n\n    align top [gardener, garden]",
    );
    expect(changed.indexOf("place garden")).toBeLessThan(
      changed.indexOf("align top"),
    );
    expect(changed).toContain("avoidance garden-clearance");
    expect((await parseC4mlProjectDraft(application.project)).valid).toBe(true);
  });

  it("rejects unsafe or under-specified operations", async () => {
    const proposal = await proposeC4mlPlacementEdit(project, {
      id: "bad-distribution",
      viewId: "garden-context",
      intent: { id: "layout:test", kind: "layout", summary: "Test." },
      operation: {
        kind: "distribute",
        itemIds: ["garden", "sensor"],
        orientation: "horizontal",
        gap: "small",
        strength: "hard",
      },
    });
    expect(proposal).toMatchObject({
      valid: false,
      issues: [{ code: "C4ML-AUTHORING-006" }],
    });
  });
});
