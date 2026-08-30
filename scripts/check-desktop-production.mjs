import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);
const desktopRoot = join(repositoryRoot, "apps", "desktop");
const requireFromDesktop = createRequire(join(desktopRoot, "package.json"));
const requireFromResvgAdapter = createRequire(
  join(repositoryRoot, "packages", "render-resvg", "package.json"),
);

const rootManifest = JSON.parse(readRequired("package.json"));
assert.deepEqual(
  rootManifest.devEngines?.runtime,
  { name: "node", version: "24.19.0", onFail: "download" },
  "desktop builds must use the locked pnpm-managed Node.js runtime",
);
const desktopManifest = JSON.parse(readRequired("apps/desktop/package.json"));
assert.equal(desktopManifest.main, "dist/main.cjs");
assert.equal(
  desktopManifest.dependencies,
  undefined,
  "desktop runtime dependencies must be bundled rather than copied as node_modules",
);
assert.equal(
  desktopManifest.devDependencies?.["@c4ml/render-resvg"],
  "workspace:*",
  "desktop PNG export must use the replaceable C4ML renderer adapter",
);
assert.equal(
  desktopManifest.devDependencies?.["@c4ml/project-node"],
  "workspace:*",
  "desktop project loading must use the shared replaceable Node.js adapter",
);

const expectedPackages = [
  ["electron", "44.0.0", "MIT"],
  ["@electron-forge/cli", "7.11.2", "MIT"],
  ["@electron-forge/maker-dmg", "7.11.2", "MIT"],
  ["@electron-forge/maker-squirrel", "7.11.2", "MIT"],
  ["@electron-forge/maker-zip", "7.11.2", "MIT"],
  ["@electron-forge/plugin-fuses", "7.11.2", "MIT"],
  ["@electron/fuses", "2.1.3", "MIT"],
  ["@electron/node-gyp", "10.2.0-electron.2", "MIT"],
  ["electron-squirrel-startup", "1.0.1", "Apache-2.0"],
  ["fs-xattr", "0.3.1", "MIT"],
  ["macos-alias", "0.2.12", "MIT"],
  ["node-gyp", "12.3.0", "MIT"],
];

for (const [packageName, version, license] of expectedPackages) {
  const manifestPath = findPackageManifest(packageName);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert.equal(
    manifest.version,
    version,
    `${packageName} must remain pinned to the reviewed version`,
  );
  assert.equal(
    manifest.license,
    license,
    `${packageName} must retain the reviewed license`,
  );
}

const resvgManifest = JSON.parse(
  readFileSync(
    findPackageManifest("@resvg/resvg-js", requireFromResvgAdapter),
    "utf8",
  ),
);
assert.equal(resvgManifest.version, "2.6.2");
assert.equal(resvgManifest.license, "MPL-2.0");

const runtimeLicenseRoot = dirname(
  findPackageManifest("electron-squirrel-startup"),
);
assert.ok(
  ["LICENSE", "LICENSE.md", "LICENSE.txt"].some((name) =>
    existsSync(join(runtimeLicenseRoot, name)),
  ),
  "the packaged Windows startup dependency must retain its license",
);

const editorIndex = readRequired("build/editor/browser/index.html");
assert.match(
  editorIndex,
  /Content-Security-Policy/,
  "the packaged editor must declare its local-only content security policy",
);
assert.doesNotMatch(
  editorIndex,
  /https?:\/\//,
  "the packaged editor entry point must not require remote assets",
);

