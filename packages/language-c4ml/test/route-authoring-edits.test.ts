import { describe, expect, it } from "vitest";

import {
  applyProjectSourceChangeSet,
  createArchitectureProjectInput,
} from "@c4ml/compiler-core";

import { parseC4mlProjectDraft, proposeC4mlRouteEdit } from "../src/index.js";

const architecture = `c4ml draft-1

model {
  person caretaker {
    name = "Caretaker"
    responsibility = "Reviews the garden plan."
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

relations {
  relation caretaker-reviews-garden {
    from = caretaker
    to = garden
    intent = "Reviews the current plan"
  }
  relation sensor-reports-garden {
    from = sensor
    to = garden
    intent = "Reports current observations"
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

    corridor lower-lane {
      orientation = horizontal
      coordinate = 320
      lanes = 2
      lane-gap = 16
    }

    route caretaker-reviews-garden {
      policy = guided
      style = orthogonal
      source-port = east
      target-port = west
      guide = [
        via source-port shift (16, 0),
        lock canvas at (280, 160) to canvas at (360, 160),
        via target-port shift (-16, 0)
      ]
      // This route comment must survive Port edits.
      label-offset-x = 8du
      label-offset-y = -12du
    }

    route sensor-reports-garden {
      policy = guided
      style = orthogonal
      corridor = lower-lane
      lane = 0
    }
  }
}
`;

const project = createArchitectureProjectInput({
  id: "route-authoring",
  documents: [
    { uri: "model.c4ml", text: architecture },
    { uri: "views/context.c4ml", text: view },
  ],
});

function request(
  operation: Parameters<typeof proposeC4mlRouteEdit>[1]["operation"],
) {
  return {
    id: `route-${operation.kind}`,
    viewId: "garden-context",
    intent: {
      id: `route:${operation.kind}`,
      kind: "route" as const,
      summary: "Adjust the selected garden route.",
    },
    operation,
  };
}

async function apply(
  operation: Parameters<typeof proposeC4mlRouteEdit>[1]["operation"],
  targetProject = project,
) {
  const baseline = await parseC4mlProjectDraft(targetProject);
  expect(baseline.diagnostics).toEqual([]);
  const proposal = await proposeC4mlRouteEdit(targetProject, request(operation));
  expect(proposal).toMatchObject({ valid: true });
  if (!proposal.valid) throw new Error("Expected a valid route proposal.");
  const application = applyProjectSourceChangeSet(targetProject, proposal.changeSet);
  expect(application.valid).toBe(true);
  if (!application.valid) throw new Error("Expected an applicable route proposal.");
  const source = application.project.documents.find(
    ({ uri }) => uri === "views/context.c4ml",
  )!.text;
  expect((await parseC4mlProjectDraft(application.project)).valid).toBe(true);
  return { proposal, source };
}

