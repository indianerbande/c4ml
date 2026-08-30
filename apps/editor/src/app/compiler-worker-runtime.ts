import {
  ArchitectureObservationError,
  ArchitecturePolicyError,
  compareArchitectureSnapshots,
  compileArchitectureDiagram,
  createArchitectureAnalysisReport,
  deriveArchitectureImpacts,
  evaluateArchitecturePolicies,
  evaluateArchitectureObservations,
  evaluateBuiltInArchitectureQuality,
  createArchitectureProjectInput,
  parseArchitectureObservationSet,
  parseArchitecturePolicySet,
  previewProjectSourceChangeSet,
  resolveArchitectureSnapshot,
  svgSceneObjectId,
  type ArchitectureModel,
  type ArchitectureView,
  type Diagnostic,
  type DiagramScene,
  type DiagramPlacementOptions,
  type DiagramRoutingOptions,
  type LayoutAdapter,
  type LayoutResult,
  type PlacementResult,
  type PlacementConstraint,
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
  inspectC4mlSemanticAuthoringContext,
  proposeC4mlPlacementEdit,
  proposeC4mlRouteEdit,
  proposeC4mlSemanticEdit,
} from "@c4ml/language-c4ml";

import {
  type AnalysisWorkerRequest,
  type AnalysisWorkerResponse,
} from "./compiler-worker.analysis.protocol.js";
import type {
  ComparisonWorkerInput,
  ComparisonWorkerRequest,
  ComparisonWorkerResponse,
} from "./compiler-worker.comparison.protocol.js";

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
  type PreviewPlacementChangeWorkerRequest,
  type PreviewPlacementChangeWorkerResponse,
  type PreviewRouteChangeWorkerRequest,
  type PreviewRouteChangeWorkerResponse,
  type WizardWorkerRequest,
  type WizardWorkerResponse,
} from "./compiler-worker.authoring.protocol.js";
import type {
  InspectSemanticAuthoringWorkerRequest,
  InspectSemanticAuthoringWorkerResponse,
  PreviewSemanticChangeWorkerRequest,
  PreviewSemanticChangeWorkerResponse,
} from "./compiler-worker.semantic-authoring.protocol.js";
import { compilerWorkerProtocolVersion } from "./compiler-worker.shared.js";
import type {
  CompilerWorkerInbound,
  CompilerWorkerOutbound,
} from "./compiler-worker.protocol.js";

let browserLayoutAdapter: LayoutAdapter | undefined;

