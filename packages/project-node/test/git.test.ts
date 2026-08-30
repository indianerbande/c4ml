import { execFile } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { loadArchitectureProjectAtGitRevision } from "../src/index.js";

const run = promisify(execFile);

async function git(cwd: string, ...args: string[]): Promise<string> {
  const result = await run("git", ["-C", cwd, ...args], {
    env: { ...process.env, LC_ALL: "C" },
  });
  return result.stdout.trim();
}

async function initializeRepository(directory: string): Promise<void> {
  await git(directory, "init", "--initial-branch=main");
  await git(directory, "config", "user.name", "C4ML Test");
  await git(directory, "config", "user.email", "c4ml@example.invalid");
}

describe("Git project revision adapter", () => {
  it("loads a source from commits and branch names without checking them out", async () => {
    const directory = await mkdtemp(join(tmpdir(), "c4ml-git-project-"));
    const sourcePath = join(directory, "architecture.c4ml");
    await initializeRepository(directory);
    await writeFile(sourcePath, "c4ml draft-1\n// first\n", "utf8");
    await git(directory, "add", "architecture.c4ml");
    await git(directory, "commit", "-m", "first");
    const firstCommit = await git(directory, "rev-parse", "HEAD");
    await git(directory, "branch", "baseline", firstCommit);
    await writeFile(sourcePath, "c4ml draft-1\n// second\n", "utf8");
    await git(directory, "add", "architecture.c4ml");
    await git(directory, "commit", "-m", "second");

    const byCommit = await loadArchitectureProjectAtGitRevision(sourcePath, firstCommit);
    const byBranch = await loadArchitectureProjectAtGitRevision(sourcePath, "baseline");

    expect(byCommit.valid).toBe(true);
    expect(byBranch.valid).toBe(true);
    if (!byCommit.valid || !byBranch.valid) return;
    expect(byCommit.project.documents[0]?.text).toContain("first");
    expect(byBranch.project).toEqual(byCommit.project);
    expect(byBranch.revision.commit).toBe(firstCommit);
    expect(await git(directory, "rev-parse", "HEAD")).not.toBe(firstCommit);
  });

  it("loads an explicit multifile project entirely from one revision", async () => {
    const directory = await mkdtemp(join(tmpdir(), "c4ml-git-multifile-"));
    const projectDirectory = join(directory, "architecture");
    await mkdir(projectDirectory);
    await initializeRepository(directory);
    await writeFile(
      join(projectDirectory, "c4ml.project.json"),
      JSON.stringify({ version: 1, id: "garden", sources: ["model.c4ml", "views.c4ml"] }),
      "utf8",
    );
    await writeFile(join(projectDirectory, "model.c4ml"), "c4ml draft-1\n// model\n", "utf8");
    await writeFile(join(projectDirectory, "views.c4ml"), "c4ml draft-1\n// views\n", "utf8");
    await git(directory, "add", "architecture");
    await git(directory, "commit", "-m", "project");

    const result = await loadArchitectureProjectAtGitRevision(projectDirectory, "HEAD");

    expect(result.valid).toBe(true);
    if (!result.valid) return;
    expect(result.project.id).toBe("garden");
    expect(result.project.documents.map(({ uri }) => uri)).toEqual([
      "model.c4ml",
      "views.c4ml",
    ]);
    expect(result.projectPath).toBe("architecture");
  });

  it("classifies unknown revisions without changing repository state", async () => {
    const directory = await mkdtemp(join(tmpdir(), "c4ml-git-invalid-"));
    await initializeRepository(directory);
    await writeFile(join(directory, "architecture.c4ml"), "c4ml draft-1\n", "utf8");
    await git(directory, "add", "architecture.c4ml");
    await git(directory, "commit", "-m", "initial");
    const before = await git(directory, "status", "--porcelain=v1");

    const result = await loadArchitectureProjectAtGitRevision(
      join(directory, "architecture.c4ml"),
      "missing-branch",
    );

    expect(result).toMatchObject({
      valid: false,
      classification: "repository",
      code: "C4ML-GIT-002",
    });
    expect(await git(directory, "status", "--porcelain=v1")).toBe(before);
  });
});
