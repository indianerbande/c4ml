import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  compileArchitectureDiagram,
  type ArchitectureView,
  type Diagnostic,
  type SvgEmbeddedFontFace,
} from "@c4ml/compiler-core";
import { ibmPlexSansFamily } from "@c4ml/font-ibm-plex";
import {
  ibmPlexSansTtfFontFiles,
  loadIbmPlexSansSvgFontFaces,
} from "@c4ml/font-ibm-plex/node";
import {
  c4mlDraftLanguageVersion,
  parseC4mlDraft,
} from "@c4ml/language-c4ml";
import { createBundledElkLayoutAdapter } from "@c4ml/layout-elk/bundled";
import { ResvgPngRenderer } from "@c4ml/render-resvg";

export const cliVersion = "0.0.0" as const;

export const cliExitCode = {
  success: 0,
  usage: 2,
  source: 3,
  compilation: 4,
  environment: 5,
} as const;

export interface CliIo {
  readonly cwd: string;
  readonly stderr: (text: string) => void;
  readonly stdout: (text: string) => void;
}

type DiagnosticFormat = "human" | "json";
type RenderFormat = "png" | "svg";

interface CheckCommand {
  readonly kind: "check";
  readonly file: string;
  readonly diagnostics: DiagnosticFormat;
}

interface RenderCommand {
  readonly kind: "render";
  readonly file: string;
  readonly diagnostics: DiagnosticFormat;
  readonly formats: readonly RenderFormat[];
  readonly output: string;
  readonly scale: number;
  readonly view: "all" | string;
}

type CliCommand = CheckCommand | RenderCommand | { readonly kind: "version" };

const usage = `C4ML experimental CLI

Usage:
  c4ml check <file> [--diagnostics human|json]
  c4ml render <file> (--view <id> | --all) [--format svg|png|svg,png]
              [--output <directory>] [--scale <number>]
              [--diagnostics human|json]
  c4ml version
`;

