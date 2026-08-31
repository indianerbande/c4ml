import { describe, expect, it } from "vitest";

import { desktopMessage } from "../src/desktop-localization.js";

describe("desktop localization", () => {
  it("localizes C4thedral-owned native controls", () => {
    expect(desktopMessage("en", "menu.file")).toBe("File");
    expect(desktopMessage("de", "menu.file")).toBe("Datei");
    expect(desktopMessage("de", "menu.edit")).toBe("Bearbeiten");
    expect(desktopMessage("en", "menu.about")).toBe("About C4thedral");
    expect(desktopMessage("de", "menu.quit")).toBe("C4thedral beenden");
    expect(
      desktopMessage("de", "close.message", { name: "architektur.c4ml" }),
    ).toBe("Änderungen an architektur.c4ml verwerfen?");
  });
});
