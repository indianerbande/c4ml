import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  signal,
  viewChild,
} from "@angular/core";
import type { AfterViewInit, OnDestroy } from "@angular/core";
import type {
  editor as MonacoEditor,
  languages as MonacoLanguages,
} from "monaco-editor/editor";

import type { CompilerWorkerDiagnostic } from "./compiler-worker.protocol.js";
import {
  c4mlMonacoThemeName,
  c4mlMonacoThemes,
} from "./monaco-theme.js";
import type {
  EffectiveColorScheme,
  WorkbenchColorPalette,
} from "./workbench-preferences.js";
import type { C4mlSyntaxThemePreset } from "./syntax-theme.js";
import {
  SourceEditorDocumentSession,
  type SourceEditorDocumentHost,
} from "./source-editor-document-session.js";
import {
  sourceEditorCompletion,
  sourceEditorMarkers,
  sourceEditorSemanticTokens,
  sourceEditorSemanticTokenTypes,
  type SourceEditorCompletionProvider,
  type SourceEditorHighlightProvider,
} from "./source-editor.contract.js";

const c4mlLanguageId = "c4ml";
const markerOwner = "c4ml-compiler";
type MonacoRuntime = typeof import("./monaco-source-editor.runtime.js");

export interface SourceEditorSelection {
  readonly startOffset: number;
  readonly endOffset: number;
}

globalThis.MonacoEnvironment = {
  getWorker: () =>
    new Worker(new URL("./monaco-editor.worker", import.meta.url), {
      name: "c4ml-monaco-editor",
      type: "module",
    }),
};

