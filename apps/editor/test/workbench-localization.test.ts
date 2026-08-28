import { describe, expect, it } from "vitest";

import { workbenchMessage } from "../src/app/workbench-messages.js";

describe("workbench localization", () => {
  it("resolves owned interface copy in English and German", () => {
    expect(workbenchMessage("en", "settings.title")).toBe("Settings");
    expect(workbenchMessage("de", "settings.title")).toBe("Einstellungen");
  });

  it("interpolates dynamic values without changing authored content", () => {
    expect(
      workbenchMessage("de", "preview.selected", {
        kind: "Element",
        label: "Field Notes Service",
      }),
    ).toBe("Ausgewählt – Element: Field Notes Service");
  });
});
