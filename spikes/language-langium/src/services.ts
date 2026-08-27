import {
  EmptyFileSystem,
  createDefaultCoreModule,
  createDefaultSharedCoreModule,
  inject,
  type LangiumCoreServices,
} from "langium";

import {
  PhaseZeroProbeGeneratedModule,
  PhaseZeroProbeGeneratedSharedModule,
} from "./generated/module.js";

export function createPhaseZeroProbeServices(): LangiumCoreServices {
  const shared = inject(
    createDefaultSharedCoreModule(EmptyFileSystem),
    PhaseZeroProbeGeneratedSharedModule,
  );
  const language = inject(
    createDefaultCoreModule({ shared }),
    PhaseZeroProbeGeneratedModule,
  );

  shared.ServiceRegistry.register(language);
  return language;
}
