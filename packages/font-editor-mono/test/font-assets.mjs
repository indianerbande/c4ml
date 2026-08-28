import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const assets = {
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

for (const [relativePath, expectedHash] of Object.entries(assets)) {
  const bytes = await readFile(join(packageRoot, "fonts", relativePath));
  const actualHash = createHash("sha256").update(bytes).digest("hex");
  if (actualHash !== expectedHash) {
    throw new Error(
      `Editor font ${relativePath} changed: expected ${expectedHash}, received ${actualHash}`,
    );
  }
  const expectedHeader = relativePath.endsWith(".woff2")
    ? "774f4632"
    : "00010000";
  if (bytes.subarray(0, 4).toString("hex") !== expectedHeader) {
    throw new Error(`Editor font ${relativePath} has an invalid file header.`);
  }
}

for (const license of [
  "FiraCode-LICENSE.txt",
  "Hack-LICENSE.md",
  "SourceCodePro-LICENSE.md",
  "IntelOneMono-OFL.txt",
  "Inconsolata-OFL.txt",
  "CascadiaCode-LICENSE.txt",
]) {
  const text = await readFile(join(packageRoot, "licenses", license), "utf8");
  if (text.trim().length < 1000) {
    throw new Error(`Editor font license ${license} is missing or truncated.`);
  }
}

console.log("Six pinned editor font faces and their licenses are intact.");
