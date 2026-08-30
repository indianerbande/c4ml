export type WorkbenchCommandId =
  | "diagram.export-png"
  | "diagram.export-svg"
  | "diagram.fit"
  | "diagram.focus"
  | "diagram.detach"
  | "diagram.route-debug"
  | "file.open"
  | "file.open-project"
  | "file.save"
  | "file.save-all"
  | "file.save-as"
  | "help.context"
  | "help.open"
  | "panel.problems"
  | "settings.open"
  | "wizard.new";

export interface WorkbenchCommand {
  readonly id: WorkbenchCommandId;
  readonly label: string;
  readonly category: string;
  readonly desktopOnly?: boolean;
  readonly shortcut?: string;
}

interface WorkbenchCommandDefinition {
  readonly id: WorkbenchCommandId;
  readonly label: WorkbenchMessageKey;
  readonly category: WorkbenchMessageKey;
  readonly desktopOnly?: boolean;
  readonly shortcut?: string;
}

const workbenchCommandDefinitions: readonly WorkbenchCommandDefinition[] = [
  {
    id: "file.open",
    label: "command.file.open",
    category: "command.category.file",
    desktopOnly: true,
    shortcut: "⌘O",
  },
  {
    id: "file.open-project",
    label: "command.file.openProject",
    category: "command.category.file",
    desktopOnly: true,
    shortcut: "⌥⌘O",
  },
  {
    id: "file.save",
    label: "command.file.save",
    category: "command.category.file",
    desktopOnly: true,
    shortcut: "⌘S",
  },
  {
    id: "file.save-all",
    label: "command.file.saveAll",
    category: "command.category.file",
    desktopOnly: true,
    shortcut: "⌥⌘S",
  },
  {
    id: "file.save-as",
    label: "command.file.saveAs",
    category: "command.category.file",
    desktopOnly: true,
    shortcut: "⇧⌘S",
  },
  {
    id: "diagram.export-svg",
    label: "command.diagram.exportSvg",
    category: "command.category.diagram",
  },
  {
    id: "diagram.export-png",
    label: "command.diagram.exportPng",
    category: "command.category.diagram",
    desktopOnly: true,
    shortcut: "⌥⌘P",
  },
  {
    id: "diagram.fit",
    label: "command.diagram.fit",
    category: "command.category.diagram",
  },
  {
    id: "diagram.focus",
    label: "command.diagram.focus",
    category: "command.category.view",
  },
  {
    id: "diagram.detach",
    label: "command.diagram.detach",
    category: "command.category.view",
    desktopOnly: true,
  },
  {
    id: "diagram.route-debug",
    label: "command.diagram.routes",
    category: "command.category.diagram",
  },
  {
    id: "panel.problems",
    label: "command.panel.problems",
    category: "command.category.view",
  },
  {
    id: "wizard.new",
    label: "command.wizard.new",
    category: "command.category.help",
  },
  {
    id: "help.open",
    label: "command.help.open",
    category: "command.category.help",
  },
  {
    id: "help.context",
    label: "command.help.context",
    category: "command.category.help",
    shortcut: "F1",
  },
  {
    id: "settings.open",
    label: "command.settings.open",
    category: "command.category.view",
    shortcut: "⌘,",
  },
];

export const workbenchCommands: readonly WorkbenchCommand[] =
  localizeWorkbenchCommands("en");

export function localizeWorkbenchCommands(
  language: WorkbenchUiLanguage,
): readonly WorkbenchCommand[] {
  return workbenchCommandDefinitions.map((command) => ({
    ...command,
    label: workbenchMessage(language, command.label),
    category: workbenchMessage(language, command.category),
  }));
}

export function filterWorkbenchCommands(
  query: string,
  desktopAvailable: boolean,
  language: WorkbenchUiLanguage = "en",
): readonly WorkbenchCommand[] {
  const terms = query
    .trim()
    .toLocaleLowerCase("en-US")
    .split(/\s+/u)
    .filter((term) => term.length > 0);
  return localizeWorkbenchCommands(language).filter((command) => {
    if (command.desktopOnly === true && !desktopAvailable) {
      return false;
    }
    const haystack = `${command.category} ${command.label}`.toLocaleLowerCase(
      "en-US",
    );
    return terms.every((term) => haystack.includes(term));
  });
}
import {
  workbenchMessage,
  type WorkbenchMessageKey,
} from "./workbench-messages.js";
import type { WorkbenchUiLanguage } from "./workbench-preferences.js";
