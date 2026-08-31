import type { ArchitectureAnalysisReport } from "@c4ml/compiler-core";

import {
  compilerWorkerProtocolVersion,
  type AnalysisWorkerRequest,
  type AnalysisWorkerResponse,
  type CompilerWorkerDiagnostic,
  type CompilerWorkerProject,
} from "./compiler-worker.protocol.js";
import { EditorRequestSequence } from "./editor-session.js";

export type EditorAnalysisPhase =
  | "failed"
  | "idle"
  | "invalid"
  | "loading"
  | "valid";

export interface EditorAnalysisState {
  readonly phase: EditorAnalysisPhase;
  readonly activeRequestId: number;
  readonly diagnostics: readonly CompilerWorkerDiagnostic[];
  readonly report: ArchitectureAnalysisReport | undefined;
}

const initialAnalysisState: EditorAnalysisState = {
  phase: "idle",
  activeRequestId: 0,
  diagnostics: [],
  report: undefined,
};

export class EditorAnalysisSession {
  #state = initialAnalysisState;

  constructor(readonly sequence = new EditorRequestSequence()) {}

  get state(): EditorAnalysisState {
    return this.#state;
  }

  reset(): void {
    this.#state = initialAnalysisState;
  }

  begin(
    source: string,
    file: string,
    project?: CompilerWorkerProject,
  ): AnalysisWorkerRequest {
    const requestId = this.sequence.next();
    this.#state = {
      phase: "loading",
      activeRequestId: requestId,
      diagnostics: [],
      report: undefined,
    };
    return {
      protocolVersion: compilerWorkerProtocolVersion,
      type: "analyze",
      requestId,
      file,
      source,
      ...(project === undefined ? {} : { project }),
    };
  }

  accept(response: AnalysisWorkerResponse): boolean {
    if (response.requestId !== this.#state.activeRequestId) return false;
    this.#state = {
      phase: response.status,
      activeRequestId: response.requestId,
      diagnostics: response.diagnostics,
      report: response.report,
    };
    return true;
  }

  failActive(message: string): void {
    this.#state = {
      ...this.#state,
      phase: "failed",
      diagnostics: [{
        code: "C4ML-EDITOR-ANALYSIS-002",
        severity: "error",
        message,
        source: undefined,
        correction: "Restart the editor worker and analyze again.",
      }],
      report: undefined,
    };
  }
}
