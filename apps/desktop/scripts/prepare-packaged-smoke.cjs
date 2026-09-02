const {
  chmodSync,
  chownSync,
  existsSync,
  lstatSync,
  realpathSync,
} = require("node:fs");
const { isAbsolute, relative, resolve, sep } = require("node:path");
const { spawnSync } = require("node:child_process");

const requiredMode = 0o4755;

function hasRequiredLinuxSandboxState(stat) {
  return stat.uid === 0 && stat.gid === 0 && (stat.mode & 0o7777) === requiredMode;
}

function isPathInside(root, candidate) {
  const relativePath = relative(root, candidate);
  return (
    relativePath !== "" &&
    !isAbsolute(relativePath) &&
    relativePath !== ".." &&
    !relativePath.startsWith(`..${sep}`)
  );
}

function runAsRoot(program, args) {
  const sudo = "/usr/bin/sudo";
  if (!existsSync(sudo)) {
    throw new Error(
      `Cannot prepare the packaged Chromium sandbox because ${sudo} is unavailable.`,
    );
  }
  const result = spawnSync(sudo, [program, ...args], { stdio: "inherit" });
  if (result.error !== undefined) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `Failed to prepare the packaged Chromium sandbox with ${program}.`,
    );
  }
}

function preparePackagedSmoke() {
  if (process.platform !== "linux") {
    return;
  }

  const packageRoot = resolve(
    __dirname,
    "../../../build/desktop",
    `C4thedral-linux-${process.arch}`,
  );
  const sandboxHelper = resolve(packageRoot, "chrome-sandbox");

  if (!existsSync(sandboxHelper)) {
    throw new Error(
      `Packaged Chromium sandbox helper not found at ${sandboxHelper}. Run the package step first.`,
    );
  }

  const initialStat = lstatSync(sandboxHelper);
  if (!initialStat.isFile() || initialStat.isSymbolicLink()) {
    throw new Error(
      `Refusing to change unexpected Chromium sandbox helper at ${sandboxHelper}.`,
    );
  }

  const realPackageRoot = realpathSync(packageRoot);
  const realSandboxHelper = realpathSync(sandboxHelper);
  if (!isPathInside(realPackageRoot, realSandboxHelper)) {
    throw new Error(
      `Refusing to change Chromium sandbox helper outside ${realPackageRoot}.`,
    );
  }

  if (hasRequiredLinuxSandboxState(initialStat)) {
    console.log("Packaged Chromium sandbox helper is ready (root:root, mode 4755).");
    return;
  }

  console.log(
    "Preparing the disposable packaged Chromium sandbox helper with root:root ownership and mode 4755.",
  );
  if (typeof process.getuid === "function" && process.getuid() === 0) {
    chownSync(realSandboxHelper, 0, 0);
    chmodSync(realSandboxHelper, requiredMode);
  } else {
    runAsRoot("/usr/bin/chown", ["root:root", realSandboxHelper]);
    runAsRoot("/usr/bin/chmod", ["4755", realSandboxHelper]);
  }

  const preparedStat = lstatSync(realSandboxHelper);
  if (!hasRequiredLinuxSandboxState(preparedStat)) {
    throw new Error(
      `Packaged Chromium sandbox helper at ${realSandboxHelper} is not root:root with mode 4755.`,
    );
  }
}

if (require.main === module) {
  preparePackagedSmoke();
}

module.exports = {
  hasRequiredLinuxSandboxState,
  isPathInside,
  preparePackagedSmoke,
};
