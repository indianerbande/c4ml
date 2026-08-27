import {
  EmptyFileSystem,
  createDefaultCoreModule,
  createDefaultSharedCoreModule,
  inject,
  type LangiumCoreServices,
  type LangiumSharedCoreServices,
  type Module,
  type PartialLangiumCoreServices,
} from "langium";

import {
  C4mlDraftGeneratedModule,
  C4mlDraftGeneratedSharedModule,
} from "./generated/module.js";
import { C4mlDraftScopeProvider } from "./scope-provider.js";

const C4mlDraftModule: Module<
  LangiumCoreServices,
  PartialLangiumCoreServices
> = {
  references: {
    ScopeProvider: (services) => new C4mlDraftScopeProvider(services),
  },
};

export interface C4mlDraftServices {
  readonly shared: LangiumSharedCoreServices;
  readonly language: LangiumCoreServices;
}

export function createC4mlDraftServices(): C4mlDraftServices {
  const shared = inject(
    createDefaultSharedCoreModule(EmptyFileSystem),
    C4mlDraftGeneratedSharedModule,
  );
  const language = inject(
    createDefaultCoreModule({ shared }),
    C4mlDraftGeneratedModule,
    C4mlDraftModule,
  );

  shared.ServiceRegistry.register(language);
  return { shared, language };
}
