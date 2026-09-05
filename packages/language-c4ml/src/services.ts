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
  DefaultCompletionProvider,
  DefaultFuzzyMatcher,
  DefaultNodeKindProvider,
  type CompletionProvider,
  type FuzzyMatcher,
  type NodeKindProvider,
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

/**
 * Core services plus the one language-server feature C4ML uses in-process:
 * grammar-driven completion. The full Langium LSP module would also wire a
 * language server, document update handling, symbols, hover, rename, and
 * folding — none of which run inside the compiler worker, yet all of which
 * would be bundled with it (including the CommonJS `vscode-languageserver`
 * connection layer).
 */
export interface C4mlDraftCompletionSharedServices extends LangiumSharedCoreServices {
  readonly lsp: {
    readonly NodeKindProvider: NodeKindProvider;
    readonly FuzzyMatcher: FuzzyMatcher;
  };
}

export interface C4mlDraftCompletionServices extends LangiumCoreServices {
  readonly shared: C4mlDraftCompletionSharedServices;
  readonly lsp: {
    readonly CompletionProvider: CompletionProvider;
  };
}

export interface C4mlDraftLanguageServices {
  readonly shared: C4mlDraftCompletionSharedServices;
  readonly language: C4mlDraftCompletionServices;
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
  const completionSharedModule: Module<
    C4mlDraftCompletionSharedServices,
    Pick<C4mlDraftCompletionSharedServices, "lsp">
  > = {
    lsp: {
      NodeKindProvider: () => new DefaultNodeKindProvider(),
      FuzzyMatcher: () => new DefaultFuzzyMatcher(),
    },
  };
  const shared = inject(
    createDefaultSharedCoreModule(EmptyFileSystem),
    C4mlDraftGeneratedSharedModule,
    completionSharedModule,
  );
  const completionModule: Module<
    C4mlDraftCompletionServices,
    Pick<C4mlDraftCompletionServices, "lsp" | "shared">
  > = {
    lsp: {
      CompletionProvider: (services) =>
        new DefaultCompletionProvider(services as never),
    },
    shared: () => shared,
  };
  const language = inject(
    createDefaultCoreModule({ shared }),
    C4mlDraftGeneratedModule,
    C4mlDraftModule,
    completionModule,
  );

  shared.ServiceRegistry.register(language);
  return { shared, language };
}
