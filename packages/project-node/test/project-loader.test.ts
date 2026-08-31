import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadArchitectureProject } from "../src/index.js";

describe("Node.js architecture project loader", () => {
  it("loads an explicit project in canonical document order", async () => {
    const directory = await mkdtemp(join(tmpdir(), "c4ml-project-node-"));
    await mkdir(join(directory, "model"));
    await mkdir(join(directory, "views"));
    await mkdir(join(directory, "governance"));
    await writeFile(
      join(directory, "c4ml.project.json"),
      JSON.stringify({
        version: 1,
        id: "garden",
        policy: "governance/garden.c4ml-policy.json",
        observations: "governance/garden.c4ml-observations.json",
        glossary: "governance/garden.c4ml-glossary.json",
        narratives: ["governance/overview.c4ml-narrative.md"],
        publication: "governance/review.c4ml-publication.json",
        sources: ["views/context.c4ml", "model/systems.c4ml"],
      }),
    );
    await writeFile(join(directory, "model", "systems.c4ml"), "c4ml draft-1\n");
    await writeFile(join(directory, "views", "context.c4ml"), "c4ml draft-1\n");
    await writeFile(
      join(directory, "governance", "garden.c4ml-policy.json"),
      JSON.stringify({
        version: 1,
        id: "garden-policies",
        policies: [{
          id: "garden.protocol",
          title: "Require HTTPS",
          severity: "error",
          kind: "required-protocol",
          relationshipKeys: ["relationship:ui-calls-api"],
          allowedProtocols: ["HTTPS"],
        }],
      }),
    );
    await writeFile(
      join(directory, "governance", "garden.c4ml-observations.json"),
      JSON.stringify({
        version: 1,
        id: "garden-runtime",
        observations: [{
          id: "runtime-technology",
          subjectKey: "element:garden",
          adapterId: "test/local-inventory",
          observedAt: "2026-08-31T08:00:00Z",
          confirmation: "confirmed",
          claim: { kind: "presence", value: true },
        }],
      }),
    );
    await writeFile(
      join(directory, "governance", "garden.c4ml-glossary.json"),
      JSON.stringify({
        version: 1,
        id: "garden-terms",
        entries: [{
          id: "api",
          term: "API",
          kind: "acronym",
          expansion: "Application Programming Interface",
          definition: "A software boundary.",
        }],
      }),
    );
    await writeFile(
      join(directory, "governance", "overview.c4ml-narrative.md"),
      "---\nc4ml-narrative: 1\nid: garden-overview\ntitle: Garden overview\n---\nGarden context.\n",
    );
    await writeFile(join(directory, "governance", "review.c4ml-publication.json"), JSON.stringify({
      version: 1,
      id: "review",
      views: [{ viewId: "context" }],
      profiles: [{ id: "svg", formats: ["svg"], scale: 1, background: "theme" }],
    }));

    const result = await loadArchitectureProject(directory);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.project.documents.map(({ uri }) => uri)).toEqual([
        "model/systems.c4ml",
        "views/context.c4ml",
      ]);
      expect(result.documentPaths.map(({ uri }) => uri)).toEqual([
        "model/systems.c4ml",
        "views/context.c4ml",
      ]);
      expect(result.project.policy).toMatchObject({
        uri: "governance/garden.c4ml-policy.json",
      });
      expect(result.project.observations).toMatchObject({
        uri: "governance/garden.c4ml-observations.json",
      });
      expect(result.project.glossary).toMatchObject({
        uri: "governance/garden.c4ml-glossary.json",
      });
      expect(result.project.narratives).toMatchObject([
        { uri: "governance/overview.c4ml-narrative.md" },
      ]);
      expect(result.project.publication).toMatchObject({
        uri: "governance/review.c4ml-publication.json",
      });
    }
  });

  it("rejects unsafe project narratives with a stable narrative code", async () => {
    const directory = await mkdtemp(join(tmpdir(), "c4ml-project-narrative-"));
    await writeFile(join(directory, "c4ml.project.json"), JSON.stringify({
      version: 1,
      id: "garden",
      sources: ["architecture.c4ml"],
      narratives: ["overview.c4ml-narrative.md"],
    }));
    await writeFile(join(directory, "architecture.c4ml"), "c4ml draft-1\n");
    await writeFile(
      join(directory, "overview.c4ml-narrative.md"),
      "---\nc4ml-narrative: 1\nid: overview\ntitle: Overview\n---\n[remote](https://example.com)\n",
    );
    expect(await loadArchitectureProject(directory)).toMatchObject({
      valid: false,
      classification: "source",
      code: "C4ML-NARRATIVE-002",
    });
  });

  it("rejects malformed project glossaries with a stable glossary code", async () => {
    const directory = await mkdtemp(join(tmpdir(), "c4ml-project-glossary-"));
    await writeFile(
      join(directory, "c4ml.project.json"),
      JSON.stringify({
        version: 1,
        id: "garden",
        sources: ["architecture.c4ml"],
        glossary: "garden.c4ml-glossary.json",
      }),
    );
    await writeFile(join(directory, "architecture.c4ml"), "c4ml draft-1\n");
    await writeFile(join(directory, "garden.c4ml-glossary.json"), "{");

    expect(await loadArchitectureProject(directory)).toMatchObject({
      valid: false,
      classification: "source",
      code: "C4ML-GLOSSARY-001",
    });
  });

  it("rejects malformed project observation resources with a stable observation code", async () => {
    const directory = await mkdtemp(join(tmpdir(), "c4ml-project-observations-"));
    await writeFile(
      join(directory, "c4ml.project.json"),
      JSON.stringify({
        version: 1,
        id: "garden",
        sources: ["architecture.c4ml"],
        observations: "garden.c4ml-observations.json",
      }),
    );
    await writeFile(join(directory, "architecture.c4ml"), "c4ml draft-1\n");
    await writeFile(join(directory, "garden.c4ml-observations.json"), "{");

    expect(await loadArchitectureProject(directory)).toMatchObject({
      valid: false,
      classification: "source",
      code: "C4ML-OBSERVATION-001",
    });
  });

  it("loads one direct source and one-source directory as implicit projects", async () => {
    const directory = await mkdtemp(join(tmpdir(), "c4ml-project-implicit-"));
    const sourcePath = join(directory, "architecture.c4ml");
    await writeFile(sourcePath, "c4ml draft-1\n");

    const [direct, folder] = await Promise.all([
      loadArchitectureProject(sourcePath),
      loadArchitectureProject(directory),
    ]);

    expect(direct).toMatchObject({
      valid: true,
      project: { id: "implicit-project" },
    });
    expect(folder).toMatchObject({
      valid: true,
      project: { id: "implicit-project" },
    });
  });

  it("rejects ambiguous directories and malformed manifests", async () => {
    const ambiguous = await mkdtemp(join(tmpdir(), "c4ml-project-ambiguous-"));
    await writeFile(join(ambiguous, "one.c4ml"), "c4ml draft-1\n");
    await writeFile(join(ambiguous, "two.c4ml"), "c4ml draft-1\n");
    const malformed = await mkdtemp(join(tmpdir(), "c4ml-project-malformed-"));
    await writeFile(join(malformed, "c4ml.project.json"), "{");

    expect(await loadArchitectureProject(ambiguous)).toMatchObject({
      valid: false,
      code: "C4ML-PROJECT-NODE-005",
    });
    expect(await loadArchitectureProject(malformed)).toMatchObject({
      valid: false,
      code: "C4ML-PROJECT-005",
    });
  });

  it("rejects malformed project policy resources with a stable policy code", async () => {
    const directory = await mkdtemp(join(tmpdir(), "c4ml-project-policy-"));
    await writeFile(
      join(directory, "c4ml.project.json"),
      JSON.stringify({
        version: 1,
        id: "garden",
        sources: ["architecture.c4ml"],
        policy: "garden.c4ml-policy.json",
      }),
    );
    await writeFile(join(directory, "architecture.c4ml"), "c4ml draft-1\n");
    await writeFile(join(directory, "garden.c4ml-policy.json"), "{");

    expect(await loadArchitectureProject(directory)).toMatchObject({
      valid: false,
      classification: "source",
      code: "C4ML-POLICY-001",
    });
  });

  it.skipIf(process.platform === "win32")(
    "rejects a listed symbolic link that escapes the project root",
    async () => {
      const parent = await mkdtemp(join(tmpdir(), "c4ml-project-link-"));
      const directory = join(parent, "project");
      const outside = join(parent, "outside.c4ml");
      await mkdir(directory);
      await writeFile(outside, "c4ml draft-1\n");
      await symlink(outside, join(directory, "linked.c4ml"));
      await writeFile(
        join(directory, "c4ml.project.json"),
        JSON.stringify({
          version: 1,
          id: "linked",
          sources: ["linked.c4ml"],
        }),
      );

      expect(await loadArchitectureProject(directory)).toMatchObject({
        valid: false,
        code: "C4ML-PROJECT-NODE-004",
      });
    },
  );
});
