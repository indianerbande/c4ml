import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it } from "vitest";

import { cliExitCode, runCli, type CliIo } from "../src/cli.js";

const staticZoomUrl = new URL(
  "../../../examples/draft/hello-static-zoom.c4ml",
  import.meta.url,
);
const dynamicUrl = new URL(
  "../../../examples/draft/hello-dynamic.c4ml",
  import.meta.url,
);
const deploymentUrl = new URL(
  "../../../examples/draft/hello-deployment.c4ml",
  import.meta.url,
);

let stdout: string[];
let stderr: string[];

beforeEach(() => {
  stdout = [];
  stderr = [];
});

function io(cwd: string): CliIo {
  return {
    cwd,
    stdout: (text) => stdout.push(text),
    stderr: (text) => stderr.push(text),
  };
}

describe("experimental C4ML CLI", () => {
  it("checks a valid source file without rendering", async () => {
    const cwd = fileURLToPath(new URL("../../..", import.meta.url));
    const exitCode = await runCli(
      ["check", "examples/draft/hello-static-zoom.c4ml"],
      io(cwd),
    );

    expect(exitCode).toBe(cliExitCode.success);
    expect(stdout.join("")).toContain("Valid C4ML:");
    expect(stderr).toEqual([]);
  });

  it("returns machine-readable source diagnostics and the source exit class", async () => {
    const directory = await mkdtemp(join(tmpdir(), "c4ml-cli-invalid-"));
    const sourcePath = join(directory, "invalid.c4ml");
    const source = (await readFile(staticZoomUrl, "utf8")).replace(
      "scope = planning-service",
      "scope = missing",
    );
    await writeFile(sourcePath, source, "utf8");

    const exitCode = await runCli(
      ["check", sourcePath, "--diagnostics", "json"],
      io(directory),
    );
    const result = JSON.parse(stdout.join("")) as {
      readonly valid: boolean;
      readonly diagnostics: readonly { readonly code: string }[];
    };

    expect(exitCode).toBe(cliExitCode.source);
    expect(result.valid).toBe(false);
    expect(result.diagnostics.map(({ code }) => code)).toContain(
      "C4ML-LANG-003",
    );
    expect(stderr).toEqual([]);
  });

  it("renders one selected view as deterministic SVG", async () => {
    const directory = await mkdtemp(join(tmpdir(), "c4ml-cli-svg-"));
    const output = join(directory, "diagrams");

    const exitCode = await runCli(
      [
        "render",
        fileURLToPath(staticZoomUrl),
        "--view",
        "arrangement-engine-code",
        "--format",
        "svg",
        "--output",
        output,
      ],
      io(directory),
    );
    const svg = await readFile(
      join(output, "arrangement-engine-code.svg"),
      "utf8",
    );

    expect(exitCode).toBe(cliExitCode.success);
    expect(svg).toContain("Code View — Arrangement Engine");
    expect(svg).toContain("Code Element · function");
    expect(svg).toContain('font-family="IBM Plex Sans"');
    expect(svg).toContain('data:font/woff2;base64,d09GMg');
    expect(stderr).toEqual([]);
  });

  it("renders every declared view to SVG and PNG at a requested scale", async () => {
    const directory = await mkdtemp(join(tmpdir(), "c4ml cli ü-"));
    const sourcePath = join(directory, "architecture copy.c4ml");
    const output = join(directory, "Ausgabe Grafiken");
    await writeFile(sourcePath, await readFile(staticZoomUrl, "utf8"), "utf8");

    const exitCode = await runCli(
      [
        "render",
        sourcePath,
        "--all",
        "--format",
        "svg,png",
        "--scale",
        "1.25",
        "--output",
        output,
        "--diagnostics",
        "json",
      ],
      io(tmpdir()),
    );
    const report = JSON.parse(stdout.join("")) as {
      readonly artifacts: readonly string[];
    };
    const png = await readFile(join(output, "arrangement-engine-code.png"));

    expect(exitCode).toBe(cliExitCode.success);
    expect(report.artifacts).toHaveLength(8);
    expect([...png.subarray(0, 8)]).toEqual([
      137, 80, 78, 71, 13, 10, 26, 10,
    ]);
    expect(stderr).toEqual([]);
  });

  it("renders a selected Dynamic View through the shared CLI pipeline", async () => {
    const directory = await mkdtemp(join(tmpdir(), "c4ml-cli-dynamic-"));
    const exitCode = await runCli(
      [
        "render",
        fileURLToPath(dynamicUrl),
        "--view",
        "finalize-release",
        "--output",
        directory,
      ],
      io(tmpdir()),
    );
    const svg = await readFile(join(directory, "finalize-release.svg"), "utf8");

    expect(exitCode).toBe(cliExitCode.success);
    expect(svg).toContain("Dynamic View — Finalize a Release Decision");
    expect(svg).toContain("2. Queues release notice");
  });

  it("renders a selected Deployment View through the shared CLI pipeline", async () => {
    const directory = await mkdtemp(join(tmpdir(), "c4ml-cli-deployment-"));
    const exitCode = await runCli(
      [
        "render",
        fileURLToPath(deploymentUrl),
        "--view",
        "parcel-observer-production",
        "--output",
        directory,
      ],
      io(tmpdir()),
    );
    const svg = await readFile(
      join(directory, "parcel-observer-production.svg"),
      "utf8",
    );

    expect(exitCode).toBe(cliExitCode.success);
    expect(svg).toContain("Deployment View — Parcel Observer Production");
    expect(svg).toContain("Regional Cloud");
    expect(svg).not.toContain("Verification Host");
  });

  it("distinguishes usage and environment failures", async () => {
    expect(
      await runCli(
        ["render", "missing.c4ml", "--all", "--view", "x"],
        io(tmpdir()),
      ),
    ).toBe(cliExitCode.usage);
    stderr = [];
    expect(await runCli(["check", "missing.c4ml"], io(tmpdir()))).toBe(
      cliExitCode.environment,
    );
    expect(stderr.join("")).toContain("C4ML-CLI-ENV-001");
  });
});
