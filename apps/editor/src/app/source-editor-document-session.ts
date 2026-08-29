export interface SourceEditorDocumentModel {
  readonly dispose: () => void;
}

export interface SourceEditorDocumentHost<Model, ViewState> {
  createModel(uri: string, source: string): Model;
  currentModel(): Model | undefined;
  setCurrentModel(model: Model | undefined): void;
  saveViewState(): ViewState | undefined;
  restoreViewState(state: ViewState): void;
}

/**
 * Keeps editor-owned model and presentation state separate for every project
 * document. The caller still owns source synchronization and language behavior.
 */
export class SourceEditorDocumentSession<
  Model extends SourceEditorDocumentModel,
  ViewState,
> {
  readonly #models = new Map<string, Model>();
  readonly #viewStates = new Map<string, ViewState>();
  #activeUri: string | undefined;
  #documentSetRevision: number | undefined;

  activate(
    documentSetRevision: number,
    uri: string,
    source: string,
    host: SourceEditorDocumentHost<Model, ViewState>,
  ): Model {
    if (this.#documentSetRevision !== documentSetRevision) {
      this.reset(host);
      this.#documentSetRevision = documentSetRevision;
    }

    const previousUri = this.#activeUri;
    if (previousUri !== undefined && previousUri !== uri) {
      const state = host.saveViewState();
      if (state !== undefined) {
        this.#viewStates.set(previousUri, state);
      }
    }

    let model = this.#models.get(uri);
    if (model === undefined) {
      model = host.createModel(uri, source);
      this.#models.set(uri, model);
    }

    if (host.currentModel() !== model) {
      host.setCurrentModel(model);
      const state = this.#viewStates.get(uri);
      if (state !== undefined) {
        host.restoreViewState(state);
      }
    }
    this.#activeUri = uri;
    return model;
  }

  reset(host: SourceEditorDocumentHost<Model, ViewState>): void {
    host.setCurrentModel(undefined);
    for (const model of this.#models.values()) {
      model.dispose();
    }
    this.#models.clear();
    this.#viewStates.clear();
    this.#activeUri = undefined;
  }

  dispose(host: SourceEditorDocumentHost<Model, ViewState>): void {
    this.reset(host);
    this.#documentSetRevision = undefined;
  }
}
