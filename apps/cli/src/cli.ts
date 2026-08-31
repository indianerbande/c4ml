import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  ArchitectureObservationError,
  ArchitecturePublicationError,
  ArchitecturePolicyError,
  ArchitectureQueryError,
  compareArchitectureSnapshots,
  compileArchitectureDiagram,
  createArchitectureAnalysisReport,
  createArchitectureComparisonScene,
  createDiagramScene,
  createTemporaryArchitectureView,
  deriveArchitectureImpacts,
  evaluateArchitecturePolicies,
  evaluateArchitectureObservations,
  evaluateBuiltInArchitectureQuality,
  executeArchitectureQuery,
  parseArchitectureObservationSet,
  parseArchitecturePublication,
  parseArchitectureThemeResource,
  parseArchitectureShapeResource,
  parseArchitecturePolicySet,
  renderDiagramSvg,
  resolveArchitectureSnapshot,
  validateArchitecturePublicationViews,
  routeDiagram,
  stabilizeLayoutAgainstBaseline,
  type ArchitectureView,
  type ArchitectureGraphDirection,
  type ArchitectureGraphItemKey,
  type ArchitectureQuery,
  type Diagnostic,
  type DiagramPlacementOptions,
  type PreparedDiagram,
  type SceneComparisonMode,
  type SceneThemeSelection,
  type DiagramShapeOptions,
  type SvgEmbeddedFontFace,
} from "@c4ml/compiler-core";
import { ibmPlexSansFamily } from "@c4ml/font-ibm-plex";
import {
  ibmPlexSansTtfFontFiles,
  loadIbmPlexSansSvgFontFaces,
} from "@c4ml/font-ibm-plex/node";
import {
  c4mlDraftLanguageVersion,
  parseC4mlProjectDraft,
} from "@c4ml/language-c4ml";
import { createBundledElkLayoutAdapter } from "@c4ml/layout-elk/bundled";
import { ResvgPngRenderer } from "@c4ml/render-resvg";

import {
  loadArchitectureProject,
  loadArchitectureProjectAtGitRevision,
  type GitProjectLoadResult,
  type ProjectLoadResult,
} from "@c4ml/project-node";

export const cliVersion = "0.0.0" as const;

export const cliExitCode = {
  success: 0,
  usage: 2,
  source: 3,
  compilation: 4,
  environment: 5,
  findings: 6,
} as const;

export interface CliIo {
  readonly cwd: string;
  readonly stderr: (text: string) => void;
  readonly stdout: (text: string) => void;
}

type DiagnosticFormat = "human" | "json";
type FindingFailureThreshold = "error" | "never" | "warning";
type RenderFormat = "png" | "svg";

interface CheckCommand {
  readonly kind: "check";
  readonly file: string;
  readonly diagnostics: DiagnosticFormat;
}

interface AnalyzeCommand {
  readonly kind: "analyze";
  readonly file: string;
  readonly diagnostics: DiagnosticFormat;
  readonly failOn: FindingFailureThreshold;
}

interface QueryCommand {
  readonly kind: "query";
  readonly file: string;
  readonly diagnostics: DiagnosticFormat;
  readonly queryKind:
    | "containment"
    | "deployment"
    | "downstream"
    | "path"
    | "upstream"
    | "view-coverage";
  readonly subjectKey: ArchitectureGraphItemKey;
  readonly targetKey?: ArchitectureGraphItemKey;
  readonly direction?: ArchitectureGraphDirection;
  readonly scope?: "ancestors" | "both" | "descendants";
}

