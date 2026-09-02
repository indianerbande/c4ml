import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirectories = new Set([
  ".angular",
  ".git",
  ".pnpm-store",
  "build",
  "coverage",
  "dist",
  "node_modules",
]);
const textExtensions = new Set([
  "",
  ".c4ml",
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".svg",
  ".toml",
  ".ts",
  ".txt",
  ".yaml",
  ".yml",
]);
const sensitiveFilePatterns = [
  /(^|\/)\.env(?:\.(?!example$).+)?$/u,
  /(^|\/)(?:credentials?|secrets?)(?:\.|$)/iu,
  /(^|\/)id_(?:ed25519|rsa)$/u,
  /\.(?:jks|key|keystore|p12|pem|pfx)$/iu,
];
const contentPatterns = [
  ["private key", /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/u],
  ["GitHub token", /(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{20,}/u],
  ["AWS access key", /AKIA[0-9A-Z]{16}/u],
  ["Google API key", /AIza[0-9A-Za-z_-]{30,}/u],
  ["OpenAI API key", /sk-[A-Za-z0-9_-]{20,}/u],
  ["Slack token", /xox[baprs]-[A-Za-z0-9-]{10,}/u],
  ["credential-bearing URL", /https?:\/\/[^/@\s]+:[^/@\s]+@/u],
  ["npm credential", /(?:_authToken|_auth|username|password)\s*=/iu],
  ["absolute macOS user path", /\/Users\//u],
  ["private build host", /\b(?:brainbird|flatterrex)\b/iu],
  ["private user handle", /(?:\/home\/phydeaux\b|phydeaux@)/iu],
];

function collectFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
      return [];
    }
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectFiles(absolutePath);
    }
    return entry.isFile() ? [absolutePath] : [];
  });
}

function collectPublicSourceFiles() {
  try {
    const output = execFileSync(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
      { cwd: repositoryRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    return output
      .split("\0")
      .filter((path) => path !== "")
      .map((path) => join(repositoryRoot, path))
      .filter((path) => existsSync(path));
  } catch {
    return collectFiles(repositoryRoot);
  }
}

function readRequired(path) {
  return readFileSync(join(repositoryRoot, path), "utf8");
}

const requiredFiles = [
  "LICENSE",
  ".npmrc",
  "README.md",
  "README.de.md",
  "CONTRIBUTING.md",
  "CONTRIBUTING.de.md",
  "SECURITY.md",
  "SECURITY.de.md",
  "docs/en/README.md",
  "docs/de/README.md",
  "docs/en/project-status.md",
  "docs/de/project-status.md",
  "docs/en/ai-assisted-development.md",
  "docs/de/ki-gestuetzte-entwicklung.md",
  "docs/en/build-from-source.md",
  "docs/de/build-from-source.md",
  "docs/engineering/README.md",
  "scripts/check-documentation.mjs",
  ".github/dependabot.yml",
  ".github/ISSUE_TEMPLATE/bug-report.yml",
  ".github/ISSUE_TEMPLATE/feature-request.yml",
  ".github/workflows/check.yml",
];
for (const path of requiredFiles) {
  readRequired(path);
}

const manifest = JSON.parse(readRequired("package.json"));
assert.equal(manifest.private, true, "the monorepo must not be published to npm");
assert.equal(manifest.license, "Apache-2.0");
assert.equal(manifest.packageManager, "pnpm@11.24.0");
assert.equal(manifest.devEngines?.runtime?.version, "24.15.0");

assert.deepEqual(
  readRequired(".npmrc").trim().split(/\r?\n/u).sort(),
  ["engine-strict=true", "save-exact=true", "strict-peer-dependencies=true"],
  ".npmrc may contain only the reviewed reproducibility settings",
);

const readmes = [
  ["README.md", readRequired("README.md"), [
    "docs/en/README.md",
    "docs/en/project-status.md",
    "docs/en/build-from-source.md",
    "docs/en/ai-assisted-development.md",
    "CONTRIBUTING.md",
    "SECURITY.md",
  ]],
  ["README.de.md", readRequired("README.de.md"), [
    "docs/de/README.md",
    "docs/de/project-status.md",
    "docs/de/build-from-source.md",
    "docs/de/ki-gestuetzte-entwicklung.md",
    "CONTRIBUTING.de.md",
    "SECURITY.de.md",
  ]],
];
for (const [readmePath, readme, publicDocuments] of readmes) {
  for (const publicDocument of publicDocuments) {
    assert.ok(
      readme.includes(publicDocument),
      `${readmePath} must link to ${publicDocument}`,
    );
  }
}
assert.ok(
  readmes[0][1].includes("README.de.md"),
  "README.md must link to README.de.md",
);
assert.ok(
  readmes[1][1].includes("README.md"),
  "README.de.md must link to README.md",
);

const ignoredNames = new Set(readRequired(".gitignore").split(/\r?\n/u));
for (const requiredIgnore of [
  ".env",
  ".env.*",
  "*.key",
  "*.p12",
  "*.pem",
  "*.pfx",
  "electron-windows-sign.log",
]) {
  assert.ok(
    ignoredNames.has(requiredIgnore),
    `.gitignore must contain ${requiredIgnore}`,
  );
}

const allFiles = collectPublicSourceFiles();
const findings = [];
for (const absolutePath of allFiles) {
  const repositoryPath = relative(repositoryRoot, absolutePath).replaceAll("\\", "/");
  if (lstatSync(absolutePath).isSymbolicLink()) {
    findings.push(`${repositoryPath}: symbolic link`);
    continue;
  }
  for (const sensitiveFilePattern of sensitiveFilePatterns) {
    if (sensitiveFilePattern.test(repositoryPath)) {
      findings.push(`${repositoryPath}: sensitive filename`);
    }
  }
  if (!textExtensions.has(extname(repositoryPath).toLowerCase())) {
    continue;
  }
  if (repositoryPath === "scripts/check-public-source.mjs") {
    continue;
  }
  const source = readFileSync(absolutePath, "utf8");
  for (const [label, pattern] of contentPatterns) {
    if (pattern.test(source)) {
      findings.push(`${repositoryPath}: ${label}`);
    }
  }
}
assert.deepEqual(
  findings,
  [],
  `public-source hygiene findings:\n${findings.join("\n")}`,
);

const workflow = readRequired(".github/workflows/check.yml");
assert.match(workflow, /permissions:\s*\n\s+contents: read/u);
assert.doesNotMatch(workflow, /pull_request_target/u);
for (const match of workflow.matchAll(/uses:\s*([^\s]+)/gu)) {
  const action = match[1];
  if (action.startsWith("./")) {
    continue;
  }
  assert.match(
    action,
    /@[0-9a-f]{40}$/u,
    `workflow action must be pinned to a full commit: ${action}`,
  );
}

console.log(
  `Public source boundary verified (${allFiles.length} files, pinned CI actions, no current-tree credential or private-host findings).`,
);
