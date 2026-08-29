import { access, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const acceptedMonacoVersion = "0.56.0";
const acceptedElkVersion = "0.12.0";
const acceptedPlexVersion = "0.0.0";
const acceptedEditorMonoVersion = "0.0.0";
const editorRoot = join(repositoryRoot, "apps", "editor");
const installedMonacoRoot = join(
  editorRoot,
  "node_modules",
  "monaco-editor",
);
const installedElkRoot = join(editorRoot, "node_modules", "elkjs");
const installedPlexRoot = join(
  editorRoot,
  "node_modules",
  "@c4ml",
  "font-ibm-plex",
);
const installedEditorMonoRoot = join(
  editorRoot,
  "node_modules",
  "@c4ml",
  "font-editor-mono",
);
const materialSymbolsRoot = join(
  editorRoot,
  "src",
  "assets",
  "material-symbols",
);
const editorBuildRoot = join(repositoryRoot, "build", "editor");

const editorManifest = await readJson(join(editorRoot, "package.json"));
const installedMonacoManifest = await readJson(
  join(installedMonacoRoot, "package.json"),
);
const installedElkManifest = await readJson(
  join(installedElkRoot, "package.json"),
);
const installedPlexManifest = await readJson(
  join(installedPlexRoot, "package.json"),
);
const installedEditorMonoManifest = await readJson(
  join(installedEditorMonoRoot, "package.json"),
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
  editorManifest.dependencies?.["@c4ml/font-ibm-plex"],
  "workspace:*",
  "apps/editor must use the reviewed local IBM Plex asset package",
);
assertEqual(
  editorManifest.dependencies?.["@c4ml/font-editor-mono"],
  "workspace:*",
  "apps/editor must use the reviewed local editor font asset package",
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
assertEqual(
  installedPlexManifest.version,
  acceptedPlexVersion,
  "the installed IBM Plex asset package must match the reviewed workspace version",
);
assertEqual(
  installedPlexManifest.license,
  "OFL-1.1",
  "the reviewed IBM Plex asset package must remain OFL-1.1",
);
assertEqual(
  installedEditorMonoManifest.version,
  acceptedEditorMonoVersion,
  "the installed editor font asset package must match the reviewed workspace version",
);
assertEqual(
  installedEditorMonoManifest.license,
  "OFL-1.1 AND MIT AND Bitstream-Vera",
  "the editor font package must retain its reviewed aggregate license expression",
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
const upstreamPlexLicense = join(installedPlexRoot, "LICENSE.txt");
const packagedPlexLicense = join(
  editorBuildRoot,
  "browser",
  "third-party",
  "ibm-plex",
  "LICENSE.txt",
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
await assertSameFile(
  upstreamPlexLicense,
  packagedPlexLicense,
  "IBM Plex's OFL license must be copied unchanged into the editor artifact",
);

const reviewedPlexAssets = {
  "sans/IBMPlexSans-Bold.woff2":
    "fa7130d854a660b39a7fc9e6e0f2dc23dba5f1346e2adea3e1fe37b6d884133d",
  "sans/IBMPlexSans-Italic.woff2":
    "13284fab1821ba6e3652c1580fcf2bbfd8c9309520c69b3d1224dab40b37c597",
  "sans/IBMPlexSans-Medium.woff2":
    "5660f8a658f8bb50dbc005232f885eadffd2bc1c235c4f6fbb63469d1f9cde6d",
  "sans/IBMPlexSans-Regular.woff2":
    "ba711a3085ff9f27440b6b9c4550cfc47c97bf36591d5da958b975bb3add8c1a",
  "sans/IBMPlexSans-SemiBold.woff2":
    "f78048030eab62e860efa39a0df79e2e5581bf122eb95b9bc42c0b8a4988d205",
  "mono/IBMPlexMono-Bold.woff2":
    "5788454f0ba4bd6300752c474215c4dd926682fa173ae1c6252d57828b6a235d",
  "mono/IBMPlexMono-Italic.woff2":
    "6afc2a6edd9a1d1f8104daf139a5062392f47da2f97fe19cb18a6a5a1fa67ec3",
  "mono/IBMPlexMono-Regular.woff2":
    "49ce58b41a0e1cb921c0f58d9a5b8b96a2cc21437c7066f3ba4f24873076d131",
};
for (const [relativePath, expectedHash] of Object.entries(reviewedPlexAssets)) {
  const upstreamAsset = join(installedPlexRoot, "fonts", relativePath);
  const packagedAsset = join(
    editorBuildRoot,
    "browser",
    "fonts",
    "ibm-plex",
    relativePath,
  );
  await assertHash(
    upstreamAsset,
    expectedHash,
    `Reviewed IBM Plex asset changed: ${relativePath}`,
  );
  await assertSameFile(
    upstreamAsset,
    packagedAsset,
    `Editor packaging changed IBM Plex asset ${relativePath}`,
  );
}

const reviewedEditorMonoAssets = {
  "fira-code/FiraCode-Regular.woff2":
    "a6ce59520b90e15d7062ffef214f94c8add5a4085c0bbb1683602ef227a4d1fe",
  "hack/hack-regular.woff2":
    "0b0ef254dfc7afc172528e3166eace813989e1cf77f576ddae5f5e8fb2897c06",
  "source-code-pro/SourceCodePro-Regular.ttf.woff2":
    "714eee29b70d191f5bf4b3a06b68f2c50522b1303d31c7d44dcefdcc5f9defd0",
  "intel-one-mono/IntelOneMono-Regular.woff2":
    "cf33e6d7cc78ea0f159a311bf7f5cc9d0a64b324c28b6a8919986d748d86e458",
  "inconsolata/Inconsolata-Regular.ttf":
    "127875d255d4c5973ca57267a43bb9d1c04397e6c7d236984a595b6cdcb12b7c",
  "cascadia-code/CascadiaCode-Regular.woff2":
    "55e460d6c9345a4769ed28fc9f01ecc2160a10e95080523f3d340a0d208288c8",
};
for (const [relativePath, expectedHash] of Object.entries(
  reviewedEditorMonoAssets,
)) {
  const upstreamAsset = join(installedEditorMonoRoot, "fonts", relativePath);
  const packagedAsset = join(
    editorBuildRoot,
    "browser",
    "fonts",
    "editor-mono",
    relativePath,
  );
  await assertHash(
    upstreamAsset,
    expectedHash,
    `Reviewed editor font asset changed: ${relativePath}`,
  );
  await assertSameFile(
    upstreamAsset,
    packagedAsset,
    `Editor packaging changed editor font asset ${relativePath}`,
  );
}

for (const filename of [
  "FiraCode-LICENSE.txt",
  "Hack-LICENSE.md",
  "SourceCodePro-LICENSE.md",
  "IntelOneMono-OFL.txt",
  "Inconsolata-OFL.txt",
  "CascadiaCode-LICENSE.txt",
]) {
  await assertSameFile(
    join(installedEditorMonoRoot, "licenses", filename),
    join(
      editorBuildRoot,
      "browser",
      "third-party",
      "editor-mono",
      filename,
    ),
    `Editor packaging changed editor font license ${filename}`,
  );
}

const reviewedMaterialSymbolAssets = {
  "download.svg":
    "13cbeb084e6056eeaf439eacad956f70a6104bf29c4501066974a25555136816",
  "folder_open.svg":
    "6d10551fa941f384f2dd6f6b63ad97e2c06627751a63cc626a16c8ffcf5d4009",
  "menu_book.svg":
    "92db94b810abc5a7b62650e56ef6fabae082623d96fd4416deee132c2840f2ba",
  "schema.svg":
    "60b295a4f6ef8dc90e02660418048986bb097187afb42fd401b20dcff026e588",
  "settings.svg":
    "24e25b8b7cd3de339ac83fbdcfa710e32cbb3b9fb16fea840362fe56e5680c97",
};
for (const [filename, expectedHash] of Object.entries(
  reviewedMaterialSymbolAssets,
)) {
  const sourceAsset = join(materialSymbolsRoot, filename);
  const packagedAsset = join(
    editorBuildRoot,
    "browser",
    "icons",
    "material-symbols",
    filename,
  );
  await assertHash(
    sourceAsset,
    expectedHash,
    `Reviewed Material Symbol changed: ${filename}`,
  );
  await assertSameFile(
    sourceAsset,
    packagedAsset,
    `Editor packaging changed Material Symbol ${filename}`,
  );
}
await assertSameFile(
  join(materialSymbolsRoot, "SOURCE.md"),
  join(
    editorBuildRoot,
    "browser",
    "third-party",
    "material-symbols",
    "SOURCE.md",
  ),
  "Material Symbols source notice must be copied unchanged",
);
await assertSameFile(
  join(materialSymbolsRoot, "LICENSE"),
  join(
    editorBuildRoot,
    "browser",
    "third-party",
    "material-symbols",
    "LICENSE",
  ),
  "Material Symbols Apache-2.0 license must be present in the editor artifact",
);
await assertSameFile(
  join(repositoryRoot, "LICENSE"),
  join(materialSymbolsRoot, "LICENSE"),
  "Material Symbols license copy must remain the unmodified Apache-2.0 text",
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
  `Accepted editor dependencies and packaged notices verified (Monaco ${acceptedMonacoVersion}, ELK.js ${acceptedElkVersion}, IBM Plex v6.4.2 assets, six optional editor fonts, five Material Symbols).`,
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

async function assertHash(path, expectedHash, message) {
  await requireFile(path, "reviewed asset");
  const hash = createHash("sha256").update(await readFile(path)).digest("hex");
  if (hash !== expectedHash) {
    throw new Error(`${message}: expected ${expectedHash}, received ${hash}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
}
