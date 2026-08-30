import { DOCUMENT } from "@angular/common";
import { Injectable, effect, inject, signal } from "@angular/core";

import {
  loadWorkbenchSession,
  normalizePreviewZoom,
  storeWorkbenchSession,
  toggleWorkbenchPanel,
  type WorkbenchActivity,
  type WorkbenchPanel,
  type WorkbenchPreviewWindowBounds,
  type WorkbenchPreviewWorkspaceMode,
  type WorkbenchSession,
} from "./workbench-session.js";

@Injectable({ providedIn: "root" })
export class WorkbenchSessionService {
  readonly #document = inject(DOCUMENT);
  readonly state = signal<WorkbenchSession>(this.#load());

  constructor() {
    effect(() => {
      storeWorkbenchSession(this.#readStorage(), this.state());
    });
  }

  setActivity(activeActivity: WorkbenchActivity): void {
    this.#patch({ activeActivity });
  }

  showPanel(bottomPanel: WorkbenchPanel): void {
    this.#patch({ bottomPanel, bottomPanelOpen: true });
  }

  togglePanel(bottomPanel: WorkbenchPanel): void {
    this.state.update((state) => toggleWorkbenchPanel(state, bottomPanel));
  }

  setPreviewZoom(previewZoom: number): void {
    this.#patch({ previewZoom: normalizePreviewZoom(previewZoom) });
  }

  toggleRoutingDebug(): void {
    this.#patch({
      routingDebugEnabled: !this.state().routingDebugEnabled,
    });
  }

  setPreviewWorkspaceMode(
    previewWorkspaceMode: WorkbenchPreviewWorkspaceMode,
  ): void {
    this.#patch({ previewWorkspaceMode });
  }

  setPreviewWindowBounds(
    previewWindowBounds: WorkbenchPreviewWindowBounds,
  ): void {
    this.#patch({ previewWindowBounds });
  }

  #patch(change: Partial<Omit<WorkbenchSession, "version">>): void {
    this.state.update((state) => ({ ...state, ...change }));
  }

  #load(): WorkbenchSession {
    return loadWorkbenchSession(this.#readStorage());
  }

  #readStorage(): Storage | undefined {
    try {
      return this.#document.defaultView?.localStorage;
    } catch {
      return undefined;
    }
  }
}
