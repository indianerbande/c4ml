import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

import {
  DesktopExternalDocumentQueue,
  externalC4mlDocumentPaths,
} from "../src/external-document-open.js";

describe("installed-app external document opening", () => {
  it("accepts native paths and file URLs for C4ML source only", () => {
    const workingDirectory = resolve("work");
    const absoluteDocument = resolve("tmp", "Garden Plan.C4ML");

    expect(
      externalC4mlDocumentPaths(
        [
          "/Applications/C4thedral.app/Contents/MacOS/C4thedral",
          "architecture.c4ml",
          pathToFileURL(absoluteDocument).href,
          "--inspect=unsafe.c4ml",
          "notes.txt",
        ],
        workingDirectory,
      ),
    ).toEqual([
      resolve(workingDirectory, "architecture.c4ml"),
      absoluteDocument,
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
