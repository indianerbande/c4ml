import { describe, expect, it } from "vitest";

import {
  SourceEditorDocumentSession,
  type SourceEditorDocumentHost,
} from "../src/app/source-editor-document-session.js";

interface FakeModel {
  readonly uri: string;
  readonly source: string;
  undoDepth: number;
  disposed: boolean;
  dispose(): void;
}

interface FakeViewState {
  readonly cursorOffset: number;
  readonly scrollTop: number;
}

function fakeHost(): SourceEditorDocumentHost<FakeModel, FakeViewState> & {
  active: FakeModel | undefined;
  state: FakeViewState;
  readonly created: FakeModel[];
  readonly restored: FakeViewState[];
} {
  return {
    active: undefined,
    state: { cursorOffset: 0, scrollTop: 0 },
    created: [],
    restored: [],
    createModel(uri, source) {
      const model: FakeModel = {
        uri,
        source,
        undoDepth: 0,
        disposed: false,
        dispose() {
          this.disposed = true;
        },
      };
      this.created.push(model);
      return model;
    },
    currentModel() {
      return this.active;
    },
    setCurrentModel(model) {
      this.active = model;
    },
    saveViewState() {
      return { ...this.state };
    },
    restoreViewState(state) {
      this.state = { ...state };
      this.restored.push(state);
    },
  };
}

describe("source-editor document session", () => {
  it("reuses each document model and restores its cursor and scroll state", () => {
    const session = new SourceEditorDocumentSession<FakeModel, FakeViewState>();
    const host = fakeHost();

    const first = session.activate(1, "model.c4ml", "model {}", host);
    first.undoDepth = 3;
    host.state = { cursorOffset: 12, scrollTop: 80 };

    session.activate(1, "views/context.c4ml", "view {}", host);
    host.state = { cursorOffset: 4, scrollTop: 20 };
    const returned = session.activate(1, "model.c4ml", "model {}", host);

    expect(returned).toBe(first);
    expect(returned.undoDepth).toBe(3);
    expect(host.state).toEqual({ cursorOffset: 12, scrollTop: 80 });
    expect(host.created).toHaveLength(2);
  });

  it("disposes stale models when a different project document set is loaded", () => {
    const session = new SourceEditorDocumentSession<FakeModel, FakeViewState>();
    const host = fakeHost();
    const first = session.activate(1, "model.c4ml", "old", host);
    const second = session.activate(1, "views/context.c4ml", "view", host);

    const replacement = session.activate(2, "model.c4ml", "new", host);

    expect(first.disposed).toBe(true);
    expect(second.disposed).toBe(true);
    expect(replacement).not.toBe(first);
    expect(replacement.source).toBe("new");
    expect(host.created).toHaveLength(3);
  });
});
