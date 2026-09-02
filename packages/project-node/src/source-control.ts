import { spawn } from "node:child_process";
import { realpath, stat } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

export type GitFileStatus =
  | "added"
  | "conflicted"
  | "copied"
  | "deleted"
  | "modified"
  | "renamed"
  | "type-changed"
  | "untracked";

export interface GitWorkingTreeChange {
  readonly path: string;
  readonly originalPath?: string;
  readonly indexStatus?: GitFileStatus;
  readonly workingTreeStatus?: GitFileStatus;
}

export interface GitWorkingTreeStatus {
  readonly repositoryName: string;
  readonly branch: string | undefined;
  readonly detachedHead: string | undefined;
  readonly upstream: string | undefined;
  readonly ahead: number;
  readonly behind: number;
  readonly remotes: readonly string[];
  readonly changes: readonly GitWorkingTreeChange[];
}

export type GitSourceControlResult<T> =
  | { readonly valid: true; readonly value: T }
  | {
      readonly valid: false;
      readonly code: "C4ML-GIT-WORKTREE-001" | "C4ML-GIT-WORKTREE-002";
      readonly message: string;
    };

export async function readGitWorkingTreeStatus(
  selectedPath: string,
): Promise<GitSourceControlResult<GitWorkingTreeStatus>> {
  const repository = await resolveRepository(selectedPath);
  if (!repository.valid) return repository;
  return readStatus(repository.value.root);
}

export async function stageGitWorkingTreePaths(
  selectedPath: string,
  paths: readonly string[],
): Promise<GitSourceControlResult<GitWorkingTreeStatus>> {
  return mutatePaths(selectedPath, paths, ["add", "-A", "--"]);
}

export async function unstageGitWorkingTreePaths(
  selectedPath: string,
  paths: readonly string[],
): Promise<GitSourceControlResult<GitWorkingTreeStatus>> {
  const repository = await resolveRepository(selectedPath);
  if (!repository.valid) return repository;
  const checked = validatePaths(paths);
  if (!checked.valid) return checked;
  const hasHead = await gitSucceeds(repository.value.root, ["rev-parse", "--verify", "HEAD"]);
  const command = hasHead
    ? ["reset", "-q", "HEAD", "--", ...paths]
    : ["rm", "-r", "--cached", "-q", "--ignore-unmatch", "--", ...paths];
  const result = await runGit(repository.value.root, command);
  if (!result.valid) return commandFailure(result.message);
  return readStatus(repository.value.root);
}

export async function stageAllGitWorkingTreeChanges(
  selectedPath: string,
): Promise<GitSourceControlResult<GitWorkingTreeStatus>> {
  const repository = await resolveRepository(selectedPath);
  if (!repository.valid) return repository;
  const result = await runGit(repository.value.root, ["add", "-A", "--", "."]);
  if (!result.valid) return commandFailure(result.message);
  return readStatus(repository.value.root);
}

export async function unstageAllGitWorkingTreeChanges(
  selectedPath: string,
): Promise<GitSourceControlResult<GitWorkingTreeStatus>> {
  const repository = await resolveRepository(selectedPath);
  if (!repository.valid) return repository;
  const hasHead = await gitSucceeds(repository.value.root, ["rev-parse", "--verify", "HEAD"]);
  const result = await runGit(
    repository.value.root,
    hasHead
      ? ["reset", "-q", "HEAD", "--", "."]
      : ["rm", "-r", "--cached", "-q", "--ignore-unmatch", "--", "."],
  );
  if (!result.valid) return commandFailure(result.message);
  return readStatus(repository.value.root);
}

export async function commitGitWorkingTreeChanges(
  selectedPath: string,
  message: string,
): Promise<GitSourceControlResult<GitWorkingTreeStatus>> {
  const repository = await resolveRepository(selectedPath);
  if (!repository.valid) return repository;
  const normalizedMessage = message.trim();
  if (normalizedMessage.length === 0 || normalizedMessage.length > 4096) {
    return commandFailure("The commit message must contain between 1 and 4096 characters.");
  }
  const before = await readStatus(repository.value.root);
  if (!before.valid) return before;
  if (!before.value.changes.some(({ indexStatus }) => indexStatus !== undefined)) {
    return commandFailure("There are no staged changes to commit.");
  }
  const result = await runGit(repository.value.root, ["commit", "--file", "-"], {
    input: `${normalizedMessage}\n`,
  });
  if (!result.valid) return commandFailure(result.message);
  return readStatus(repository.value.root);
}

