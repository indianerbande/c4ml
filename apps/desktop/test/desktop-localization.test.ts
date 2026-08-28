import { describe, expect, it } from "vitest";

import { desktopMessage } from "../src/desktop-localization.js";

describe("desktop localization", () => {
  it("localizes C4ML-owned native controls", () => {
    expect(desktopMessage("en", "menu.file")).toBe("File");
    expect(desktopMessage("de", "menu.file")).toBe("Datei");
    expect(desktopMessage("de", "menu.edit")).toBe("Bearbeiten");
    expect(
      desktopMessage("de", "close.message", { name: "architektur.c4ml" }),
    ).toBe("Änderungen an architektur.c4ml verwerfen?");
  });
});
