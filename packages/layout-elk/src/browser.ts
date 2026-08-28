import type { ELKConstructorArguments } from "elkjs/lib/elk-api.js";
import ElkModule from "elkjs/lib/elk-api.js";

import {
  ElkLayoutAdapter,
  type ElkLayoutEngine,
} from "./index.js";

export interface BrowserElkLayoutAdapterOptions {
  readonly workerUrl: string;
  readonly workerFactory?: (url?: string) => Worker;
}

type ElkConstructor = new (options: ELKConstructorArguments) => unknown;
const Elk = ElkModule as unknown as ElkConstructor;

/** Creates the browser adapter with ELK's API-only entry and a real Web Worker. */
export function createBrowserElkLayoutAdapter(
  options: BrowserElkLayoutAdapterOptions,
): ElkLayoutAdapter {
  return new ElkLayoutAdapter(
    new Elk({
      workerUrl: options.workerUrl,
      ...(options.workerFactory === undefined
        ? {}
        : { workerFactory: options.workerFactory }),
    }) as ElkLayoutEngine,
  );
}
