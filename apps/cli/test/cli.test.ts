import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { beforeEach, describe, expect, it } from "vitest";

import {
  proposeC4mlPlacementEdit,
  proposeC4mlRouteEdit,
  proposeC4mlSemanticEdit,
} from "@c4ml/language-c4ml";
import {
  applyProjectSourceChangeSet,
  createArchitectureProjectInput,
} from "@c4ml/compiler-core";

import { cliExitCode, runCli, type CliIo } from "../src/cli.js";

const staticZoomUrl = new URL(
  "../../../examples/draft/hello-static-zoom.c4ml",
  import.meta.url,
);
const contextUrl = new URL(
  "../../../examples/draft/hello-context.c4ml",
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
const runProcess = promisify(execFile);

async function git(cwd: string, ...args: string[]): Promise<string> {
  const result = await runProcess("git", ["-C", cwd, ...args], {
    env: { ...process.env, LC_ALL: "C" },
  });
  return result.stdout.trim();
}

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
  it("exposes the canonical analysis report through the CLI boundary", async () => {
    const cwd = fileURLToPath(new URL("../../..", import.meta.url));
    const exitCode = await runCli(
      ["analyze", "examples/draft/hello-context.c4ml", "--diagnostics", "json"],
      io(cwd),
    );
    const result = JSON.parse(stdout.join("")) as {
      readonly command: string;
      readonly report: {
        readonly version: number;
        readonly snapshot: {
          readonly elements: readonly { readonly id: string }[];
          readonly views: readonly { readonly id: string }[];
        };
        readonly findings: readonly unknown[];
      };
    };

    expect(exitCode).toBe(cliExitCode.success);
    expect(result.command).toBe("analyze");
    expect(result.report.version).toBe(1);
    expect(result.report.snapshot.elements.map(({ id }) => id)).toContain(
      "garden-pulse",
    );
    expect(result.report.snapshot.views.map(({ id }) => id)).toEqual([
      "garden-pulse-context",
    ]);
    expect(result.report.findings).toEqual([]);
    expect(stderr).toEqual([]);
  });

  it("prints source-located built-in architecture findings", async () => {
    const directory = await mkdtemp(join(tmpdir(), "c4ml-cli-analysis-"));
    const sourcePath = join(directory, "architecture.c4ml");
    const source = (await readFile(contextUrl, "utf8")).replace(
      'intent = "Reviews and adjusts the garden work plan"',
      'intent = "Uses"',
    );
    await writeFile(sourcePath, source, "utf8");

    const exitCode = await runCli(["analyze", sourcePath], io(directory));
    const output = stdout.join("");

    expect(exitCode).toBe(cliExitCode.success);
    expect(output).toContain("1 finding(s)");
    expect(output).toContain("warning c4ml.validation.c4ml-sem-014");
    expect(output).toContain("State the concrete intent or data flow.");
    expect(output).toContain("architecture.c4ml:26:3");
    expect(stderr).toEqual([]);
  });

  it("returns an explained temporary focus View for a graph query", async () => {
    const cwd = fileURLToPath(new URL("../../..", import.meta.url));
    const exitCode = await runCli(
      [
        "query",
        "examples/draft/hello-context.c4ml",
        "--kind",
        "downstream",
        "--subject",
        "element:caretaker",
        "--diagnostics",
        "json",
      ],
      io(cwd),
    );
    const output = JSON.parse(stdout.join("")) as {
      readonly command: string;
      readonly result: {
        readonly itemKeys: readonly string[];
        readonly relationshipKeys: readonly string[];
        readonly evidence: readonly { readonly subjectKey: string }[];
      };
      readonly focusView: {
        readonly version: number;
        readonly itemKeys: readonly string[];
        readonly explanations: readonly { readonly subjectKey: string }[];
      };
    };

    expect(exitCode).toBe(cliExitCode.success);
    expect(output.command).toBe("query");
    expect(output.result.itemKeys).toEqual([
      "element:caretaker",
      "element:garden-pulse",
    ]);
    expect(output.result.relationshipKeys).toEqual([
      "relationship:caretaker-reviews-plan",
    ]);
    expect(output.focusView.version).toBe(1);
    expect(output.focusView.itemKeys).toEqual(output.result.itemKeys);
    expect(output.focusView.explanations.map(({ subjectKey }) => subjectKey)).toEqual([
      "element:caretaker",
      "element:garden-pulse",
      "relationship:caretaker-reviews-plan",
    ]);
    expect(stderr).toEqual([]);
  });

  it("reports an unknown graph-query subject as source input", async () => {
    const cwd = fileURLToPath(new URL("../../..", import.meta.url));
    const exitCode = await runCli(
      [
        "query",
        "examples/draft/hello-context.c4ml",
        "--kind",
        "upstream",
        "--subject",
        "element:missing",
        "--diagnostics",
        "json",
      ],
      io(cwd),
    );
    const output = JSON.parse(stdout.join("")) as {
      readonly valid: boolean;
      readonly diagnostics: readonly { readonly code: string }[];
    };

    expect(exitCode).toBe(cliExitCode.source);
    expect(output.valid).toBe(false);
    expect(output.diagnostics).toEqual([
      expect.objectContaining({ code: "C4ML-QUERY-002" }),
    ]);
    expect(stderr).toEqual([]);
  });

  it("compares two sources by stable architecture identity", async () => {
    const directory = await mkdtemp(join(tmpdir(), "c4ml-cli-diff-"));
    const beforePath = join(directory, "before.c4ml");
    const afterPath = join(directory, "after.c4ml");
    const before = await readFile(contextUrl, "utf8");
    const after = before.replace(
      'name = "Garden Pulse"',
      'name = "Garden Coordination"',
    );
    await writeFile(beforePath, before, "utf8");
    await writeFile(afterPath, after, "utf8");

    const exitCode = await runCli(
      ["diff", beforePath, afterPath, "--diagnostics", "json"],
      io(directory),
    );
    const result = JSON.parse(stdout.join("")) as {
      readonly command: string;
      readonly difference: {
        readonly changes: readonly {
          readonly category: string;
          readonly kind: string;
          readonly subjectKey: string;
        }[];
      };
      readonly impacts: { readonly impacts: readonly unknown[] };
    };

    expect(exitCode).toBe(cliExitCode.success);
    expect(result.command).toBe("diff");
    expect(result.difference.changes).toEqual([
      expect.objectContaining({
        category: "model",
        kind: "renamed",
        subjectKey: "element:garden-pulse",
      }),
    ]);
    expect(result.impacts.impacts).toHaveLength(1);
    expect(stderr).toEqual([]);
  });

  it("exports a self-explaining stable visual comparison", async () => {
    const directory = await mkdtemp(join(tmpdir(), "c4ml-cli-visual-diff-"));
    const beforePath = join(directory, "before.c4ml");
    const afterPath = join(directory, "after.c4ml");
    const output = join(directory, "comparison");
    const before = await readFile(contextUrl, "utf8");
    const after = before.replace(
      'name = "Garden Pulse"',
      'name = "Garden Coordination"',
    );
    await writeFile(beforePath, before, "utf8");
    await writeFile(afterPath, after, "utf8");

    const exitCode = await runCli(
      [
        "diff",
        beforePath,
        afterPath,
        "--comparison",
        "overlay",
        "--view",
        "garden-pulse-context",
        "--output",
        output,
        "--diagnostics",
        "json",
      ],
      io(directory),
    );
    const result = JSON.parse(stdout.join("")) as {
      readonly comparisonArtifact: string;
      readonly stability: readonly { readonly status: string }[];
    };
    const svg = await readFile(result.comparisonArtifact, "utf8");

    expect(exitCode).toBe(cliExitCode.success);
    expect(result.comparisonArtifact).toBe(
      join(output, "garden-pulse-context.overlay.svg"),
    );
    expect(result.stability.every(({ status }) =>
      status === "retained" || status === "fixed-by-layout"
    )).toBe(true);
    expect(svg).toContain('data-c4ml-comparison-mode="overlay"');
    expect(svg).toContain("Comparison");
    expect(svg).toContain("Layout movement");
    expect(svg).toContain('data-c4ml-comparison-state="modified"');
    expect(stderr).toEqual([]);
  });

  it("ignores formatting and comments in a CLI semantic comparison", async () => {
    const directory = await mkdtemp(join(tmpdir(), "c4ml-cli-diff-format-"));
    const beforePath = join(directory, "before.c4ml");
    const afterPath = join(directory, "after.c4ml");
    const before = await readFile(contextUrl, "utf8");
    const after = `${before}\n// Comparison-only note.\n`;
    await writeFile(beforePath, before, "utf8");
    await writeFile(afterPath, after, "utf8");

    const exitCode = await runCli(
      ["diff", beforePath, afterPath, "--diagnostics", "json"],
      io(directory),
    );
    const result = JSON.parse(stdout.join("")) as {
      readonly difference: {
        readonly changes: readonly unknown[];
        readonly summary: { readonly total: number };
      };
    };

    expect(exitCode).toBe(cliExitCode.success);
    expect(result.difference.changes).toEqual([]);
    expect(result.difference.summary.total).toBe(0);
    expect(stderr).toEqual([]);
  });

  it("compares a selected Git commit with working source without checkout", async () => {
    const directory = await mkdtemp(join(tmpdir(), "c4ml-cli-git-diff-"));
    const sourcePath = join(directory, "architecture.c4ml");
    const before = await readFile(contextUrl, "utf8");
    await git(directory, "init", "--initial-branch=main");
    await git(directory, "config", "user.name", "C4ML Test");
    await git(directory, "config", "user.email", "c4ml@example.invalid");
    await writeFile(sourcePath, before, "utf8");
    await git(directory, "add", "architecture.c4ml");
    await git(directory, "commit", "-m", "baseline");
    const baseline = await git(directory, "rev-parse", "HEAD");
    await writeFile(
      sourcePath,
      before.replace('name = "Garden Pulse"', 'name = "Garden Coordination"'),
      "utf8",
    );

    const exitCode = await runCli(
      [
        "diff",
        sourcePath,
        "--before-ref",
        "HEAD",
        "--after-ref",
        "working",
        "--diagnostics",
        "json",
      ],
      io(directory),
    );
    const result = JSON.parse(stdout.join("")) as {
      readonly beforeRef: { readonly kind: string; readonly commit: string };
      readonly afterRef: { readonly kind: string };
      readonly difference: {
        readonly changes: readonly { readonly kind: string; readonly subjectKey: string }[];
      };
    };

    expect(exitCode).toBe(cliExitCode.success);
    expect(result.beforeRef).toEqual({
      kind: "git",
      requestedRef: "HEAD",
      commit: baseline,
    });
    expect(result.afterRef).toEqual({ kind: "working", requestedRef: "working" });
    expect(result.difference.changes).toEqual([
      expect.objectContaining({ kind: "renamed", subjectKey: "element:garden-pulse" }),
    ]);
    expect(await git(directory, "status", "--porcelain=v1")).toBe("M architecture.c4ml");
    expect(stderr).toEqual([]);
  });

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

  it("checks source produced by the graphical placement authoring contract", async () => {
    const directory = await mkdtemp(join(tmpdir(), "c4ml-cli-placement-"));
    const source = await readFile(contextUrl, "utf8");
    const project = createArchitectureProjectInput({
      id: "garden-placement",
      documents: [{ uri: "architecture.c4ml", text: source }],
    });
    const proposal = await proposeC4mlPlacementEdit(project, {
      id: "place-garden-pulse",
      viewId: "garden-pulse-context",
      intent: {
        id: "layout:relative",
        kind: "layout",
        summary: "Place Garden Pulse relative to the caretaker.",
      },
      operation: {
        kind: "relative",
        subjectId: "garden-pulse",
        anchorId: "caretaker",
        relation: "right-of",
        gap: "small",
        strength: "soft",
      },
    });
    expect(proposal.valid).toBe(true);
    if (!proposal.valid) return;
    const application = applyProjectSourceChangeSet(project, proposal.changeSet);
    expect(application.valid).toBe(true);
    if (!application.valid) return;
    const sourcePath = join(directory, "architecture.c4ml");
    await writeFile(sourcePath, application.project.documents[0]!.text, "utf8");

    const exitCode = await runCli(["check", sourcePath], io(tmpdir()));

    expect(exitCode).toBe(cliExitCode.success);
    expect(stdout.join("")).toContain("Valid C4ML:");
    expect(stderr).toEqual([]);
  });

  it("checks source produced by the graphical route authoring contract", async () => {
    const directory = await mkdtemp(join(tmpdir(), "c4ml-cli-route-"));
    const source = await readFile(contextUrl, "utf8");
    const project = createArchitectureProjectInput({
      id: "garden-route",
      documents: [{ uri: "architecture.c4ml", text: source }],
    });
    const proposal = await proposeC4mlRouteEdit(project, {
      id: "route-caretaker-ports",
      viewId: "garden-pulse-context",
      intent: {
        id: "route:ports",
        kind: "route",
        summary: "Choose the caretaker route Ports.",
      },
      operation: {
        kind: "ports",
        relationshipId: "caretaker-reviews-plan",
        sourcePort: "east",
        targetPort: "west",
      },
    });
    expect(proposal.valid).toBe(true);
    if (!proposal.valid) return;
    const application = applyProjectSourceChangeSet(project, proposal.changeSet);
    expect(application.valid).toBe(true);
    if (!application.valid) return;
    const sourcePath = join(directory, "architecture.c4ml");
    await writeFile(sourcePath, application.project.documents[0]!.text, "utf8");

    const exitCode = await runCli(["check", sourcePath], io(tmpdir()));

    expect(exitCode).toBe(cliExitCode.success);
    expect(stdout.join("")).toContain("Valid C4ML:");
    expect(stderr).toEqual([]);
  });

  it("checks source produced by the semantic graphical authoring contract", async () => {
    const directory = await mkdtemp(join(tmpdir(), "c4ml-cli-semantic-"));
    const source = await readFile(contextUrl, "utf8");
    const project = createArchitectureProjectInput({
      id: "garden-semantic",
      documents: [{ uri: "architecture.c4ml", text: source }],
    });
    const proposal = await proposeC4mlSemanticEdit(project, {
      id: "semantic-add-watering-service",
      viewId: "garden-pulse-context",
      intent: {
        id: "architecture:create-element",
        kind: "architecture",
        summary: "Add the watering service.",
      },
      operation: {
        kind: "create-element",
        elementKind: "software-system",
        elementId: "watering-service",
        name: "Watering Service",
        responsibility: "Coordinates automated watering.",
        classification: "external",
      },
    });
    expect(proposal.valid).toBe(true);
    if (!proposal.valid) return;
    const application = applyProjectSourceChangeSet(project, proposal.changeSet);
    expect(application.valid).toBe(true);
    if (!application.valid) return;
    const sourcePath = join(directory, "architecture.c4ml");
    await writeFile(sourcePath, application.project.documents[0]!.text, "utf8");

    const exitCode = await runCli(["check", sourcePath], io(tmpdir()));

    expect(exitCode).toBe(cliExitCode.success);
    expect(stdout.join("")).toContain("Valid C4ML:");
    expect(stderr).toEqual([]);
  });

  it("checks an explicit multifile project directory", async () => {
    const directory = await mkdtemp(join(tmpdir(), "c4ml-cli-project-"));
    await writeMultifileContextProject(directory);

    const exitCode = await runCli(
      ["check", directory, "--diagnostics", "json"],
      io(tmpdir()),
    );
    const result = JSON.parse(stdout.join("")) as {
      readonly valid: boolean;
      readonly views: readonly { readonly id: string }[];
    };

    expect(exitCode).toBe(cliExitCode.success);
    expect(result.valid).toBe(true);
    expect(result.views).toEqual([
      { id: "garden-pulse-context", kind: "system-context" },
    ]);
    expect(stderr).toEqual([]);
  });

  it("renders single-file and multifile projects to identical SVG", async () => {
    const directory = await mkdtemp(join(tmpdir(), "c4ml-cli-project-parity-"));
    const projectDirectory = join(directory, "project");
    const singleOutput = join(directory, "single");
    const projectOutput = join(directory, "project-output");
    await mkdir(projectDirectory);
    await writeMultifileContextProject(projectDirectory);

    expect(
      await runCli(
        [
          "render",
          fileURLToPath(
            new URL(
              "../../../examples/draft/hello-context.c4ml",
              import.meta.url,
            ),
          ),
          "--view",
          "garden-pulse-context",
          "--output",
          singleOutput,
        ],
        io(directory),
      ),
    ).toBe(cliExitCode.success);
    stdout = [];
    expect(
      await runCli(
        [
          "render",
          projectDirectory,
          "--view",
          "garden-pulse-context",
          "--output",
          projectOutput,
        ],
        io(directory),
      ),
    ).toBe(cliExitCode.success);

    const withoutSourceLocations = (svg: string): string =>
      svg.replace(/ data-c4ml-source="[^"]+"/gu, "");
    expect(
      withoutSourceLocations(
        await readFile(join(projectOutput, "garden-pulse-context.svg"), "utf8"),
      ),
    ).toBe(
      withoutSourceLocations(
        await readFile(join(singleOutput, "garden-pulse-context.svg"), "utf8"),
      ),
    );
  });

  it("requires an explicit manifest when a directory has several sources", async () => {
    const directory = await mkdtemp(join(tmpdir(), "c4ml-cli-ambiguous-"));
    await writeFile(join(directory, "one.c4ml"), "c4ml draft-1\n", "utf8");
    await writeFile(join(directory, "two.c4ml"), "c4ml draft-1\n", "utf8");

    const exitCode = await runCli(["check", directory], io(tmpdir()));

    expect(exitCode).toBe(cliExitCode.source);
    expect(stderr.join("")).toContain("C4ML-CLI-PROJECT-003");
    expect(stderr.join("")).toContain("c4ml.project.json");
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
    expect(svg).toContain("data:font/woff2;base64,d09GMg");
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
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
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

async function writeMultifileContextProject(directory: string): Promise<void> {
  const source = await readFile(
    new URL("../../../examples/draft/hello-context.c4ml", import.meta.url),
    "utf8",
  );
  const modelStart = source.indexOf("model {");
  const relationsStart = source.indexOf("relations {");
  const viewStart = source.indexOf("view garden-pulse-context {");
  const section = (start: number, end?: number): string =>
    `c4ml draft-1\n\n${source.slice(start, end).trim()}\n`;
  await Promise.all([
    mkdir(join(directory, "model"), { recursive: true }),
    mkdir(join(directory, "relations"), { recursive: true }),
    mkdir(join(directory, "views"), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(
      join(directory, "c4ml.project.json"),
      `${JSON.stringify(
        {
          version: 1,
          id: "garden-pulse",
          name: "Garden Pulse Architecture",
          sources: [
            "model/systems.c4ml",
            "relations/relationships.c4ml",
            "views/context.c4ml",
          ],
        },
        null,
        2,
      )}\n`,
      "utf8",
    ),
    writeFile(
      join(directory, "model", "systems.c4ml"),
      section(modelStart, relationsStart),
      "utf8",
    ),
    writeFile(
      join(directory, "relations", "relationships.c4ml"),
      section(relationsStart, viewStart),
      "utf8",
    ),
    writeFile(
      join(directory, "views", "context.c4ml"),
      section(viewStart),
      "utf8",
    ),
  ]);
}
