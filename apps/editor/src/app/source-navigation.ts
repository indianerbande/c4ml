import type { CompilerWorkerSource } from "./compiler-worker.protocol.js";

export interface SourceNavigationDocumentHost {
  activeDocumentUri(): string;
  selectDocument(uri: string): boolean;
}

export interface SourceNavigationEditorHost {
  revealSourceInDocument(source: CompilerWorkerSource): Promise<boolean>;
}

/**
 * Selects the document owning a source range and lets the editor's activation
 * gate delay the reveal until Angular has presented that document.
 */
export async function revealSourceInOwningDocument(
  documents: SourceNavigationDocumentHost,
  editor: SourceNavigationEditorHost | undefined,
  source: CompilerWorkerSource,
  documentSelected: () => void = () => undefined,
): Promise<boolean> {
  if (source.file !== documents.activeDocumentUri()) {
    if (!documents.selectDocument(source.file)) return false;
    documentSelected();
  }
  if (editor === undefined) return false;
  return editor.revealSourceInDocument(source);
}
