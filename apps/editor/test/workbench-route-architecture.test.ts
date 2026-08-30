import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const appSource = new URL("../src/app/", import.meta.url);

describe("workbench route architecture", () => {
  it("keeps route transactions out of the root component", async () => {
    const [root, facade, editor] = await Promise.all([
      readFile(new URL("app.component.ts", appSource), "utf8"),
      readFile(new URL("workbench-route.facade.ts", appSource), "utf8"),
      readFile(new URL("route-editor.component.ts", appSource), "utf8"),
    ]);

    expect(root).toContain("this.routeEditor.apply(response, this.sourceEditor())");
    expect(root).toContain("this.routeEditor.undo(this.sourceEditor())");
    expect(root).not.toContain("projectChangeToSourceChange");
    expect(facade).toContain("projectChangeToSourceChange");
    expect(facade).toContain("WorkbenchDocumentFacade");
    expect(facade).toContain("WorkbenchPreviewFacade");
    expect(editor).toContain("this.compiler.previewRouteChange(");
    expect(editor).not.toContain("proposeC4mlRouteEdit");
  });
});
