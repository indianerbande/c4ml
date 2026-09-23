import { describe, expect, it } from "vitest";
import { createArchitectureProjectInput } from "@c4ml/compiler-core";
import { parseC4mlProjectDraft } from "../src/index.js";
import { c4mlProjectStarter } from "../src/project-starter.js";

describe("explicit project starter", () => {
  it("compiles the exact on-disk fragments as an empty viewless architecture", async () => {
    const project = createArchitectureProjectInput({ id: "new-project", documents: c4mlProjectStarter.documents });
    const result = await parseC4mlProjectDraft(project);
    expect(result.valid).toBe(true);
    expect(result.model?.elements).toHaveLength(0);
    expect(result.model?.relationships).toHaveLength(0);
    expect(result.views).toHaveLength(0);
  });
});
