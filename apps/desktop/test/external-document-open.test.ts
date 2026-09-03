import { describe, expect, it } from "vitest";

import {
  DesktopExternalDocumentQueue,
  externalC4mlDocumentPaths,
} from "../src/external-document-open.js";

describe("installed-app external document opening", () => {
  it("accepts native paths and file URLs for C4ML source only", () => {
    expect(
      externalC4mlDocumentPaths(
        [
          "/Applications/C4thedral.app/Contents/MacOS/C4thedral",
          "architecture.c4ml",
          "file:///tmp/Garden%20Plan.C4ML",
          "--inspect=unsafe.c4ml",
          "notes.txt",
        ],
        "/work",
      ),
    ).toEqual([
      "/work/architecture.c4ml",
      "/tmp/Garden Plan.C4ML",
    ]);
  });

  it("queues each document once and preserves arrival order", () => {
    const queue = new DesktopExternalDocumentQueue();
    queue.enqueue(["/tmp/first.c4ml", "/tmp/first.c4ml"]);
    queue.enqueue(["/tmp/second.c4ml"]);

    expect(queue.pending).toBe(true);
    expect(queue.take()).toBe("/tmp/first.c4ml");
    expect(queue.take()).toBe("/tmp/second.c4ml");
    expect(queue.take()).toBeUndefined();
    expect(queue.pending).toBe(false);
  });
});
