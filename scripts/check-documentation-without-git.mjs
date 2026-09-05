import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const environment = { ...process.env };
for (const key of Object.keys(environment)) {
  if (key.toLowerCase() === "path") {
    delete environment[key];
  }
}
environment.PATH = "";

execFileSync(process.execPath, [join(repositoryRoot, "scripts/check-documentation.mjs")], {
  cwd: repositoryRoot,
  env: environment,
  stdio: "inherit",
});

console.log("Documentation check passed without Git in PATH.");
