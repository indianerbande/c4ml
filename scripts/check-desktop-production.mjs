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
const workspaceConfiguration = readRequired("pnpm-workspace.yaml");
const lockfile = readRequired("pnpm-lock.yaml");
assert.deepEqual(
  rootManifest.devEngines?.runtime,
  { name: "node", version: "24.15.0", onFail: "warn" },
  "desktop builds must prefer Node.js 24.15.0 without forcing a runtime download",
);
const desktopManifest = JSON.parse(readRequired("apps/desktop/package.json"));
const packagingRuntimeGuard = readRequired(
  "apps/desktop/scripts/check-packaging-runtime.cjs",
);
assert.equal(desktopManifest.main, "dist/main.cjs");
assert.equal(
  desktopManifest.productName,
  "C4thedral",
  "the visible desktop product name must be C4thedral",
);
assert.equal(rootManifest.version, "0.1.0-beta.1");
assert.equal(
  desktopManifest.version,
  rootManifest.version,
  "the desktop and repository release identities must stay aligned",
);
assert.equal(
  rootManifest.scripts?.["desktop:start"],
  "pnpm run desktop:build && pnpm --filter @c4ml/desktop run start",
  "desktop:start must launch the development shell without packaging first",
);
assert.equal(
  desktopManifest.scripts?.start,
  "node scripts/launch-development.cjs",
  "desktop development start must use the C4thedral-owned cross-platform launcher",
);
assert.equal(
  desktopManifest.scripts?.premake,
  undefined,
  "cross-platform makes must not rebuild macOS-native helpers on every host",
);
for (const command of ["package", "make"]) {
  assert.match(
    desktopManifest.scripts?.[command] ?? "",
    /^node scripts\/check-packaging-runtime\.cjs && electron-forge /,
    `${command} must reject unsupported build runtimes before invoking Forge`,
  );
}
assert.match(
  packagingRuntimeGuard,
  /major !== 24 \|\| minor < 15/,
  "desktop packaging must require the accepted Node.js 24.15+ build line",
);
for (const [packageName, version] of [
  ["webpack", "5.109.2"],
  ["minimizer-webpack-plugin", "5.7.0"],
  ["terser", "5.51.1"],
]) {
  assert.ok(
    workspaceConfiguration.includes(`${packageName}: '${version}'`),
    `${packageName} must remain pinned to the reviewed repository-firewall version`,
  );
  assert.ok(
    lockfile.includes(`  ${packageName}@${version}:`),
    `${packageName}@${version} must be present in the locked graph`,
  );
}
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
for (const macOnlyPackage of ["fs-xattr", "macos-alias", "node-gyp"]) {
  assert.equal(
    desktopManifest.devDependencies?.[macOnlyPackage],
    undefined,
    `${macOnlyPackage} must not be a direct cross-platform desktop dependency`,
  );
}
assert.match(
  lockfile,
  /appdmg@0\.6\.6:\n    dependencies:[\s\S]*?      fs-xattr: 0\.3\.1[\s\S]*?    optional: true/,
  "fs-xattr must remain owned by the optional macOS DMG dependency graph",
);
assert.match(
  lockfile,
  /ds-store@0\.1\.6:\n    dependencies:[\s\S]*?      macos-alias: 0\.2\.12[\s\S]*?    optional: true/,
  "macos-alias must remain owned by the optional macOS DMG dependency graph",
);

