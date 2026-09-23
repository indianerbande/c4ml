import { mkdir, realpath, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { isDesktopProjectName } from "@c4ml/desktop-contract";
import { c4mlProjectStarter } from "@c4ml/language-c4ml/project-starter";

export class ProjectCreationError extends Error {
  constructor(readonly reason: "exists" | "invalid" | "write") {
    super(reason);
  }
}

/** The parent comes only from a native directory dialog. Never overwrite a project. */
export async function createDesktopProject(parent: string, name: string): Promise<string> {
  if (!isDesktopProjectName(name)) throw new ProjectCreationError("invalid");
  const parentPath = await realpath(parent);
  const projectPath = resolve(parentPath, name);
  if (dirname(projectPath) !== parentPath) throw new ProjectCreationError("invalid");
  try {
    await mkdir(projectPath); // Exclusive: existing folders, files and links all fail.
  } catch (error) {
    throw new ProjectCreationError(
      (error as NodeJS.ErrnoException).code === "EEXIST" ? "exists" : "write",
    );
  }
  try {
    for (const directory of c4mlProjectStarter.directories) {
      await mkdir(join(projectPath, directory));
    }
    for (const document of c4mlProjectStarter.documents) {
      await writeFile(join(projectPath, document.uri), document.text, { encoding: "utf8", flag: "wx" });
    }
    // The manifest is last: a complete project becomes discoverable only after all sources exist.
    await writeFile(join(projectPath, "c4ml.project.json"), JSON.stringify({
      version: 1,
      id: randomUUID(),
      name,
      sources: c4mlProjectStarter.documents.map(({ uri }) => uri),
    }, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
    return projectPath;
  } catch {
    // Remove only the new directory successfully reserved by this invocation.
    // Refuse cleanup if its identity no longer resolves to the selected child.
    if (await realpath(projectPath).catch(() => undefined) === projectPath) {
      await rm(projectPath, { recursive: true, force: true }).catch(() => undefined);
    }
    throw new ProjectCreationError("write");
  }
}
