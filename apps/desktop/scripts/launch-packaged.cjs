const { cpSync, existsSync, mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { spawnSync } = require("node:child_process");

const packageRoot = resolve(
  __dirname,
  "../../../build/desktop",
  `C4thedral-${process.platform}-${process.arch}`,
);
const executable =
  process.platform === "darwin"
    ? resolve(packageRoot, "C4thedral.app/Contents/MacOS/C4thedral")
    : process.platform === "win32"
      ? resolve(packageRoot, "C4thedral.exe")
      : resolve(packageRoot, "C4thedral");

if (!existsSync(executable)) {
  throw new Error(
    `Packaged C4thedral executable not found at ${executable}. Run the package step first.`,
  );
}

const smoke = process.argv.includes("--smoke");
// The smoke edits the multifile example through the workbench; it works on a
// disposable copy so the repository stays untouched even if a step fails.
const smokeProject = smoke
  ? mkdtempSync(join(tmpdir(), "c4thedral-smoke-project-"))
  : undefined;
if (smokeProject !== undefined) {
  cpSync(
    resolve(__dirname, "../../../examples/projects/garden-pulse-multifile"),
    smokeProject,
    { recursive: true },
  );
}

const result = spawnSync(
  executable,
  smoke ? ["--c4ml-smoke", `--c4ml-smoke-project=${smokeProject}`] : [],
  // The smoke's verdict travels on stdout; capture it so a run that reports
  // nothing cannot pass by accident, and echo it for the person watching.
  { stdio: smoke ? ["inherit", "pipe", "inherit"] : "inherit", encoding: "utf8" },
);
if (smokeProject !== undefined) {
  rmSync(smokeProject, { recursive: true, force: true });
}
if (result.error !== undefined) {
  throw result.error;
}
if (smoke) {
  process.stdout.write(result.stdout ?? "");
  const verdict = (result.stdout ?? "")
    .split(/\r?\n/u)
    .find((line) => line.startsWith("C4ML_DESKTOP_SMOKE "));
  if (verdict === undefined) {
    console.error(
      "C4thedral smoke produced no C4ML_DESKTOP_SMOKE verdict; treating the run as failed.",
    );
    process.exit(1);
  }
  const parsed = JSON.parse(verdict.slice("C4ML_DESKTOP_SMOKE ".length));
  if (parsed.ok !== true || (parsed.authoring !== undefined && parsed.authoring.ok !== true)) {
    console.error("C4thedral smoke reported a failure; see the verdict above.");
    process.exit(1);
  }
}
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
