import { describe, expect, it } from "vitest";

import {
  applyProjectSourceChangeSet,
  createArchitectureProjectInput,
} from "@c4ml/compiler-core";

import {
  inspectC4mlSemanticAuthoringContext,
  parseC4mlProjectDraft,
  proposeC4mlSemanticEdit,
  type C4mlSemanticEditRequest,
} from "../src/index.js";

const source = `c4ml draft-1

model {
  person caretaker {
    name = "Garden Caretaker"
    responsibility = "Plans garden work."
    classification = internal
  }

  system garden-pulse {
    name = "Garden Pulse"
    responsibility = "Coordinates garden observations."
    classification = internal
  }

  system weather-feed {
    name = "Weather Feed"
    responsibility = "Publishes local forecasts."
    classification = external
  }

  container garden-api inside garden-pulse {
    name = "Garden API"
    responsibility = "Processes garden plans."
    technology = "Application service"
  }

  component plan-engine inside garden-api {
    name = "Plan Engine"
    responsibility = "Builds garden plans."
    technology = "TypeScript module"
  }

  code plan-handler inside plan-engine {
    name = "Plan Handler"
    responsibility = "Handles plan requests."
    code-kind = class
    language = "TypeScript"
  }
}

relations {
  // Existing declarations and comments must survive semantic authoring.
}

view garden-context {
  type = system-context
  scope = garden-pulse
  title = "System Context — Garden Pulse"
  purpose = "Shows the people and systems around Garden Pulse."
  audience = default
  legend = generated
}

view garden-containers {
  type = container
  scope = garden-pulse
  title = "Container View — Garden Pulse"
  purpose = "Shows separately running parts."
  audience = default
  legend = generated
}

view garden-components {
  type = component
  scope = garden-api
  title = "Component View — Garden API"
  purpose = "Shows the parts inside the API."
  audience = default
  legend = generated
}

view garden-code {
  type = code
  scope = plan-engine
  title = "Code View — Plan Engine"
  purpose = "Shows important code structures."
  audience = default
  legend = generated
}

view garden-landscape {
  type = system-landscape
  scope = "Community Garden"
  title = "System Landscape — Community Garden"
  purpose = "Shows the application landscape."
  audience = default
  legend = generated
}
`;

function project(text = source) {
  return createArchitectureProjectInput({
    id: "semantic-authoring",
    documents: [{ uri: "architecture.c4ml", text }],
  });
}

function request(
  viewId: string,
  operation: C4mlSemanticEditRequest["operation"],
): C4mlSemanticEditRequest {
  return {
    id: `semantic:${viewId}:${operation.kind}`,
    viewId,
    intent: {
      id: `architecture:${operation.kind}`,
      kind: "architecture",
      summary: "Change the architecture model.",
    },
    operation,
  };
}

describe("semantic authoring context", () => {
  it("offers only the C4 element kinds owned by each static view scope", async () => {
    const context = await inspectC4mlSemanticAuthoringContext(
      project(),
      "garden-context",
    );
    const containers = await inspectC4mlSemanticAuthoringContext(
      project(),
      "garden-containers",
    );
    const components = await inspectC4mlSemanticAuthoringContext(
      project(),
      "garden-components",
    );
    const code = await inspectC4mlSemanticAuthoringContext(
      project(),
      "garden-code",
    );

    expect(context.valid && context.context.createActions).toEqual([
      { kind: "person" },
      { kind: "software-system" },
    ]);
    expect(containers.valid && containers.context.createActions).toEqual([
      { kind: "container", ownerId: "garden-pulse", ownerLabel: "Garden Pulse" },
    ]);
    expect(components.valid && components.context.createActions).toEqual([
      { kind: "component", ownerId: "garden-api", ownerLabel: "Garden API" },
    ]);
    expect(code.valid && code.context.createActions).toEqual([
      { kind: "code-element", ownerId: "plan-engine", ownerLabel: "Plan Engine" },
    ]);
  });

  it("derives directed connection choices from the active C4 scope", async () => {
    const context = await inspectC4mlSemanticAuthoringContext(
      project(),
      "garden-containers",
    );
    expect(context.valid).toBe(true);
    if (!context.valid) return;
    expect(context.context.connectionOptions).toContainEqual({
      sourceId: "caretaker",
      targetIds: ["garden-api"],
    });
    expect(context.context.connectionOptions).not.toContainEqual({
      sourceId: "caretaker",
      targetIds: ["weather-feed"],
    });
  });
});

