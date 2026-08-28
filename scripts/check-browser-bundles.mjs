import { build } from "esbuild";

const probes = [
  ["compiler-core", "packages/compiler-core/src/index.ts"],
  ["language-c4ml", "packages/language-c4ml/src/index.ts"],
  ["langium", "spikes/language-langium/src/services.ts"],
  ["elkjs-api", "packages/layout-elk/src/browser.ts"],
];

for (const [name, entryPoint] of probes) {
  const result = await build({
    entryPoints: [entryPoint],
    bundle: true,
    format: "esm",
    logLevel: "silent",
    platform: "browser",
    target: ["es2023"],
    treeShaking: true,
    write: false,
  });
  const bytes = result.outputFiles.reduce(
    (sum, outputFile) => sum + outputFile.contents.byteLength,
    0,
  );
  console.log(`${name}: browser bundle verified (${bytes} bytes)`);
}
