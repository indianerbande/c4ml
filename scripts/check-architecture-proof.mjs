import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = join(
  repositoryRoot,
  "examples",
  "projects",
  "garden-pulse-multifile",
);
const cliEntry = join(repositoryRoot, "apps", "cli", "dist", "main.js");

const before = await projectDigest(projectRoot);
const first = analyzeProject();
const second = analyzeProject();
const after = await projectDigest(projectRoot);

assert.equal(first.status, 6, "the warning threshold must classify proof findings");
assert.equal(second.status, 6, "the repeated proof run must retain its exit class");
assert.equal(first.stderr, "", "the accepted proof project must not emit CLI errors");
assert.equal(second.stderr, "", "the repeated proof project must not emit CLI errors");
assert.equal(first.stdout, second.stdout, "architecture proof output must be deterministic");
assert.equal(before, after, "architecture proof evaluation must not mutate project files");

const payload = JSON.parse(first.stdout);
assert.equal(payload.command, "analyze");
assert.deepEqual(
  payload.report.findings.map(({ ruleId, severity }) => ({ ruleId, severity })),
  [
    { ruleId: "c4ml.observation.drift", severity: "warning" },
    { ruleId: "c4ml.observation.uncertain", severity: "information" },
    { ruleId: "garden-pulse.owner", severity: "warning" },
  ],
);

for (const finding of payload.report.findings) {
  assert.ok(finding.sourceLocations.length > 0, `${finding.ruleId} needs a source location`);
  assert.ok(finding.evidence.length > 0, `${finding.ruleId} needs explained evidence`);
}

const drift = payload.report.findings.find(
  ({ ruleId }) => ruleId === "c4ml.observation.drift",
);
assert.ok(
  drift.evidence.some(
    ({ origin, adapterId, confirmation, observedAt }) =>
      origin === "observed" &&
      adapterId === "c4ml.example.local-inventory/v1" &&
      confirmation === "confirmed" &&
      observedAt === "2026-08-31T08:15:00.000Z",
  ),
  "drift evidence must retain adapter, confirmation, and normalized time",
);
assert.equal(
  payload.report.snapshot.elements.find(({ id }) => id === "garden-pulse")?.name,
  "Garden Pulse",
  "observed evidence must not reconcile or overwrite authored architecture",
);

console.log(
  "C4thedral architecture-proof gate verified deterministic policy and observation findings without source mutation.",
);

function analyzeProject() {
  const result = spawnSync(
    process.execPath,
    [
      cliEntry,
      "analyze",
      projectRoot,
      "--diagnostics",
      "json",
      "--fail-on",
      "warning",
    ],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        LC_ALL: "C",
        LANG: "C",
        TZ: "UTC",
      },
    },
  );
  if (result.error !== undefined) {
    throw result.error;
  }
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

async function projectDigest(root) {
  const files = await listFiles(root);
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(relative(root, file));
    hash.update("\0");
    hash.update(await readFile(file));
    hash.update("\0");
  }
  return hash.digest("hex");
}

async function listFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path)));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files;
}