export async function pushGitWorkingTreeBranch(
  selectedPath: string,
): Promise<GitSourceControlResult<GitWorkingTreeStatus>> {
  const repository = await resolveRepository(selectedPath);
  if (!repository.valid) return repository;
  const status = await readStatus(repository.value.root);
  if (!status.valid) return status;
  if (status.value.branch === undefined) {
    return commandFailure("Cannot push while HEAD is detached.");
  }
  let args: readonly string[];
  if (status.value.upstream !== undefined) {
    args = ["push"];
  } else if (status.value.remotes.length === 1) {
    args = [
      "push",
      "--set-upstream",
      status.value.remotes[0]!,
      status.value.branch,
    ];
  } else if (status.value.remotes.length === 0) {
    return commandFailure("No Git remote is configured for this repository.");
  } else {
    return commandFailure(
      "This branch has no upstream and the repository has several remotes. Configure an upstream before pushing.",
    );
  }
  const pushed = await runGit(repository.value.root, args, { timeoutMs: 120_000 });
  if (!pushed.valid) return commandFailure(pushed.message);
  return readStatus(repository.value.root);
}

async function mutatePaths(
  selectedPath: string,
  paths: readonly string[],
  prefix: readonly string[],
): Promise<GitSourceControlResult<GitWorkingTreeStatus>> {
  const repository = await resolveRepository(selectedPath);
  if (!repository.valid) return repository;
  const checked = validatePaths(paths);
  if (!checked.valid) return checked;
  const result = await runGit(repository.value.root, [...prefix, ...paths]);
  if (!result.valid) return commandFailure(result.message);
  return readStatus(repository.value.root);
}

async function resolveRepository(
  selectedPath: string,
): Promise<GitSourceControlResult<{ readonly root: string }>> {
  const directory = await nearestExistingDirectory(resolve(selectedPath));
  if (directory === undefined) {
    return repositoryFailure("The selected source no longer exists.");
  }
  const root = await runGit(directory, ["rev-parse", "--show-toplevel"]);
  if (!root.valid) {
    return repositoryFailure("The selected source is not inside a Git repository.");
  }
  try {
    return { valid: true, value: { root: await realpath(root.stdout.trim()) } };
  } catch {
    return repositoryFailure("The Git repository root is not readable.");
  }
}

async function readStatus(
  repositoryRoot: string,
): Promise<GitSourceControlResult<GitWorkingTreeStatus>> {
  const [branchResult, headResult, upstreamResult, remoteResult, changesResult] =
    await Promise.all([
      runGit(repositoryRoot, ["symbolic-ref", "--quiet", "--short", "HEAD"]),
      runGit(repositoryRoot, ["rev-parse", "--short", "HEAD"]),
      runGit(repositoryRoot, [
        "rev-parse",
        "--abbrev-ref",
        "--symbolic-full-name",
        "@{upstream}",
      ]),
      runGit(repositoryRoot, ["remote"]),
      runGit(repositoryRoot, ["status", "--porcelain=v1", "-z", "--untracked-files=all"], {
        maximumBytes: 4 * 1024 * 1024,
      }),
    ]);
  if (!changesResult.valid) return commandFailure(changesResult.message);
  const branch = branchResult.valid ? branchResult.stdout.trim() : undefined;
  const detachedHead = branch === undefined && headResult.valid
    ? headResult.stdout.trim()
    : undefined;
  const upstream = upstreamResult.valid ? upstreamResult.stdout.trim() : undefined;
  let ahead = 0;
  let behind = 0;
  if (upstream !== undefined) {
    const divergence = await runGit(repositoryRoot, [
      "rev-list",
      "--left-right",
      "--count",
      `HEAD...${upstream}`,
    ]);
    if (divergence.valid) {
      const [aheadText, behindText] = divergence.stdout.trim().split(/\s+/u);
      ahead = Number.parseInt(aheadText ?? "0", 10) || 0;
      behind = Number.parseInt(behindText ?? "0", 10) || 0;
    }
  }
  return {
    valid: true,
    value: {
      repositoryName: basename(repositoryRoot),
      branch,
      detachedHead,
      upstream,
      ahead,
      behind,
      remotes: remoteResult.valid
        ? remoteResult.stdout.split(/\r?\n/u).filter(Boolean).sort()
        : [],
      changes: parsePorcelainStatus(changesResult.stdout),
    },
  };
}

function parsePorcelainStatus(value: string): readonly GitWorkingTreeChange[] {
  const records = value.split("\0");
  const changes: GitWorkingTreeChange[] = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (record === undefined || record.length < 4) continue;
    const indexCode = record[0]!;
    const workingTreeCode = record[1]!;
    const path = record.slice(3);
    let originalPath: string | undefined;
    if (indexCode === "R" || indexCode === "C") {
      originalPath = records[index + 1];
      index += 1;
    }
    const conflicted = isConflict(indexCode, workingTreeCode);
    changes.push({
      path,
      ...(originalPath === undefined ? {} : { originalPath }),
      ...(indexCode === " " || indexCode === "?"
        ? {}
        : { indexStatus: conflicted ? "conflicted" : toFileStatus(indexCode) }),
      ...(workingTreeCode === " "
        ? {}
        : {
            workingTreeStatus:
              conflicted
                ? "conflicted"
                : workingTreeCode === "?"
                  ? "untracked"
                  : toFileStatus(workingTreeCode),
          }),
    });
  }
  return changes.sort((left, right) => left.path.localeCompare(right.path, "en"));
}

