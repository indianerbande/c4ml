import {
  compileArchitectureDiagram,
  createArchitectureAnalysisReport,
  createArchitectureProjectInput,
  previewProjectSourceChangeSet,
  resolveArchitectureSnapshot,
  svgSceneObjectId,
  type ArchitectureModel,
  type ArchitectureView,
  type Diagnostic,
  type DiagramScene,
  type DiagramRoutingOptions,
  type LayoutAdapter,
  type SceneNode,
  type ScenePort,
  type SceneRoute,
  type SourceReference,
  type SvgEmbeddedFontFace,
} from "@c4ml/compiler-core";
import { ibmPlexSansFamily } from "@c4ml/font-ibm-plex";
import { loadIbmPlexSansSvgFontFaces } from "@c4ml/font-ibm-plex/browser";
import { createBrowserElkLayoutAdapter } from "@c4ml/layout-elk/browser";
import {
  completeC4mlDraft,
  completeC4mlProjectDraft,
  generateSystemContextDraft,
  helpContextAtC4mlDraft,
  highlightC4mlDraft,
  parseC4mlDraft,
  parseC4mlProjectDraft,
} from "@c4ml/language-c4ml";

import {
  type AnalysisWorkerRequest,
  type AnalysisWorkerResponse,
} from "./compiler-worker.analysis.protocol.js";

import {
  type CompilerWorkerDiagnostic,
  type CompilerWorkerNavigation,
  type CompilerWorkerRequest,
  type CompilerWorkerResponse,
  type CompilerWorkerView,
} from "./compiler-worker.compile.protocol.js";
import {
  type CompletionWorkerRequest,
  type CompletionWorkerResponse,
  type HighlightWorkerRequest,
  type HighlightWorkerResponse,
  type HelpWorkerRequest,
  type HelpWorkerResponse,
} from "./compiler-worker.language.protocol.js";
import {
  type PreviewProjectChangeWorkerRequest,
  type PreviewProjectChangeWorkerResponse,
  type WizardWorkerRequest,
  type WizardWorkerResponse,
} from "./compiler-worker.authoring.protocol.js";
import { compilerWorkerProtocolVersion } from "./compiler-worker.shared.js";
import type {
  CompilerWorkerInbound,
  CompilerWorkerOutbound,
} from "./compiler-worker.protocol.js";

let browserLayoutAdapter: LayoutAdapter | undefined;

export async function analyzeWorkerRequest(
  request: AnalysisWorkerRequest,
): Promise<AnalysisWorkerResponse> {
  try {
    const parsed =
      request.project === undefined
        ? await parseC4mlDraft(request.source, { file: request.file })
        : await parseC4mlProjectDraft(toArchitectureProject(request.project));
    if (
      !parsed.valid ||
      parsed.model === undefined ||
      parsed.views === undefined
    ) {
      return {
        protocolVersion: compilerWorkerProtocolVersion,
        type: "analysis-result",
        requestId: request.requestId,
        status: "invalid",
        diagnostics: parsed.diagnostics.map(toWorkerDiagnostic),
        report: undefined,
      };
    }
    const snapshot = resolveArchitectureSnapshot(
      parsed.model,
      parsed.views,
    ).snapshot!;
    return {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "analysis-result",
      requestId: request.requestId,
      status: "valid",
      diagnostics: parsed.diagnostics.map(toWorkerDiagnostic),
      report: createArchitectureAnalysisReport(snapshot),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "analysis-result",
      requestId: request.requestId,
      status: "failed",
      diagnostics: [
        {
          code: "C4ML-EDITOR-ANALYSIS-001",
          severity: "error",
          message: `Architecture analysis failed: ${message}`,
          source: undefined,
          correction: "Inspect the source and restart the editor worker.",
        },
      ],
      report: undefined,
    };
  }
}

