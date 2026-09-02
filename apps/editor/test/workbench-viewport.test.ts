import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const componentStyles = await readFile(
  new URL("../src/app/app.component.css", import.meta.url),
  "utf8",
);
const globalStyles = await readFile(
  new URL("../src/styles.css", import.meta.url),
  "utf8",
);

describe("workbench viewport", () => {
  it("keeps the workbench and status bar inside the renderer viewport", () => {
    const hostRule = componentStyles.match(/^:host\s*\{([^}]*)\}/mu)?.[1];
    const shellRule = componentStyles.match(
      /\.workbench-shell\s*\{([^}]*)\}/u,
    )?.[1];
    const documentRule = globalStyles.match(
      /html,\s*\nbody\s*\{([^}]*)\}/u,
    )?.[1];

    expect(hostRule).toMatch(/height:\s*100%/u);
    expect(hostRule).toMatch(/min-height:\s*0/u);
    expect(hostRule).toMatch(/overflow:\s*hidden/u);
    expect(shellRule).toMatch(/grid-template-rows:\s*48px minmax\(0, 1fr\) 24px/u);
    expect(shellRule).toMatch(/height:\s*100%/u);
    expect(shellRule).toMatch(/min-height:\s*0/u);
    expect(shellRule).toMatch(/overflow:\s*hidden/u);
    expect(documentRule).toMatch(/height:\s*100%/u);
    expect(documentRule).toMatch(/min-height:\s*0/u);
    expect(documentRule).toMatch(/overflow:\s*hidden/u);
  });

  it("does not restore document scrolling in the narrow workbench layout", () => {
    const narrowLayout = componentStyles.slice(
      componentStyles.indexOf("@media (max-width: 900px)"),
    );

    expect(narrowLayout).not.toContain("min-height: 100vh");
    expect(narrowLayout).not.toContain("min-height: 1000px");
    expect(narrowLayout).not.toContain("overflow: visible");
    expect(narrowLayout).toContain("overflow: auto");
  });
});
