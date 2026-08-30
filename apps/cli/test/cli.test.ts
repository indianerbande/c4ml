import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

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