describe("syntax-aware route authoring edits", () => {
  it("selects source and target Ports without rewriting unrelated route text", async () => {
    const { proposal, source } = await apply({
      kind: "ports",
      relationshipId: "caretaker-reviews-garden",
      sourcePort: "south",
      targetPort: "north",
    });

    expect(proposal.documentUri).toBe("views/context.c4ml");
    expect(proposal.changeSet.intent.kind).toBe("route");
    expect(source).toContain("source-port = south");
    expect(source).toContain("target-port = north");
    expect(source).toContain("This route comment must survive Port edits.");
    expect(source).toContain("label-offset-x = 8du");
    expect(source).toContain("label-offset-y = -12du");
  });

  it("adds a canvas waypoint and reports removal of an incompatible corridor lane", async () => {
    const { proposal, source } = await apply({
      kind: "add-waypoint",
      relationshipId: "sensor-reports-garden",
      point: { x: 420, y: 224 },
    });

    expect(source).toContain("guide = [via canvas at (420, 224)]");
    expect(source).not.toContain("corridor = lower-lane");
    expect(source).not.toContain("lane = 0");
    expect(proposal.repairs).toContainEqual({
      code: "C4ML-ROUTE-REPAIR-003",
      message: expect.stringContaining("releases the corridor lane"),
    });
  });

  it("moves a symbolic waypoint by changing its relative shift", async () => {
    const { source } = await apply({
      kind: "move-waypoint",
      relationshipId: "caretaker-reviews-garden",
      waypointIndex: 0,
      delta: { x: 0, y: -16 },
    });

    expect(source).toContain("via source-port shift (16, -16)");
    expect(source).toContain(
      "lock canvas at (280, 160) to canvas at (360, 160)",
    );
    expect(source).toContain("via target-port shift (-16, 0)");
  });

  it("changes independent label offsets without changing Route geometry", async () => {
    const { source } = await apply({
      kind: "label-offset",
      relationshipId: "caretaker-reviews-garden",
      offset: { x: 24, y: -18 },
    });

    expect(source).toContain("policy = guided");
    expect(source).toContain("source-port = east");
    expect(source).toContain("guide = [");
    expect(source).toContain("label-offset-x = 24du");
    expect(source).toContain("label-offset-y = -18du");
    expect(source).not.toContain("label-offset-x = 8du");
    expect(source).not.toContain("label-offset-y = -12du");
  });

  it("removes zero label offsets while retaining other Route controls", async () => {
    const { source } = await apply({
      kind: "label-offset",
      relationshipId: "caretaker-reviews-garden",
      offset: { x: 0, y: 0 },
    });

    expect(source).not.toContain("label-offset-x");
    expect(source).not.toContain("label-offset-y");
    expect(source).toContain("policy = guided");
    expect(source).toContain("guide = [");
  });

  it("creates an automatic label-only Route when no route controls exist", async () => {
    const withoutSecondRoute = createArchitectureProjectInput({
      id: project.id,
      documents: project.documents.map((document) => ({
        uri: document.uri,
        text:
          document.uri === "views/context.c4ml"
            ? document.text.replace(
                /\n    route sensor-reports-garden \{[\s\S]*?\n    \}/u,
                "",
              )
            : document.text,
      })),
    });
    const { proposal, source } = await apply(
      {
        kind: "label-offset",
        relationshipId: "sensor-reports-garden",
        offset: { x: -20, y: 12 },
      },
      withoutSecondRoute,
    );

    expect(source).toContain("route sensor-reports-garden {");
    expect(source).toContain("policy = automatic");
    expect(source).toContain("label-offset-x = -20du");
    expect(source).toContain("label-offset-y = 12du");
    expect(proposal.repairs).toEqual([]);
  });

  it("preserves fixed Route geometry while changing its label offset", async () => {
    const fixedProject = createArchitectureProjectInput({
      id: project.id,
      documents: project.documents.map((document) => ({
        uri: document.uri,
        text:
          document.uri === "views/context.c4ml"
            ? document.text.replace(
                /    route sensor-reports-garden \{[\s\S]*?    \}/u,
                [
                  "    route sensor-reports-garden {",
                  "      policy = fixed",
                  "      style = orthogonal",
                  "      points = [(420, 224), (520, 224)]",
                  "    }",
                ].join("\n"),
              )
            : document.text,
      })),
    });
    const { source } = await apply(
      {
        kind: "label-offset",
        relationshipId: "sensor-reports-garden",
        offset: { x: 0, y: -16 },
      },
      fixedProject,
    );

    expect(source).toContain("policy = fixed");
    expect(source).toContain("points = [(420, 224), (520, 224)]");
    expect(source).toContain("label-offset-y = -16du");
    expect(
      source.match(/route sensor-reports-garden \{[\s\S]*?\n    \}/u)?.[0],
    ).not.toContain("label-offset-x");
  });

  it("removes one waypoint while preserving locked guidance", async () => {
    const { source } = await apply({
      kind: "remove-waypoint",
      relationshipId: "caretaker-reviews-garden",
      waypointIndex: 1,
    });

    expect(source).toContain("via source-port shift (16, 0)");
    expect(source).not.toContain("via target-port shift (-16, 0)");
    expect(source).toContain(
      "lock canvas at (280, 160) to canvas at (360, 160)",
    );
  });

  it("clears path guidance but retains explicit Ports and label placement", async () => {
    const { source } = await apply({
      kind: "clear-guidance",
      relationshipId: "caretaker-reviews-garden",
    });

    expect(source).not.toContain("guide = [");
    expect(source).toContain("source-port = east");
    expect(source).toContain("target-port = west");
    expect(source).toContain("policy = guided");
    expect(source).toContain("label-offset-x = 8du");
    expect(source).toContain("label-offset-y = -12du");
  });

  it("removes an obsolete route block when no explicit route intent remains", async () => {
    const automaticProject = createArchitectureProjectInput({
      id: project.id,
      documents: project.documents.map((document) => ({
        uri: document.uri,
        text:
          document.uri === "views/context.c4ml"
            ? document.text.replace(
                /    route sensor-reports-garden \{[\s\S]*?    \}/u,
                "    route sensor-reports-garden {\n      policy = guided\n      guide = [via canvas at (420, 224)]\n    }",
              )
            : document.text,
      })),
    });
    const proposal = await proposeC4mlRouteEdit(
      automaticProject,
      request({
        kind: "clear-guidance",
        relationshipId: "sensor-reports-garden",
      }),
    );
    expect(proposal.valid).toBe(true);
    if (!proposal.valid) return;
    const application = applyProjectSourceChangeSet(automaticProject, proposal.changeSet);
    expect(application.valid).toBe(true);
    if (!application.valid) return;
    const source = application.project.documents.find(
      ({ uri }) => uri === "views/context.c4ml",
    )!.text;
    expect(source).not.toContain("route sensor-reports-garden");
    expect(proposal.repairs.map(({ code }) => code)).toContain("C4ML-ROUTE-REPAIR-004");
    expect((await parseC4mlProjectDraft(application.project)).valid).toBe(true);
  });

  it("creates an ordinary route block when a relationship had no controls", async () => {
    const withoutSecondRoute = createArchitectureProjectInput({
      id: project.id,
      documents: project.documents.map((document) => ({
        uri: document.uri,
        text:
          document.uri === "views/context.c4ml"
            ? document.text.replace(
                /\n    route sensor-reports-garden \{[\s\S]*?\n    \}/u,
                "",
              )
            : document.text,
      })),
    });
    const proposal = await proposeC4mlRouteEdit(
      withoutSecondRoute,
      request({
        kind: "ports",
        relationshipId: "sensor-reports-garden",
        sourcePort: "east",
        targetPort: "south",
      }),
    );
    expect(proposal.valid).toBe(true);
    if (!proposal.valid) return;
    const application = applyProjectSourceChangeSet(
      withoutSecondRoute,
      proposal.changeSet,
    );
    expect(application.valid).toBe(true);
    if (!application.valid) return;
    const source = application.project.documents.find(
      ({ uri }) => uri === "views/context.c4ml",
    )!.text;
    expect(source).toContain("route sensor-reports-garden {");
    expect(source).toContain("source-port = east");
    expect(source).toContain("target-port = south");
  });

  it("rejects missing waypoints and unknown Relationships", async () => {
    const missingWaypoint = await proposeC4mlRouteEdit(
      project,
      request({
        kind: "move-waypoint",
        relationshipId: "sensor-reports-garden",
        waypointIndex: 0,
        delta: { x: 16, y: 0 },
      }),
    );
    expect(missingWaypoint).toMatchObject({
      valid: false,
      issues: [{ code: "C4ML-AUTHORING-104" }],
    });

    const unknown = await proposeC4mlRouteEdit(
      project,
      request({
        kind: "clear-guidance",
        relationshipId: "missing-route",
      }),
    );
    expect(unknown).toMatchObject({
      valid: false,
      issues: [{ code: "C4ML-AUTHORING-103" }],
    });
  });
});
