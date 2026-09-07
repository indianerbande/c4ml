import {
  DestroyRef,
  Injectable,
  InjectionToken,
  inject,
} from "@angular/core";

import {
  CompilerWorkerClientCore,
  type CompilerWorkerFactory,
  type CompilerWorkerPort,
} from "./compiler-worker-client.core.js";

export type {
  CompilerWorkerFactory,
  CompilerWorkerPort,
  CompilerWorkerRecoveryState,
} from "./compiler-worker-client.core.js";

export const COMPILER_WORKER_FACTORY =
  new InjectionToken<CompilerWorkerFactory>("C4ML compiler worker factory", {
    providedIn: "root",
    factory: () => () =>
      new Worker(new URL("./compiler.worker", import.meta.url), {
        name: "c4ml-compiler",
        type: "module",
      }) as unknown as CompilerWorkerPort,
  });

@Injectable({ providedIn: "root" })
export class CompilerWorkerClient extends CompilerWorkerClientCore {
  constructor() {
    super(inject(COMPILER_WORKER_FACTORY));
    inject(DestroyRef).onDestroy(() => this.destroy());
  }
}
