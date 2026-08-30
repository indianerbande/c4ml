import { describe, expect, it } from "vitest";

import {
  ArchitectureProjectError,
  architectureObservationResourceSuffix,
  architectureGlossaryResourceSuffix,
  architectureNarrativeResourceSuffix,
  architecturePublicationResourceSuffix,
  architectureThemeResourceSuffix,
  architectureShapeResourceSuffix,
  architectureAssetResourceSuffix,
  architecturePolicyResourceSuffix,
  architectureProjectManifestName,
  createArchitectureProjectInput,
  createImplicitArchitectureProject,
  parseArchitectureProjectManifest,
} from "../src/index.js";

describe("portable architecture project contract", () => {
  it("creates one deterministic project from unordered source documents", () => {
    const project = createArchitectureProjectInput({
      id: "signal-garden",
      name: "Signal Garden Architecture",
      documents: [
        { uri: "views/context.c4ml", text: "context" },
        { uri: "model/systems.c4ml", text: "systems" },
      ],
    });

    expect(project.documents.map(({ uri }) => uri)).toEqual([
      "model/systems.c4ml",
      "views/context.c4ml",
    ]);
  });

  it("keeps a single source file usable as an implicit project", () => {
    const project = createImplicitArchitectureProject({
      uri: "architecture.c4ml",
      text: "c4ml draft-1",
    });

    expect(project).toMatchObject({
      version: 1,
      id: "implicit-project",
      documents: [{ uri: "architecture.c4ml" }],
    });
  });

  it("rejects duplicate, absolute, escaping, and platform-specific paths", () => {
    expect(() =>
      createArchitectureProjectInput({
        id: "invalid",
        documents: [
          { uri: "views/context.c4ml", text: "one" },
          { uri: "views/context.c4ml", text: "two" },
          { uri: "Views/Context.c4ml", text: "case collision" },
          { uri: "../outside.c4ml", text: "outside" },
          { uri: "C:\\outside.c4ml", text: "outside" },
          { uri: "views/context?.c4ml", text: "not portable" },
        ],
      }),
    ).toThrow(ArchitectureProjectError);
  });

  it("parses and canonicalizes an explicit project manifest", () => {
    const result = parseArchitectureProjectManifest(JSON.stringify({
      version: 1,
      id: "signal-garden",
      name: "Signal Garden",
      policy: "governance/signal-garden.c4ml-policy.json",
      observations: "evidence/signal-garden.c4ml-observations.json",
      glossary: "knowledge/signal-garden.c4ml-glossary.json",
      narratives: ["docs/overview.c4ml-narrative.md"],
      publication: "publication/review.c4ml-publication.json",
      theme: "presentation/garden.c4ml-theme.json",
      shapes: "presentation/garden.c4ml-shapes.json",
      assets: "assets/garden.c4ml-assets.json",
      sources: ["views/context.c4ml", "model/systems.c4ml"],
    }));

    expect(result).toEqual({
      valid: true,
      manifest: {
        version: 1,
        id: "signal-garden",
        name: "Signal Garden",
        policy: "governance/signal-garden.c4ml-policy.json",
        observations: "evidence/signal-garden.c4ml-observations.json",
        glossary: "knowledge/signal-garden.c4ml-glossary.json",
        narratives: ["docs/overview.c4ml-narrative.md"],
        publication: "publication/review.c4ml-publication.json",
        theme: "presentation/garden.c4ml-theme.json",
        shapes: "presentation/garden.c4ml-shapes.json",
        assets: "assets/garden.c4ml-assets.json",
        sources: ["model/systems.c4ml", "views/context.c4ml"],
      },
      issues: [],
    });
    expect(architectureProjectManifestName).toBe("c4ml.project.json");
    expect(architecturePolicyResourceSuffix).toBe(".c4ml-policy.json");
    expect(architectureObservationResourceSuffix).toBe(".c4ml-observations.json");
    expect(architectureGlossaryResourceSuffix).toBe(".c4ml-glossary.json");
    expect(architectureNarrativeResourceSuffix).toBe(".c4ml-narrative.md");
    expect(architecturePublicationResourceSuffix).toBe(".c4ml-publication.json");
    expect(architectureThemeResourceSuffix).toBe(".c4ml-theme.json");
    expect(architectureShapeResourceSuffix).toBe(".c4ml-shapes.json");
    expect(architectureAssetResourceSuffix).toBe(".c4ml-assets.json");
  });

  it("retains one non-semantic publication resource", () => {
    const project = createArchitectureProjectInput({
      id: "signal-garden",
      documents: [{ uri: "architecture.c4ml", text: "c4ml draft-1" }],
      publication: { uri: "publication/review.c4ml-publication.json", source: "{}" },
    });
    expect(project.publication?.uri).toBe("publication/review.c4ml-publication.json");
  });

  it("orders typed project narratives and rejects duplicate or unsafe paths", () => {
    const project = createArchitectureProjectInput({
      id: "signal-garden",
      documents: [{ uri: "architecture.c4ml", text: "c4ml draft-1" }],
      narratives: [
        { uri: "docs/z.c4ml-narrative.md", source: "z" },
        { uri: "docs/a.c4ml-narrative.md", source: "a" },
      ],
    });
    expect(project.narratives?.map(({ uri }) => uri)).toEqual([
      "docs/a.c4ml-narrative.md",
      "docs/z.c4ml-narrative.md",
    ]);
    expect(() => createArchitectureProjectInput({
      id: "invalid-narrative",
      documents: [{ uri: "architecture.c4ml", text: "c4ml draft-1" }],
      narratives: [{ uri: "../overview.md", source: "text" }],
    })).toThrowError(expect.objectContaining<Partial<ArchitectureProjectError>>({
      issues: [expect.objectContaining({ code: "C4ML-PROJECT-009" })],
    }));
  });

  it("retains one typed project-local glossary independently of authored source", () => {
    const project = createArchitectureProjectInput({
      id: "signal-garden",
      documents: [{ uri: "architecture.c4ml", text: "c4ml draft-1" }],
      glossary: {
        uri: "knowledge/signal-garden.c4ml-glossary.json",
        source: '{"version":1}',
      },
    });

    expect(project.glossary).toEqual({
      uri: "knowledge/signal-garden.c4ml-glossary.json",
      source: '{"version":1}',
    });
    expect(() => createArchitectureProjectInput({
      id: "invalid-glossary",
      documents: [{ uri: "architecture.c4ml", text: "c4ml draft-1" }],
      glossary: { uri: "../glossary.json", source: "{}" },
    })).toThrowError(expect.objectContaining<Partial<ArchitectureProjectError>>({
      issues: [expect.objectContaining({ code: "C4ML-PROJECT-008" })],
    }));
  });

  it("retains one project-local observation resource independently of authored source", () => {
    const project = createArchitectureProjectInput({
      id: "signal-garden",
      documents: [{ uri: "architecture.c4ml", text: "c4ml draft-1" }],
      observations: {
        uri: "evidence/signal-garden.c4ml-observations.json",
        source: '{"version":1}',
      },
    });

    expect(project.observations).toEqual({
      uri: "evidence/signal-garden.c4ml-observations.json",
      source: '{"version":1}',
    });
    expect(() => createArchitectureProjectInput({
      id: "invalid-observations",
      documents: [{ uri: "architecture.c4ml", text: "c4ml draft-1" }],
      observations: { uri: "../observations.json", source: "{}" },
    })).toThrowError(expect.objectContaining<Partial<ArchitectureProjectError>>({
      issues: [expect.objectContaining({ code: "C4ML-PROJECT-007" })],
    }));
  });

  it("retains one project-local policy resource independently of source order", () => {
    const project = createArchitectureProjectInput({
      id: "signal-garden",
      documents: [{ uri: "architecture.c4ml", text: "c4ml draft-1" }],
      policy: {
        uri: "governance/signal-garden.c4ml-policy.json",
        source: '{"version":1}',
      },
    });

    expect(project.policy).toEqual({
      uri: "governance/signal-garden.c4ml-policy.json",
      source: '{"version":1}',
    });
    expect(() => createArchitectureProjectInput({
      id: "invalid-policy",
      documents: [{ uri: "architecture.c4ml", text: "c4ml draft-1" }],
      policy: { uri: "../policy.json", source: "{}" },
    })).toThrowError(expect.objectContaining<Partial<ArchitectureProjectError>>({
      issues: [expect.objectContaining({ code: "C4ML-PROJECT-006" })],
    }));
  });

  it("rejects malformed and path-escaping manifests with stable codes", () => {
    expect(parseArchitectureProjectManifest("{")).toMatchObject({
      valid: false,
      issues: [{ code: "C4ML-PROJECT-005" }],
    });
    expect(parseArchitectureProjectManifest(JSON.stringify({
      version: 1,
      id: "signal-garden",
      sources: ["../outside.c4ml"],
    }))).toMatchObject({
      valid: false,
      issues: [{ code: "C4ML-PROJECT-003" }],
    });
    expect(parseArchitectureProjectManifest(JSON.stringify({
      version: 1,
      id: "signal-garden",
      sources: ["architecture.c4ml"],
      policy: "policy.json",
    }))).toMatchObject({
      valid: false,
      issues: [{ code: "C4ML-PROJECT-006" }],
    });
  });
});
