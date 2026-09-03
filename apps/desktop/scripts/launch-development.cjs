const {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { createHash } = require("node:crypto");
const { resolve } = require("node:path");
const { spawnSync } = require("node:child_process");

const desktopRoot = resolve(__dirname, "..");
const electronExecutable = require("electron");
const electronVersion = require("electron/package.json").version;
const desktopVersion = require("../package.json").version;
const desktopBuildVersion = desktopVersion.replace("-beta.", ".");
const developmentBundleSchemaVersion = "2";
const applicationIcon = resolve(__dirname, "../assets/icon.icns");
const developmentBundleVersion = `${developmentBundleSchemaVersion}:${electronVersion}:${desktopVersion}:${createHash("sha256")
  .update(readFileSync(applicationIcon))
  .digest("hex")}`;
const applicationArguments = process.argv.slice(2).filter(
  (argument) => argument !== "--prepare-only",
);

let executable = electronExecutable;
if (process.platform === "darwin") {
  executable = prepareMacDevelopmentBundle();
}

if (process.argv.includes("--prepare-only")) {
  console.log(executable);
  process.exit(0);
}

const result = spawnSync(executable, [desktopRoot, ...applicationArguments], {
  cwd: desktopRoot,
  stdio: "inherit",
});
if (result.error !== undefined) {
  throw result.error;
}
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

function prepareMacDevelopmentBundle() {
  const sourceBundle = resolve(electronExecutable, "../../..");
  const developmentRoot = resolve(
    __dirname,
    "../../../build/desktop/development",
  );
  const targetBundle = resolve(developmentRoot, "C4thedral.app");
  const targetExecutable = resolve(
    targetBundle,
    "Contents/MacOS/Electron",
  );
  const versionMarker = resolve(developmentRoot, "electron-version.txt");
  if (
    existsSync(targetExecutable) &&
    existsSync(versionMarker) &&
    readFileSync(versionMarker, "utf8").trim() === developmentBundleVersion
  ) {
    return targetExecutable;
  }

  mkdirSync(developmentRoot, { recursive: true });
  const temporaryBundle = resolve(
    developmentRoot,
    `C4thedral.app.preparing-${process.pid}`,
  );
  rmSync(temporaryBundle, { recursive: true, force: true });
  try {
    runRequired(
      "/usr/bin/ditto",
      [sourceBundle, temporaryBundle],
      "Could not prepare the C4thedral development application",
    );

    const plist = resolve(temporaryBundle, "Contents/Info.plist");
    setPlistValue(plist, "CFBundleName", "C4thedral");
    setPlistValue(plist, "CFBundleDisplayName", "C4thedral");
    setPlistValue(
      plist,
      "CFBundleIdentifier",
      "org.c4ml.desktop.development",
    );
    setPlistValue(plist, "CFBundleShortVersionString", desktopVersion);
    setPlistValue(plist, "CFBundleVersion", desktopBuildVersion);
    setPlistValue(plist, "CFBundleIconFile", "c4thedral.icns");
    configureC4mlDocumentType(plist);
    copyFileSync(
      applicationIcon,
      resolve(temporaryBundle, "Contents/Resources/c4thedral.icns"),
    );
    runRequired(
      "/usr/bin/codesign",
      ["--sign", "-", "--force", "--deep", temporaryBundle],
      "Could not ad-hoc sign the C4thedral development application",
    );

    rmSync(targetBundle, { recursive: true, force: true });
    renameSync(temporaryBundle, targetBundle);
    writeFileSync(versionMarker, `${developmentBundleVersion}\n`, "utf8");
  } catch (error) {
    rmSync(temporaryBundle, { recursive: true, force: true });
    throw error;
  }
  return targetExecutable;
}

function configureC4mlDocumentType(plist) {
  deletePlistValue(plist, "CFBundleDocumentTypes");
  deletePlistValue(plist, "UTExportedTypeDeclarations");
  for (const command of [
    "Add :CFBundleDocumentTypes array",
    "Add :CFBundleDocumentTypes:0 dict",
    "Add :CFBundleDocumentTypes:0:CFBundleTypeExtensions array",
    "Add :CFBundleDocumentTypes:0:CFBundleTypeExtensions:0 string c4ml",
    "Add :CFBundleDocumentTypes:0:CFBundleTypeIconFile string c4thedral.icns",
    "Add :CFBundleDocumentTypes:0:CFBundleTypeName string C4ML Source",
    "Add :CFBundleDocumentTypes:0:CFBundleTypeRole string Editor",
    "Add :CFBundleDocumentTypes:0:LSHandlerRank string Owner",
    "Add :CFBundleDocumentTypes:0:LSItemContentTypes array",
    "Add :CFBundleDocumentTypes:0:LSItemContentTypes:0 string org.c4ml.source",
    "Add :UTExportedTypeDeclarations array",
    "Add :UTExportedTypeDeclarations:0 dict",
    "Add :UTExportedTypeDeclarations:0:UTTypeConformsTo array",
    "Add :UTExportedTypeDeclarations:0:UTTypeConformsTo:0 string public.plain-text",
    "Add :UTExportedTypeDeclarations:0:UTTypeDescription string C4ML Source",
    "Add :UTExportedTypeDeclarations:0:UTTypeIdentifier string org.c4ml.source",
    "Add :UTExportedTypeDeclarations:0:UTTypeTagSpecification dict",
    "Add :UTExportedTypeDeclarations:0:UTTypeTagSpecification:public.filename-extension array",
    "Add :UTExportedTypeDeclarations:0:UTTypeTagSpecification:public.filename-extension:0 string c4ml",
    "Add :UTExportedTypeDeclarations:0:UTTypeTagSpecification:public.mime-type array",
    "Add :UTExportedTypeDeclarations:0:UTTypeTagSpecification:public.mime-type:0 string text/x-c4ml",
  ]) {
    runRequired(
      "/usr/libexec/PlistBuddy",
      ["-c", command, plist],
      "Could not configure the C4ML development document type",
    );
  }
}

function deletePlistValue(plist, key) {
  spawnSync("/usr/libexec/PlistBuddy", ["-c", `Delete :${key}`, plist]);
}

function setPlistValue(plist, key, value) {
  const setResult = spawnSync(
    "/usr/libexec/PlistBuddy",
    ["-c", `Set :${key} ${value}`, plist],
    { encoding: "utf8" },
  );
  if (setResult.status === 0) {
    return;
  }
  runRequired(
    "/usr/libexec/PlistBuddy",
    ["-c", `Add :${key} string ${value}`, plist],
    `Could not set ${key} for the C4thedral development application`,
  );
}

function runRequired(command, arguments, message) {
  const result = spawnSync(command, arguments, { encoding: "utf8" });
  if (result.error !== undefined) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${message}: ${result.stderr.trim()}`);
  }
}
