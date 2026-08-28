import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const acceptedMonacoVersion = "0.56.0";
const editorRoot = join(repositoryRoot, "apps", "editor");
const installedMonacoRoot = join(
  editorRoot,
  "node_modules",
  "monaco-editor",
);
const editorBuildRoot = join(repositoryRoot, "build", "editor");

const editorManifest = await readJson(join(editorRoot, "package.json"));
const installedMonacoManifest = await readJson(
  join(installedMonacoRoot, "package.json"),
);

assertEqual(
  editorManifest.dependencies?.["monaco-editor"],
  acceptedMonacoVersion,
  "apps/editor must pin the accepted Monaco version exactly",
);
assertEqual(
  installedMonacoManifest.version,
  acceptedMonacoVersion,
  "the installed Monaco version must match the reviewed production version",
);
assertEqual(
  installedMonacoManifest.license,
  "MIT",
  "the reviewed Monaco license must remain MIT",
);

await requireFile(
  join(
    installedMonacoRoot,
    "esm",
    "vs",
    "editor",
    "contrib",
    "suggest",
    "browser",
    "suggestController.js",
  ),
  "the pinned adapter-local Monaco Suggest controller",
);

const upstreamLicense = join(installedMonacoRoot, "LICENSE");
const upstreamNotices = join(installedMonacoRoot, "ThirdPartyNotices.txt");
const packagedLicense = join(
  editorBuildRoot,
  "browser",
  "third-party",
  "monaco-editor",
  "LICENSE",
);
const packagedNotices = join(
  editorBuildRoot,
  "browser",
  "third-party",
  "monaco-editor",
  "ThirdPartyNotices.txt",
);

await assertSameFile(
  upstreamLicense,
  packagedLicense,
  "Monaco's license must be copied unchanged into the editor artifact",
);
await assertSameFile(
  upstreamNotices,
  packagedNotices,
  "Monaco's third-party notices must be copied unchanged into the editor artifact",
);

const generatedLicenseInventory = await readFile(
  join(editorBuildRoot, "3rdpartylicenses.txt"),
  "utf8",
);
for (const packageName of [
  "@angular/common",
  "@angular/core",
  "@angular/platform-browser",
  "monaco-editor",
  "rxjs",
]) {
  const entry = `Package: ${packageName}`;
  if (!generatedLicenseInventory.includes(entry)) {
    throw new Error(
      `The editor production license inventory is missing ${packageName}.`,
    );
  }
}

console.log(
  `Accepted editor dependencies and packaged notices verified (Monaco ${acceptedMonacoVersion}).`,
);

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function requireFile(path, description) {
  try {
    await access(path);
  } catch {
    throw new Error(`Missing ${description}: ${path}`);
  }
}

async function assertSameFile(expectedPath, actualPath, message) {
  await requireFile(expectedPath, "upstream notice file");
  await requireFile(actualPath, "packaged notice file");
  const [expected, actual] = await Promise.all([
    readFile(expectedPath),
    readFile(actualPath),
  ]);
  if (!expected.equals(actual)) {
    throw new Error(message);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
}
