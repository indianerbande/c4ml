import { describe, expect, it } from "vitest";

import {
  applyProjectSourceChangeSet,
  applySourceChangeSet,
  createArchitectureProjectInput,
  createProjectRevision,
  createProposedProjectSourceChangeSet,
  createProposedSourceChangeSet,
  createSourceRevision,
  isProjectRevision,
  isProjectSourceChangeIssue,
  isProposedProjectSourceChangeSet,
  previewProjectSourceChangeSet,
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
          text: ' {\n    responsibility = "Plans gardens."\n  }',
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
        'model {\n  person gardener {\n    responsibility = "Plans gardens."\n  }\n}\n',
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
      issues: [
        {
          code: "C4ML-SOURCE-CHANGE-002",
          message:
            "The proposed source change was created for another source revision.",
        },
      ],
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
      intent: {
        id: "layout:nudge",
        kind: "layout",
        summary: "Move Garden right.",
      },
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

describe("portable multi-document source change sets", () => {
  const project = createArchitectureProjectInput({
    id: "signal-garden",
    documents: [
      { uri: "model/systems.c4ml", text: "system garden" },
      { uri: "views/context.c4ml", text: "view context" },
    ],
  });

  it("creates an order-independent project revision", () => {
    const reordered = createArchitectureProjectInput({
      id: "signal-garden",
      documents: [...project.documents].reverse(),
    });

    expect(createProjectRevision(reordered)).toEqual(
      createProjectRevision(project),
    );
    expect(
      createProjectRevision(
        createArchitectureProjectInput({
          id: "signal-garden",
          name: "Renamed Project",
          documents: project.documents,
        }),
      ),
    ).not.toEqual(createProjectRevision(project));
  });

  it("includes the optional architecture policy resource in the project revision", () => {
    const projectWithPolicy = createArchitectureProjectInput({
      ...project,
      policy: {
        uri: "governance/team.c4ml-policy.json",
        source: '{"version":1,"id":"team","policies":[]}',
      },
    });
    const changedPolicy = createArchitectureProjectInput({
      ...project,
      policy: {
        uri: "governance/team.c4ml-policy.json",
        source: '{"version":1,"id":"team","name":"Team","policies":[]}',
      },
    });

    expect(createProjectRevision(projectWithPolicy)).not.toEqual(
      createProjectRevision(project),
    );
    expect(createProjectRevision(changedPolicy)).not.toEqual(
      createProjectRevision(projectWithPolicy),
    );
  });

  it("includes the optional architecture observation resource in the project revision", () => {
    const projectWithObservations = createArchitectureProjectInput({
      ...project,
      observations: {
        uri: "evidence/team.c4ml-observations.json",
        source: '{"version":1,"id":"runtime","observations":[]}',
      },
    });
    const changedObservations = createArchitectureProjectInput({
      ...project,
      observations: {
        uri: "evidence/team.c4ml-observations.json",
        source: '{"version":1,"id":"runtime","name":"Team","observations":[]}',
      },
    });

    expect(createProjectRevision(projectWithObservations)).not.toEqual(
      createProjectRevision(project),
    );
    expect(createProjectRevision(changedObservations)).not.toEqual(
      createProjectRevision(projectWithObservations),
    );
  });

  it("includes the optional architecture glossary in the project revision", () => {
    const projectWithGlossary = createArchitectureProjectInput({
      ...project,
      glossary: {
        uri: "knowledge/team.c4ml-glossary.json",
        source: '{"version":1,"id":"terms","entries":[]}',
      },
    });
    const changedGlossary = createArchitectureProjectInput({
      ...project,
      glossary: {
        uri: "knowledge/team.c4ml-glossary.json",
        source: '{"version":1,"id":"terms","name":"Team","entries":[]}',
      },
    });

    expect(createProjectRevision(projectWithGlossary)).not.toEqual(
      createProjectRevision(project),
    );
    expect(createProjectRevision(changedGlossary)).not.toEqual(
      createProjectRevision(projectWithGlossary),
    );
  });

  it("validates the portable project change boundary structurally", () => {
    const changeSet = createProposedProjectSourceChangeSet(project, {
      id: "rename-system",
      intent: {
        id: "authoring:rename",
        kind: "architecture",
        summary: "Rename the system.",
      },
      affectedIds: ["garden"],
      edits: [
        {
          documentUri: "model/systems.c4ml",
          startOffset: 7,
          endOffset: 13,
          text: "park",
        },
      ],
    });

    expect(isProposedProjectSourceChangeSet(changeSet)).toBe(true);
    expect(isProjectRevision(changeSet.baseRevision)).toBe(true);
    expect(
      isProposedProjectSourceChangeSet({
        ...changeSet,
        edits: [{ ...changeSet.edits[0], startOffset: "7" }],
      }),
    ).toBe(false);
    expect(
      isProjectSourceChangeIssue({
        code: "C4ML-SOURCE-CHANGE-102",
        message: "Stale.",
      }),
    ).toBe(true);
  });

  it("applies edits to several documents atomically", () => {
    const changeSet = createProposedProjectSourceChangeSet(project, {
      id: "rename-and-retitle",
      intent: {
        id: "authoring.rename-system",
        kind: "architecture",
        summary: "Rename the system and its context title.",
      },
      affectedIds: ["garden", "context"],
      edits: [
        {
          documentUri: "views/context.c4ml",
          startOffset: 5,
          endOffset: 12,
          text: "overview",
        },
        {
          documentUri: "model/systems.c4ml",
          startOffset: 7,
          endOffset: 13,
          text: "orchard",
        },
      ],
    });

    const result = applyProjectSourceChangeSet(project, changeSet);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.project.documents).toEqual([
        { uri: "model/systems.c4ml", text: "system orchard" },
        { uri: "views/context.c4ml", text: "view overview" },
      ]);
    }
    expect(project.documents[0]?.text).toBe("system garden");
  });

  it("rejects the whole transaction when one document is stale or unknown", () => {
    const stale = createProposedProjectSourceChangeSet(project, {
      id: "stale",
      intent: { id: "authoring.edit", kind: "architecture", summary: "Edit." },
      affectedIds: ["garden"],
      edits: [
        {
          documentUri: "model/systems.c4ml",
          startOffset: 0,
          endOffset: 6,
          text: "service",
        },
      ],
    });
    const changedProject = createArchitectureProjectInput({
      id: project.id,
      documents: project.documents.map((document) =>
        document.uri === "views/context.c4ml"
          ? { ...document, text: `${document.text}\n` }
          : document,
      ),
    });
    const unknown = {
      ...stale,
      baseRevision: createProjectRevision(project),
      edits: [{ ...stale.edits[0]!, documentUri: "missing.c4ml" }],
    };

    expect(applyProjectSourceChangeSet(changedProject, stale)).toMatchObject({
      valid: false,
      issues: [{ code: "C4ML-SOURCE-CHANGE-102" }],
    });
    expect(applyProjectSourceChangeSet(project, unknown)).toMatchObject({
      valid: false,
      issues: [{ code: "C4ML-SOURCE-CHANGE-105" }],
    });
  });

  it("previews a complete candidate project without mutating active documents", async () => {
    const changeSet = createProposedProjectSourceChangeSet(project, {
      id: "preview",
      intent: { id: "authoring.preview", kind: "layout", summary: "Preview." },
      affectedIds: ["context"],
      edits: [
        {
          documentUri: "views/context.c4ml",
          startOffset: 5,
          endOffset: 12,
          text: "overview",
        },
      ],
    });

    const preview = await previewProjectSourceChangeSet(
      project,
      changeSet,
      (candidate) => candidate.documents.map(({ text }) => text).join("|"),
    );

    expect(preview).toMatchObject({
      valid: true,
      evaluation: "system garden|view overview",
    });
    expect(project.documents[1]?.text).toBe("view context");
  });
});