export async function compileWorkerRequest(
  request: CompilerWorkerRequest,
  layoutAdapter: LayoutAdapter = getBrowserLayoutAdapter(),
  embeddedFontFaces?: readonly SvgEmbeddedFontFace[],
): Promise<CompilerWorkerResponse> {
  try {
    const parsed =
      request.project === undefined
        ? await parseC4mlDraft(request.source, { file: request.file })
        : await parseC4mlProjectDraft(toArchitectureProject(request.project));
    if (
      !parsed.valid ||
      parsed.model === undefined ||
      parsed.views === undefined ||
      parsed.views[0] === undefined
    ) {
      return response(
        request,
        "invalid",
        parsed.diagnostics,
        undefined,
        undefined,
        [],
        undefined,
      );
    }

    const views = parsed.views.map(toWorkerView);
    const view =
      parsed.views.find(({ id }) => id === request.requestedViewId) ??
      parsed.views[0];

    const effectiveFontFaces =
      embeddedFontFaces ?? (await getBrowserSvgFontFaces());
    const compiled = await compileArchitectureDiagram({
      model: parsed.model,
      view,
      layoutAdapter,
      ...(parsed.placementByViewId?.[view.id] === undefined
        ? {}
        : { placement: parsed.placementByViewId[view.id] }),
      ...(parsed.routingByViewId?.[view.id] === undefined
        ? {}
        : { routing: parsed.routingByViewId[view.id] }),
      scene: { fontFamily: ibmPlexSansFamily, theme: "c4ml-blue" },
      svg: { embeddedFontFaces: effectiveFontFaces },
    });
    if (!compiled.valid || compiled.svg === undefined) {
      return response(
        request,
        "invalid",
        compiled.diagnostics,
        undefined,
        undefined,
        views,
        view.id,
      );
    }

    return response(
      request,
      "valid",
      compiled.diagnostics,
      compiled.svg,
      toWorkerNavigation(
        parsed.model,
        view,
        compiled.scene!,
        parsed.routingByViewId?.[view.id],
      ),
      views,
      view.id,
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "compile-result",
      requestId: request.requestId,
      status: "failed",
      svg: undefined,
      navigation: undefined,
      views: [],
      activeViewId: undefined,
      diagnostics: [
        {
          code: "C4ML-EDITOR-002",
          severity: "error",
          message: `The compiler worker failed: ${message}`,
          source: undefined,
          correction: "Inspect the source and restart the editor worker.",
        },
      ],
    };
  }
}

function getBrowserSvgFontFaces(): Promise<readonly SvgEmbeddedFontFace[]> {
  return loadIbmPlexSansSvgFontFaces(
    new URL("fonts/ibm-plex/", self.location.href),
  );
}

function getBrowserLayoutAdapter(): LayoutAdapter {
  browserLayoutAdapter ??= createBrowserElkLayoutAdapter({
    workerUrl: new URL(
      "third-party/elkjs/elk-worker.min.js",
      self.location.href,
    ).href,
  });
  return browserLayoutAdapter;
}

export async function completeWorkerRequest(
  request: CompletionWorkerRequest,
): Promise<CompletionWorkerResponse> {
  try {
    const result =
      request.project === undefined
        ? await completeC4mlDraft(request.source, {
            file: request.file,
            offset: request.offset,
          })
        : await completeC4mlProjectDraft(
            toArchitectureProject(request.project),
            request.file,
            request.offset,
          );
    return {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "completion-result",
      requestId: request.requestId,
      status: "complete",
      candidates: result.candidates,
      message: undefined,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "completion-result",
      requestId: request.requestId,
      status: "failed",
      candidates: [],
      message: `Completion failed: ${message}`,
    };
  }
}

export async function highlightWorkerRequest(
  request: HighlightWorkerRequest,
): Promise<HighlightWorkerResponse> {
  try {
    return {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "highlight-result",
      requestId: request.requestId,
      status: "complete",
      highlights: highlightC4mlDraft(request.source),
      message: undefined,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "highlight-result",
      requestId: request.requestId,
      status: "failed",
      highlights: [],
      message: `Highlighting failed: ${message}`,
    };
  }
}

export async function helpWorkerRequest(
  request: HelpWorkerRequest,
): Promise<HelpWorkerResponse> {
  try {
    return {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "help-context-result",
      requestId: request.requestId,
      status: "complete",
      topicId: helpContextAtC4mlDraft(request.source, request.offset).topicId,
      message: undefined,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "help-context-result",
      requestId: request.requestId,
      status: "failed",
      topicId: "getting-started",
      message: `Help context failed: ${message}`,
    };
  }
}