export async function runCli(
  args: readonly string[],
  io: CliIo = processIo(),
): Promise<number> {
  const parsedCommand = parseCommand(args);
  if (typeof parsedCommand === "string") {
    io.stderr(`${parsedCommand}\n\n${usage}`);
    return cliExitCode.usage;
  }
  if (parsedCommand.kind === "version") {
    io.stdout(`C4ML CLI ${cliVersion} (language ${c4mlDraftLanguageVersion})\n`);
    return cliExitCode.success;
  }

  const sourcePath = resolve(io.cwd, parsedCommand.file);
  let source: string;
  try {
    source = await readFile(sourcePath, "utf8");
  } catch (error: unknown) {
    io.stderr(`C4ML-CLI-ENV-001: Cannot read ${sourcePath}: ${errorMessage(error)}\n`);
    return cliExitCode.environment;
  }

  const parsed = await parseC4mlDraft(source, { file: sourcePath });
  if (!parsed.valid || parsed.model === undefined || parsed.views === undefined) {
    reportDiagnostics(parsed.diagnostics, parsedCommand.diagnostics, io);
    return cliExitCode.source;
  }
  if (parsedCommand.kind === "check") {
    reportSuccess(
      {
        command: "check",
        file: sourcePath,
        languageVersion: parsed.languageVersion,
        valid: true,
        views: parsed.views.map(({ id, kind }) => ({ id, kind })),
      },
      parsedCommand.diagnostics,
      io,
    );
    return cliExitCode.success;
  }

  const selectedViews = selectViews(parsed.views, parsedCommand.view);
  if (selectedViews.length === 0) {
    const message = `No view with stable identifier "${parsedCommand.view}" exists in ${sourcePath}.`;
    reportCliFailure("C4ML-CLI-SOURCE-001", message, parsedCommand.diagnostics, io);
    return cliExitCode.source;
  }

  const artifacts: Array<{
    readonly bytes: string | Uint8Array;
    readonly filename: string;
  }> = [];
  const layoutAdapter = createBundledElkLayoutAdapter();
  const pngRenderer = new ResvgPngRenderer();
  let embeddedFontFaces: readonly SvgEmbeddedFontFace[];
  try {
    embeddedFontFaces = await loadIbmPlexSansSvgFontFaces();
  } catch (error: unknown) {
    reportCliFailure(
      "C4ML-CLI-ENV-003",
      `Cannot load bundled IBM Plex fonts: ${errorMessage(error)}`,
      parsedCommand.diagnostics,
      io,
    );
    return cliExitCode.environment;
  }
  for (const view of selectedViews) {
    try {
      const result = await compileArchitectureDiagram({
        model: parsed.model,
        view,
        layoutAdapter,
        ...(parsed.routingByViewId?.[view.id] === undefined
          ? {}
          : { routing: parsed.routingByViewId[view.id] }),
        scene: { fontFamily: ibmPlexSansFamily, theme: "c4ml-blue" },
        svg: { embeddedFontFaces },
      });
      if (!result.valid || result.svg === undefined) {
        reportDiagnostics(result.diagnostics, parsedCommand.diagnostics, io);
        return cliExitCode.compilation;
      }
      if (parsedCommand.formats.includes("svg")) {
        artifacts.push({ filename: `${view.id}.svg`, bytes: result.svg });
      }
      if (parsedCommand.formats.includes("png")) {
        const png = await pngRenderer.render(result.svg, {
          scale: parsedCommand.scale,
          fontFiles: ibmPlexSansTtfFontFiles,
          loadSystemFonts: false,
          defaultFontFamily: ibmPlexSansFamily,
          ...(result.scene === undefined
            ? {}
            : { background: result.scene.theme.canvas.background }),
        });
        artifacts.push({ filename: `${view.id}.png`, bytes: png.bytes });
      }
    } catch (error: unknown) {
      reportCliFailure(
        "C4ML-CLI-COMPILE-001",
        `Cannot render view "${view.id}": ${errorMessage(error)}`,
        parsedCommand.diagnostics,
        io,
      );
      return cliExitCode.compilation;
    }
  }

  const outputDirectory = resolve(io.cwd, parsedCommand.output);
  try {
    await mkdir(outputDirectory, { recursive: true });
    for (const artifact of artifacts) {
      await writeFile(resolve(outputDirectory, artifact.filename), artifact.bytes);
    }
  } catch (error: unknown) {
    io.stderr(
      `C4ML-CLI-ENV-002: Cannot write ${outputDirectory}: ${errorMessage(error)}\n`,
    );
    return cliExitCode.environment;
  }

  reportSuccess(
    {
      command: "render",
      file: sourcePath,
      languageVersion: parsed.languageVersion,
      outputDirectory,
      valid: true,
      artifacts: artifacts.map(({ filename }) => filename),
    },
    parsedCommand.diagnostics,
    io,
  );
  return cliExitCode.success;
}

