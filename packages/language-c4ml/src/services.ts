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
  createDefaultModule,
  createDefaultSharedModule,
  type LangiumServices,
  type LangiumSharedServices,
} from "langium/lsp";

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

export interface C4mlDraftLanguageServices {
  readonly shared: LangiumSharedServices;
  readonly language: LangiumServices;
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

export function createC4mlDraftLanguageServices(): C4mlDraftLanguageServices {
  const shared = inject(
    createDefaultSharedModule(EmptyFileSystem),
    C4mlDraftGeneratedSharedModule,
  );
  const language = inject(
    createDefaultModule({ shared }),
    C4mlDraftGeneratedModule,
    C4mlDraftModule,
  );

  shared.ServiceRegistry.register(language);
  return { shared, language };
}
