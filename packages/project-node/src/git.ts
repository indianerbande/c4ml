import { spawn } from "node:child_process";
import { realpath, stat } from "node:fs/promises";
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";
import { posix } from "node:path";

import {
  architectureProjectManifestName,
  createArchitectureProjectInput,
  createImplicitArchitectureProject,
  parseArchitectureProjectManifest,
  type ArchitectureProjectInput,
} from "@c4ml/compiler-core";

export interface GitRevisionIdentity {
  readonly requestedRef: string;
  readonly commit: string;
}

export type GitProjectLoadResult =
  | {
      readonly valid: true;
      readonly project: ArchitectureProjectInput;
      readonly revision: GitRevisionIdentity;
      readonly projectPath: string;
    }
  | {
      readonly valid: false;
      readonly classification: "environment" | "repository" | "source";
      readonly code: string;
      readonly message: string;
    };

type GitProjectLoadFailure = Extract<GitProjectLoadResult, { readonly valid: false }>;

/** Loads an architecture project from a commit-ish without checking it out. */
export async function loadArchitectureProjectAtGitRevision(
  path: string,
  requestedRef: string,
): Promise<GitProjectLoadResult> {
  if (requestedRef.trim().length === 0 || requestedRef === "working") {
    return failure(
      "source",
      "C4ML-GIT-002",
      'A Git revision must be a non-empty commit, tag, or branch name other than "working".',
    );
  }
  const inputPath = resolve(path);
  const commandDirectory = await nearestExistingDirectory(inputPath);
  if (commandDirectory === undefined) {
    return failure(
      "environment",
      "C4ML-GIT-001",
      `Cannot locate an existing directory for ${inputPath}.`,
    );
  }
  const rootResult = await runGit(commandDirectory, ["rev-parse", "--show-toplevel"]);
  if (!rootResult.valid) {
    return failure(
      "repository",
      "C4ML-GIT-001",
      `The selected path is not inside a readable Git repository: ${rootResult.message}`,
    );
  }
  const repositoryRoot = await realpath(rootResult.stdout.trim());
  const canonicalCommandDirectory = await realpath(commandDirectory);
  let canonicalInput: string;
  try {
    canonicalInput = await realpath(inputPath);
  } catch {
    canonicalInput = resolve(
      canonicalCommandDirectory,
      relative(commandDirectory, inputPath),
    );
  }
  const relativeInput = relative(repositoryRoot, canonicalInput);
  if (
    relativeInput === ".." ||
    relativeInput.split(sep)[0] === ".." ||
    isAbsolute(relativeInput)
  ) {
    return failure(
      "repository",
      "C4ML-GIT-003",
      "The selected project path is outside the resolved Git repository.",
    );
  }
  const projectPath = toGitPath(relativeInput);
  const revisionResult = await runGit(repositoryRoot, [
    "rev-parse",
    "--verify",
    "--end-of-options",
    `${requestedRef}^{commit}`,
  ]);
  if (!revisionResult.valid) {
    return failure(
      "repository",
      "C4ML-GIT-002",
      `Cannot resolve Git revision "${requestedRef}": ${revisionResult.message}`,
    );
  }
  const revision = {
    requestedRef,
    commit: revisionResult.stdout.trim(),
  };
  const objectType = projectPath.length === 0
    ? "tree"
    : await gitObjectType(repositoryRoot, revision.commit, projectPath);
  if (objectType === undefined) {
    return failure(
      "source",
      "C4ML-GIT-003",
      `The selected path does not exist at Git revision "${requestedRef}".`,
    );
  }
  if (objectType === "blob") {
    return loadBlobProject(repositoryRoot, projectPath, revision);
  }
  if (objectType !== "tree") {
    return failure(
      "source",
      "C4ML-GIT-004",
      "The selected Git object is neither a regular source file nor a project directory.",
    );
  }
  return loadTreeProject(repositoryRoot, projectPath, revision);
}

async function loadBlobProject(
  repositoryRoot: string,
  projectPath: string,
  revision: GitRevisionIdentity,
): Promise<GitProjectLoadResult> {
  const name = posix.basename(projectPath);
  if (name === architectureProjectManifestName) {
    return loadManifestProject(
      repositoryRoot,
      posix.dirname(projectPath) === "." ? "" : posix.dirname(projectPath),
      projectPath,
      revision,
    );
  }
  if (extname(name).toLowerCase() !== ".c4ml") {
    return failure(
      "source",
      "C4ML-GIT-004",
      `Expected a .c4ml source, ${architectureProjectManifestName}, or project directory at the selected revision.`,
    );
  }
  const source = await readBlob(repositoryRoot, revision.commit, projectPath);
  if (!source.valid) return source;
  return {
    valid: true,
    project: createImplicitArchitectureProject({ uri: name, text: source.text }),
    revision,
    projectPath,
  };
}

