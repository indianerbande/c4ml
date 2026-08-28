import {
  compileArchitectureDiagram,
  svgSceneObjectId,
  type ArchitectureModel,
  type ArchitectureView,
  type Diagnostic,
  type DiagramScene,
  type LayoutAdapter,
  type SceneNode,
  type SourceReference,
} from "@c4ml/compiler-core";
import { createBrowserElkLayoutAdapter } from "@c4ml/layout-elk/browser";
import {
  completeC4mlDraft,
  generateSystemContextDraft,
  highlightC4mlDraft,
  parseC4mlDraft,
} from "@c4ml/language-c4ml";

import {
  compilerWorkerProtocolVersion,
  type CompilerWorkerDiagnostic,
  type CompilerWorkerInbound,
  type CompilerWorkerNavigation,
  type CompilerWorkerOutbound,
  type CompilerWorkerRequest,
  type CompilerWorkerResponse,
  type CompilerWorkerView,
  type CompletionWorkerRequest,
  type CompletionWorkerResponse,
  type HighlightWorkerRequest,
  type HighlightWorkerResponse,
  type WizardWorkerRequest,
  type WizardWorkerResponse,
} from "./compiler-worker.protocol.js";

let browserLayoutAdapter: LayoutAdapter | undefined;

export async function compileWorkerRequest(
  request: CompilerWorkerRequest,
  layoutAdapter: LayoutAdapter = getBrowserLayoutAdapter(),
): Promise<CompilerWorkerResponse> {
  try {
    const parsed = await parseC4mlDraft(request.source, { file: request.file });
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

    const compiled = await compileArchitectureDiagram({
      model: parsed.model,
      view,
      layoutAdapter,
      ...(parsed.routingByViewId?.[view.id] === undefined
        ? {}
        : { routing: parsed.routingByViewId[view.id] }),
      scene: { fontFamily: "Arial", theme: "c4ml-blue" },
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
      toWorkerNavigation(parsed.model, view, compiled.scene!),
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
    const result = await completeC4mlDraft(request.source, {
      file: request.file,
      offset: request.offset,
    });
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

export function executeWorkerRequest(
  request: CompilerWorkerInbound,
): Promise<CompilerWorkerOutbound> {
  switch (request.type) {
    case "compile":
      return compileWorkerRequest(request);
    case "complete":
      return completeWorkerRequest(request);
    case "highlight":
      return highlightWorkerRequest(request);
    case "generate-system-context":
      return generateWorkerRequest(request);
  }
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
): CompilerWorkerNavigation {
  return {
    width: scene.width,
    height: scene.height,
    targets: scene.nodes.flatMap((node) => {
      const source = sourceForSceneNode(model, view, node);
      return source === undefined
        ? []
        : [
            {
              sceneNodeId: node.id,
              svgElementId: svgSceneObjectId(node.id),
              referenceId: node.referenceId,
              label: node.title.lines.join(" "),
              source: toWorkerSource(source),
              bounds: {
                x: node.x,
                y: node.y,
                width: node.width,
                height: node.height,
              },
            },
          ];
    }),
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

function toWorkerSource(source: SourceReference) {
  return {
    file: source.file,
    start: source.range.start,
    end: source.range.end,
  };
}
