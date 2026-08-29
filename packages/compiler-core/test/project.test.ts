import { describe, expect, it } from "vitest";

import {
  ArchitectureProjectError,
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
      sources: ["views/context.c4ml", "model/systems.c4ml"],
    }));

    expect(result).toEqual({
      valid: true,
      manifest: {
        version: 1,
        id: "signal-garden",
        name: "Signal Garden",
        sources: ["model/systems.c4ml", "views/context.c4ml"],
      },
      issues: [],
    });
    expect(architectureProjectManifestName).toBe("c4ml.project.json");
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
  });
});