async function loadTreeProject(
  repositoryRoot: string,
  projectPath: string,
  revision: GitRevisionIdentity,
): Promise<GitProjectLoadResult> {
  const manifestPath = joinGitPath(projectPath, architectureProjectManifestName);
  if (await gitObjectType(repositoryRoot, revision.commit, manifestPath) === "blob") {
    return loadManifestProject(repositoryRoot, projectPath, manifestPath, revision);
  }
  const tree = await runGit(repositoryRoot, [
    "ls-tree",
    "-r",
    "--name-only",
    revision.commit,
    "--",
    projectPath.length === 0 ? "." : projectPath,
  ]);
  if (!tree.valid) {
    return failure("repository", "C4ML-GIT-005", tree.message);
  }
  const prefix = projectPath.length === 0 ? "" : `${projectPath}/`;
  const rootSources = tree.stdout
    .split(/\r?\n/u)
    .filter(Boolean)
    .filter((path) => path.startsWith(prefix))
    .map((path) => path.slice(prefix.length))
    .filter((path) => !path.includes("/") && posix.extname(path).toLowerCase() === ".c4ml")
    .sort();
  if (rootSources.length !== 1) {
    return failure(
      "source",
      "C4ML-GIT-006",
      rootSources.length === 0
        ? `The selected directory contains no root-level .c4ml source and no ${architectureProjectManifestName} at revision "${revision.requestedRef}".`
        : `The selected directory contains several root-level .c4ml sources at revision "${revision.requestedRef}"; add ${architectureProjectManifestName}.`,
    );
  }
  const sourcePath = joinGitPath(projectPath, rootSources[0]!);
  const source = await readBlob(repositoryRoot, revision.commit, sourcePath);
  if (!source.valid) return source;
  return {
    valid: true,
    project: createImplicitArchitectureProject({
      uri: rootSources[0]!,
      text: source.text,
    }),
    revision,
    projectPath,
  };
}

async function loadManifestProject(
  repositoryRoot: string,
  projectPath: string,
  manifestPath: string,
  revision: GitRevisionIdentity,
): Promise<GitProjectLoadResult> {
  const manifestSource = await readBlob(repositoryRoot, revision.commit, manifestPath);
  if (!manifestSource.valid) return manifestSource;
  const parsed = parseArchitectureProjectManifest(manifestSource.text);
  if (!parsed.valid) {
    return failure("source", parsed.issues[0]!.code, parsed.issues[0]!.message);
  }
  const documents: Array<{ readonly uri: string; readonly text: string }> = [];
  for (const uri of parsed.manifest.sources) {
    const source = await readBlob(
      repositoryRoot,
      revision.commit,
      joinGitPath(projectPath, uri),
    );
    if (!source.valid) return source;
    documents.push({ uri, text: source.text });
  }
  return {
    valid: true,
    project: createArchitectureProjectInput({
      id: parsed.manifest.id,
      ...(parsed.manifest.name === undefined ? {} : { name: parsed.manifest.name }),
      ...(parsed.manifest.description === undefined
        ? {}
        : { description: parsed.manifest.description }),
      documents,
    }),
    revision,
    projectPath,
  };
}

async function gitObjectType(
  repositoryRoot: string,
  commit: string,
  path: string,
): Promise<string | undefined> {
  const result = await runGit(repositoryRoot, ["cat-file", "-t", `${commit}:${path}`]);
  return result.valid ? result.stdout.trim() : undefined;
}

async function readBlob(
  repositoryRoot: string,
  commit: string,
  path: string,
): Promise<{ readonly valid: true; readonly text: string } | GitProjectLoadFailure> {
  const result = await runGit(repositoryRoot, ["show", `${commit}:${path}`], 16 * 1024 * 1024);
  return result.valid
    ? { valid: true, text: result.stdout }
    : failure(
        "source",
        "C4ML-GIT-007",
        `Cannot read project source "${path}" at the selected revision: ${result.message}`,
      );
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

function toGitPath(path: string): string {
  return path.split(sep).join("/");
}

function joinGitPath(root: string, child: string): string {
  return root.length === 0 ? child : posix.join(root, child);
}

interface GitCommandSuccess {
  readonly valid: true;
  readonly stdout: string;
}

interface GitCommandFailure {
  readonly valid: false;
  readonly message: string;
}

async function runGit(
  cwd: string,
  args: readonly string[],
  maximumBytes = 2 * 1024 * 1024,
): Promise<GitCommandSuccess | GitCommandFailure> {
  return new Promise((resolveResult) => {
    const child = spawn("git", ["-C", cwd, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        GIT_OPTIONAL_LOCKS: "0",
        GIT_PAGER: "cat",
        LC_ALL: "C",
      },
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let byteLength = 0;
    let exceeded = false;
    const collect = (target: Buffer[]) => (chunk: Buffer): void => {
      byteLength += chunk.byteLength;
      if (byteLength > maximumBytes) {
        exceeded = true;
        child.kill();
        return;
      }
      target.push(chunk);
    };
    child.stdout.on("data", collect(stdout));
    child.stderr.on("data", collect(stderr));
    child.on("error", (error) => {
      resolveResult({ valid: false, message: error.message });
    });
    child.on("close", (code) => {
      if (exceeded) {
        resolveResult({
          valid: false,
          message: `Git output exceeded the ${maximumBytes}-byte safety limit.`,
        });
      } else if (code === 0) {
        resolveResult({ valid: true, stdout: Buffer.concat(stdout).toString("utf8") });
      } else {
        resolveResult({
          valid: false,
          message: Buffer.concat(stderr).toString("utf8").trim() || `Git exited with code ${String(code)}.`,
        });
      }
    });
  });
}

function failure(
  classification: "environment" | "repository" | "source",
  code: string,
  message: string,
): GitProjectLoadFailure {
  return { valid: false, classification, code, message };
}