function toFileStatus(code: string): GitFileStatus {
  switch (code) {
    case "A":
      return "added";
    case "D":
      return "deleted";
    case "R":
      return "renamed";
    case "C":
      return "copied";
    case "T":
      return "type-changed";
    default:
      return "modified";
  }
}

function isConflict(indexCode: string, workingTreeCode: string): boolean {
  return (
    indexCode === "U" ||
    workingTreeCode === "U" ||
    `${indexCode}${workingTreeCode}` === "AA" ||
    `${indexCode}${workingTreeCode}` === "DD"
  );
}

function validatePaths(
  paths: readonly string[],
): GitSourceControlResult<readonly string[]> {
  if (
    paths.length === 0 ||
    paths.length > 5_000 ||
    paths.some(
      (path) =>
        path.length === 0 ||
        path.length > 4096 ||
        path.includes("\0") ||
        path.startsWith("/") ||
        path.split("/").includes(".."),
    )
  ) {
    return commandFailure("The requested Git path selection is invalid.");
  }
  return { valid: true, value: paths };
}

async function nearestExistingDirectory(path: string): Promise<string | undefined> {
  let candidate = path;
  while (true) {
    try {
      const value = await stat(candidate);
      return value.isDirectory() ? candidate : dirname(candidate);
    } catch {
      const parent = dirname(candidate);
      if (parent === candidate) return undefined;
      candidate = parent;
    }
  }
}

interface GitCommandResult {
  readonly valid: boolean;
  readonly stdout: string;
  readonly message: string;
}

async function gitSucceeds(cwd: string, args: readonly string[]): Promise<boolean> {
  return (await runGit(cwd, args)).valid;
}

async function runGit(
  cwd: string,
  args: readonly string[],
  options: {
    readonly input?: string;
    readonly maximumBytes?: number;
    readonly timeoutMs?: number;
  } = {},
): Promise<GitCommandResult> {
  return new Promise((resolveResult) => {
    const child = spawn("git", ["-C", cwd, ...args], {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        GCM_INTERACTIVE: "Never",
        GIT_PAGER: "cat",
        GIT_TERMINAL_PROMPT: "0",
        LC_ALL: "C",
      },
    });
    const maximumBytes = options.maximumBytes ?? 2 * 1024 * 1024;
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let byteLength = 0;
    let settled = false;
    const finish = (result: GitCommandResult): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolveResult(result);
    };
    const timer = setTimeout(() => {
      child.kill();
      finish({ valid: false, stdout: "", message: "Git operation timed out." });
    }, options.timeoutMs ?? 30_000);
    const collect = (target: Buffer[]) => (chunk: Buffer): void => {
      byteLength += chunk.byteLength;
      if (byteLength > maximumBytes) {
        child.kill();
        finish({
          valid: false,
          stdout: "",
          message: `Git output exceeded the ${String(maximumBytes)}-byte safety limit.`,
        });
        return;
      }
      target.push(chunk);
    };
    child.stdout.on("data", collect(stdout));
    child.stderr.on("data", collect(stderr));
    child.on("error", (error) =>
      finish({
        valid: false,
        stdout: "",
        message: sanitizeGitMessage(error.message, cwd),
      }),
    );
    child.stdin.on("error", (error: NodeJS.ErrnoException) => {
      // Short-lived Git commands may close stdin before Node flushes it on
      // some platforms. Their exit code and stderr remain authoritative.
      if (error.code === "EPIPE") return;
      finish({
        valid: false,
        stdout: "",
        message: sanitizeGitMessage(error.message, cwd),
      });
    });
    child.on("close", (code) => {
      const output = Buffer.concat(stdout).toString("utf8");
      finish(
        code === 0
          ? { valid: true, stdout: output, message: "" }
          : {
              valid: false,
              stdout: output,
              message:
                sanitizeGitMessage(
                  Buffer.concat(stderr).toString("utf8").trim() ||
                    `Git exited with code ${String(code)}.`,
                  cwd,
                ),
            },
      );
    });
    if (options.input === undefined) {
      child.stdin.end();
    } else {
      child.stdin.end(options.input);
    }
  });
}

function sanitizeGitMessage(message: string, repositoryRoot: string): string {
  const withoutRoot = message.split(repositoryRoot).join("<repository>");
  return withoutRoot.replace(
    /(https?:\/\/)[^\s/@:]+:[^\s/@]+@/gu,
    "$1",
  );
}

function repositoryFailure(
  message: string,
): GitSourceControlResult<never> {
  return { valid: false, code: "C4ML-GIT-WORKTREE-001", message };
}

function commandFailure(message: string): GitSourceControlResult<never> {
  return { valid: false, code: "C4ML-GIT-WORKTREE-002", message };
}