@Component({
  selector: "c4ml-monaco-source-editor",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #editorHost class="monaco-host"></div>
    @if (loadFailure(); as message) {
      <p class="load-failure" role="alert">{{ message }}</p>
    }
  `,
  styleUrl: "./monaco-source-editor.component.css",
})
export class C4mlMonacoSourceEditorComponent
  implements AfterViewInit, OnDestroy
{
  readonly value = input.required<string>();
  readonly documentUri = input.required<string>();
  readonly documentSetRevision = input.required<number>();
  readonly diagnostics = input<readonly CompilerWorkerDiagnostic[]>([]);
  readonly completionProvider =
    input.required<SourceEditorCompletionProvider>();
  readonly highlightProvider = input.required<SourceEditorHighlightProvider>();
  readonly colorScheme = input.required<EffectiveColorScheme>();
  readonly colorPalette = input.required<WorkbenchColorPalette>();
  readonly syntaxTheme = input.required<C4mlSyntaxThemePreset>();
  readonly editorFontFamily = input.required<string>();
  readonly editorFontLigatures = input.required<boolean | string>();
  readonly editorFontSize = input.required<number>();
  readonly valueChanged = output<string>();
  readonly selectionChanged = output<SourceEditorSelection>();
  readonly loadFailure = signal<string | undefined>(undefined);
  readonly editorHost =
    viewChild.required<ElementRef<HTMLDivElement>>("editorHost");

  #editor: MonacoEditor.IStandaloneCodeEditor | undefined;
  #model: MonacoEditor.ITextModel | undefined;
  readonly #documents = new SourceEditorDocumentSession<
    MonacoEditor.ITextModel,
    MonacoEditor.ICodeEditorViewState
  >();
  #completionRegistration: { dispose(): void } | undefined;
  #highlightRegistration: { dispose(): void } | undefined;
  #synchronizeExternalValue = false;
  #destroyed = false;
  #runtime: MonacoRuntime | undefined;

  constructor() {
    effect(() => {
      const value = this.value();
      const uri = this.documentUri();
      const documentSetRevision = this.documentSetRevision();
      const model = this.#activateDocument(documentSetRevision, uri, value);
      if (model === undefined || model.getValue() === value) {
        return;
      }
      this.#synchronizeExternalValue = true;
      model.setValue(value);
      this.#synchronizeExternalValue = false;
    });

    effect(() => {
      const diagnostics = this.diagnostics();
      const model = this.#model;
      if (model === undefined) {
        return;
      }
      this.#setMarkers(diagnostics);
    });

    effect(() => {
      const colorScheme = this.colorScheme();
      const colorPalette = this.colorPalette();
      const syntaxTheme = this.syntaxTheme();
      const fontFamily = this.editorFontFamily();
      const fontLigatures = this.editorFontLigatures();
      const fontSize = this.editorFontSize();
      this.#runtime?.editor.setTheme(
        c4mlMonacoThemeName(colorScheme, colorPalette, syntaxTheme),
      );
      this.#editor?.updateOptions({
        fontFamily,
        fontLigatures,
        fontSize,
        lineHeight: Math.round(fontSize * 1.68),
      });
      this.#remeasureFontAfterLoad(fontFamily, fontSize);
    });
  }

  ngAfterViewInit(): void {
    void this.#initialize().catch((error: unknown) => {
      if (!this.#destroyed) {
        this.loadFailure.set(
          error instanceof Error
            ? error.message
            : "The source editor could not be started.",
        );
      }
    });
  }

  ngOnDestroy(): void {
    this.#destroyed = true;
    this.#completionRegistration?.dispose();
    this.#highlightRegistration?.dispose();
    const host = this.#documentHost();
    if (host !== undefined) {
      this.#documents.dispose(host);
    }
    this.#editor?.dispose();
    this.#model = undefined;
  }

  revealDiagnostic(diagnostic: CompilerWorkerDiagnostic): void {
    const source = diagnostic.source;
    if (source === undefined) {
      return;
    }
    this.revealSource(source);
  }

  revealSource(source: NonNullable<CompilerWorkerDiagnostic["source"]>): void {
    if (this.#editor === undefined) {
      return;
    }
    const range = {
      startLineNumber: source.start.line + 1,
      startColumn: source.start.column + 1,
      endLineNumber: source.end.line + 1,
      endColumn: source.end.column + 1,
    };
    this.#editor.setSelection(range);
    this.#editor.revealRangeInCenter(range);
    this.#editor.focus();
  }

  triggerSuggestions(): void {
    this.#editor?.focus();
    this.#editor?.trigger(
      "c4ml-editor",
      "editor.action.triggerSuggest",
      undefined,
    );
  }

  async #initialize(): Promise<void> {
    const [runtime] = await Promise.all([
      loadMonacoRuntime(),
      loadMonacoStyles(),
    ]);
    if (this.#destroyed) {
      return;
    }
    this.#runtime = runtime;
    registerC4mlLanguage(runtime);
    this.#editor = runtime.editor.create(this.editorHost().nativeElement, {
      model: null,
      theme: c4mlMonacoThemeName(
        this.colorScheme(),
        this.colorPalette(),
        this.syntaxTheme(),
      ),
      ariaLabel: "C4ML source",
      automaticLayout: true,
      bracketPairColorization: { enabled: true },
      editContext: false,
      fontFamily: this.editorFontFamily(),
      fontLigatures: this.editorFontLigatures(),
      fontSize: this.editorFontSize(),
      lineHeight: Math.round(this.editorFontSize() * 1.68),
      lineNumbersMinChars: 3,
      minimap: { enabled: false },
      overviewRulerBorder: false,
      padding: { top: 16, bottom: 28 },
      quickSuggestions: {
        comments: false,
        other: true,
        strings: true,
      },
      renderValidationDecorations: "on",
      scrollBeyondLastLine: false,
      "semanticHighlighting.enabled": true,
      smoothScrolling: true,
      suggestOnTriggerCharacters: false,
      tabSize: 2,
      wordBasedSuggestions: "off",
      wordWrap: "off",
    });
    this.#remeasureFontAfterLoad(
      this.editorFontFamily(),
      this.editorFontSize(),
    );
    this.#activateDocument(
      this.documentSetRevision(),
      this.documentUri(),
      this.value(),
    );
    this.#editor.onDidChangeModelContent(() => {
      const model = this.#editor?.getModel();
      if (!this.#synchronizeExternalValue && model !== null && model !== undefined) {
        this.valueChanged.emit(model.getValue());
      }
    });
    this.#editor.onDidChangeCursorSelection(({ selection }) => {
      const model = this.#editor?.getModel();
      if (model === null || model === undefined) {
        return;
      }
      this.selectionChanged.emit({
        startOffset: model.getOffsetAt(selection.getStartPosition()),
        endOffset: model.getOffsetAt(selection.getEndPosition()),
      });
    });
    this.#completionRegistration =
      runtime.languages.registerCompletionItemProvider(c4mlLanguageId, {
        provideCompletionItems: async (model, position, _context, token) => {
          const source = model.getValue();
          const offset = model.getOffsetAt(position);
          const candidates = await this.completionProvider()(source, offset);
          if (token.isCancellationRequested || model.getValue() !== source) {
            return { suggestions: [] };
          }
          return {
            suggestions: candidates.map((candidate, index) => {
              const completion = sourceEditorCompletion(candidate);
              return {
                label: completion.label,
                kind: completionKind(runtime, completion.kind),
                detail: completion.detail,
                insertText: completion.insertText,
                range: completion.range,
                sortText: index.toString().padStart(5, "0"),
                ...(completion.documentation === undefined
                  ? {}
                  : { documentation: completion.documentation }),
              };
            }),
          };
        },
      });
    this.#highlightRegistration =
      runtime.languages.registerDocumentSemanticTokensProvider(
        c4mlLanguageId,
        {
          getLegend: () => ({
            tokenTypes: [...sourceEditorSemanticTokenTypes],
            tokenModifiers: [],
          }),
          provideDocumentSemanticTokens: async (model, _lastResultId, token) => {
            const source = model.getValue();
            const highlights = await this.highlightProvider()(source);
            if (token.isCancellationRequested || model.getValue() !== source) {
              return { data: new Uint32Array() };
            }
            return { data: sourceEditorSemanticTokens(highlights) };
          },
          releaseDocumentSemanticTokens: () => undefined,
        },
      );
    this.#updateMarkers();
  }

  #activateDocument(
    documentSetRevision: number,
    uri: string,
    source: string,
  ): MonacoEditor.ITextModel | undefined {
    const host = this.#documentHost();
    if (host === undefined) {
      return undefined;
    }
    const model = this.#documents.activate(
      documentSetRevision,
      uri,
      source,
      host,
    );
    this.#model = model;
    this.#emitCurrentSelection();
    this.#updateMarkers();
    return model;
  }

  #documentHost():
    | SourceEditorDocumentHost<
        MonacoEditor.ITextModel,
        MonacoEditor.ICodeEditorViewState
      >
    | undefined {
    const runtime = this.#runtime;
    const editor = this.#editor;
    if (runtime === undefined || editor === undefined) {
      return undefined;
    }
    return {
      createModel: (uri, source) =>
        runtime.editor.createModel(
          source,
          c4mlLanguageId,
          runtime.Uri.from({ scheme: "c4ml-document", path: `/${uri}` }),
        ),
      currentModel: () => editor.getModel() ?? undefined,
      setCurrentModel: (model) => editor.setModel(model ?? null),
      saveViewState: () => editor.saveViewState() ?? undefined,
      restoreViewState: (state) => editor.restoreViewState(state),
    };
  }

  #emitCurrentSelection(): void {
    const editor = this.#editor;
    const model = editor?.getModel();
    const selection = editor?.getSelection();
    if (model === null || model === undefined || selection === null || selection === undefined) {
      return;
    }
    this.selectionChanged.emit({
      startOffset: model.getOffsetAt(selection.getStartPosition()),
      endOffset: model.getOffsetAt(selection.getEndPosition()),
    });
  }

  #remeasureFontAfterLoad(fontFamily: string, fontSize: number): void {
    const runtime = this.#runtime;
    if (runtime === undefined) {
      return;
    }
    const fontSet = this.editorHost().nativeElement.ownerDocument.fonts;
    void fontSet
      .load(`${fontSize}px ${fontFamily}`)
      .then(() => {
        if (!this.#destroyed && this.#runtime === runtime) {
          runtime.editor.remeasureFonts();
        }
      })
      .catch(() => {
        // The CSS fallback remains usable when a packaged face cannot load.
      });
  }

  #updateMarkers(): void {
    const model = this.#model;
    const runtime = this.#runtime;
    if (model === undefined || runtime === undefined) {
      return;
    }
    this.#setMarkers(this.diagnostics());
  }

  #setMarkers(diagnostics: readonly CompilerWorkerDiagnostic[]): void {
    const model = this.#model;
    const runtime = this.#runtime;
    if (model === undefined || runtime === undefined) {
      return;
    }
    runtime.editor.setModelMarkers(
      model,
      markerOwner,
      sourceEditorMarkers(diagnostics).map((marker) => ({
        ...marker.range,
        code: marker.code,
        severity: markerSeverity(runtime, marker.severity),
        message:
          marker.correction === undefined
            ? marker.message
            : `${marker.message}\n\nSuggested correction: ${marker.correction}`,
        source: "C4ML",
      })),
    );
  }
}

let languageRegistered = false;
let monacoRuntime: Promise<MonacoRuntime> | undefined;
let monacoStyles: Promise<void> | undefined;

function loadMonacoRuntime(): Promise<MonacoRuntime> {
  monacoRuntime ??= import("./monaco-source-editor.runtime.js");
  return monacoRuntime;
}

function loadMonacoStyles(): Promise<void> {
  monacoStyles ??= new Promise<void>((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = new URL("monaco/editor.main.css", document.baseURI).href;
    link.dataset["c4mlMonacoStyles"] = "true";
    link.addEventListener("load", () => resolve(), { once: true });
    link.addEventListener(
      "error",
      () => reject(new Error("Could not load the local Monaco stylesheet.")),
      { once: true },
    );
    document.head.append(link);
  });
  return monacoStyles;
}

function registerC4mlLanguage(runtime: MonacoRuntime): void {
  if (languageRegistered) {
    return;
  }
  runtime.languages.register({ id: c4mlLanguageId });
  for (const theme of c4mlMonacoThemes) {
    runtime.editor.defineTheme(theme.name, {
      base: theme.base,
      inherit: theme.inherit,
      rules: [...theme.rules],
      colors: { ...theme.colors },
    });
  }
  languageRegistered = true;
}

function markerSeverity(
  runtime: MonacoRuntime,
  severity: CompilerWorkerDiagnostic["severity"],
): MonacoEditor.IMarkerData["severity"] {
  switch (severity) {
    case "error":
      return runtime.MarkerSeverity.Error;
    case "warning":
      return runtime.MarkerSeverity.Warning;
    case "information":
      return runtime.MarkerSeverity.Info;
  }
}

function completionKind(
  runtime: MonacoRuntime,
  kind: "keyword" | "property" | "reference" | "value",
): MonacoLanguages.CompletionItemKind {
  switch (kind) {
    case "keyword":
      return runtime.languages.CompletionItemKind.Keyword;
    case "property":
      return runtime.languages.CompletionItemKind.Property;
    case "reference":
      return runtime.languages.CompletionItemKind.Reference;
    case "value":
      return runtime.languages.CompletionItemKind.Value;
  }
}
