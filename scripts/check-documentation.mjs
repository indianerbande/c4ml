import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
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
const languagePairs = [
  ["README.md", "README.de.md"],
  ["CONTRIBUTING.md", "CONTRIBUTING.de.md"],
  ["SECURITY.md", "SECURITY.de.md"],
  ["docs/en/README.md", "docs/de/README.md"],
  [
    "docs/en/ai-assisted-development.md",
    "docs/de/ki-gestuetzte-entwicklung.md",
  ],
  ["docs/en/user-guide.md", "docs/de/user-guide.md"],
  ["docs/en/project-status.md", "docs/de/project-status.md"],
  ["docs/en/projects.md", "docs/de/projects.md"],
  ["docs/en/build-from-source.md", "docs/de/build-from-source.md"],
  ["docs/en/platforms.md", "docs/de/platforms.md"],
  ["docs/en/install-linux.md", "docs/de/install-linux.md"],
  ["docs/en/install-windows.md", "docs/de/install-windows.md"],
  [
    "docs/en/releases/0.1.0-beta.1.md",
    "docs/de/releases/0.1.0-beta.1.md",
  ],
  [
    "docs/en/releases/0.1.0-beta.2.md",
    "docs/de/releases/0.1.0-beta.2.md",
  ],
  [
    "docs/en/releases/0.1.0-beta.3.md",
    "docs/de/releases/0.1.0-beta.3.md",
  ],
  [
    "docs/en/releases/0.1.0-beta.4.md",
    "docs/de/releases/0.1.0-beta.4.md",
  ],
  [
    "docs/en/releases/0.1.0-beta.5.md",
    "docs/de/releases/0.1.0-beta.5.md",
  ],
];

function repositoryPath(path) {
  return join(repositoryRoot, path);
}

function collectMarkdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
      return [];
    }
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectMarkdownFiles(absolutePath);
    }
    if (!entry.isFile() || extname(entry.name).toLowerCase() !== ".md") {
      return [];
    }
    return [relative(repositoryRoot, absolutePath).split(sep).join("/")];
  });
}

function markdownFiles() {
  if (!process.argv.includes("--filesystem")) {
    try {
      return execFileSync(
        "git",
        ["ls-files", "--cached", "--others", "--exclude-standard", "*.md"],
        {
          cwd: repositoryRoot,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        },
      )
        .trim()
        .split(/\r?\n/u)
        .filter(Boolean);
    } catch {
      // A GitHub source archive intentionally has no .git directory.
    }
  }
  return collectMarkdownFiles(repositoryRoot).sort();
}

function relativeLink(from, to) {
  const path = relative(dirname(from), to).split(sep).join("/");
  return path === "" ? to.split(sep).at(-1) : path;
}

for (const [englishPath, germanPath] of languagePairs) {
  const english = readFileSync(repositoryPath(englishPath), "utf8");
  const german = readFileSync(repositoryPath(germanPath), "utf8");
  const germanLink = relativeLink(englishPath, germanPath);
  const englishLink = relativeLink(germanPath, englishPath);

  assert.ok(
    english.includes(`(${germanLink})`),
    `${englishPath} must link directly to ${germanPath}`,
  );
  assert.ok(
    german.includes(`(${englishLink})`),
    `${germanPath} must link directly to ${englishPath}`,
  );

  const englishSections = english.match(/^## /gmu)?.length ?? 0;
  const germanSections = german.match(/^## /gmu)?.length ?? 0;
  assert.equal(
    germanSections,
    englishSections,
    `${germanPath} must cover the same top-level sections as ${englishPath}`,
  );
}

const linkPattern = /\[[^\]]*\]\(([^)]+)\)/gu;
const failures = [];
const checkedMarkdownFiles = markdownFiles();
for (const markdownPath of checkedMarkdownFiles) {
  if (markdownPath.endsWith(".c4ml-narrative.md")) {
    continue;
  }
  const markdown = readFileSync(repositoryPath(markdownPath), "utf8");
  for (const match of markdown.matchAll(linkPattern)) {
    let target = match[1].trim();
    if (target.startsWith("<") && target.endsWith(">")) {
      target = target.slice(1, -1);
    }
    target = target.split(/\s+["']/u, 1)[0];
    if (/^(?:[a-z]+:|#)/iu.test(target)) {
      continue;
    }
    const decodedTarget = decodeURIComponent(target.split("#", 1)[0]);
    if (decodedTarget === "") {
      continue;
    }
    const absoluteTarget = resolve(repositoryRoot, dirname(markdownPath), decodedTarget);
    const repositoryPrefix = `${resolve(repositoryRoot)}${sep}`;
    if (
      !absoluteTarget.startsWith(repositoryPrefix) ||
      !existsSync(absoluteTarget) ||
      (!statSync(absoluteTarget).isFile() && !statSync(absoluteTarget).isDirectory())
    ) {
      failures.push(`${markdownPath}: broken local link ${target}`);
    }
  }
}

assert.deepEqual(failures, [], failures.join("\n"));
console.log(
  `Documentation check passed (${languagePairs.length} language pairs, ${checkedMarkdownFiles.length} Markdown files).`,
);
