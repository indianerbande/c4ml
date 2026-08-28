const { spawnSync } = require("node:child_process");
const { dirname } = require("node:path");

const nodeGyp = require.resolve("node-gyp/bin/node-gyp.js");
const makerNativePackages = ["fs-xattr", "macos-alias"];

for (const packageName of makerNativePackages) {
  const packageRoot = dirname(require.resolve(`${packageName}/package.json`));
  const result = spawnSync(process.execPath, [nodeGyp, "rebuild"], {
    cwd: packageRoot,
    stdio: "inherit",
  });
  if (result.error !== undefined) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `Native maker helper ${packageName} failed to rebuild with ${process.version}.`,
    );
  }
}
