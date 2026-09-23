import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadArchitectureProject } from "@c4ml/project-node";
import { createDesktopProject } from "../src/project-creation.js";

const failure = vi.hoisted(() => ({ afterWrites: -1 }));
vi.mock("node:fs/promises", async importOriginal => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, writeFile: async (...args: Parameters<typeof actual.writeFile>) => {
    if (failure.afterWrites === 0) {
      failure.afterWrites = -1;
      throw Object.assign(new Error("Simulated disk write failure"), { code: "EACCES" });
    }
    if (failure.afterWrites > 0) failure.afterWrites--;
    return actual.writeFile(...args);
  } };
});

const roots: string[] = [];
async function parent(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), "c4ml-create-"));
  roots.push(path);
  return path;
}
afterEach(async () => { failure.afterWrites = -1; for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });

describe("native project creation", () => {
  it("cleans up a partially written new project without touching its siblings", async () => {
    const root = await parent();
    await writeFile(join(root, "keep.txt"), "existing sibling");
    failure.afterWrites = 2;
    await expect(createDesktopProject(root, "Incomplete")).rejects.toMatchObject({ reason: "write" });
    expect(await readdir(root)).toEqual(["keep.txt"]);
    expect(await readFile(join(root, "keep.txt"), "utf8")).toBe("existing sibling");
  });
  it("creates a reloadable explicit project and preserves its persisted identity", async () => {
    const root = await parent();
    const path = await createDesktopProject(root, "Garten Planung");
    expect(await readdir(path)).toEqual(["c4ml.project.json", "docs", "model", "relations", "views"]);
    expect(await readdir(join(path, "docs"))).toEqual([]);
    const loaded = await loadArchitectureProject(path);
    expect(loaded.valid).toBe(true);
    if (!loaded.valid) throw new Error(loaded.message);
    expect(loaded.project.name).toBe("Garten Planung");
    expect(loaded.project.documents.map(({ uri }) => uri)).toEqual([
      "model/architecture.c4ml", "relations/relationships.c4ml", "views/views.c4ml",
    ]);
    expect(await loadArchitectureProject(path)).toEqual(loaded);
  });

  it("leaves existing directories, contents and files untouched", async () => {
    const root = await parent();
    await mkdir(join(root, "Existing"));
    await writeFile(join(root, "Existing", "keep.txt"), "user content");
    await expect(createDesktopProject(root, "Existing")).rejects.toMatchObject({ reason: "exists" });
    expect(await readdir(join(root, "Existing"))).toEqual(["keep.txt"]);
    expect(await readFile(join(root, "Existing", "keep.txt"), "utf8")).toBe("user content");
    await writeFile(join(root, "A file"), "keep");
    await expect(createDesktopProject(root, "A file")).rejects.toMatchObject({ reason: "exists" });
    expect(await readFile(join(root, "A file"), "utf8")).toBe("keep");
  });

  it("rejects paths and reserved names before creating anything", async () => {
    const root = await parent();
    for (const name of ["", "..", "../outside", "C:\\outside", "CON", "aux.txt", "trailing.", " name"]) {
      await expect(createDesktopProject(root, name)).rejects.toMatchObject({ reason: "invalid" });
    }
    expect(await readdir(root)).toEqual([]);
  });
});
