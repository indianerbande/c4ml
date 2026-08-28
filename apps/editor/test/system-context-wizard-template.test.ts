import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const template = readFileSync(
  new URL(
    "../src/app/system-context-wizard.component.html",
    import.meta.url,
  ),
  "utf8",
);

describe("system context wizard template", () => {
  it("keeps an edited part row mounted while its generated identifier changes", () => {
    expect(template).toContain(
      "@for (part of answers().parts; track $index; let index = $index)",
    );
    expect(template).not.toContain(
      "@for (part of answers().parts; track part.id; let index = $index)",
    );
  });
});
