import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const acceptedMonacoVersion = "0.56.0";
const acceptedElkVersion = "0.12.0";
const editorRoot = join(repositoryRoot, "apps", "editor");
const installedMonacoRoot = join(
  editorRoot,
  "node_modules",
  "monaco-editor",
);
const installedElkRoot = join(editorRoot, "node_modules", "elkjs");
const editorBuildRoot = join(repositoryRoot, "build", "editor");

const editorManifest = await readJson(join(editorRoot, "package.json"));
const installedMonacoManifest = await readJson(
  join(installedMonacoRoot, "package.json"),
);
const installedElkManifest = await readJson(
  join(installedElkRoot, "package.json"),
);

assertEqual(
  editorManifest.dependencies?.["monaco-editor"],
  acceptedMonacoVersion,
  "apps/editor must pin the accepted Monaco version exactly",
);
assertEqual(
  editorManifest.dependencies?.["elkjs"],
  acceptedElkVersion,
  "apps/editor must pin the reviewed ELK.js version exactly",
);
assertEqual(
  installedElkManifest.version,
  acceptedElkVersion,
  "the installed ELK.js version must match the reviewed browser version",
);
assertEqual(
  installedElkManifest.license,
  "EPL-2.0 OR GPL-3.0-or-later",
  "the reviewed ELK.js dual-license expression must remain unchanged",
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
await requireFile(
  join(
    installedMonacoRoot,
    "esm",
    "vs",
    "editor",
    "contrib",
    "semanticTokens",
    "browser",
    "documentSemanticTokens.js",
  ),
  "the pinned adapter-local Monaco semantic-token feature",
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
const upstreamElkLicense = join(installedElkRoot, "LICENSE.md");
const upstreamElkWorker = join(installedElkRoot, "lib", "elk-worker.min.js");
const packagedElkLicense = join(
  editorBuildRoot,
  "browser",
  "third-party",
  "elkjs",
  "LICENSE.md",
);
const packagedElkWorker = join(
  editorBuildRoot,
  "browser",
  "third-party",
  "elkjs",
  "elk-worker.min.js",
);

await assertSameFile(
  upstreamLicense,
  packagedLicense,
  "Monaco's license must be copied unchanged into the editor artifact",
);
await assertSameFile(
  upstreamElkLicense,
  packagedElkLicense,
  "ELK.js's license must be copied unchanged into the editor artifact",
);
await assertSameFile(
  upstreamElkWorker,
  packagedElkWorker,
  "the editor must package the reviewed ELK.js worker unchanged",
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
  "elkjs",
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
  `Accepted editor dependencies and packaged notices verified (Monaco ${acceptedMonacoVersion}, ELK.js ${acceptedElkVersion}).`,
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
