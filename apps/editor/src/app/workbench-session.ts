export const workbenchSessionStorageKey = "c4ml.workbench.session.v1";

export const workbenchActivities = ["files", "diagrams", "export"] as const;
export type WorkbenchActivity = (typeof workbenchActivities)[number];

export const workbenchPanels = ["problems", "route"] as const;
export type WorkbenchPanel = (typeof workbenchPanels)[number];

export interface WorkbenchSession {
  readonly version: 1;
  readonly activeActivity: WorkbenchActivity;
  readonly bottomPanel: WorkbenchPanel;
  readonly bottomPanelOpen: boolean;
  readonly previewZoom: number;
  readonly routingDebugEnabled: boolean;
}

export interface WorkbenchSessionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const defaultWorkbenchSession: WorkbenchSession = {
  version: 1,
  activeActivity: "files",
  bottomPanel: "problems",
  bottomPanelOpen: true,
  previewZoom: 1,
  routingDebugEnabled: true,
};

export function parseWorkbenchSession(
  serialized: string | null,
): WorkbenchSession {
  if (serialized === null) {
    return defaultWorkbenchSession;
  }
  try {
    const value = JSON.parse(serialized) as unknown;
    if (!isRecord(value) || value["version"] !== 1) {
      return defaultWorkbenchSession;
    }
    return {
      version: 1,
      activeActivity: isActivity(value["activeActivity"])
        ? value["activeActivity"]
        : defaultWorkbenchSession.activeActivity,
      bottomPanel: isPanel(value["bottomPanel"])
        ? value["bottomPanel"]
        : defaultWorkbenchSession.bottomPanel,
      bottomPanelOpen:
        typeof value["bottomPanelOpen"] === "boolean"
          ? value["bottomPanelOpen"]
          : defaultWorkbenchSession.bottomPanelOpen,
      previewZoom: normalizePreviewZoom(value["previewZoom"]),
      routingDebugEnabled:
        typeof value["routingDebugEnabled"] === "boolean"
          ? value["routingDebugEnabled"]
          : defaultWorkbenchSession.routingDebugEnabled,
    };
  } catch {
    return defaultWorkbenchSession;
  }
}

export function loadWorkbenchSession(
  storage: WorkbenchSessionStorage | undefined,
): WorkbenchSession {
  try {
    return parseWorkbenchSession(
      storage?.getItem(workbenchSessionStorageKey) ?? null,
    );
  } catch {
    return defaultWorkbenchSession;
  }
}

export function storeWorkbenchSession(
  storage: WorkbenchSessionStorage | undefined,
  session: WorkbenchSession,
): boolean {
  try {
    storage?.setItem(workbenchSessionStorageKey, JSON.stringify(session));
    return storage !== undefined;
  } catch {
    return false;
  }
}

export function normalizePreviewZoom(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return defaultWorkbenchSession.previewZoom;
  }
  const rounded = Math.round(value * 5) / 5;
  return Math.min(2.5, Math.max(0.4, rounded));
}

function isActivity(value: unknown): value is WorkbenchActivity {
  return workbenchActivities.some((candidate) => candidate === value);
}

function isPanel(value: unknown): value is WorkbenchPanel {
  return workbenchPanels.some((candidate) => candidate === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
