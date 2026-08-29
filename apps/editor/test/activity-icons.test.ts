import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const template = await readFile(
  new URL("../src/app/app.component.html", import.meta.url),
  "utf8",
);
const styles = await readFile(
  new URL("../src/app/app.component.css", import.meta.url),
  "utf8",
);

describe("workbench activity icons", () => {
  it.each([
    ["files", "folder-open"],
    ["diagrams", "schema"],
    ["export", "download"],
    ["help", "menu-book"],
  ])("maps %s to the reviewed %s symbol", (activity, symbol) => {
    const button = activityButton(activity);
    expect(button).toContain(`[attr.aria-label]="i18n.t('area.`);
    expect(button).toContain(`data-symbol="${symbol}"`);
    expect(button).toContain(`aria-hidden="true"`);
  });

  it("keeps Settings accessibly named while using the reviewed symbol", () => {
    const settingsButton = template.match(
      /<button\s+#settingsButton[\s\S]*?<\/button>/u,
    )?.[0];
    expect(settingsButton).toContain(
      `[attr.aria-label]="i18n.t('area.settings')"`,
    );
    expect(settingsButton).toContain(`data-symbol="settings"`);
    expect(settingsButton).toContain(`aria-hidden="true"`);
  });

  it.each([
    ["folder-open", "folder_open.svg"],
    ["schema", "schema.svg"],
    ["download", "download.svg"],
    ["menu-book", "menu_book.svg"],
    ["settings", "settings.svg"],
  ])("loads %s from the local Material Symbols assets", (symbol, file) => {
    expect(styles).toContain(`.activity-icon[data-symbol="${symbol}"]`);
    expect(styles).toContain(`url("/icons/material-symbols/${file}")`);
  });
});

function activityButton(activity: string): string {
  const marker = `data-activity="${activity}"`;
  const markerIndex = template.indexOf(marker);
  const start = template.lastIndexOf("<button", markerIndex);
  const end = template.indexOf("</button>", markerIndex);
  if (markerIndex < 0 || start < 0 || end < 0) {
    throw new Error(`Missing activity button: ${activity}`);
  }
  return template.slice(start, end + "</button>".length);
}
