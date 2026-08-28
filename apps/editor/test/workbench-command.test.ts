import { describe, expect, it } from "vitest";

import {
  filterWorkbenchCommands,
  workbenchCommands,
} from "../src/app/workbench-command.js";

describe("workbench command catalogue", () => {
  it("keeps identifiers stable and unique", () => {
    const ids = workbenchCommands.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("filters by category and label terms deterministically", () => {
    expect(
      filterWorkbenchCommands("diagram svg", true).map(({ id }) => id),
    ).toEqual(["diagram.export-svg"]);
    expect(
      filterWorkbenchCommands("settings", true).map(({ id }) => id),
    ).toEqual(["settings.open"]);
    expect(filterWorkbenchCommands("help cursor", true).map(({ id }) => id))
      .toEqual(["help.context"]);
  });

  it("does not offer native-only commands in the browser path", () => {
    const browserIds = filterWorkbenchCommands("", false).map(({ id }) => id);
    expect(browserIds).not.toContain("file.open");
    expect(browserIds).not.toContain("diagram.export-png");
    expect(browserIds).toContain("diagram.export-svg");
  });

  it("searches the localized German command catalogue", () => {
    expect(
      filterWorkbenchCommands("diagramm svg", true, "de").map(({ id }) => id),
    ).toEqual(["diagram.export-svg"]);
    expect(
      filterWorkbenchCommands("einstellungen", true, "de").map(
        ({ id }) => id,
      ),
    ).toEqual(["settings.open"]);
    expect(
      filterWorkbenchCommands("hilfe cursor", true, "de").map(({ id }) => id),
    ).toEqual(["help.context"]);
  });
});
