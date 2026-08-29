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
    await writeFile(
      join(directory, "c4ml.project.json"),
      JSON.stringify({
        version: 1,
        id: "garden",
        sources: ["views/context.c4ml", "model/systems.c4ml"],
      }),
    );
    await writeFile(join(directory, "model", "systems.c4ml"), "c4ml draft-1\n");
    await writeFile(join(directory, "views", "context.c4ml"), "c4ml draft-1\n");

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
    }
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
