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
const applicationIcon = resolve(__dirname, "../assets/icon.icns");
const developmentBundleVersion = `${electronVersion}:${desktopVersion}:${createHash("sha256")
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