export async function generateWorkerRequest(
  request: WizardWorkerRequest,
): Promise<WizardWorkerResponse> {
  try {
    const result = generateSystemContextDraft(request.answers);
    return {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "generation-result",
      requestId: request.requestId,
      status: result.valid ? "valid" : "invalid",
      source: result.source,
      issues: result.issues,
      message: undefined,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "generation-result",
      requestId: request.requestId,
      status: "failed",
      source: undefined,
      issues: [],
      message: `Source generation failed: ${message}`,
    };
  }
}

export async function previewProjectChangeWorkerRequest(
  request: PreviewProjectChangeWorkerRequest,
  layoutAdapter: LayoutAdapter = getBrowserLayoutAdapter(),
  embeddedFontFaces?: readonly SvgEmbeddedFontFace[],
): Promise<PreviewProjectChangeWorkerResponse> {
  try {
    const activeProject = createArchitectureProjectInput({
      id: request.project.id,
      ...(request.project.name === undefined
        ? {}
        : { name: request.project.name }),
      ...(request.project.description === undefined
        ? {}
        : { description: request.project.description }),
      documents: request.project.documents.map(({ uri, source }) => ({
        uri,
        text: source,
      })),
    });
    const preview = await previewProjectSourceChangeSet(
      activeProject,
      request.changeSet,
      async (candidate) => {
        const candidateProject = {
          version: 1 as const,
          id: candidate.id,
          ...(candidate.name === undefined ? {} : { name: candidate.name }),
          ...(candidate.description === undefined
            ? {}
            : { description: candidate.description }),
          documents: candidate.documents.map(({ uri, text }) => ({
            uri,
            source: text,
          })),
        };
        const activeDocument = candidateProject.documents.find(
          ({ uri }) => uri === request.file,
        )!;
        const compilation = await compileWorkerRequest(
          {
            protocolVersion: compilerWorkerProtocolVersion,
            type: "compile",
            requestId: request.requestId,
            file: request.file,
            source: activeDocument.source,
            project: candidateProject,
            ...(request.requestedViewId === undefined
              ? {}
              : { requestedViewId: request.requestedViewId }),
          },
          layoutAdapter,
          embeddedFontFaces,
        );
        return { candidateProject, compilation };
      },
    );
    if (!preview.valid) {
      return {
        protocolVersion: compilerWorkerProtocolVersion,
        type: "preview-project-change-result",
        requestId: request.requestId,
        status: "invalid",
        candidateProject: undefined,
        revision: undefined,
        compilation: undefined,
        issues: preview.issues,
        message: undefined,
      };
    }
    return {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "preview-project-change-result",
      requestId: request.requestId,
      status: preview.evaluation.compilation.status,
      candidateProject: preview.evaluation.candidateProject,
      revision: preview.revision,
      compilation: preview.evaluation.compilation,
      issues: [],
      message: undefined,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "preview-project-change-result",
      requestId: request.requestId,
      status: "failed",
      candidateProject: undefined,
      revision: undefined,
      compilation: undefined,
      issues: [],
      message: `Change preview failed: ${message}`,
    };
  }
}

export function executeWorkerRequest(
  request: CompilerWorkerInbound,
): Promise<CompilerWorkerOutbound> {
  switch (request.type) {
    case "analyze":
      return analyzeWorkerRequest(request);
    case "compile":
      return compileWorkerRequest(request);
    case "complete":
      return completeWorkerRequest(request);
    case "highlight":
      return highlightWorkerRequest(request);
    case "help-context":
      return helpWorkerRequest(request);
    case "preview-project-change":
      return previewProjectChangeWorkerRequest(request);
    case "generate-system-context":
      return generateWorkerRequest(request);
  }
}

function toArchitectureProject(project: {
  readonly id: string;
  readonly name?: string;
  readonly description?: string;
  readonly documents: readonly {
    readonly uri: string;
    readonly source: string;
  }[];
}) {
  return createArchitectureProjectInput({
    id: project.id,
    ...(project.name === undefined ? {} : { name: project.name }),
    ...(project.description === undefined
      ? {}
      : { description: project.description }),
    documents: project.documents.map(({ uri, source }) => ({
      uri,
      text: source,
    })),
  });
}

