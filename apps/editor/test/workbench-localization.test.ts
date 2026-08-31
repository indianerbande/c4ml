import { describe, expect, it } from "vitest";

import { workbenchMessage } from "../src/app/workbench-messages.js";

describe("workbench localization", () => {
  it("resolves owned interface copy in English and German", () => {
    expect(workbenchMessage("en", "settings.title")).toBe("Settings");
    expect(workbenchMessage("de", "settings.title")).toBe("Einstellungen");
    expect(workbenchMessage("en", "files.workspaceName")).toBe(
      "C4thedral workspace",
    );
    expect(workbenchMessage("de", "files.workspaceName")).toBe(
      "C4thedral-Arbeitsbereich",
    );
    expect(workbenchMessage("en", "editor.noSuggestions")).toBe(
      "No suggestions",
    );
    expect(workbenchMessage("de", "editor.noSuggestions")).toBe(
      "Keine Vorschläge",
    );
  });

  it("interpolates dynamic values without changing authored content", () => {
    expect(
      workbenchMessage("de", "preview.selected", {
        kind: "Element",
        label: "Shop-Dienst",
      }),
    ).toBe("Ausgewählt – Element: Shop-Dienst");
  });

  it("explains wizard identifiers as source IDs rather than vague technical names", () => {
    expect(workbenchMessage("de", "wizard.application.id")).toBe(
      "Eindeutige Anwendungs-ID",
    );
    expect(workbenchMessage("de", "wizard.people.id")).toBe(
      "Eindeutige Rollen-ID",
    );
    expect(workbenchMessage("de", "wizard.help.people.id")).toContain(
      "Quelltext-Token",
    );
    expect(workbenchMessage("de", "wizard.help.people.id")).toContain(
      "customer",
    );
    expect(
      workbenchMessage("de", "wizard.help.open", {
        field: "Eindeutige Rollen-ID",
      }),
    ).toBe("Eindeutige Rollen-ID erklären");
  });
});
