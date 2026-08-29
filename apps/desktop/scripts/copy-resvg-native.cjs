const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");

const desktopRoot = path.resolve(__dirname, "..");
const rendererRoot = fs.realpathSync(
  path.join(desktopRoot, "node_modules/@c4ml/render-resvg"),
);
const rendererRequire = createRequire(path.join(rendererRoot, "package.json"));
const resvgEntry = rendererRequire.resolve("@resvg/resvg-js");
const resvgRequire = createRequire(resvgEntry);

const targetByPlatform = {
  "darwin-arm64": "@resvg/resvg-js-darwin-arm64",
  "darwin-x64": "@resvg/resvg-js-darwin-x64",
  "linux-arm64": "@resvg/resvg-js-linux-arm64-gnu",
  "linux-x64": "@resvg/resvg-js-linux-x64-gnu",
  "win32-arm64": "@resvg/resvg-js-win32-arm64-msvc",
  "win32-ia32": "@resvg/resvg-js-win32-ia32-msvc",
  "win32-x64": "@resvg/resvg-js-win32-x64-msvc",
};

const target = targetByPlatform[`${process.platform}-${process.arch}`];
if (target === undefined) {
  throw new Error(
    `C4ML desktop PNG export does not have a reviewed resvg target for ${process.platform}-${process.arch}.`,
  );
}

const nativeSource = resvgRequire.resolve(target);
const dist = path.join(desktopRoot, "dist");
fs.mkdirSync(dist, { recursive: true });

for (const entry of fs.readdirSync(dist)) {
  if (/^resvgjs\..+\.node$/.test(entry)) {
    fs.unlinkSync(path.join(dist, entry));
  }
}

fs.copyFileSync(nativeSource, path.join(dist, path.basename(nativeSource)));
fs.copyFileSync(
  path.join(path.dirname(resvgEntry), "LICENSE"),
  path.join(dist, "RESVG_LICENSE.txt"),
);
