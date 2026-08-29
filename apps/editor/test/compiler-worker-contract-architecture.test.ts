import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const appSource = new URL("../src/app/", import.meta.url);

describe("compiler-worker contract architecture", () => {
  it("keeps compile, language, and authoring contracts independent", async () => {
    const domainFiles = [
      "compiler-worker.compile.protocol.ts",
      "compiler-worker.language.protocol.ts",
      "compiler-worker.authoring.protocol.ts",
    ];
    const sources = await Promise.all(
      domainFiles.map((file) =>
        readFile(new URL(file, appSource), "utf8"),
      ),
    );

    for (const source of sources) {
      expect(source).toContain("./compiler-worker.shared.js");
      expect(source).not.toContain("./compiler-worker.protocol.js");
    }
  });

  it("uses the root protocol only as the composed transport boundary", async () => {
    const source = await readFile(
      new URL("compiler-worker.protocol.ts", appSource),
      "utf8",
    );

    expect(source).toContain("./compiler-worker.compile.protocol.js");
    expect(source).toContain("./compiler-worker.language.protocol.js");
    expect(source).toContain("./compiler-worker.authoring.protocol.js");
    expect(source.split("\n").length).toBeLessThan(100);
  });
});
