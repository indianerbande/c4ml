import { readdir, readFile, realpath, stat } from "node:fs/promises";
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";

import {
  architectureProjectManifestName,
  createArchitectureProjectInput,
  createImplicitArchitectureProject,
  parseArchitectureProjectManifest,
  type ArchitectureProjectInput,
} from "@c4ml/compiler-core";

export * from "./git.js";

export interface LoadedProjectDocumentPath {
  readonly uri: string;
  readonly path: string;
}

export type ProjectLoadResult =
  | {
      readonly valid: true;
      readonly project: ArchitectureProjectInput;
      readonly projectRoot: string;
      readonly inputPath: string;
      readonly documentPaths: readonly LoadedProjectDocumentPath[];
    }
  | {
      readonly valid: false;
      readonly classification: "environment" | "source";
      readonly code: string;
      readonly message: string;
    };

export async function loadArchitectureProject(
  path: string,
): Promise<ProjectLoadResult> {
  const inputPath = resolve(path);
  let inputStat;
  try {
    inputStat = await stat(inputPath);
  } catch (error: unknown) {
    return environmentFailure(
      "C4ML-PROJECT-NODE-001",
      `Cannot read ${inputPath}: ${errorMessage(error)}`,
    );
  }

  if (inputStat.isFile() && basename(inputPath) !== architectureProjectManifestName) {
    if (extname(inputPath).toLowerCase() !== ".c4ml") {
      return sourceFailure(
        "C4ML-PROJECT-NODE-002",
        `Expected a .c4ml source, ${architectureProjectManifestName}, or project directory.`,
      );
    }
    try {
      const text = await readFile(inputPath, "utf8");
      return {
        valid: true,
        inputPath,
        projectRoot: dirname(inputPath),
        project: createImplicitArchitectureProject({
          uri: basename(inputPath),
          text,
        }),
        documentPaths: [{ uri: basename(inputPath), path: inputPath }],
      };
    } catch (error: unknown) {
      return environmentFailure(
        "C4ML-PROJECT-NODE-001",
        `Cannot read ${inputPath}: ${errorMessage(error)}`,
      );
    }
  }

  if (!inputStat.isDirectory() && !inputStat.isFile()) {
    return sourceFailure(
      "C4ML-PROJECT-NODE-002",
      `Expected a regular source file, project manifest, or directory at ${inputPath}.`,
    );
  }

  const projectRoot = inputStat.isDirectory() ? inputPath : dirname(inputPath);
  const manifestPath = inputStat.isDirectory()
    ? join(inputPath, architectureProjectManifestName)
    : inputPath;
  let manifestSource: string | undefined;
  try {
    manifestSource = await readFile(manifestPath, "utf8");
  } catch (error: unknown) {
    if (!inputStat.isDirectory() || !isMissingFile(error)) {
      return environmentFailure(
        "C4ML-PROJECT-NODE-001",
        `Cannot read ${manifestPath}: ${errorMessage(error)}`,
      );
    }
  }

  if (manifestSource === undefined) {
    return loadImplicitDirectory(projectRoot, inputPath);
  }

  const parsedManifest = parseArchitectureProjectManifest(manifestSource);
  if (!parsedManifest.valid) {
    const issue = parsedManifest.issues[0]!;
    return sourceFailure(issue.code, issue.message);
  }

  let rootRealPath: string;
  try {
    rootRealPath = await realpath(projectRoot);
  } catch (error: unknown) {
    return environmentFailure(
      "C4ML-PROJECT-NODE-001",
      `Cannot resolve project directory ${projectRoot}: ${errorMessage(error)}`,
    );
  }

  const documents: Array<{ readonly uri: string; readonly text: string }> = [];
  const documentPaths: LoadedProjectDocumentPath[] = [];
  for (const uri of parsedManifest.manifest.sources) {
    const sourcePath = resolve(projectRoot, ...uri.split("/"));
    let sourceRealPath: string;
    try {
      sourceRealPath = await realpath(sourcePath);
    } catch (error: unknown) {
      return environmentFailure(
        "C4ML-PROJECT-NODE-003",
        `Cannot read project source ${sourcePath}: ${errorMessage(error)}`,
      );
    }
    const relativeRealPath = relative(rootRealPath, sourceRealPath);
    if (
      relativeRealPath === ".." ||
      relativeRealPath.split(sep)[0] === ".." ||
      isAbsolute(relativeRealPath)
    ) {
      return sourceFailure(
        "C4ML-PROJECT-NODE-004",
        `Project source "${uri}" resolves outside the project directory.`,
      );
    }
    try {
      documents.push({ uri, text: await readFile(sourceRealPath, "utf8") });
      documentPaths.push({ uri, path: sourceRealPath });
    } catch (error: unknown) {
      return environmentFailure(
        "C4ML-PROJECT-NODE-003",
        `Cannot read project source ${sourcePath}: ${errorMessage(error)}`,
      );
    }
  }

  return {
    valid: true,
    inputPath,
    projectRoot,
    project: createArchitectureProjectInput({
      id: parsedManifest.manifest.id,
      ...(parsedManifest.manifest.name === undefined
        ? {}
        : { name: parsedManifest.manifest.name }),
      ...(parsedManifest.manifest.description === undefined
        ? {}
        : { description: parsedManifest.manifest.description }),
      documents,
    }),
    documentPaths,
  };
}

async function loadImplicitDirectory(
  projectRoot: string,
  inputPath: string,
): Promise<ProjectLoadResult> {
  let sourceNames: string[];
  try {
    sourceNames = (await readdir(projectRoot, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".c4ml")
      .map(({ name }) => name)
      .sort();
  } catch (error: unknown) {
    return environmentFailure(
      "C4ML-PROJECT-NODE-001",
      `Cannot inspect project directory ${projectRoot}: ${errorMessage(error)}`,
    );
  }
  if (sourceNames.length !== 1) {
    return sourceFailure(
      "C4ML-PROJECT-NODE-005",
      sourceNames.length === 0
        ? `Directory ${projectRoot} contains no root-level .c4ml source and no ${architectureProjectManifestName}.`
        : `Directory ${projectRoot} contains several .c4ml sources; add ${architectureProjectManifestName} to select the project documents explicitly.`,
    );
  }
  const sourceName = sourceNames[0]!;
  const sourcePath = join(projectRoot, sourceName);
  try {
    return {
      valid: true,
      inputPath,
      projectRoot,
      project: createImplicitArchitectureProject({
        uri: sourceName,
        text: await readFile(sourcePath, "utf8"),
      }),
      documentPaths: [{ uri: sourceName, path: sourcePath }],
    };
  } catch (error: unknown) {
    return environmentFailure(
      "C4ML-PROJECT-NODE-001",
      `Cannot read ${sourcePath}: ${errorMessage(error)}`,
    );
  }
}

function sourceFailure(code: string, message: string): ProjectLoadResult {
  return { valid: false, classification: "source", code, message };
}

function environmentFailure(code: string, message: string): ProjectLoadResult {
  return { valid: false, classification: "environment", code, message };
}

function isMissingFile(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