interface DiffCommand {
  readonly kind: "diff";
  readonly beforeFile: string;
  readonly afterFile: string;
  readonly beforeRef: string;
  readonly afterRef: string;
  readonly diagnostics: DiagnosticFormat;
  readonly comparison?: SceneComparisonMode;
  readonly formats: readonly RenderFormat[];
  readonly output: string;
  readonly scale: number;
  readonly view?: string;
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

type CliCommand =
  | AnalyzeCommand
  | CheckCommand
  | DiffCommand
  | QueryCommand
  | RenderCommand
  | { readonly kind: "version" };

const usage = `C4ML experimental CLI

Usage:
  c4ml analyze <file-or-project> [--diagnostics human|json]
               [--fail-on never|error|warning]
  c4ml check <file-or-project> [--diagnostics human|json]
  c4ml query <file-or-project> --kind upstream|downstream|path|containment|deployment|view-coverage
             --subject <kind:id> [--target <kind:id>] [--direction upstream|downstream]
             [--scope ancestors|descendants|both] [--diagnostics human|json]
  c4ml diff <before-file-or-project> <after-file-or-project> [--diagnostics human|json]
            [--comparison before|after|overlay|change-only --view <id>]
            [--before-ref <commit-or-branch|working>]
            [--after-ref <commit-or-branch|working>]
            [--format svg|png|svg,png] [--output <directory>] [--scale <number>]
  c4ml render <file-or-project> (--view <id> | --all) [--format svg|png|svg,png]
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
    io.stdout(
      `C4ML CLI ${cliVersion} (language ${c4mlDraftLanguageVersion})\n`,
    );
    return cliExitCode.success;
  }
  if (parsedCommand.kind === "diff") {
    return runDiffCommand(parsedCommand, io);
  }

  const sourcePath = resolve(io.cwd, parsedCommand.file);
  const loaded = await loadArchitectureProject(sourcePath);
  if (!loaded.valid) {
    reportCliFailure(
      cliProjectFailureCode(loaded.code),
      loaded.message,
      parsedCommand.diagnostics,
      io,
    );
    return loaded.classification === "source"
      ? cliExitCode.source
      : cliExitCode.environment;
  }

  const parsed = await parseC4mlProjectDraft(loaded.project);
  if (
    !parsed.valid ||
    parsed.model === undefined ||
    parsed.views === undefined
  ) {
    reportDiagnostics(parsed.diagnostics, parsedCommand.diagnostics, io);
    return cliExitCode.source;
  }
  if (loaded.project.publication !== undefined) {
    const publication = parseArchitecturePublication(loaded.project.publication.source);
    if (!publication.valid) {
      reportCliFailure(publication.error.code, publication.error.message, parsedCommand.diagnostics, io);
      return cliExitCode.source;
    }
    try {
      validateArchitecturePublicationViews(publication.publication, parsed.views);
    } catch (error: unknown) {
      if (error instanceof ArchitecturePublicationError) {
        reportCliFailure(error.code, error.message, parsedCommand.diagnostics, io);
        return cliExitCode.source;
      }
      throw error;
    }
  }
  let projectTheme: SceneThemeSelection = "c4ml-blue";
  if (loaded.project.theme !== undefined) {
    const theme = parseArchitectureThemeResource(loaded.project.theme.source);
    if (!theme.valid) {
      reportCliFailure(theme.error.code, theme.error.message, parsedCommand.diagnostics, io);
      return cliExitCode.source;
    }
    projectTheme = theme.theme.selection;
  }
  let projectShapes: DiagramShapeOptions | undefined;
  if (loaded.project.shapes !== undefined) {
    const shapes = parseArchitectureShapeResource(loaded.project.shapes.source);
    if (!shapes.valid) {
      reportCliFailure(shapes.error.code, shapes.error.message, parsedCommand.diagnostics, io);
      return cliExitCode.source;
    }
    projectShapes = shapes.shapes.options;
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
  if (parsedCommand.kind === "analyze") {
    const snapshot = resolveArchitectureSnapshot(
      parsed.model,
      parsed.views,
      {
        placementByViewId: parsed.placementByViewId,
        routingByViewId: parsed.routingByViewId,
      },
    ).snapshot!;
    const findings = evaluateBuiltInArchitectureQuality({
      model: parsed.model,
      views: parsed.views,
      snapshot,
      diagnostics: parsed.diagnostics,
    });
    if (loaded.project.policy !== undefined) {
      const parsedPolicy = parseArchitecturePolicySet(
        loaded.project.policy.source,
      );
      if (!parsedPolicy.valid) {
        reportCliFailure(
          parsedPolicy.error.code,
          parsedPolicy.error.message,
          parsedCommand.diagnostics,
          io,
        );
        return cliExitCode.source;
      }
      try {
        findings.push(...evaluateArchitecturePolicies({
          model: parsed.model,
          views: parsed.views,
          snapshot,
          policySet: parsedPolicy.policySet,
        }));
      } catch (error: unknown) {
        if (error instanceof ArchitecturePolicyError) {
          reportCliFailure(
            error.code,
            error.message,
            parsedCommand.diagnostics,
            io,
          );
          return cliExitCode.source;
        }
        throw error;
      }
    }
    if (loaded.project.observations !== undefined) {
      const parsedObservations = parseArchitectureObservationSet(
        loaded.project.observations.source,
      );
      if (!parsedObservations.valid) {
        reportCliFailure(
          parsedObservations.error.code,
          parsedObservations.error.message,
          parsedCommand.diagnostics,
          io,
        );
        return cliExitCode.source;
      }
      try {
        findings.push(...evaluateArchitectureObservations({
          model: parsed.model,
          views: parsed.views,
          snapshot,
          observationSet: parsedObservations.observationSet,
          resourceSource: resourceSource(
            loaded.project.observations.uri,
            loaded.project.observations.source,
          ),
        }).findings);
      } catch (error: unknown) {
        if (error instanceof ArchitectureObservationError) {
          reportCliFailure(
            error.code,
            error.message,
            parsedCommand.diagnostics,
            io,
          );
          return cliExitCode.source;
        }
        throw error;
      }
    }
    const report = createArchitectureAnalysisReport(snapshot, findings);
    reportSuccess(
      {
        command: "analyze",
        file: sourcePath,
        languageVersion: parsed.languageVersion,
        valid: true,
        report,
      },
      parsedCommand.diagnostics,
      io,
    );
    return analysisThresholdReached(report.findings, parsedCommand.failOn)
      ? cliExitCode.findings
      : cliExitCode.success;
  }
  if (parsedCommand.kind === "query") {
    const snapshot = resolveArchitectureSnapshot(
      parsed.model,
      parsed.views,
      {
        placementByViewId: parsed.placementByViewId,
        routingByViewId: parsed.routingByViewId,
      },
    ).snapshot!;
    try {
      const query = cliArchitectureQuery(parsedCommand);
      const result = executeArchitectureQuery(snapshot, query);
      const focusView = createTemporaryArchitectureView(result, {
        id: `focus:${query.id}`,
        title: `${query.kind} focus for ${query.subjectKey}`,
      });
      reportSuccess(
        {
          command: "query",
          file: sourcePath,
          languageVersion: parsed.languageVersion,
          valid: true,
          query,
          result,
          focusView,
        },
        parsedCommand.diagnostics,
        io,
      );
      return cliExitCode.success;
    } catch (error: unknown) {
      if (error instanceof ArchitectureQueryError) {
        reportCliFailure(
          error.code,
          error.message,
          parsedCommand.diagnostics,
          io,
        );
        return cliExitCode.source;
      }
      throw error;
    }
  }

  const selectedViews = selectViews(parsed.views, parsedCommand.view);
  if (selectedViews.length === 0) {
    const message = `No view with stable identifier "${parsedCommand.view}" exists in ${sourcePath}.`;
    reportCliFailure(
      "C4ML-CLI-SOURCE-001",
      message,
      parsedCommand.diagnostics,
      io,
    );
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
        ...(projectShapes === undefined ? {} : { shapes: projectShapes }),
        ...(parsed.placementByViewId?.[view.id] === undefined
          ? {}
          : { placement: parsed.placementByViewId[view.id] }),
        ...(parsed.routingByViewId?.[view.id] === undefined
          ? {}
          : { routing: parsed.routingByViewId[view.id] }),
        scene: { fontFamily: ibmPlexSansFamily, theme: projectTheme },
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
      await writeFile(
        resolve(outputDirectory, artifact.filename),
        artifact.bytes,
      );
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

function cliProjectFailureCode(code: string): string {
  switch (code) {
    case "C4ML-PROJECT-NODE-001":
      return "C4ML-CLI-ENV-001";
    case "C4ML-PROJECT-NODE-003":
      return "C4ML-CLI-ENV-002";
    case "C4ML-PROJECT-NODE-002":
      return "C4ML-CLI-PROJECT-001";
    case "C4ML-PROJECT-NODE-004":
      return "C4ML-CLI-PROJECT-002";
    case "C4ML-PROJECT-NODE-005":
      return "C4ML-CLI-PROJECT-003";
    default:
      return code;
  }
}

function parseCommand(args: readonly string[]): CliCommand | string {
  const [command, ...rest] = args;
  if (command === "version" && rest.length === 0) {
    return { kind: "version" };
  }
  if (
    command !== "analyze" &&
    command !== "check" &&
    command !== "diff" &&
    command !== "query" &&
    command !== "render"
  ) {
    return "Expected analyze, check, diff, query, render, or version.";
  }
  if (command === "diff") {
    return parseDiffCommand(rest);
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
    command === "analyze"
      ? new Set(["--diagnostics", "--fail-on"])
      : command === "check"
        ? new Set(["--diagnostics"])
      : command === "query"
        ? new Set([
            "--diagnostics",
            "--direction",
            "--kind",
            "--scope",
            "--subject",
            "--target",
          ])
      : new Set(["--diagnostics", "--format", "--output", "--scale", "--view"]);
  for (const option of options.keys()) {
    if (!allowed.has(option)) {
      return `Unknown option ${option} for ${command}.`;
    }
  }
  if (command === "analyze" || command === "check") {
    if (flags.size > 0) {
      return "--all is available only for render.";
    }
    const diagnostics = diagnosticFormat(options.get("--diagnostics"));
    if (typeof diagnostics === "string") return diagnostics;
    if (command === "analyze") {
      const failOn = findingFailureThreshold(options.get("--fail-on"));
      return typeof failOn === "string"
        ? failOn
        : {
            kind: command,
            file,
            diagnostics: diagnostics.value,
            failOn: failOn.value,
          };
    }
    return { kind: command, file, diagnostics: diagnostics.value };
  }
  if (command === "query") {
    if (flags.size > 0) return "--all is available only for render.";
    return parseQueryCommand(file, options);
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

function parseQueryCommand(
  file: string,
  options: ReadonlyMap<string, string>,
): QueryCommand | string {
  const diagnostics = diagnosticFormat(options.get("--diagnostics"));
  if (typeof diagnostics === "string") return diagnostics;
  const queryKind = options.get("--kind");
  if (
    queryKind !== "containment" &&
    queryKind !== "deployment" &&
    queryKind !== "downstream" &&
    queryKind !== "path" &&
    queryKind !== "upstream" &&
    queryKind !== "view-coverage"
  ) {
    return "Query --kind must be upstream, downstream, path, containment, deployment, or view-coverage.";
  }
  const subjectKey = parseArchitectureGraphItemKey(options.get("--subject"));
  if (typeof subjectKey === "string") return subjectKey;
  const target = options.get("--target");
  const targetKey = target === undefined
    ? undefined
    : parseArchitectureGraphItemKey(target);
  if (typeof targetKey === "string") return targetKey;
  if (queryKind === "path" && targetKey === undefined) {
    return "Path queries require --target <kind:id>.";
  }
  if (queryKind !== "path" && targetKey !== undefined) {
    return "--target is available only for path queries.";
  }
  const direction = options.get("--direction");
  if (
    direction !== undefined &&
    direction !== "downstream" &&
    direction !== "upstream"
  ) {
    return "--direction must be upstream or downstream.";
  }
  if (queryKind !== "path" && direction !== undefined) {
    return "--direction is available only for path queries.";
  }
  const scope = options.get("--scope");
  if (
    scope !== undefined &&
    scope !== "ancestors" &&
    scope !== "both" &&
    scope !== "descendants"
  ) {
    return "--scope must be ancestors, descendants, or both.";
  }
  if (queryKind !== "containment" && scope !== undefined) {
    return "--scope is available only for containment queries.";
  }
  return {
    kind: "query",
    file,
    diagnostics: diagnostics.value,
    queryKind,
    subjectKey: subjectKey.value,
    ...(targetKey === undefined ? {} : { targetKey: targetKey.value }),
    ...(direction === undefined ? {} : { direction }),
    ...(scope === undefined ? {} : { scope }),
  };
}

function parseArchitectureGraphItemKey(
  value: string | undefined,
): { readonly value: ArchitectureGraphItemKey } | string {
  if (value === undefined) return "Query requires --subject <kind:id>.";
  if (
    !/^(deployment-environment|deployment-instance|deployment-node|deployment-relationship|element|group|infrastructure-node|interaction|relationship|view):[^:]+$/.test(
      value,
    )
  ) {
    return `Invalid architecture identity "${value}"; expected kind:id.`;
  }
  return { value: value as ArchitectureGraphItemKey };
}

function cliArchitectureQuery(command: QueryCommand): ArchitectureQuery {
  const id = [
    "cli-query",
    command.queryKind,
    command.subjectKey,
    command.targetKey,
    command.direction,
    command.scope,
  ].filter((value) => value !== undefined).join(":");
  switch (command.queryKind) {
    case "path":
      return {
        id,
        kind: "path",
        subjectKey: command.subjectKey,
        targetKey: command.targetKey!,
        ...(command.direction === undefined ? {} : { direction: command.direction }),
      };
    case "containment":
      return {
        id,
        kind: "containment",
        subjectKey: command.subjectKey,
        ...(command.scope === undefined ? {} : { scope: command.scope }),
      };
    default:
      return { id, kind: command.queryKind, subjectKey: command.subjectKey };
  }
}

function parseDiffCommand(rest: readonly string[]): DiffCommand | string {
  const beforeFile = rest[0];
  const second = rest[1];
  const hasAfterFile = second !== undefined && !second.startsWith("--");
  if (beforeFile === undefined || beforeFile.startsWith("--")) {
    return "The diff command requires a before source or project.";
  }
  const afterFile = hasAfterFile ? second! : beforeFile;
  const options = new Map<string, string>();
  for (let index = hasAfterFile ? 2 : 1; index < rest.length; index += 1) {
    const option = rest[index]!;
    if (!["--after-ref", "--before-ref", "--comparison", "--diagnostics", "--format", "--output", "--scale", "--view"].includes(option)) {
      return `Unknown option ${option} for diff.`;
    }
    if (options.has(option)) return `${option} may be declared only once.`;
    const value = rest[index + 1];
    if (value === undefined || value.startsWith("--")) {
      return `${option} requires a value.`;
    }
    options.set(option, value);
    index += 1;
  }
  const diagnostics = diagnosticFormat(options.get("--diagnostics"));
  const comparison = comparisonMode(options.get("--comparison"));
  if (typeof comparison === "string") return comparison;
  const formats = renderFormats(options.get("--format"));
  if (typeof formats === "string") return formats;
  const scale = Number(options.get("--scale") ?? "1");
  if (!Number.isFinite(scale) || scale <= 0) {
    return "--scale must be a finite number greater than zero.";
  }
  const view = options.get("--view");
  if ((comparison.value === undefined) !== (view === undefined)) {
    return "Visual diff requires both --comparison <mode> and --view <id>.";
  }
  return typeof diagnostics === "string"
    ? diagnostics
    : {
        kind: "diff",
        beforeFile,
        afterFile,
        beforeRef: options.get("--before-ref") ?? "working",
        afterRef: options.get("--after-ref") ?? "working",
        diagnostics: diagnostics.value,
        ...(comparison.value === undefined ? {} : { comparison: comparison.value }),
        formats,
        output: options.get("--output") ?? "build/comparisons",
        scale,
        ...(view === undefined ? {} : { view }),
      };
}

function comparisonMode(
  value: string | undefined,
): { readonly value: SceneComparisonMode | undefined } | string {
  if (
    value === undefined ||
    value === "before" ||
    value === "after" ||
    value === "overlay" ||
    value === "change-only"
  ) {
    return { value };
  }
  return "--comparison must be before, after, overlay, or change-only.";
}

async function runDiffCommand(
  command: DiffCommand,
  io: CliIo,
): Promise<number> {
  const beforePath = resolve(io.cwd, command.beforeFile);
  const afterPath = resolve(io.cwd, command.afterFile);
  const beforeLoaded = await loadComparisonProject(beforePath, command.beforeRef);
  if (!beforeLoaded.valid) {
    reportCliFailure(
      cliProjectFailureCode(beforeLoaded.code),
      beforeLoaded.message,
      command.diagnostics,
      io,
    );
    return beforeLoaded.classification === "source"
      ? cliExitCode.source
      : cliExitCode.environment;
  }
  const afterLoaded = await loadComparisonProject(afterPath, command.afterRef);
  if (!afterLoaded.valid) {
    reportCliFailure(
      cliProjectFailureCode(afterLoaded.code),
      afterLoaded.message,
      command.diagnostics,
      io,
    );
    return afterLoaded.classification === "source"
      ? cliExitCode.source
      : cliExitCode.environment;
  }
  const before = await parseC4mlProjectDraft(beforeLoaded.project);
  if (!before.valid || before.model === undefined || before.views === undefined) {
    reportDiagnostics(before.diagnostics, command.diagnostics, io);
    return cliExitCode.source;
  }
  const after = await parseC4mlProjectDraft(afterLoaded.project);
  if (!after.valid || after.model === undefined || after.views === undefined) {
    reportDiagnostics(after.diagnostics, command.diagnostics, io);
    return cliExitCode.source;
  }
  const beforeSnapshot = resolveArchitectureSnapshot(before.model, before.views, {
    placementByViewId: before.placementByViewId,
    routingByViewId: before.routingByViewId,
  }).snapshot!;
  const afterSnapshot = resolveArchitectureSnapshot(after.model, after.views, {
    placementByViewId: after.placementByViewId,
    routingByViewId: after.routingByViewId,
  }).snapshot!;
  const difference = compareArchitectureSnapshots(beforeSnapshot, afterSnapshot);
  const impacts = deriveArchitectureImpacts(beforeSnapshot, afterSnapshot, difference);
  let comparisonArtifacts: string[] | undefined;
  let stability: ReturnType<typeof stabilizeLayoutAgainstBaseline>["decisions"] | undefined;
  if (command.comparison !== undefined && command.view !== undefined) {
    const beforeView = before.views.find(({ id }) => id === command.view);
    const afterView = after.views.find(({ id }) => id === command.view);
    if (beforeView === undefined || afterView === undefined || beforeView.kind !== afterView.kind) {
      reportCliFailure(
        "C4ML-CLI-DIFF-001",
        `Visual comparison requires stable view "${command.view}" with the same kind in both states.`,
        command.diagnostics,
        io,
      );
      return cliExitCode.source;
    }
    try {
      const embeddedFontFaces = await loadIbmPlexSansSvgFontFaces();
      const beforeCompiled = await compileArchitectureDiagram({
        model: before.model,
        view: beforeView,
        layoutAdapter: createBundledElkLayoutAdapter(),
        ...(before.placementByViewId?.[beforeView.id] === undefined
          ? {}
          : { placement: before.placementByViewId[beforeView.id] }),
        ...(before.routingByViewId?.[beforeView.id] === undefined
          ? {}
          : { routing: before.routingByViewId[beforeView.id] }),
        scene: { fontFamily: ibmPlexSansFamily, theme: "c4ml-blue" },
        svg: { embeddedFontFaces },
      });
      const afterCompiled = await compileArchitectureDiagram({
        model: after.model,
        view: afterView,
        layoutAdapter: createBundledElkLayoutAdapter(),
        ...(after.placementByViewId?.[afterView.id] === undefined
          ? {}
          : { placement: after.placementByViewId[afterView.id] }),
        ...(after.routingByViewId?.[afterView.id] === undefined
          ? {}
          : { routing: after.routingByViewId[afterView.id] }),
        scene: { fontFamily: ibmPlexSansFamily, theme: "c4ml-blue" },
        svg: { embeddedFontFaces },
      });
      if (
        !beforeCompiled.valid || beforeCompiled.scene === undefined ||
        beforeCompiled.layout === undefined ||
        !afterCompiled.valid || afterCompiled.preparedDiagram === undefined ||
        afterCompiled.layout === undefined
      ) {
        reportDiagnostics(
          [...beforeCompiled.diagnostics, ...afterCompiled.diagnostics],
          command.diagnostics,
          io,
        );
        return cliExitCode.compilation;
      }
      const stabilized = stabilizeLayoutAgainstBaseline(
        afterCompiled.preparedDiagram,
        beforeCompiled.layout,
        afterCompiled.layout,
        {
          fixedNodeIds: hardPlacementNodeIds(
            afterCompiled.preparedDiagram,
            after.placementByViewId?.[afterView.id],
          ),
        },
      );
      stability = stabilized.decisions;
      const stabilizedRoutes = routeDiagram(
        afterCompiled.preparedDiagram,
        stabilized.layout,
        after.routingByViewId?.[afterView.id],
      );
      const stabilizedAfterScene = createDiagramScene(
        afterCompiled.preparedDiagram,
        stabilized.layout,
        stabilizedRoutes,
        { fontFamily: ibmPlexSansFamily, theme: "c4ml-blue" },
      );
      const comparisonScene = createArchitectureComparisonScene(
        beforeCompiled.scene,
        stabilizedAfterScene,
        difference,
        impacts,
        command.comparison,
      );
      const svg = renderDiagramSvg(comparisonScene, { embeddedFontFaces });
      const outputDirectory = resolve(io.cwd, command.output);
      comparisonArtifacts = [];
      await mkdir(outputDirectory, { recursive: true });
      if (command.formats.includes("svg")) {
        const svgPath = resolve(outputDirectory, `${command.view}.${command.comparison}.svg`);
        await writeFile(svgPath, svg);
        comparisonArtifacts.push(svgPath);
      }
      if (command.formats.includes("png")) {
        const pngPath = resolve(outputDirectory, `${command.view}.${command.comparison}.png`);
        const png = await new ResvgPngRenderer().render(svg, {
          scale: command.scale,
          fontFiles: ibmPlexSansTtfFontFiles,
          loadSystemFonts: false,
          defaultFontFamily: ibmPlexSansFamily,
          background: comparisonScene.theme.canvas.background,
        });
        await writeFile(pngPath, png.bytes);
        comparisonArtifacts.push(pngPath);
      }
    } catch (error: unknown) {
      reportCliFailure(
        "C4ML-CLI-DIFF-002",
        `Cannot render architecture comparison: ${errorMessage(error)}`,
        command.diagnostics,
        io,
      );
      return cliExitCode.compilation;
    }
  }
  reportSuccess(
    {
      command: "diff",
      beforeFile: beforePath,
      afterFile: afterPath,
      beforeRef: comparisonRevision(beforeLoaded, command.beforeRef),
      afterRef: comparisonRevision(afterLoaded, command.afterRef),
      valid: true,
      difference,
      impacts,
      ...(comparisonArtifacts === undefined
        ? {}
        : {
            comparisonArtifact: comparisonArtifacts[0],
            comparisonArtifacts,
          }),
      ...(stability === undefined ? {} : { stability }),
    },
    command.diagnostics,
    io,
  );
  return cliExitCode.success;
}

type ComparisonProjectLoadResult = ProjectLoadResult | GitProjectLoadResult;

async function loadComparisonProject(
  path: string,
  reference: string,
): Promise<ComparisonProjectLoadResult> {
  return reference === "working"
    ? loadArchitectureProject(path)
    : loadArchitectureProjectAtGitRevision(path, reference);
}

function comparisonRevision(
  result: Extract<ComparisonProjectLoadResult, { readonly valid: true }>,
  requestedRef: string,
): Readonly<Record<string, string>> {
  return "revision" in result
    ? {
        kind: "git",
        requestedRef: result.revision.requestedRef,
        commit: result.revision.commit,
      }
    : { kind: "working", requestedRef };
}

function hardPlacementNodeIds(
  diagram: PreparedDiagram,
  placement: DiagramPlacementOptions | undefined,
): string[] {
  const references = new Set<string>();
  for (const constraint of placement?.constraints ?? []) {
    if (constraint.strength !== "hard") continue;
    switch (constraint.kind) {
      case "adjust":
      case "pin":
        references.add(constraint.targetId);
        break;
      case "alignment":
      case "relative":
        references.add(constraint.subjectId);
        references.add(constraint.targetId);
        break;
      case "align":
      case "distribute":
        constraint.nodeIds.forEach((id) => references.add(id));
        break;
    }
  }
  return diagram.nodes
    .filter(({ referenceId }) => references.has(referenceId))
    .map(({ id }) => id)
    .sort();
}

function diagnosticFormat(
  value: string | undefined,
): { readonly value: DiagnosticFormat } | string {
  if (value === undefined || value === "human" || value === "json") {
    return { value: value ?? "human" };
  }
  return "--diagnostics must be human or json.";
}

function findingFailureThreshold(
  value: string | undefined,
): { readonly value: FindingFailureThreshold } | string {
  if (
    value === undefined ||
    value === "never" ||
    value === "error" ||
    value === "warning"
  ) {
    return { value: value ?? "never" };
  }
  return "--fail-on must be never, error, or warning.";
}

function analysisThresholdReached(
  findings: readonly { readonly severity: string }[],
  threshold: FindingFailureThreshold,
): boolean {
  if (threshold === "never") return false;
  return findings.some(({ severity }) =>
    severity === "error" ||
    (threshold === "warning" && severity === "warning")
  );
}

function renderFormats(
  value: string | undefined,
): readonly RenderFormat[] | string {
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
    io.stdout(
      `${JSON.stringify({ valid: false, diagnostics: [{ code, message }] })}\n`,
    );
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
  } else if (value.command === "analyze") {
    const report = value.report as {
      readonly snapshot: {
        readonly elements: readonly unknown[];
        readonly relationships: readonly unknown[];
        readonly views: readonly unknown[];
      };
      readonly findings: readonly {
        readonly ruleId: string;
        readonly severity: string;
        readonly message: string;
        readonly sourceLocations: readonly {
          readonly file: string;
          readonly range: {
            readonly start: { readonly line: number; readonly column: number };
          };
        }[];
      }[];
    };
    io.stdout(
      `Analyzed C4ML: ${report.snapshot.elements.length} element(s), ` +
        `${report.snapshot.relationships.length} relationship(s), ` +
        `${report.snapshot.views.length} view(s), ` +
        `${report.findings.length} finding(s)\n`,
    );
    for (const finding of report.findings) {
      const source = finding.sourceLocations[0];
      io.stdout(
        `${source === undefined
          ? "<architecture>"
          : `${source.file}:${source.range.start.line + 1}:${source.range.start.column + 1}`} ` +
          `${finding.severity} ${finding.ruleId}: ${finding.message}\n`,
      );
    }
  } else if (value.command === "diff") {
    const difference = value.difference as {
      readonly summary: {
        readonly total: number;
        readonly architecture: number;
        readonly presentation: number;
        readonly layout: number;
      };
    };
    const impacts = value.impacts as { readonly impacts: readonly unknown[] };
    const comparisonArtifact = value.comparisonArtifact as string | undefined;
    io.stdout(
      `Compared C4ML: ${difference.summary.total} change(s), ` +
        `${difference.summary.architecture} architecture, ` +
        `${difference.summary.presentation} presentation, ` +
        `${difference.summary.layout} layout, ` +
        `${impacts.impacts.length} impact set(s)` +
      (comparisonArtifact === undefined ? "\n" : `; wrote ${comparisonArtifact}\n`),
    );
  } else if (value.command === "query") {
    const query = value.query as ArchitectureQuery;
    const result = value.result as {
      readonly itemKeys: readonly string[];
      readonly relationshipKeys: readonly string[];
      readonly evidence: readonly {
        readonly subjectKey: string;
        readonly statement: string;
      }[];
    };
    io.stdout(
      `Queried C4ML: ${query.kind} from ${query.subjectKey}; ` +
        `${result.itemKeys.length} item(s), ` +
        `${result.relationshipKeys.length} relationship(s)\n`,
    );
    for (const evidence of result.evidence) {
      io.stdout(`${evidence.subjectKey}: ${evidence.statement}\n`);
    }
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

function resourceSource(file: string, source: string) {
  const lines = source.split("\n");
  const lastLine = lines.length - 1;
  return {
    file,
    range: {
      start: { offset: 0, line: 0, column: 0 },
      end: {
        offset: source.length,
        line: lastLine,
        column: lines[lastLine]?.length ?? 0,
      },
    },
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
