import { describe, expect, it } from "vitest";

import {
  CompilerWorkerClientCore,
  type CompilerWorkerPort,
} from "../src/app/compiler-worker-client.core.js";
import {
  compilerWorkerProtocolVersion,
  type AnalysisWorkerRequest,
  type CompilerWorkerProject,
  type CompilerWorkerRequest,
  type CompletionWorkerRequest,
  type PreviewPlacementChangeWorkerRequest,
} from "../src/app/compiler-worker.protocol.js";

type WorkerRequest =
  | AnalysisWorkerRequest
  | CompilerWorkerRequest
  | CompletionWorkerRequest
  | PreviewPlacementChangeWorkerRequest;

class FakeCompilerWorker implements CompilerWorkerPort {
  readonly messages: unknown[] = [];
  readonly #listeners = new Map<string, Set<EventListener>>();
  readonly #allMessageListeners: EventListener[] = [];
  terminated = false;

  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.#listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.#listeners.set(type, listeners);
    if (type === "message") this.#allMessageListeners.push(listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.#listeners.get(type)?.delete(listener);
  }

  postMessage(message: unknown): void {
    this.messages.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  fail(): void {
    for (const listener of this.#listeners.get("error") ?? []) {
      listener({ type: "error" } as Event);
    }
  }

  respond(message: unknown): void {
    const event = { type: "message", data: message } as MessageEvent<unknown>;
    for (const listener of this.#listeners.get("message") ?? []) listener(event);
  }

  respondAfterTermination(message: unknown): void {
    const event = { type: "message", data: message } as MessageEvent<unknown>;
    for (const listener of this.#allMessageListeners) listener(event);
  }

  request(type: WorkerRequest["type"]): WorkerRequest {
    const request = this.messages.find(
      (message) =>
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        message.type === type,
    );
    if (request === undefined) throw new Error(`Missing ${type} request.`);
    return request as WorkerRequest;
  }
}

const project: CompilerWorkerProject = {
  version: 1,
  id: "unsaved-garden",
  documents: [
    {
      uri: "architecture.c4ml",
      source: "c4ml draft-1\nmodel {}\n// unsaved project source",
    },
    {
      uri: "relations.c4ml",
      source: "relations {\n  // second unsaved document\n}",
    },
  ],
};

function validCompilation(request: CompilerWorkerRequest, svg?: string) {
  return {
    protocolVersion: compilerWorkerProtocolVersion,
    type: "compile-result" as const,
    requestId: request.requestId,
    status: "valid" as const,
    diagnostics: [],
    modelElementCount: svg === undefined ? 0 : 1,
    svg,
    navigation:
      svg === undefined ? undefined : { width: 100, height: 100, targets: [] },
    views:
      svg === undefined
        ? []
        : [{ id: "context", kind: "system-context" as const, title: "Context" }],
    activeViewId: svg === undefined ? undefined : "context",
  };
}

describe("compiler-worker client recovery", () => {
  function createClient(): {
    readonly client: CompilerWorkerClientCore;
    readonly workers: FakeCompilerWorker[];
  } {
    const workers: FakeCompilerWorker[] = [];
    const client = new CompilerWorkerClientCore(() => {
      const worker = new FakeCompilerWorker();
      workers.push(worker);
      return worker;
    });
    return { client, workers };
  }

  it("replays unsaved source and rejects obsolete worker responses", async () => {
    const { client, workers } = createClient();
    client.compileProject(project, "architecture.c4ml", "context");
    const first = workers[0]!;
    expect(first.request("compile")).toMatchObject({ project });

    const completion = client.complete(project.documents[0]!.source, 8);
    const placement = client.previewPlacementChange(
      project,
      "architecture.c4ml",
      {
        id: "nudge-garden",
        viewId: "context",
        intent: { id: "nudge", kind: "layout", summary: "Nudge garden." },
        operation: {
          kind: "nudge",
          targetId: "garden",
          direction: "right",
          distance: "small",
          strength: "soft",
        },
      },
      "context",
    );

    first.fail();
    expect(first.terminated).toBe(true);
    expect(workers).toHaveLength(2);
    expect(client.recovery()).toMatchObject({ phase: "recovering", generation: 2 });
    await expect(completion).resolves.toEqual([]);
    await expect(placement).resolves.toMatchObject({ status: "failed" });

    const second = workers[1]!;
    const replayedCompile = second.request("compile") as CompilerWorkerRequest;
    const replayedAnalysis = second.request("analyze") as AnalysisWorkerRequest;
    expect(replayedCompile).toMatchObject({
      file: "architecture.c4ml",
      project,
      requestedViewId: "context",
    });
    expect(replayedAnalysis).toMatchObject({
      file: "architecture.c4ml",
      source: project.documents[0]!.source,
      project,
    });

    first.respondAfterTermination(validCompilation(replayedCompile, "stale-svg"));
    expect(client.state().phase).toBe("compiling");
    expect(client.state().lastValidSvg).toBeUndefined();

    second.respond(validCompilation(replayedCompile, "current-svg"));
    expect(client.state()).toMatchObject({
      phase: "valid",
      lastValidSvg: "current-svg",
    });
    expect(client.recovery()).toMatchObject({
      phase: "recovering",
      generation: 2,
    });

    second.respond({
      protocolVersion: compilerWorkerProtocolVersion,
      type: "analysis-result",
      requestId: replayedAnalysis.requestId,
      status: "invalid",
      diagnostics: [],
      report: undefined,
    });
    expect(client.analysis().phase).toBe("invalid");
    expect(client.recovery()).toMatchObject({ phase: "ready", generation: 2 });

    const restoredCompletion = client.complete(project.documents[0]!.source, 8);
    const completionRequest = second.messages.at(-1) as CompletionWorkerRequest;
    second.respond({
      protocolVersion: compilerWorkerProtocolVersion,
      type: "completion-result",
      requestId: completionRequest.requestId,
      status: "complete",
      candidates: [],
      message: undefined,
    });
    await expect(restoredCompletion).resolves.toEqual([]);
    expect(client.completion().phase).toBe("ready");
  });

  it("stops after one automatic replacement and retries only on demand", () => {
    const { client, workers } = createClient();
    client.compileProject(project, "architecture.c4ml", "context");

    workers[0]!.fail();
    expect(workers).toHaveLength(2);
    const partialAnalysis = workers[1]!.request("analyze") as AnalysisWorkerRequest;
    workers[1]!.respond({
      protocolVersion: compilerWorkerProtocolVersion,
      type: "analysis-result",
      requestId: partialAnalysis.requestId,
      status: "invalid",
      diagnostics: [],
      report: undefined,
    });
    expect(client.recovery().phase).toBe("recovering");
    workers[1]!.fail();
    expect(workers).toHaveLength(2);
    expect(client.recovery().phase).toBe("failed");

    workers[1]!.fail();
    expect(workers).toHaveLength(2);

    client.retryWorker();
    expect(workers).toHaveLength(3);
    expect(client.recovery().phase).toBe("recovering");
    workers[2]!.fail();
    expect(workers).toHaveLength(3);
    expect(client.recovery().phase).toBe("failed");
  });
});
