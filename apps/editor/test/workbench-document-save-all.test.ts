import { describe, expect, it, vi } from "vitest";

import { saveAllProjectDocuments } from "../src/app/workbench-document-save-all.js";

const documents = [
  {
    uri: "model.c4ml",
    displayName: "model.c4ml",
    source: "model",
    handle: "opaque-model",
    dirty: true,
  },
  {
    uri: "relationships.c4ml",
    displayName: "relationships.c4ml",
    source: "relationships",
    handle: "opaque-relationships",
    dirty: false,
  },
  {
    uri: "views/context.c4ml",
    displayName: "context.c4ml",
    source: "view",
    handle: "opaque-view",
    dirty: true,
  },
] as const;

describe("project Save All", () => {
  it("saves dirty documents sequentially and preserves clean documents", async () => {
    const save = vi
      .fn()
      .mockResolvedValueOnce({
        status: "saved",
        handle: "opaque-model",
        displayName: "model.c4ml",
      })
      .mockResolvedValueOnce({
        status: "saved",
        handle: "opaque-view",
        displayName: "context.c4ml",
      });

    const result = await saveAllProjectDocuments(documents, save);

    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls.map(([request]) => request.source)).toEqual([
      "model",
      "view",
    ]);
    expect(result.savedCount).toBe(2);
    expect(result.failedCount).toBe(0);
    expect(result.documents.every(({ dirty }) => !dirty)).toBe(true);
  });

  it("retains unsaved documents after cancellation", async () => {
    const save = vi
      .fn()
      .mockResolvedValueOnce({
        status: "saved",
        handle: "opaque-model",
        displayName: "model.c4ml",
      })
      .mockResolvedValueOnce({ status: "canceled" });

    const result = await saveAllProjectDocuments(documents, save);

    expect(result.canceled).toBe(true);
    expect(result.savedCount).toBe(1);
    expect(result.documents[0]?.dirty).toBe(false);
    expect(result.documents[2]?.dirty).toBe(true);
  });

  it("continues after one failed document and reports the partial result", async () => {
    const save = vi
      .fn()
      .mockResolvedValueOnce({
        status: "failed",
        code: "C4ML-DESKTOP-FILE-002",
        message: "not writable",
      })
      .mockResolvedValueOnce({
        status: "saved",
        handle: "opaque-view",
        displayName: "context.c4ml",
      });

    const result = await saveAllProjectDocuments(documents, save);

    expect(result.failedCount).toBe(1);
    expect(result.savedCount).toBe(1);
    expect(result.documents[0]?.dirty).toBe(true);
    expect(result.documents[2]?.dirty).toBe(false);
  });
});
