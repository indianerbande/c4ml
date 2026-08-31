const { existsSync } = require("node:fs");
const { resolve } = require("node:path");
const { spawnSync } = require("node:child_process");

const packageRoot = resolve(
  __dirname,
  "../../../build/desktop",
  `C4thedral-${process.platform}-${process.arch}`,
);
const executable =
  process.platform === "darwin"
    ? resolve(packageRoot, "C4thedral.app/Contents/MacOS/C4thedral")
    : process.platform === "win32"
      ? resolve(packageRoot, "C4thedral.exe")
      : resolve(packageRoot, "C4thedral");

if (!existsSync(executable)) {
  throw new Error(
    `Packaged C4thedral executable not found at ${executable}. Run the package step first.`,
  );
}

const result = spawnSync(
  executable,
  process.argv.includes("--smoke") ? ["--c4ml-smoke"] : [],
  { stdio: "inherit" },
);
if (result.error !== undefined) {
  throw result.error;
}
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