function response(
  request: CompilerWorkerRequest,
  status: "invalid" | "valid",
  diagnostics: readonly Diagnostic[],
  svg: string | undefined,
  navigation: CompilerWorkerNavigation | undefined,
  views: readonly CompilerWorkerView[],
  activeViewId: string | undefined,
): CompilerWorkerResponse {
  return {
    protocolVersion: compilerWorkerProtocolVersion,
    type: "compile-result",
    requestId: request.requestId,
    status,
    diagnostics: diagnostics.map(toWorkerDiagnostic),
    svg,
    navigation,
    views,
    activeViewId,
  };
}

function toWorkerView(
  view: NonNullable<
    Awaited<ReturnType<typeof parseC4mlDraft>>["views"]
  >[number],
): CompilerWorkerView {
  return { id: view.id, kind: view.kind, title: view.title };
}

function toWorkerDiagnostic(diagnostic: Diagnostic): CompilerWorkerDiagnostic {
  return {
    code: diagnostic.code,
    severity: diagnostic.severity,
    message: diagnostic.message,
    source: toWorkerSource(diagnostic.source),
    correction: diagnostic.correction,
  };
}

function toWorkerNavigation(
  model: ArchitectureModel,
  view: ArchitectureView,
  scene: DiagramScene,
  routing: DiagramRoutingOptions | undefined,
): CompilerWorkerNavigation {
  const portById = new Map(scene.ports.map((port) => [port.id, port]));
  return {
    width: scene.width,
    height: scene.height,
    targets: [
      ...scene.nodes.flatMap((node) => {
        const source = sourceForSceneNode(model, view, node);
        return source === undefined
          ? []
          : [
              {
                kind: "node" as const,
                sceneObjectId: node.id,
                svgElementIds: [svgSceneObjectId(node.id)],
                referenceId: node.referenceId,
                label: node.title.lines.join(" "),
                source: toWorkerSource(source),
                relatedSources: [],
                nodeRole:
                  node.kind === "element" || node.kind === "infrastructure-node"
                    ? ("element" as const)
                    : ("boundary" as const),
                bounds: {
                  x: node.x,
                  y: node.y,
                  width: node.width,
                  height: node.height,
                },
              },
            ];
      }),
      ...scene.routes.flatMap((route) => {
        const source = sourceForSceneRoute(model, view, route);
        const sourcePort = portById.get(route.sourcePortId);
        const targetPort = portById.get(route.targetPortId);
        if (
          source === undefined ||
          sourcePort === undefined ||
          targetPort === undefined
        ) {
          return [];
        }
        const controlSource = routing?.controls?.find(
          ({ relationshipId }) => relationshipId === route.relationshipId,
        )?.source;
        const relationshipSource = toWorkerSource(source);
        const detailSource = toWorkerSource(controlSource ?? source);
        const routeTarget = {
          kind: "route" as const,
          sceneObjectId: route.id,
          svgElementIds: [
            svgSceneObjectId(route.id),
            svgSceneObjectId(`${route.id}:arrowhead`),
          ],
          referenceId: route.relationshipId,
          label: route.label,
          source: relationshipSource,
          relatedSources:
            controlSource === undefined ? [] : [toWorkerSource(controlSource)],
          policy: route.policy,
          style: route.style,
          points: route.points,
          sourcePort: toWorkerPort(sourcePort),
          targetPort: toWorkerPort(targetPort),
          labelPoint: route.labelPoint,
          labelSegment: route.labelSegment,
          corridor:
            route.corridor === undefined
              ? undefined
              : {
                  id: route.corridor.corridorId,
                  orientation: route.corridor.orientation,
                  coordinate: route.corridor.coordinate,
                  laneCoordinate: route.corridor.laneCoordinate,
                  lane: route.corridor.lane,
                  lanes: route.corridor.lanes,
                  laneSpacing: route.corridor.laneSpacing,
                },
          waypoints: route.waypoints.map((waypoint) => ({
            anchorKind: waypoint.anchor.kind,
            referenceId:
              waypoint.anchor.kind === "node"
                ? waypoint.anchor.referenceId
                : undefined,
            side:
              waypoint.anchor.kind === "node"
                ? waypoint.anchor.side
                : undefined,
            point: waypoint.point,
          })),
          lockedSegments: route.lockedSegments,
          avoidanceRegions: route.avoidanceRegions,
        };
        const commonDetail = {
          referenceId: route.relationshipId,
          source: detailSource,
          relatedSources: [],
          routeSceneObjectId: route.id,
        };
        const detailTargets = [
          {
            ...commonDetail,
            kind: "port" as const,
            sceneObjectId: sourcePort.id,
            svgElementIds: [svgSceneObjectId(sourcePort.id)],
            label: `Source port · ${sourcePort.side}`,
            portRole: "source" as const,
            side: sourcePort.side,
            point: sourcePort.point,
          },
          {
            ...commonDetail,
            kind: "port" as const,
            sceneObjectId: targetPort.id,
            svgElementIds: [svgSceneObjectId(targetPort.id)],
            label: `Target port · ${targetPort.side}`,
            portRole: "target" as const,
            side: targetPort.side,
            point: targetPort.point,
          },
          {
            ...commonDetail,
            kind: "route-label" as const,
            sceneObjectId: `${route.id}:label`,
            svgElementIds: [svgSceneObjectId(`${route.id}:label`)],
            label: route.label,
            point: route.labelPoint,
            bounds: route.labelBounds,
          },
        ];
        const corridorTarget =
          route.corridor === undefined
            ? []
            : [
                {
                  ...commonDetail,
                  kind: "corridor" as const,
                  sceneObjectId: `${route.id}:corridor:${route.corridor.corridorId}:${route.corridor.lane}`,
                  svgElementIds: [svgSceneObjectId(route.id)],
                  label: `Corridor ${route.corridor.corridorId} · lane ${route.corridor.lane + 1}`,
                  orientation: route.corridor.orientation,
                  points:
                    route.corridor.orientation === "vertical"
                      ? ([
                          { x: route.corridor.laneCoordinate, y: 82 },
                          {
                            x: route.corridor.laneCoordinate,
                            y: scene.height - 54,
                          },
                        ] as const)
                      : ([
                          { x: 24, y: route.corridor.laneCoordinate },
                          {
                            x: scene.width - 24,
                            y: route.corridor.laneCoordinate,
                          },
                        ] as const),
                  lane: route.corridor.lane,
                  lanes: route.corridor.lanes,
                },
              ];
        return [routeTarget, ...detailTargets, ...corridorTarget];
      }),
    ],
  };
}

