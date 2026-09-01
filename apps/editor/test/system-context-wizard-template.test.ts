import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const template = readFileSync(
  new URL(
    "../src/app/system-context-wizard.component.html",
    import.meta.url,
  ),
  "utf8",
);
const component = readFileSync(
  new URL(
    "../src/app/system-context-wizard.component.ts",
    import.meta.url,
  ),
  "utf8",
);
const styles = readFileSync(
  new URL(
    "../src/app/system-context-wizard.component.css",
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

  it("offers click-to-expand help for every form control", () => {
    const controls = template.match(/<(?:input|select|textarea)\b/gu) ?? [];
    const helpButtons = template.match(/class="field-help-button"/gu) ?? [];

    expect(controls).toHaveLength(22);
    expect(helpButtons).toHaveLength(controls.length);
    expect(template).toContain("[attr.aria-expanded]");
    expect(template).toContain("aria-controls");
    expect(template).toContain('class="field-help"');
  });

  it("draws the close icon from geometrically centered strokes", () => {
    expect(styles).toContain(".close-button::before");
    expect(styles).toContain(".close-button::after");
    expect(styles).toContain("top: 50%");
    expect(styles).toContain("left: 50%");
    expect(styles).toContain("translate(-50%, -50%)");
  });

  it("starts a German wizard with one coherent Online Shop example", () => {
    expect(component).toContain('personName: "Kundin oder Kunde"');
    expect(component).toContain(
      '"Zeigt Produkte, nimmt Bestellungen entgegen und informiert über den Bestellstatus."',
    );
    expect(component).toContain('technology: "Webanwendung"');
    expect(component).toContain('technology: "Apache Kafka"');
    expect(component).toContain('technology: "PostgreSQL"');
    expect(component).toContain('technology: "S3-kompatibler Objektspeicher"');
    expect(component).toContain(
      'viewTitle: "Systemkontext — Onlineshop"',
    );
  });

  it("offers an explicit, source-preserving existing-document mode", () => {
    expect(template).toContain('i18n.t("wizard.target.extend")');
    expect(template).toContain("selectMode('extend')");
    expect(template).toContain('mode() === "extend" ? "wizard.extend" : "wizard.create"');
    expect(component).toContain('readonly mode = signal<"extend" | "new">("new")');
    expect(component).toContain("this.compiler.generateSystemContext(");
  });
});