describe("semantic source edits", () => {
  it("creates a scope-owned Container without reprinting existing source", async () => {
    const proposal = await proposeC4mlSemanticEdit(
      project(),
      request("garden-containers", {
        kind: "create-element",
        elementKind: "container",
        elementId: "notice-worker",
        name: "Notice Worker",
        responsibility: "Delivers scheduled garden notices.",
        ownerId: "garden-pulse",
        technology: "TypeScript worker",
      }),
    );
    expect(proposal.valid).toBe(true);
    if (!proposal.valid) return;
    const applied = applyProjectSourceChangeSet(project(), proposal.changeSet);
    expect(applied.valid).toBe(true);
    if (!applied.valid) return;
    const changed = applied.project.documents[0]!.text;
    expect(changed).toContain("container notice-worker inside garden-pulse");
    expect(changed).toContain("// Existing declarations and comments must survive");
    expect(changed.indexOf("container notice-worker")).toBeLessThan(
      changed.indexOf("relations {"),
    );
    expect((await parseC4mlProjectDraft(applied.project)).valid).toBe(true);
  });

  it("creates a directed relationship only for a context-valid pair", async () => {
    const proposal = await proposeC4mlSemanticEdit(
      project(),
      request("garden-containers", {
        kind: "create-relationship",
        relationshipId: "caretaker-requests-plans",
        sourceId: "caretaker",
        targetId: "garden-api",
        intent: "Requests the current garden plan",
        protocol: "HTTPS/JSON",
      }),
    );
    expect(proposal.valid).toBe(true);
    if (!proposal.valid) return;
    const applied = applyProjectSourceChangeSet(project(), proposal.changeSet);
    expect(applied.valid).toBe(true);
    if (!applied.valid) return;
    expect(applied.project.documents[0]!.text).toContain(
      "relation caretaker-requests-plans",
    );
    expect((await parseC4mlProjectDraft(applied.project)).valid).toBe(true);

    const invalid = await proposeC4mlSemanticEdit(
      project(),
      request("garden-containers", {
        kind: "create-relationship",
        relationshipId: "unsupported-context-pair",
        sourceId: "caretaker",
        targetId: "weather-feed",
        intent: "Reads forecasts",
      }),
    );
    expect(invalid).toMatchObject({
      valid: false,
      issues: [{ code: "C4ML-AUTHORING-203" }],
    });
  });

  it("inserts a missing relations block before the owning view", async () => {
    const withoutRelations = source.replace(
      /\nrelations \{[\s\S]*?\n\}\n\nview garden-context/u,
      "\nview garden-context",
    );
    const proposal = await proposeC4mlSemanticEdit(
      project(withoutRelations),
      request("garden-context", {
        kind: "create-relationship",
        relationshipId: "caretaker-uses-garden-pulse",
        sourceId: "caretaker",
        targetId: "garden-pulse",
        intent: "Reviews garden plans",
      }),
    );
    expect(proposal.valid).toBe(true);
    if (!proposal.valid) return;
    const applied = applyProjectSourceChangeSet(
      project(withoutRelations),
      proposal.changeSet,
    );
    expect(applied.valid).toBe(true);
    if (!applied.valid) return;
    expect(applied.project.documents[0]!.text).toMatch(
      /relations \{[\s\S]*caretaker-uses-garden-pulse[\s\S]*\}\n\nview garden-context/u,
    );
  });

  it("targets the owner document in an explicit multifile project", async () => {
    const modelEnd = source.indexOf("\nrelations {");
    const viewStart = source.indexOf("\nview garden-context");
    const multifile = createArchitectureProjectInput({
      id: "semantic-multifile",
      documents: [
        { uri: "model.c4ml", text: `${source.slice(0, modelEnd)}\n` },
        {
          uri: "views.c4ml",
          text: `c4ml draft-1\n${source.slice(viewStart)}\n`,
        },
      ],
    });
    const proposal = await proposeC4mlSemanticEdit(
      multifile,
      request("garden-components", {
        kind: "create-element",
        elementKind: "component",
        elementId: "notice-planner",
        name: "Notice Planner",
        responsibility: "Plans cultivation notices.",
        ownerId: "garden-api",
        technology: "TypeScript module",
      }),
    );
    expect(proposal.valid && proposal.documentUri).toBe("model.c4ml");
  });

  it("rejects duplicate identities and invalid Code metadata", async () => {
    const duplicate = await proposeC4mlSemanticEdit(
      project(),
      request("garden-context", {
        kind: "create-element",
        elementKind: "person",
        elementId: "caretaker",
        name: "Another Caretaker",
        responsibility: "Duplicates an identity.",
        classification: "external",
      }),
    );
    expect(duplicate).toMatchObject({
      valid: false,
      issues: [{ code: "C4ML-AUTHORING-204" }],
    });

    const code = await proposeC4mlSemanticEdit(
      project(),
      request("garden-code", {
        kind: "create-element",
        elementKind: "code-element",
        elementId: "notice-handler",
        name: "Notice Handler",
        responsibility: "Handles notice requests.",
        ownerId: "plan-engine",
        codeKind: "not a stable id",
      }),
    );
    expect(code).toMatchObject({
      valid: false,
      issues: [{ code: "C4ML-AUTHORING-203" }],
    });
  });
});
