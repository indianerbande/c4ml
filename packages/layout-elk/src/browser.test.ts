import { describe, expect, it } from "vitest";

import { createBrowserElkLayoutAdapter } from "./browser.js";

describe("browser ELK layout adapter", () => {
  it("uses the API-only entry with the supplied browser worker factory", async () => {
    let requestedUrl: string | undefined;
    let terminated = false;
    const fakeWorker = {
      onmessage: undefined as ((event: MessageEvent) => void) | undefined,
      postMessage(message: { id?: number }): void {
        queueMicrotask(() => {
          this.onmessage?.({
            data: { id: message.id, data: {} },
          } as MessageEvent);
        });
      },
      terminate(): void {
        terminated = true;
      },
    };

    const adapter = createBrowserElkLayoutAdapter({
      workerUrl: "./third-party/elkjs/elk-worker.min.js",
      workerFactory: (url) => {
        requestedUrl = url;
        return fakeWorker as unknown as Worker;
      },
    });

    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(requestedUrl).toBe("./third-party/elkjs/elk-worker.min.js");
    expect(adapter.adapterId).toBe("elkjs-0.12");

    adapter.terminate();
    expect(terminated).toBe(true);
  });
});
