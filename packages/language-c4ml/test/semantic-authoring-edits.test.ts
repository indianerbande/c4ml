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
  relation garden-reads-weather {
    from = garden-pulse
    to = weather-feed
    intent = "Reads the local forecast"
    protocol = "HTTPS/JSON"
  }
}

deployments {
  environment production {
    name = "Production"
    responsibility = "Runs the live Garden Pulse installation."

    node garden-cloud {
      name = "Garden Cloud"
      responsibility = "Hosts the production application."
      technology = "European cloud region"
    }

    system-instance live-garden-pulse of garden-pulse on garden-cloud
  }
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

view garden-weather-sequence {
  type = dynamic
  scope = "Read the weather forecast"
  title = "Dynamic View — Read Weather"
  purpose = "Shows how Garden Pulse obtains a forecast."
  audience = default
  legend = generated
  display = sequence

  interaction read-weather {
    order = 1
    from = garden-pulse
    to = weather-feed
    intent = "Reads the local forecast"
    relation = garden-reads-weather
  }

  layout {
    flow = right
  }
}

view garden-production {
  type = deployment
  environment = production
  systems = [garden-pulse]
  title = "Deployment View — Garden Pulse Production"
  purpose = "Shows where Garden Pulse runs."
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
  const viewOperation = operation.kind === "create-view" || operation.kind === "update-view" ||
    operation.kind === "delete-view" || operation.kind === "show-element" || operation.kind === "hide-element";
  return {
    id: `semantic:${viewId}:${operation.kind}`,
    viewId,
    intent: {
      id: `${viewOperation ? "view" : "architecture"}:${operation.kind}`,
      kind: viewOperation ? "view" : "architecture",
      summary: viewOperation ? "Change the active diagram." : "Change the architecture model.",
    },
    operation,
  };
}

describe("semantic authoring context", () => {
  it("distinguishes hidden valid targets from wrong-level elements", async () => {
    const result = await inspectC4mlSemanticAuthoringContext(project(), "garden-context");
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.context.viewElements).toContainEqual(expect.objectContaining({ id: "caretaker", visible: false, canShow: true }));
    expect(result.context.viewElements).toContainEqual(expect.objectContaining({ id: "garden-api", canShow: false, suitableViews: expect.arrayContaining(["garden-containers"]) }));
    expect(result.context.connectionOptions.find(({ sourceId }) => sourceId === "garden-pulse")?.targetIds).toContain("caretaker");
  });

  it("shows an unconnected existing element without adding model data or losing automatic neighbours", async () => {
    const input = project();
    const proposal = await proposeC4mlSemanticEdit(input, request("garden-context", { kind: "show-element", elementId: "caretaker" }));
    expect(proposal.valid, JSON.stringify(proposal)).toBe(true);
    if (!proposal.valid) return;
    const applied = applyProjectSourceChangeSet(input, proposal.changeSet);
    expect(applied.valid).toBe(true);
    if (!applied.valid) return;
    const before = await parseC4mlProjectDraft(input);
    const after = await parseC4mlProjectDraft(applied.project);
    expect(after.valid).toBe(true);
    expect(after.model).toEqual(before.model);
    expect(after.resolvedViews?.find(({ id }) => id === "garden-context")?.elements.map(({ id }) => id)).toEqual(["caretaker", "garden-pulse", "weather-feed"]);
    expect(after.resolvedViews?.find(({ id }) => id === "garden-containers")?.elements).toEqual(before.resolvedViews?.find(({ id }) => id === "garden-containers")?.elements);
  });

  it("removes an element from one diagram without deleting it from the model", async () => {
    const input = project(source.replace(
      "view garden-context {",
      "view garden-context {\n  show = [caretaker]",
    ));
    const before = await parseC4mlProjectDraft(input);
    const proposal = await proposeC4mlSemanticEdit(
      input,
      request("garden-context", { kind: "hide-element", elementId: "caretaker" }),
    );
    expect(proposal.valid, JSON.stringify(proposal)).toBe(true);
    if (!proposal.valid) return;
    expect(proposal.changeSet.intent.kind).toBe("view");
    const applied = applyProjectSourceChangeSet(input, proposal.changeSet);
    expect(applied.valid).toBe(true);
    if (!applied.valid) return;
    const after = await parseC4mlProjectDraft(applied.project);
    expect(after.valid).toBe(true);
    expect(after.model).toEqual(before.model);
    expect(after.resolvedViews?.find(({ id }) => id === "garden-context")?.elements.map(({ id }) => id)).not.toContain("caretaker");
    expect(after.resolvedViews?.find(({ id }) => id === "garden-landscape")?.elements.map(({ id }) => id)).toContain("caretaker");
  });

  it("shows an explicitly hidden element by removing its hide entry", async () => {
    const text = source.replace(
      "view garden-context {",
      "view garden-context {\n  hide = [caretaker]",
    );
    const input = project(text);
    const proposal = await proposeC4mlSemanticEdit(
      input,
      request("garden-context", { kind: "show-element", elementId: "caretaker" }),
    );
    expect(proposal.valid, JSON.stringify(proposal)).toBe(true);
    if (!proposal.valid) return;
    const applied = applyProjectSourceChangeSet(input, proposal.changeSet);
    expect(applied.valid).toBe(true);
    if (!applied.valid) return;
    const after = await parseC4mlProjectDraft(applied.project);
    expect(after.valid).toBe(true);
    expect(after.resolvedViews?.find(({ id }) => id === "garden-context")?.elements.map(({ id }) => id)).toContain("caretaker");
    expect(applied.project.documents[0]?.text).not.toContain("hide = [caretaker]");
  });

  it("deletes an unreferenced element from the shared model and cleans diagram lists", async () => {
    const input = project(source.replace(
      "view garden-landscape {",
      "view garden-landscape {\n  show = [caretaker]\n  hide = [caretaker]",
    ));
    const proposal = await proposeC4mlSemanticEdit(
      input,
      request("garden-landscape", { kind: "delete-element", elementId: "caretaker" }),
    );
    expect(proposal.valid).toBe(true);
    if (!proposal.valid) return;
    expect(proposal.changeSet.intent.kind).toBe("architecture");
    const applied = applyProjectSourceChangeSet(input, proposal.changeSet);
    expect(applied.valid).toBe(true);
    if (!applied.valid) return;
    const after = await parseC4mlProjectDraft(applied.project);
    expect(after.valid).toBe(true);
    expect(after.model?.elements.map(({ id }) => id)).not.toContain("caretaker");
    expect(applied.project.documents[0]?.text).not.toContain("show = [caretaker]");
    expect(applied.project.documents[0]?.text).not.toContain("hide = [caretaker]");
  });

  it("creates and shows through one project proposal even when model and view are in different files", async () => {
    const split = source.indexOf("view garden-context");
    const input = createArchitectureProjectInput({ id: "split-garden", documents: [
      { uri: "model.c4ml", text: source.slice(0, split) },
      { uri: "views.c4ml", text: `c4ml draft-1\n${source.slice(split)}` },
    ] });
    const proposal = await proposeC4mlSemanticEdit(input, request("garden-context", {
      kind: "create-element", elementKind: "person", elementId: "gardener", name: "Gardener",
      responsibility: "Tends garden beds.", classification: "internal", showInView: true,
    }));
    expect(proposal.valid).toBe(true);
    if (!proposal.valid) return;
    expect(new Set(proposal.changeSet.edits.map(({ documentUri }) => documentUri))).toEqual(new Set(["model.c4ml", "views.c4ml"]));
    const applied = applyProjectSourceChangeSet(input, proposal.changeSet);
    expect(applied.valid).toBe(true);
    if (!applied.valid) return;
    const result = await parseC4mlProjectDraft(applied.project);
    expect(result.valid).toBe(true);
    expect(result.resolvedViews?.find(({ id }) => id === "garden-context")?.elements.map(({ id }) => id)).toContain("gardener");
    expect(input.documents[0]!.text).not.toContain("person gardener");
  });

  it("preserves comments and CRLF when appending to a show list", async () => {
    const text = source.replace('view garden-context {', 'view garden-context {\n  show = [weather-feed // keep this comment\n  ]').replaceAll("\n", "\r\n");
    const input = project(text);
    const proposal = await proposeC4mlSemanticEdit(input, request("garden-context", { kind: "show-element", elementId: "caretaker" }));
    expect(proposal.valid).toBe(true);
    if (!proposal.valid) return;
    const applied = applyProjectSourceChangeSet(input, proposal.changeSet);
    if (!applied.valid) throw new Error("Rejected valid show change");
    expect(applied.project.documents[0]!.text).toBe(text.replace("[weather-feed //", "[weather-feed, caretaker //"));
    expect((await parseC4mlProjectDraft(applied.project)).valid).toBe(true);
  });

  it("rejects wrong-level show requests and handwritten lists", async () => {
    const proposal = await proposeC4mlSemanticEdit(project(), request("garden-context", { kind: "show-element", elementId: "garden-api" }));
    expect(proposal.valid).toBe(false);
    const result = await parseC4mlProjectDraft(project(source.replace("view garden-context {", "view garden-context {\n show = [garden-api]")));
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some(({ severity }) => severity === "error")).toBe(true);
  });

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

  it("creates a sibling Software System and its empty Container View atomically", async () => {
    const input = project();
    const proposal = await proposeC4mlSemanticEdit(input, request("garden-containers", {
      kind: "create-system-with-container-view",
      systemId: "marketplace",
      name: "Community Marketplace",
      responsibility: "Offers supplies from neighboring gardens.",
      classification: "internal",
      viewId: "marketplace-containers",
      title: "Container View — Community Marketplace",
      purpose: "Shows the separately running parts of the marketplace.",
    }));

    expect(proposal.valid, JSON.stringify(proposal)).toBe(true);
    if (!proposal.valid) return;
    expect(proposal.changeSet.intent.kind).toBe("architecture");
    expect(proposal.changeSet.affectedIds).toEqual([
      "marketplace",
      "marketplace-containers",
    ]);
    expect(proposal.proposedText).toContain("system marketplace");
    expect(proposal.proposedText).toContain("view marketplace-containers");
    expect(proposal.proposedText).toContain("scope = marketplace");

    const applied = applyProjectSourceChangeSet(input, proposal.changeSet);
    expect(applied.valid).toBe(true);
    if (!applied.valid) return;
    const parsed = await parseC4mlProjectDraft(applied.project);
    expect(parsed.valid, JSON.stringify(parsed.diagnostics)).toBe(true);
    expect(parsed.model?.elements).toContainEqual(
      expect.objectContaining({ id: "marketplace", kind: "software-system" }),
    );
    expect(parsed.resolvedViews).toContainEqual(
      expect.objectContaining({
        id: "marketplace-containers",
        kind: "container",
        scope: "Community Marketplace",
      }),
    );
    expect(input.documents[0]!.text).not.toContain("system marketplace");
  });

  it("keeps model and diagram edits atomic across source documents", async () => {
    const split = source.indexOf("view garden-context");
    const input = createArchitectureProjectInput({
      id: "split-system-and-view",
      documents: [
        { uri: "model.c4ml", text: source.slice(0, split) },
        { uri: "views.c4ml", text: `c4ml draft-1\n${source.slice(split)}` },
      ],
    });
    const proposal = await proposeC4mlSemanticEdit(input, {
      ...request("garden-containers", {
        kind: "create-system-with-container-view",
        systemId: "marketplace",
        name: "Community Marketplace",
        responsibility: "Offers supplies from neighboring gardens.",
        classification: "internal",
        viewId: "marketplace-containers",
        title: "Container View — Community Marketplace",
        purpose: "Shows the separately running parts of the marketplace.",
      }),
      documentUri: "views.c4ml",
    });

    expect(proposal.valid, JSON.stringify(proposal)).toBe(true);
    if (!proposal.valid) return;
    expect(new Set(proposal.changeSet.edits.map(({ documentUri }) => documentUri))).toEqual(
      new Set(["model.c4ml", "views.c4ml"]),
    );
    const applied = applyProjectSourceChangeSet(input, proposal.changeSet);
    expect(applied.valid).toBe(true);
    if (!applied.valid) return;
    expect(applied.project.documents.find(({ uri }) => uri === "model.c4ml")?.text).toContain(
      "system marketplace",
    );
    expect(applied.project.documents.find(({ uri }) => uri === "views.c4ml")?.text).toContain(
      "view marketplace-containers",
    );
  });

  it("rejects the combined workflow outside Container Views and on identity collisions", async () => {
    const operation = {
      kind: "create-system-with-container-view" as const,
      systemId: "weather-feed",
      name: "Community Marketplace",
      responsibility: "Offers supplies from neighboring gardens.",
      classification: "internal" as const,
      viewId: "garden-context",
      title: "Container View — Community Marketplace",
      purpose: "Shows the separately running parts of the marketplace.",
    };
    expect((await proposeC4mlSemanticEdit(
      project(),
      request("garden-context", { ...operation, systemId: "marketplace", viewId: "marketplace-containers" }),
    )).valid).toBe(false);
    expect((await proposeC4mlSemanticEdit(
      project(),
      request("garden-containers", operation),
    )).valid).toBe(false);
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

  it("derives Deployment topology choices from the active environment and system scope", async () => {
    const result = await inspectC4mlSemanticAuthoringContext(
      project(),
      "garden-production",
    );
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.context.deployment).toMatchObject({
      environmentId: "production",
      environmentLabel: "Production",
      createActions: [
        "deployment-node",
        "infrastructure-node",
        "software-system-instance",
        "container-instance",
      ],
      nodes: [{ id: "garden-cloud", label: "Garden Cloud" }],
    });
    expect(result.context.deployment?.elements).toEqual([
      { id: "garden-api", label: "Garden API", kind: "container" },
      { id: "garden-pulse", label: "Garden Pulse", kind: "software-system" },
    ]);
  });

  it("derives the next Dynamic order and only directed static-model relationships", async () => {
    const result = await inspectC4mlSemanticAuthoringContext(
      project(),
      "garden-weather-sequence",
    );
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.context.dynamic).toEqual({
      nextOrder: 2,
      relationships: [{
        id: "garden-reads-weather",
        sourceId: "garden-pulse",
        sourceLabel: "Garden Pulse",
        targetId: "weather-feed",
        targetLabel: "Weather Feed",
        intent: "Reads the local forecast",
      }],
    });
  });
});