const expectedPackages = [
  ["electron", "44.0.0", "MIT"],
  ["@electron-forge/cli", "7.11.2", "MIT"],
  ["@electron-forge/maker-deb", "7.11.2", "MIT"],
  ["@electron-forge/maker-dmg", "7.11.2", "MIT"],
  ["@electron-forge/maker-squirrel", "7.11.2", "MIT"],
  ["@electron-forge/maker-zip", "7.11.2", "MIT"],
  ["@electron-forge/plugin-fuses", "7.11.2", "MIT"],
  ["@electron/fuses", "2.1.3", "MIT"],
  ["@electron/node-gyp", "10.2.0-electron.2", "MIT"],
  ["electron-squirrel-startup", "1.0.1", "Apache-2.0"],
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

const debMakerManifestPath = findPackageManifest("@electron-forge/maker-deb");
const debMakerManifest = JSON.parse(readFileSync(debMakerManifestPath, "utf8"));
assert.equal(
  debMakerManifest.optionalDependencies?.["electron-installer-debian"],
  "^3.2.0",
  "the DEB maker must retain the reviewed optional installer version",
);
assert.match(
  lockfile,
  /electron-installer-debian@3\.2\.0:\n[\s\S]*?    os: \[darwin, linux\]/,
  "the DEB installer must remain limited to its supported host platforms",
);
if (process.platform === "darwin" || process.platform === "linux") {
  const requireFromDebMaker = createRequire(debMakerManifestPath);
  const debInstallerManifest = JSON.parse(
    readFileSync(
      findPackageManifest("electron-installer-debian", requireFromDebMaker),
      "utf8",
    ),
  );
  assert.equal(debInstallerManifest.version, "3.2.0");
  assert.equal(debInstallerManifest.license, "MIT");
} else {
  assert.equal(
    process.platform,
    "win32",
    "desktop production checks support the accepted macOS, Linux, and Windows hosts",
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
const forgeConfiguration = requireFromDesktop("./forge.config.cjs");
const electronChecksums = JSON.parse(
  readFileSync(
    findPackageManifest("electron").replace(/package\.json$/, "checksums.json"),
    "utf8",
  ),
);
assert.deepEqual(
  forgeConfiguration.packagerConfig?.download?.checksums,
  electronChecksums,
  "packaging must validate Electron archives without a separate GitHub checksum request",
);
assert.equal(
  forgeConfiguration.packagerConfig?.prune,
  false,
  "the bundled desktop must not run a redundant production install while packaging",
);
assert.equal(
  forgeConfiguration.packagerConfig?.executableName,
  "C4thedral",
  "packaged executables must use the visible product name",
);
assert.equal(
  forgeConfiguration.packagerConfig?.icon,
  join(desktopRoot, "assets", "icon"),
  "native packages must use the original C4thedral icon family",
);
for (const extension of ["svg", "png", "icns", "ico"]) {
  assert.ok(
    existsSync(join(desktopRoot, "assets", `icon.${extension}`)),
    `C4thedral icon.${extension} missing`,
  );
}
const desktopNotices = readRequired("apps/desktop/THIRD_PARTY_NOTICES.txt");
const desktopMainSource = readRequired("apps/desktop/src/main.ts");
const packagedLauncher = readRequired(
  "apps/desktop/scripts/launch-packaged.cjs",
);
const developmentLauncher = readRequired(
  "apps/desktop/scripts/launch-development.cjs",
);
assert.match(
  editorIndex,
  /<title>C4thedral<\/title>/,
  "the packaged editor must identify the visible product as C4thedral",
);
assert.ok(
  mainBundle.includes("C4thedral"),
  "the desktop main bundle must contain the visible product name",
);
assert.match(
  desktopMainSource,
  /app\.setPath\([\s\S]*?"userData"[\s\S]*?legacyUserDataDirectoryName/,
  "the product rename must preserve the established C4ML application-data directory",
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
  preloadBundle.includes("c4ml:desktop:export-svg"),
  "desktop preload must expose the owned SVG export channel",
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
  /c4mlDesktop|open-document|open-project|save-document|export-png|export-svg/,
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
assert.match(forgeConfig, /@electron-forge\/maker-deb/);
assert.deepEqual(
  forgeConfiguration.makers.map(({ name, platforms }) => [name, platforms]),
  [
    ["@electron-forge/maker-squirrel", ["win32"]],
    ["@electron-forge/maker-dmg", ["darwin"]],
    ["@electron-forge/maker-zip", ["darwin"]],
    ["@electron-forge/maker-deb", ["linux"]],
  ],
  "desktop makers must cover native Windows, macOS, and Linux hosts",
);
const debMaker = forgeConfiguration.makers.find(
  ({ name }) => name === "@electron-forge/maker-deb",
);
assert.deepEqual(
  debMaker?.config?.options,
  {
    name: "c4thedral",
    productName: "C4thedral",
    genericName: "Architecture Workbench",
    description: "Local architecture workbench powered by C4ML",
    productDescription:
      "C4thedral is a local architecture workbench for editing C4ML source and exporting deterministic SVG and PNG diagrams.",
    section: "devel",
    priority: "optional",
    maintainer: "C4thedral contributors",
    homepage: "https://github.com/indianerbande/c4ml",
    bin: "C4thedral",
    icon: join(desktopRoot, "assets", "icon.png"),
    categories: ["Development"],
  },
  "the Linux DEB must have stable user-facing package metadata",
);
const linuxInstallGuide = readRequired("INSTALL-LINUX.md");
const debianVersion = rootManifest.version.replace(
  /(\d)[_.+-]?((?:RC|rc|pre|dev|beta|alpha)[_.+-]?\d*)$/u,
  "$1~$2",
);
for (const debianArchitecture of ["amd64", "arm64"]) {
  assert.ok(
    linuxInstallGuide.includes(
      `sudo apt install ./c4thedral_${debianVersion}_${debianArchitecture}.deb`,
    ),
    `the Linux install guide must name the current ${debianArchitecture} DEB exactly`,
  );
}
assert.ok(
  linuxInstallGuide.includes("sudo apt remove c4thedral"),
  "the Linux install guide must include the supported removal command",
);
assert.ok(
  linuxInstallGuide.includes("Starte C4thedral nicht mit `--no-sandbox`"),
  "the Linux install guide must prohibit disabling the production sandbox",
);
const windowsInstallGuide = readRequired("INSTALL-WINDOWS.md");
const squirrelSetupName = `C4thedral-${rootManifest.version} Setup.exe`;
assert.ok(
  windowsInstallGuide.includes(squirrelSetupName),
  "the Windows install guide must name the current Squirrel Setup executable exactly",
);
assert.ok(
  windowsInstallGuide.includes("brauchst weder Node.js noch pnpm"),
  "the Windows install guide must distinguish end-user installation from the build toolchain",
);
assert.ok(
  windowsInstallGuide.includes("Einstellungen → Apps → Installierte Apps"),
  "the Windows install guide must document normal application removal",
);
assert.match(desktopNotices, /electron-squirrel-startup 1\.0\.1/);
assert.match(desktopNotices, /Apache License, Version 2\.0/);
assert.match(desktopNotices, /resvg-js 2\.6\.2/);
assert.match(desktopNotices, /Mozilla Public License 2\.0/);
assert.match(forgeConfig, /font-ibm-plex\/fonts\/sans/);
assert.match(packagedLauncher, /C4thedral-\$\{process\.platform\}-\$\{process\.arch\}/);
assert.match(packagedLauncher, /--c4ml-smoke/);
assert.match(
  developmentLauncher,
  /CFBundleDisplayName["'], ["']C4thedral/,
  "the macOS development bundle must identify itself as C4thedral",
);
assert.match(
  developmentLauncher,
  /CFBundleIconFile["'], ["']c4thedral\.icns/,
  "the macOS development wrapper must use the C4thedral icon",
);
assert.match(
  developmentLauncher,
  /org\.c4ml\.desktop\.development/,
  "the macOS development bundle must use a C4ML-owned bundle identifier",
);
assert.match(
  developmentLauncher,
  /require\(["']electron["']\)/,
  "the development launcher must use the pinned local Electron runtime",
);

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
  "Desktop production boundary verified (Electron 44.0.0, Forge 7.11.2, native Squirrel/DMG/ZIP/DEB makers, separated secure preloads, local editor assets, native SVG save, controlled resvg PNG export).",
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