export async function compareWorkerRequest(
  request: ComparisonWorkerRequest,
): Promise<ComparisonWorkerResponse> {
  try {
    const before = await parseComparisonInput(request.before);
    const after = await parseComparisonInput(request.after);
    if (
      !before.valid ||
      before.model === undefined ||
      before.views === undefined ||
      !after.valid ||
      after.model === undefined ||
      after.views === undefined
    ) {
      return {
        protocolVersion: compilerWorkerProtocolVersion,
        type: "comparison-result",
        requestId: request.requestId,
        status: "invalid",
        diagnostics: {
          before: before.diagnostics.map(toWorkerDiagnostic),
          after: after.diagnostics.map(toWorkerDiagnostic),
        },
        difference: undefined,
        impacts: undefined,
      };
    }
    const beforeSnapshot = resolveArchitectureSnapshot(
      before.model,
      before.views,
      {
        placementByViewId: before.placementByViewId,
        routingByViewId: before.routingByViewId,
      },
    ).snapshot!;
    const afterSnapshot = resolveArchitectureSnapshot(
      after.model,
      after.views,
      {
        placementByViewId: after.placementByViewId,
        routingByViewId: after.routingByViewId,
      },
    ).snapshot!;
    const difference = compareArchitectureSnapshots(beforeSnapshot, afterSnapshot);
    return {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "comparison-result",
      requestId: request.requestId,
      status: "valid",
      diagnostics: {
        before: before.diagnostics.map(toWorkerDiagnostic),
        after: after.diagnostics.map(toWorkerDiagnostic),
      },
      difference,
      impacts: deriveArchitectureImpacts(beforeSnapshot, afterSnapshot, difference),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "comparison-result",
      requestId: request.requestId,
      status: "failed",
      diagnostics: {
        before: [],
        after: [
          {
            code: "C4ML-EDITOR-DIFF-001",
            severity: "error",
            message: `Architecture comparison failed: ${message}`,
            source: undefined,
            correction: "Inspect both sources and restart the editor worker.",
          },
        ],
      },
      difference: undefined,
      impacts: undefined,
    };
  }
}

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
    const policyResource = request.project?.policy;
    if (policyResource !== undefined) {
      const parsedPolicy = parseArchitecturePolicySet(policyResource.source);
      if (!parsedPolicy.valid) {
        return invalidPolicyAnalysisResponse(
          request,
          policyResource,
          parsedPolicy.error,
        );
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
          return invalidPolicyAnalysisResponse(request, policyResource, error);
        }
        throw error;
      }
    }
    const observationResource = request.project?.observations;
    if (observationResource !== undefined) {
      const parsedObservations = parseArchitectureObservationSet(
        observationResource.source,
      );
      if (!parsedObservations.valid) {
        return invalidObservationAnalysisResponse(
          request,
          observationResource,
          parsedObservations.error,
        );
      }
      try {
        findings.push(...evaluateArchitectureObservations({
          model: parsed.model,
          views: parsed.views,
          snapshot,
          observationSet: parsedObservations.observationSet,
          resourceSource: resourceSource(
            observationResource.uri,
            observationResource.source,
          ),
        }).findings);
      } catch (error: unknown) {
        if (error instanceof ArchitectureObservationError) {
          return invalidObservationAnalysisResponse(
            request,
            observationResource,
            error,
          );
        }
        throw error;
      }
    }
    return {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "analysis-result",
      requestId: request.requestId,
      status: "valid",
      diagnostics: parsed.diagnostics.map(toWorkerDiagnostic),
      report: createArchitectureAnalysisReport(
        snapshot,
        findings,
      ),
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

function invalidPolicyAnalysisResponse(
  request: AnalysisWorkerRequest,
  policy: { readonly uri: string; readonly source: string },
  error: ArchitecturePolicyError,
): AnalysisWorkerResponse {
  const lines = policy.source.split("\n");
  const lastLine = lines.length - 1;
  return {
    protocolVersion: compilerWorkerProtocolVersion,
    type: "analysis-result",
    requestId: request.requestId,
    status: "invalid",
    diagnostics: [{
      code: error.code,
      severity: "error",
      message: error.message,
      source: {
        file: policy.uri,
        start: { offset: 0, line: 0, column: 0 },
        end: {
          offset: policy.source.length,
          line: lastLine,
          column: lines[lastLine]?.length ?? 0,
        },
      },
      correction: "Review the project-local architecture policy resource.",
    }],
    report: undefined,
  };
}

function invalidObservationAnalysisResponse(
  request: AnalysisWorkerRequest,
  observations: { readonly uri: string; readonly source: string },
  error: ArchitectureObservationError,
): AnalysisWorkerResponse {
  const source = resourceSource(observations.uri, observations.source);
  return {
    protocolVersion: compilerWorkerProtocolVersion,
    type: "analysis-result",
    requestId: request.requestId,
    status: "invalid",
    diagnostics: [{
      code: error.code,
      severity: "error",
      message: error.message,
      source: {
        file: source.file,
        start: source.range.start,
        end: source.range.end,
      },
      correction: "Review the project-local architecture observation resource.",
    }],
    report: undefined,
  };
}

function resourceSource(file: string, source: string): SourceReference {
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
        compiled.candidateLayout,
        compiled.placement,
        parsed.placementByViewId?.[view.id],
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
      ...(request.project.policy === undefined
        ? {}
        : {
            policy: {
              uri: request.project.policy.uri,
              source: request.project.policy.source,
            },
          }),
      ...(request.project.observations === undefined
        ? {}
        : {
            observations: {
              uri: request.project.observations.uri,
              source: request.project.observations.source,
            },
          }),
      ...(request.project.glossary === undefined
        ? {}
        : {
            glossary: {
              uri: request.project.glossary.uri,
              source: request.project.glossary.source,
            },
          }),
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
          ...(candidate.policy === undefined
            ? {}
            : {
                policy: {
                  uri: candidate.policy.uri,
                  source: candidate.policy.source,
                },
              }),
          ...(candidate.observations === undefined
            ? {}
            : {
                observations: {
                  uri: candidate.observations.uri,
                  source: candidate.observations.source,
                },
              }),
          ...(candidate.glossary === undefined
            ? {}
            : {
                glossary: {
                  uri: candidate.glossary.uri,
                  source: candidate.glossary.source,
                },
              }),
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

export async function previewPlacementChangeWorkerRequest(
  request: PreviewPlacementChangeWorkerRequest,
  layoutAdapter: LayoutAdapter = getBrowserLayoutAdapter(),
  embeddedFontFaces?: readonly SvgEmbeddedFontFace[],
): Promise<PreviewPlacementChangeWorkerResponse> {
  try {
    const project = toArchitectureProject(request.project);
    const proposal = await proposeC4mlPlacementEdit(project, request.placement);
    if (!proposal.valid) {
      return {
        protocolVersion: compilerWorkerProtocolVersion,
        type: "preview-placement-change-result",
        requestId: request.requestId,
        status: "invalid",
        changeSet: undefined,
        documentUri: undefined,
        proposedText: undefined,
        candidateProject: undefined,
        compilation: undefined,
        authoringIssues: proposal.issues,
        changeIssues: [],
        message: undefined,
      };
    }
    const preview = await previewProjectChangeWorkerRequest(
      {
        protocolVersion: compilerWorkerProtocolVersion,
        type: "preview-project-change",
        requestId: request.requestId,
        file: request.file,
        project: request.project,
        changeSet: proposal.changeSet,
        ...(request.requestedViewId === undefined
          ? {}
          : { requestedViewId: request.requestedViewId }),
      },
      layoutAdapter,
      embeddedFontFaces,
    );
    return {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "preview-placement-change-result",
      requestId: request.requestId,
      status: preview.status,
      changeSet: proposal.changeSet,
      documentUri: proposal.documentUri,
      proposedText: proposal.proposedText,
      candidateProject: preview.candidateProject,
      compilation: preview.compilation,
      authoringIssues: [],
      changeIssues: preview.issues,
      message: preview.message,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "preview-placement-change-result",
      requestId: request.requestId,
      status: "failed",
      changeSet: undefined,
      documentUri: undefined,
      proposedText: undefined,
      candidateProject: undefined,
      compilation: undefined,
      authoringIssues: [],
      changeIssues: [],
      message: `Placement preview failed: ${message}`,
    };
  }
}

export async function previewRouteChangeWorkerRequest(
  request: PreviewRouteChangeWorkerRequest,
  layoutAdapter: LayoutAdapter = getBrowserLayoutAdapter(),
  embeddedFontFaces?: readonly SvgEmbeddedFontFace[],
): Promise<PreviewRouteChangeWorkerResponse> {
  try {
    const project = toArchitectureProject(request.project);
    const proposal = await proposeC4mlRouteEdit(project, request.route);
    if (!proposal.valid) {
      return {
        protocolVersion: compilerWorkerProtocolVersion,
        type: "preview-route-change-result",
        requestId: request.requestId,
        status: "invalid",
        changeSet: undefined,
        documentUri: undefined,
        proposedText: undefined,
        candidateProject: undefined,
        compilation: undefined,
        repairs: [],
        authoringIssues: proposal.issues,
        changeIssues: [],
        message: undefined,
      };
    }
    const preview = await previewProjectChangeWorkerRequest(
      {
        protocolVersion: compilerWorkerProtocolVersion,
        type: "preview-project-change",
        requestId: request.requestId,
        file: request.file,
        project: request.project,
        changeSet: proposal.changeSet,
        ...(request.requestedViewId === undefined
          ? {}
          : { requestedViewId: request.requestedViewId }),
      },
      layoutAdapter,
      embeddedFontFaces,
    );
    return {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "preview-route-change-result",
      requestId: request.requestId,
      status: preview.status,
      changeSet: proposal.changeSet,
      documentUri: proposal.documentUri,
      proposedText: proposal.proposedText,
      candidateProject: preview.candidateProject,
      compilation: preview.compilation,
      repairs: proposal.repairs,
      authoringIssues: [],
      changeIssues: preview.issues,
      message: preview.message,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "preview-route-change-result",
      requestId: request.requestId,
      status: "failed",
      changeSet: undefined,
      documentUri: undefined,
      proposedText: undefined,
      candidateProject: undefined,
      compilation: undefined,
      repairs: [],
      authoringIssues: [],
      changeIssues: [],
      message: `Route preview failed: ${message}`,
    };
  }
}

export async function inspectSemanticAuthoringWorkerRequest(
  request: InspectSemanticAuthoringWorkerRequest,
): Promise<InspectSemanticAuthoringWorkerResponse> {
  try {
    const result = await inspectC4mlSemanticAuthoringContext(
      toArchitectureProject(request.project),
      request.viewId,
    );
    return result.valid
      ? {
          protocolVersion: compilerWorkerProtocolVersion,
          type: "semantic-authoring-context-result",
          requestId: request.requestId,
          status: "valid",
          context: result.context,
          issues: [],
          message: undefined,
        }
      : {
          protocolVersion: compilerWorkerProtocolVersion,
          type: "semantic-authoring-context-result",
          requestId: request.requestId,
          status: "invalid",
          context: undefined,
          issues: result.issues,
          message: undefined,
        };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "semantic-authoring-context-result",
      requestId: request.requestId,
      status: "failed",
      context: undefined,
      issues: [],
      message: `Architecture authoring context failed: ${message}`,
    };
  }
}

export async function previewSemanticChangeWorkerRequest(
  request: PreviewSemanticChangeWorkerRequest,
  layoutAdapter: LayoutAdapter = getBrowserLayoutAdapter(),
  embeddedFontFaces?: readonly SvgEmbeddedFontFace[],
): Promise<PreviewSemanticChangeWorkerResponse> {
  try {
    const proposal = await proposeC4mlSemanticEdit(
      toArchitectureProject(request.project),
      request.semantic,
    );
    if (!proposal.valid) {
      return {
        protocolVersion: compilerWorkerProtocolVersion,
        type: "preview-semantic-change-result",
        requestId: request.requestId,
        status: "invalid",
        changeSet: undefined,
        documentUri: undefined,
        proposedText: undefined,
        candidateProject: undefined,
        compilation: undefined,
        authoringIssues: proposal.issues,
        changeIssues: [],
        message: undefined,
      };
    }
    const preview = await previewProjectChangeWorkerRequest(
      {
        protocolVersion: compilerWorkerProtocolVersion,
        type: "preview-project-change",
        requestId: request.requestId,
        file: request.file,
        project: request.project,
        changeSet: proposal.changeSet,
        ...(request.requestedViewId === undefined
          ? {}
          : { requestedViewId: request.requestedViewId }),
      },
      layoutAdapter,
      embeddedFontFaces,
    );
    return {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "preview-semantic-change-result",
      requestId: request.requestId,
      status: preview.status,
      changeSet: proposal.changeSet,
      documentUri: proposal.documentUri,
      proposedText: proposal.proposedText,
      candidateProject: preview.candidateProject,
      compilation: preview.compilation,
      authoringIssues: [],
      changeIssues: preview.issues,
      message: preview.message,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "preview-semantic-change-result",
      requestId: request.requestId,
      status: "failed",
      changeSet: undefined,
      documentUri: undefined,
      proposedText: undefined,
      candidateProject: undefined,
      compilation: undefined,
      authoringIssues: [],
      changeIssues: [],
      message: `Architecture change preview failed: ${message}`,
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
    case "compare":
      return compareWorkerRequest(request);
    case "complete":
      return completeWorkerRequest(request);
    case "highlight":
      return highlightWorkerRequest(request);
    case "help-context":
      return helpWorkerRequest(request);
    case "inspect-semantic-authoring":
      return inspectSemanticAuthoringWorkerRequest(request);
    case "preview-project-change":
      return previewProjectChangeWorkerRequest(request);
    case "preview-placement-change":
      return previewPlacementChangeWorkerRequest(request);
    case "preview-route-change":
      return previewRouteChangeWorkerRequest(request);
    case "preview-semantic-change":
      return previewSemanticChangeWorkerRequest(request);
    case "generate-system-context":
      return generateWorkerRequest(request);
  }
}

function parseComparisonInput(input: ComparisonWorkerInput) {
  return input.project === undefined
    ? parseC4mlDraft(input.source, { file: input.file })
    : parseC4mlProjectDraft(toArchitectureProject(input.project));
}

function toArchitectureProject(project: {
  readonly id: string;
  readonly name?: string;
  readonly description?: string;
  readonly documents: readonly {
    readonly uri: string;
    readonly source: string;
  }[];
  readonly policy?: {
    readonly uri: string;
    readonly source: string;
  };
  readonly observations?: {
    readonly uri: string;
    readonly source: string;
  };
  readonly glossary?: {
    readonly uri: string;
    readonly source: string;
  };
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
    ...(project.policy === undefined
      ? {}
      : {
          policy: {
            uri: project.policy.uri,
            source: project.policy.source,
          },
        }),
    ...(project.observations === undefined
      ? {}
      : {
          observations: {
            uri: project.observations.uri,
            source: project.observations.source,
          },
        }),
    ...(project.glossary === undefined
      ? {}
      : {
          glossary: {
            uri: project.glossary.uri,
            source: project.glossary.source,
          },
        }),
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
  candidateLayout: LayoutResult | undefined,
  placement: PlacementResult | undefined,
  placementOptions: DiagramPlacementOptions | undefined,
): CompilerWorkerNavigation {
  const portById = new Map(scene.ports.map((port) => [port.id, port]));
  return {
    width: scene.width,
    height: scene.height,
    targets: [
      ...scene.nodes.flatMap((node) => {
        const source = sourceForSceneNode(model, view, node);
        const geometry = toWorkerNodeGeometry(
          node,
          source,
          view.source,
          candidateLayout,
          placement,
          placementOptions,
        );
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
                ...(geometry === undefined ? {} : { geometry }),
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
        const control = routing?.controls?.find(
          ({ relationshipId }) => relationshipId === route.relationshipId,
        );
        const controlSource = control?.source;
        const relationshipSource = toWorkerSource(source);
        const detailSource = toWorkerSource(controlSource ?? source);
        const sourceForRoutingDetail = (
          detailSourceReference?: SourceReference,
        ) => toWorkerSource(detailSourceReference ?? controlSource ?? source);
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
          sourcePortSelection: control?.sourcePort ?? "automatic",
          targetPortSelection: control?.targetPort ?? "automatic",
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
                  source: sourceForRoutingDetail(
                    routing?.corridors?.find(
                      ({ id }) => id === route.corridor?.corridorId,
                    )?.source,
                  ),
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
          avoidanceRegions: route.avoidanceRegions.map((region) => ({
            ...region,
            source: sourceForRoutingDetail(
              routing?.avoidanceRegions?.find(({ id }) => id === region.id)
                ?.source,
            ),
          })),
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

function toWorkerNodeGeometry(
  node: SceneNode,
  nodeSource: SourceReference | undefined,
  viewSource: SourceReference | undefined,
  candidateLayout: LayoutResult | undefined,
  placement: PlacementResult | undefined,
  placementOptions: DiagramPlacementOptions | undefined,
) {
  const candidate = candidateLayout?.nodes.find(
    ({ id }) => `scene-node:${id}` === node.id,
  );
  if (candidate === undefined || nodeSource === undefined) {
    return undefined;
  }
  const finalLayoutNode = placement?.layout.nodes.find(
    ({ id }) => id === candidate.id,
  );
  const sceneOffset = {
    x: finalLayoutNode === undefined ? 0 : node.x - finalLayoutNode.x,
    y: finalLayoutNode === undefined ? 0 : node.y - finalLayoutNode.y,
  };
  const fallbackSource = viewSource ?? nodeSource;
  const effective =
    placement?.constraints.filter(({ nodeIds }) =>
      nodeIds.includes(candidate.id),
    ) ?? [];
  const explanations = [
    {
      id: "automatic-layout",
      kind: "automatic" as const,
      strength: "automatic" as const,
      state: "applied" as const,
      summary: "Automatic layout candidate",
      source: toWorkerSource(fallbackSource),
    },
    ...effective.map((constraint) => {
      const authored = placementOptions?.constraints.find(
        ({ id }) => id === constraint.id,
      );
      return {
        id: constraint.id,
        kind: constraint.kind,
        strength: constraint.strength,
        state: constraint.relaxed ? ("relaxed" as const) : ("applied" as const),
        summary:
          authored === undefined
            ? constraint.kind
            : placementConstraintSummary(authored),
        source: toWorkerSource(authored?.source ?? fallbackSource),
      };
    }),
  ];
  const final = {
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
  };
  return {
    candidate: {
      x: candidate.x + sceneOffset.x,
      y: candidate.y + sceneOffset.y,
      width: candidate.width,
      height: candidate.height,
    },
    final,
    delta: {
      x: final.x - candidate.x - sceneOffset.x,
      y: final.y - candidate.y - sceneOffset.y,
    },
    explanations,
  };
}

function placementConstraintSummary(constraint: PlacementConstraint): string {
  switch (constraint.kind) {
    case "relative":
      return `${constraint.subjectId} ${constraint.relation} ${constraint.targetId} · gap ${constraint.gap}du`;
    case "alignment":
      return `${constraint.subjectId} ${constraint.alignment} ${constraint.targetId}`;
    case "align":
      return `${constraint.alignment} [${constraint.nodeIds.join(", ")}] · anchor ${constraint.anchorId}`;
    case "distribute":
      return `${constraint.orientation} [${constraint.nodeIds.join(", ")}] · gap ${constraint.gap}du`;
    case "adjust":
      return `${constraint.targetId} from automatic${constraint.offsetX === undefined ? "" : ` · Δx ${constraint.offsetX}du`}${constraint.offsetY === undefined ? "" : ` · Δy ${constraint.offsetY}du`}`;
    case "pin":
      return `${constraint.targetId} · x ${constraint.x}du · y ${constraint.y}du`;
  }
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