describe("semantic source edits", () => {
  it("updates only the active diagram title and purpose", async () => {
    const input = project();
    const proposal = await proposeC4mlSemanticEdit(
      input,
      request("garden-context", {
        kind: "update-view",
        title: "Garden Pulse and its neighbours",
        purpose: "Explains who exchanges information with Garden Pulse.",
      }),
    );
    expect(proposal.valid, JSON.stringify(proposal)).toBe(true);
    if (!proposal.valid) return;
    expect(proposal.changeSet.intent.kind).toBe("view");
    expect(proposal.changeSet.affectedIds).toEqual(["garden-context"]);
    const applied = applyProjectSourceChangeSet(input, proposal.changeSet);
    expect(applied.valid).toBe(true);
    if (!applied.valid) return;
    const changed = applied.project.documents[0]!.text;
    expect(changed).toContain('title = "Garden Pulse and its neighbours"');
    expect(changed).toContain('purpose = "Explains who exchanges information with Garden Pulse."');
    expect(changed).toContain('title = "Container View — Garden Pulse"');
    expect(changed).toContain("view garden-context {");
    expect((await parseC4mlProjectDraft(applied.project)).valid).toBe(true);
  });

  it("deletes one diagram without deleting the shared model or other diagrams", async () => {
    const input = project();
    const before = await parseC4mlProjectDraft(input);
    const proposal = await proposeC4mlSemanticEdit(
      input,
      request("garden-context", { kind: "delete-view" }),
    );
    expect(proposal.valid, JSON.stringify(proposal)).toBe(true);
    if (!proposal.valid) return;
    expect(proposal.changeSet.intent.kind).toBe("view");
    expect(proposal.changeSet.affectedIds).toEqual(["garden-context"]);
    const applied = applyProjectSourceChangeSet(input, proposal.changeSet);
    expect(applied.valid).toBe(true);
    if (!applied.valid) return;
    const after = await parseC4mlProjectDraft(applied.project);
    expect(after.valid).toBe(true);
    expect(after.model).toEqual(before.model);
    expect(after.resolvedViews?.some(({ id }) => id === "garden-context")).toBe(false);
    expect(after.resolvedViews?.some(({ id }) => id === "garden-containers")).toBe(true);
  });

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
    const relationsStart = source.indexOf("\nrelations {");
    const deploymentsStart = source.indexOf("\ndeployments {");
    const withoutRelationsAndDynamic = `${source.slice(0, relationsStart)}${source.slice(deploymentsStart)}`;
    const dynamicStart = withoutRelationsAndDynamic.indexOf("\nview garden-weather-sequence");
    const deploymentViewStart = withoutRelationsAndDynamic.indexOf("\nview garden-production");
    const withoutRelations = `${withoutRelationsAndDynamic.slice(0, dynamicStart)}${withoutRelationsAndDynamic.slice(deploymentViewStart)}`;
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
    const viewStart = source.indexOf("\nview garden-context");
    const multifile = createArchitectureProjectInput({
      id: "semantic-multifile",
      documents: [
        { uri: "model.c4ml", text: `${source.slice(0, viewStart)}\n` },
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

  it("adds Deployment Nodes and scoped instances to the active environment", async () => {
    const nodeProposal = await proposeC4mlSemanticEdit(
      project(),
      request("garden-production", {
        kind: "create-deployment-item",
        itemKind: "deployment-node",
        itemId: "application-cluster",
        name: "Application Cluster",
        responsibility: "Runs the application workloads.",
        technology: "Kubernetes",
        parentNodeId: "garden-cloud",
      }),
    );
    expect(nodeProposal.valid).toBe(true);
    if (!nodeProposal.valid) return;
    const withNode = applyProjectSourceChangeSet(project(), nodeProposal.changeSet);
    expect(withNode.valid).toBe(true);
    if (!withNode.valid) return;
    expect(withNode.project.documents[0]?.text).toContain(
      "node application-cluster inside garden-cloud",
    );
    expect((await parseC4mlProjectDraft(withNode.project)).valid).toBe(true);

    const instanceProposal = await proposeC4mlSemanticEdit(
      project(),
      request("garden-production", {
        kind: "create-deployment-item",
        itemKind: "container-instance",
        itemId: "live-garden-api",
        nodeId: "garden-cloud",
        elementId: "garden-api",
      }),
    );
    expect(instanceProposal.valid).toBe(true);
    if (!instanceProposal.valid) return;
    const withInstance = applyProjectSourceChangeSet(project(), instanceProposal.changeSet);
    expect(withInstance.valid).toBe(true);
    if (!withInstance.valid) return;
    expect(withInstance.project.documents[0]?.text).toContain(
      "container-instance live-garden-api of garden-api on garden-cloud",
    );
    expect((await parseC4mlProjectDraft(withInstance.project)).valid).toBe(true);
  });

  it("adds an ordered Dynamic interaction before a View layout block", async () => {
    const proposal = await proposeC4mlSemanticEdit(
      project(),
      request("garden-weather-sequence", {
        kind: "create-dynamic-interaction",
        interactionId: "refresh-weather",
        order: 2,
        relationshipId: "garden-reads-weather",
        intent: "Refreshes the local forecast",
      }),
    );
    expect(proposal.valid).toBe(true);
    if (!proposal.valid) return;
    const applied = applyProjectSourceChangeSet(project(), proposal.changeSet);
    expect(applied.valid).toBe(true);
    if (!applied.valid) return;
    const changed = applied.project.documents[0]!.text;
    expect(changed).toContain("interaction refresh-weather");
    expect(changed.indexOf("interaction refresh-weather")).toBeLessThan(
      changed.indexOf("layout {", changed.indexOf("view garden-weather-sequence")),
    );
    expect((await parseC4mlProjectDraft(applied.project)).valid).toBe(true);
  });

  it("rejects out-of-scope Deployment selections and invalid Dynamic steps", async () => {
    const outsideDeploymentScope = await proposeC4mlSemanticEdit(
      project(),
      request("garden-production", {
        kind: "create-deployment-item",
        itemKind: "software-system-instance",
        itemId: "live-weather-feed",
        nodeId: "garden-cloud",
        elementId: "weather-feed",
      }),
    );
    expect(outsideDeploymentScope).toMatchObject({
      valid: false,
      issues: [{ code: "C4ML-AUTHORING-203" }],
    });

    const wrongEnvironmentNode = await proposeC4mlSemanticEdit(
      project(),
      request("garden-production", {
        kind: "create-deployment-item",
        itemKind: "deployment-node",
        itemId: "nested-elsewhere",
        name: "Nested Elsewhere",
        responsibility: "Would use a node outside this environment.",
        technology: "Virtual machine",
        parentNodeId: "unknown-node",
      }),
    );
    expect(wrongEnvironmentNode).toMatchObject({
      valid: false,
      issues: [{ code: "C4ML-AUTHORING-203" }],
    });

    const invalidDynamic = await proposeC4mlSemanticEdit(
      project(),
      request("garden-weather-sequence", {
        kind: "create-dynamic-interaction",
        interactionId: "read-weather",
        order: 0,
        relationshipId: "unknown-relationship",
        intent: "Repeats an invalid step",
      }),
    );
    expect(invalidDynamic).toMatchObject({
      valid: false,
      issues: [{ code: "C4ML-AUTHORING-204" }],
    });

    const invalidOrder = await proposeC4mlSemanticEdit(
      project(),
      request("garden-weather-sequence", {
        kind: "create-dynamic-interaction",
        interactionId: "invalid-order",
        order: 0,
        relationshipId: "garden-reads-weather",
        intent: "Uses an invalid order",
      }),
    );
    expect(invalidOrder).toMatchObject({
      valid: false,
      issues: [{ code: "C4ML-AUTHORING-203" }],
    });

    const unknownRelationship = await proposeC4mlSemanticEdit(
      project(),
      request("garden-weather-sequence", {
        kind: "create-dynamic-interaction",
        interactionId: "unknown-static-relation",
        order: 2,
        relationshipId: "unknown-relationship",
        intent: "Uses an unknown relationship",
      }),
    );
    expect(unknownRelationship).toMatchObject({
      valid: false,
      issues: [{ code: "C4ML-AUTHORING-203" }],
    });
  });
});