function parseCommand(args: readonly string[]): CliCommand | string {
  const [command, ...rest] = args;
  if (command === "version" && rest.length === 0) {
    return { kind: "version" };
  }
  if (command !== "check" && command !== "render") {
    return "Expected check, render, or version.";
  }
  const file = rest[0];
  if (file === undefined || file.startsWith("--")) {
    return `The ${command} command requires one source file.`;
  }

  const options = new Map<string, string>();
  const flags = new Set<string>();
  for (let index = 1; index < rest.length; index += 1) {
    const token = rest[index]!;
    if (token === "--all") {
      if (flags.has(token)) {
        return "--all may be declared only once.";
      }
      flags.add(token);
      continue;
    }
    if (!token.startsWith("--")) {
      return `Unexpected argument "${token}".`;
    }
    if (options.has(token)) {
      return `${token} may be declared only once.`;
    }
    const value = rest[index + 1];
    if (value === undefined || value.startsWith("--")) {
      return `${token} requires a value.`;
    }
    options.set(token, value);
    index += 1;
  }

  const allowed =
    command === "check"
      ? new Set(["--diagnostics"])
      : new Set([
          "--diagnostics",
          "--format",
          "--output",
          "--scale",
          "--view",
        ]);
  for (const option of options.keys()) {
    if (!allowed.has(option)) {
      return `Unknown option ${option} for ${command}.`;
    }
  }
  if (command === "check") {
    if (flags.size > 0) {
      return "--all is available only for render.";
    }
    const diagnostics = diagnosticFormat(options.get("--diagnostics"));
    return typeof diagnostics === "string"
      ? diagnostics
      : { kind: "check", file, diagnostics: diagnostics.value };
  }

  const hasAll = flags.has("--all");
  const view = options.get("--view");
  if (hasAll === (view !== undefined)) {
    return "Render requires exactly one of --view <id> or --all.";
  }
  const diagnostics = diagnosticFormat(options.get("--diagnostics"));
  if (typeof diagnostics === "string") {
    return diagnostics;
  }
  const formats = renderFormats(options.get("--format"));
  if (typeof formats === "string") {
    return formats;
  }
  const scale = Number(options.get("--scale") ?? "1");
  if (!Number.isFinite(scale) || scale <= 0) {
    return "--scale must be a finite number greater than zero.";
  }
  return {
    kind: "render",
    file,
    diagnostics: diagnostics.value,
    formats,
    output: options.get("--output") ?? "build/diagrams",
    scale,
    view: hasAll ? "all" : view!,
  };
}

function diagnosticFormat(
  value: string | undefined,
): { readonly value: DiagnosticFormat } | string {
  if (value === undefined || value === "human" || value === "json") {
    return { value: value ?? "human" };
  }
  return "--diagnostics must be human or json.";
}

function renderFormats(value: string | undefined): readonly RenderFormat[] | string {
  const values = value === undefined ? ["svg"] : value.split(",");
  if (
    values.length === 0 ||
    values.some((format) => format !== "svg" && format !== "png")
  ) {
    return "--format must be svg, png, or svg,png.";
  }
  return [...new Set(values as RenderFormat[])].sort();
}

function selectViews(
  views: readonly ArchitectureView[],
  selection: "all" | string,
): readonly ArchitectureView[] {
  return selection === "all"
    ? views
    : views.filter(({ id }) => id === selection);
}

function reportDiagnostics(
  diagnostics: readonly Diagnostic[],
  format: DiagnosticFormat,
  io: CliIo,
): void {
  if (format === "json") {
    io.stdout(`${JSON.stringify({ valid: false, diagnostics })}\n`);
    return;
  }
  for (const diagnostic of diagnostics) {
    const start = diagnostic.source.range.start;
    io.stderr(
      `${diagnostic.source.file}:${start.line + 1}:${start.column + 1} ` +
        `${diagnostic.severity} ${diagnostic.code}: ${diagnostic.message}\n`,
    );
  }
}

function reportCliFailure(
  code: string,
  message: string,
  format: DiagnosticFormat,
  io: CliIo,
): void {
  if (format === "json") {
    io.stdout(`${JSON.stringify({ valid: false, diagnostics: [{ code, message }] })}\n`);
  } else {
    io.stderr(`${code}: ${message}\n`);
  }
}

function reportSuccess(
  value: Readonly<Record<string, unknown>>,
  format: DiagnosticFormat,
  io: CliIo,
): void {
  if (format === "json") {
    io.stdout(`${JSON.stringify(value)}\n`);
  } else if (value.command === "check") {
    io.stdout(`Valid C4ML: ${String(value.file)}\n`);
  } else {
    const artifacts = value.artifacts as readonly string[];
    io.stdout(
      `Rendered ${artifacts.length} artifact(s) to ${String(value.outputDirectory)}\n`,
    );
  }
}

function processIo(): CliIo {
  return {
    cwd: process.cwd(),
    stdout: (text) => process.stdout.write(text),
    stderr: (text) => process.stderr.write(text),
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