const mainBundle = readRequired("apps/desktop/dist/main.cjs");
const preloadBundle = readRequired("apps/desktop/dist/preload.cjs");
const previewPreloadBundle = readRequired(
  "apps/desktop/dist/preview-preload.cjs",
);
const forgeConfig = readRequired("apps/desktop/forge.config.cjs");
const desktopNotices = readRequired("apps/desktop/THIRD_PARTY_NOTICES.txt");
const packagedLauncher = readRequired(
  "apps/desktop/scripts/launch-packaged.cjs",
);
for (const requiredSetting of [
  "contextIsolation",
  "nodeIntegration",
  "sandbox",
  "webSecurity",
  "setPermissionRequestHandler",
  "setWindowOpenHandler",
  "registerSchemesAsPrivileged",
  "protocol.handle",
  "loadURL",
]) {
  assert.ok(
    mainBundle.includes(requiredSetting),
    `desktop main bundle is missing ${requiredSetting}`,
  );
}
assert.ok(
  preloadBundle.includes("c4mlDesktop"),
  "desktop preload must expose only the owned C4ML bridge",
);
assert.ok(
  preloadBundle.includes("c4ml:desktop:export-png"),
  "desktop preload must expose the owned PNG export channel",
);
assert.ok(
  preloadBundle.includes("c4ml:desktop:open-project"),
  "desktop preload must expose the owned project-open channel",
);
assert.ok(
  preloadBundle.includes("c4ml:desktop:set-ui-language"),
  "desktop preload must expose the owned UI-language channel",
);
assert.ok(
  preloadBundle.includes("c4ml:desktop:open-preview-window"),
  "desktop preload must expose the owned preview-window channel",
);
assert.ok(
  previewPreloadBundle.includes("c4mlPreview"),
  "preview preload must expose the projection-only C4ML bridge",
);
assert.ok(
  previewPreloadBundle.includes("c4ml:desktop:preview-projection"),
  "preview preload must expose the read-only projection channel",
);
assert.doesNotMatch(
  previewPreloadBundle,
  /c4mlDesktop|open-document|open-project|save-document|export-png/,
  "preview preload must not expose document, project, save, or export authority",
);
assert.ok(
  mainBundle.includes("C4ML-DESKTOP-EXPORT-001"),
  "desktop main bundle must validate PNG rendering failures",
);
assert.doesNotMatch(
  preloadBundle,
  /node:fs|require\(["']fs["']\)/,
  "desktop preload must not expose filesystem access",
);
assert.doesNotMatch(
  previewPreloadBundle,
  /node:fs|require\(["']fs["']\)/,
  "preview preload must not expose filesystem access",
);
for (const requiredFuse of [
  "RunAsNode",
  "EnableCookieEncryption",
  "EnableNodeOptionsEnvironmentVariable",
  "EnableNodeCliInspectArguments",
  "EnableEmbeddedAsarIntegrityValidation",
  "OnlyLoadAppFromAsar",
  "LoadBrowserProcessSpecificV8Snapshot",
  "GrantFileProtocolExtraPrivileges",
  "WasmTrapHandlers",
]) {
  assert.ok(
    forgeConfig.includes(requiredFuse),
    `desktop Forge config is missing the explicit ${requiredFuse} fuse`,
  );
}
assert.match(forgeConfig, /@electron-forge\/maker-squirrel/);
assert.match(forgeConfig, /@electron-forge\/maker-dmg/);
assert.match(forgeConfig, /@electron-forge\/maker-zip/);
assert.match(desktopNotices, /electron-squirrel-startup 1\.0\.1/);
assert.match(desktopNotices, /Apache License, Version 2\.0/);
assert.match(desktopNotices, /resvg-js 2\.6\.2/);
assert.match(desktopNotices, /Mozilla Public License 2\.0/);
assert.match(forgeConfig, /font-ibm-plex\/fonts\/sans/);
assert.match(packagedLauncher, /C4ML-\$\{process\.platform\}-\$\{process\.arch\}/);
assert.match(packagedLauncher, /--c4ml-smoke/);

for (const relativePath of [
  "build/editor/browser/main.js",
  "build/editor/browser/third-party/elkjs/elk-worker.min.js",
  "build/editor/browser/fonts/ibm-plex/sans/IBMPlexSans-Regular.woff2",
  "build/editor/3rdpartylicenses.txt",
]) {
  assert.ok(existsSync(join(repositoryRoot, relativePath)), `${relativePath} missing`);
}

const nativeRenderers = readdirSync(join(desktopRoot, "dist")).filter((name) =>
  /^resvgjs\..+\.node$/.test(name),
);
assert.equal(
  nativeRenderers.length,
  1,
  "desktop build must contain exactly one current-platform resvg binary",
);
assert.ok(
  existsSync(join(desktopRoot, "dist", "RESVG_LICENSE.txt")),
  "desktop build must retain the resvg MPL-2.0 license",
);

console.log(
  "Desktop production boundary verified (Electron 44.0.0, Forge 7.11.2, separated secure preloads, local editor assets, controlled resvg PNG export).",
);

function readRequired(relativePath) {
  const path = join(repositoryRoot, relativePath);
  assert.ok(existsSync(path), `${relativePath} missing`);
  return readFileSync(path, "utf8");
}

function findPackageManifest(packageName, requester = requireFromDesktop) {
  try {
    return requester.resolve(`${packageName}/package.json`);
  } catch {
    // Some packages do not export package.json, so fall back to their entry.
  }
  let current = dirname(requester.resolve(packageName));
  while (current !== dirname(current)) {
    const candidate = join(current, "package.json");
    if (existsSync(candidate)) {
      const manifest = JSON.parse(readFileSync(candidate, "utf8"));
      if (manifest.name === packageName) {
        return candidate;
      }
    }
    current = dirname(current);
  }
  throw new Error(`Cannot locate installed package manifest for ${packageName}.`);
}
