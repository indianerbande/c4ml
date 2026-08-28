import {
  compileArchitectureDiagram,
  type Diagnostic,
  type LayoutAdapter,
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
      scene: { fontFamily: "Arial", theme: "c4ml-blue" },
    });
    if (!compiled.valid || compiled.svg === undefined) {
      return response(
        request,
        "invalid",
        compiled.diagnostics,
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
    source: {
      file: diagnostic.source.file,
      start: diagnostic.source.range.start,
      end: diagnostic.source.range.end,
    },
    correction: diagnostic.correction,
  };
}
