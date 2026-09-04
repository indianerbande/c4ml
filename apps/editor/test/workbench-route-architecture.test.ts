import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const appSource = new URL("../src/app/", import.meta.url);

describe("workbench route architecture", () => {
  it("keeps route transactions out of the root component", async () => {
    const [root, rootTemplate, facade, editor] = await Promise.all([
      readFile(new URL("app.component.ts", appSource), "utf8"),
      readFile(new URL("app.component.html", appSource), "utf8"),
      readFile(new URL("workbench-route.facade.ts", appSource), "utf8"),
      readFile(new URL("route-editor.component.ts", appSource), "utf8"),
    ]);

    expect(root).toContain("this.routeEditor.apply(response, this.sourceEditor())");
    expect(root).toContain("this.routeEditor.undo(this.sourceEditor())");
    expect(root).not.toContain("projectChangeToSourceChange");
    expect(facade).not.toContain("projectChangeToSourceChange");
    expect(facade).toContain("SourceAuthoringTransaction");
    expect(facade).not.toContain("queueMicrotask");
    expect(facade).toContain("WorkbenchDocumentFacade");
    expect(facade).toContain("WorkbenchPreviewFacade");
    expect(facade).toContain("readonly session = signal<RouteEditorSession | undefined>");
    expect(rootTemplate).toContain("@if (routeEditor.session(); as session)");
    expect(rootTemplate).not.toContain("routeEditor.open() && selectedRoute()");
    expect(rootTemplate).toContain('[route]="session.route"');
    expect(rootTemplate).toContain('[viewId]="session.viewId"');
    expect(editor).toContain("this.compiler.previewRouteChange(");
    expect(editor).not.toContain("proposeC4mlRouteEdit");
  });
});
