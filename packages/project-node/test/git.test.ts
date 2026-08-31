import { execFile } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import {
  commitGitWorkingTreeChanges,
  loadArchitectureProjectAtGitRevision,
  pushGitWorkingTreeBranch,
  readGitWorkingTreeStatus,
  stageAllGitWorkingTreeChanges,
  stageGitWorkingTreePaths,
  unstageGitWorkingTreePaths,
} from "../src/index.js";

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
      JSON.stringify({
        version: 1,
        id: "garden",
        sources: ["model.c4ml", "views.c4ml"],
        policy: "garden.c4ml-policy.json",
      }),
      "utf8",
    );
    await writeFile(join(projectDirectory, "model.c4ml"), "c4ml draft-1\n// model\n", "utf8");
    await writeFile(join(projectDirectory, "views.c4ml"), "c4ml draft-1\n// views\n", "utf8");
    await writeFile(
      join(projectDirectory, "garden.c4ml-policy.json"),
      JSON.stringify({
        version: 1,
        id: "garden-policies",
        policies: [{
          id: "garden.protocol",
          title: "Require HTTPS",
          severity: "warning",
          kind: "required-protocol",
          relationshipKeys: ["relationship:ui-calls-api"],
        }],
      }),
      "utf8",
    );
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
    expect(result.project.policy).toMatchObject({
      uri: "garden.c4ml-policy.json",
    });
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

describe("Git working-tree adapter", () => {
  it("reports, stages, unstages, and commits repository changes", async () => {
    const directory = await mkdtemp(join(tmpdir(), "c4ml-git-worktree-"));
    const sourcePath = join(directory, "architecture.c4ml");
    await initializeRepository(directory);
    await writeFile(sourcePath, "c4ml draft-1\n", "utf8");
    await git(directory, "add", "architecture.c4ml");
    await git(directory, "commit", "-m", "initial");
    await writeFile(sourcePath, "c4ml draft-1\n// changed\n", "utf8");
    await writeFile(join(directory, "notes.txt"), "local note\n", "utf8");

    const initial = await readGitWorkingTreeStatus(sourcePath);
    expect(initial).toMatchObject({
      valid: true,
      value: {
        branch: "main",
        changes: [
          { path: "architecture.c4ml", workingTreeStatus: "modified" },
          { path: "notes.txt", workingTreeStatus: "untracked" },
        ],
      },
    });

    const staged = await stageGitWorkingTreePaths(sourcePath, ["architecture.c4ml"]);
    expect(staged).toMatchObject({
      valid: true,
      value: {
        changes: [
          { path: "architecture.c4ml", indexStatus: "modified" },
          { path: "notes.txt", workingTreeStatus: "untracked" },
        ],
      },
    });

    const unstaged = await unstageGitWorkingTreePaths(sourcePath, ["architecture.c4ml"]);
    expect(unstaged).toMatchObject({
      valid: true,
      value: {
        changes: [
          { path: "architecture.c4ml", workingTreeStatus: "modified" },
          { path: "notes.txt", workingTreeStatus: "untracked" },
        ],
      },
    });

    expect((await stageAllGitWorkingTreeChanges(sourcePath)).valid).toBe(true);
    const committed = await commitGitWorkingTreeChanges(
      sourcePath,
      "Update architecture",
    );
    expect(committed).toMatchObject({ valid: true, value: { changes: [] } });
    expect(await git(directory, "log", "-1", "--pretty=%s")).toBe(
      "Update architecture",
    );
  });

  it("sets the upstream when pushing a branch to its only remote", async () => {
    const root = await mkdtemp(join(tmpdir(), "c4ml-git-push-"));
    const remote = join(root, "remote.git");
    const directory = join(root, "worktree");
    await mkdir(directory);
    await git(root, "init", "--bare", remote);
    await initializeRepository(directory);
    const sourcePath = join(directory, "architecture.c4ml");
    await writeFile(sourcePath, "c4ml draft-1\n", "utf8");
    await git(directory, "add", "architecture.c4ml");
    await git(directory, "commit", "-m", "initial");
    await git(directory, "remote", "add", "origin", remote);

    const pushed = await pushGitWorkingTreeBranch(sourcePath);

    expect(pushed).toMatchObject({
      valid: true,
      value: { branch: "main", upstream: "origin/main", ahead: 0, behind: 0 },
    });
    expect(await git(remote, "rev-parse", "refs/heads/main")).toBe(
      await git(directory, "rev-parse", "HEAD"),
    );
  });

  it("rejects source-control requests outside a repository", async () => {
    const directory = await mkdtemp(join(tmpdir(), "c4ml-git-none-"));
    const sourcePath = join(directory, "architecture.c4ml");
    await writeFile(sourcePath, "c4ml draft-1\n", "utf8");

    expect(await readGitWorkingTreeStatus(sourcePath)).toMatchObject({
      valid: false,
      code: "C4ML-GIT-WORKTREE-001",
    });
  });
});
