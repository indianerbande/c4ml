import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const appSource = new URL("../src/app/", import.meta.url);
const languageSource = new URL(
  "../../../packages/language-c4ml/src/",
  import.meta.url,
);

describe("workbench semantic authoring architecture", () => {
  it("keeps source transactions and C4 operation discovery outside Angular", async () => {
    const [root, facade, editor, runtime, language, protocol] = await Promise.all([
      readFile(new URL("app.component.ts", appSource), "utf8"),
      readFile(new URL("workbench-semantic.facade.ts", appSource), "utf8"),
      readFile(new URL("semantic-editor.component.ts", appSource), "utf8"),
      readFile(new URL("compiler-worker-runtime.ts", appSource), "utf8"),
      readFile(new URL("semantic-authoring-edits.ts", languageSource), "utf8"),
      readFile(new URL("compiler-worker.protocol.ts", appSource), "utf8"),
    ]);

    expect(root).toContain("this.semanticEditor.apply(response, this.sourceEditor())");
    expect(root).toContain("this.semanticEditor.undo(this.sourceEditor())");
    expect(root).not.toContain("projectChangeToSourceChange");
    expect(facade).toContain("projectChangeToSourceChange");
    expect(facade).toContain("WorkbenchDocumentFacade");
    expect(editor).toContain("this.compiler.inspectSemanticAuthoring(");
    expect(editor).toContain("this.compiler.previewSemanticChange(");
    expect(editor).not.toContain("proposeC4mlSemanticEdit");
    expect(runtime).toContain("inspectC4mlSemanticAuthoringContext");
    expect(runtime).toContain("proposeC4mlSemanticEdit");
    expect(language).toContain("export async function proposeC4mlSemanticEdit");
    expect(protocol.split("\n").length - 1).toBeLessThanOrEqual(100);
  });
});
