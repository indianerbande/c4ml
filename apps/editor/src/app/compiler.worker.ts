/// <reference lib="webworker" />

import { isCompilerWorkerInbound } from "./compiler-worker.protocol.js";
import { executeWorkerRequest } from "./compiler-worker-runtime.js";

self.addEventListener("message", (event: MessageEvent<unknown>) => {
  if (!isCompilerWorkerInbound(event.data)) {
    return;
  }
  void executeWorkerRequest(event.data).then((result) => self.postMessage(result));
});
