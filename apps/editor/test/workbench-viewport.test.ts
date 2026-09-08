import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const componentStyles = await readFile(
  new URL("../src/app/app.component.css", import.meta.url),
  "utf8",
);
const componentTemplate = await readFile(
  new URL("../src/app/app.component.html", import.meta.url),
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

  it("keeps title-bar actions compact, unwrapped, and in one flex group", () => {
    const commandButton = componentTemplate.match(
      /<button\s+type="button"\s+class="command-center"[\s\S]*?<\/button>/u,
    )?.[0];
    const commandRule = componentStyles.match(
      /\.command-center\s*\{([^}]*)\}/u,
    )?.[1];
    const actionRule = componentStyles.match(
      /\.title-action,\s*\n\.primary-action\s*\{([^}]*)\}/u,
    )?.[1];
    const titleActionsRule = componentStyles.match(
      /\.title-actions\s*\{([^}]*)\}/u,
    )?.[1];
    const responsiveRules = componentStyles.slice(
      componentStyles.indexOf("@media (max-width: 1120px)"),
    );

    expect(commandButton).toContain("aria-haspopup=\"dialog\"");
    expect(commandButton).toContain("[attr.aria-label]");
    expect(commandButton).not.toContain("<strong>");
    expect(commandButton).not.toContain("<kbd>");
    expect(
      componentTemplate.indexOf('class="command-center"'),
    ).toBeGreaterThan(componentTemplate.indexOf('class="title-actions"'));
    expect(commandRule).toMatch(/width:\s*34px/u);
    expect(commandRule).toMatch(/min-width:\s*34px/u);
    expect(commandRule).toMatch(/height:\s*30px/u);
    expect(titleActionsRule).toMatch(/white-space:\s*nowrap/u);
    expect(actionRule).toMatch(/height:\s*30px/u);
    expect(actionRule).toMatch(/flex:\s*0 0 auto/u);
    expect(actionRule).toMatch(/white-space:\s*nowrap/u);
    expect(responsiveRules).not.toMatch(
      /\.title-action\s*\{[^}]*display:\s*none/u,
    );
    expect(responsiveRules).not.toMatch(
      /\.primary-action\s*\{[^}]*display:\s*none/u,
    );
  });
});
