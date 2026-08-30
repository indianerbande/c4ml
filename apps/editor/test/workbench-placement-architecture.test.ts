import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const appSource = new URL("../src/app/", import.meta.url);

describe("workbench placement architecture", () => {
  it("keeps placement transactions out of the root component", async () => {
    const [root, facade] = await Promise.all([
      readFile(new URL("app.component.ts", appSource), "utf8"),
      readFile(new URL("workbench-placement.facade.ts", appSource), "utf8"),
    ]);

    expect(root).toContain("this.placement.apply(response, this.sourceEditor())");
    expect(root).toContain("this.placement.undo(this.sourceEditor())");
    expect(root).not.toContain("projectChangeToSourceChange");
    expect(facade).toContain("projectChangeToSourceChange");
    expect(facade).toContain("WorkbenchDocumentFacade");
    expect(facade).toContain("WorkbenchPreviewFacade");
  });
});