function toWorkerPort(port: ScenePort) {
  return {
    id: port.id,
    role: port.role,
    side: port.side,
    point: port.point,
  };
}

function sourceForSceneNode(
  model: ArchitectureModel,
  view: ArchitectureView,
  node: SceneNode,
): SourceReference | undefined {
  switch (node.kind) {
    case "scope-boundary":
      return view.source;
    case "visual-group":
      return view.groups?.find(({ id }) => id === node.referenceId)?.source;
    case "deployment-node":
      return model.deployment?.nodes.find(({ id }) => id === node.referenceId)
        ?.source;
    case "infrastructure-node":
      return model.deployment?.infrastructureNodes.find(
        ({ id }) => id === node.referenceId,
      )?.source;
    case "element":
      return node.elementRole === "container-instance" ||
        node.elementRole === "software-system-instance"
        ? model.deployment?.instances.find(({ id }) => id === node.referenceId)
            ?.source
        : model.elements.find(({ id }) => id === node.referenceId)?.source;
  }
}

function sourceForSceneRoute(
  model: ArchitectureModel,
  view: ArchitectureView,
  route: SceneRoute,
): SourceReference | undefined {
  if (view.kind === "dynamic") {
    return view.interactions.find(({ id }) => id === route.relationshipId)
      ?.source;
  }
  if (view.kind === "deployment") {
    return model.deployment?.relationships.find(
      ({ id }) => id === route.relationshipId,
    )?.source;
  }
  return model.relationships.find(({ id }) => id === route.relationshipId)
    ?.source;
}

function toWorkerSource(source: SourceReference) {
  return {
    file: source.file,
    start: source.range.start,
    end: source.range.end,
  };
}
