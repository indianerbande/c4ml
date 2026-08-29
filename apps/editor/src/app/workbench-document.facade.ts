import { Injectable, effect, inject, signal } from "@angular/core";

import type { DesktopCommand } from "@c4ml/desktop-contract";

import { resolveC4mlDesktopApi } from "./desktop-bridge.js";
import { initialC4mlSource } from "./initial-source.js";
import { WorkbenchLocalizationService } from "./workbench-localization.js";
import { WorkbenchPreferencesService } from "./workbench-preferences.service.js";

export interface OpenedWorkbenchDocument {
  readonly source: string;
  readonly displayName: string;
}

@Injectable({ providedIn: "root" })
export class WorkbenchDocumentFacade {
  readonly source = signal(initialC4mlSource);
  readonly documentName = signal("architecture.c4ml");
  readonly documentHandle = signal<string | undefined>(undefined);
  readonly documentDirty = signal(false);
  readonly fileOperationLabel = signal<string | undefined>(undefined);
  readonly pngScale = signal(2);

  readonly #desktop = resolveC4mlDesktopApi();
  readonly #i18n = inject(WorkbenchLocalizationService);
  readonly #preferences = inject(WorkbenchPreferencesService);
  readonly desktopAvailable = this.#desktop !== undefined;

  constructor() {
    effect(() => {
      const handle = this.documentHandle();
      this.#desktop?.setDocumentState({
        displayName: this.documentName(),
        dirty: this.documentDirty(),
        ...(handle === undefined ? {} : { handle }),
      });
    });
    effect(() => {
      this.#desktop?.setUiLanguage(this.#preferences.uiLanguage());
    });
  }

  onDesktopCommand(listener: (command: DesktopCommand) => void): () => void {
    return this.#desktop?.onCommand(listener) ?? (() => undefined);
  }

  replaceSource(source: string, dirty: boolean): void {
    this.source.set(source);
    this.documentDirty.set(dirty);
  }

  resetAsGeneratedDocument(source: string): void {
    this.source.set(source);
    this.documentHandle.set(undefined);
    this.documentName.set("architecture.c4ml");
    this.documentDirty.set(true);
  }

  restoreDocumentState(state: {
    readonly handle: string | undefined;
    readonly name: string;
    readonly dirty: boolean;
  }): void {
    this.documentHandle.set(state.handle);
    this.documentName.set(state.name);
    this.documentDirty.set(state.dirty);
  }

  async openDocument(): Promise<OpenedWorkbenchDocument | undefined> {
    const desktop = this.#desktop;
    if (desktop === undefined) {
      return undefined;
    }
    if (
      this.documentDirty() &&
      !window.confirm(
        this.#i18n.t("operation.discard", { name: this.documentName() }),
      )
    ) {
      return undefined;
    }
    this.fileOperationLabel.set(this.#i18n.t("operation.opening"));
    try {
      const result = await desktop.openDocument();
      if (result.status === "opened") {
        this.source.set(result.document.source);
        this.documentHandle.set(result.document.handle);
        this.documentName.set(result.document.displayName);
        this.documentDirty.set(false);
        this.fileOperationLabel.set(
          this.#i18n.t("operation.opened", {
            name: result.document.displayName,
          }),
        );
        return {
          source: result.document.source,
          displayName: result.document.displayName,
        };
      }
      if (result.status === "failed") {
        this.fileOperationLabel.set(`${result.code}: ${result.message}`);
      } else {
        this.fileOperationLabel.set(undefined);
      }
    } catch {
      this.fileOperationLabel.set(this.#i18n.t("operation.openFailed"));
    }
    return undefined;
  }

  async saveDocument(mode: "save" | "save-as"): Promise<void> {
    const desktop = this.#desktop;
    if (desktop === undefined) {
      return;
    }
    this.fileOperationLabel.set(
      this.#i18n.t(
        mode === "save-as" ? "operation.choosingSave" : "operation.saving",
      ),
    );
    try {
      const handle = this.documentHandle();
      const result = await desktop.saveDocument({
        suggestedName: this.documentName(),
        source: this.source(),
        mode,
        ...(handle === undefined ? {} : { handle }),
      });
      if (result.status === "saved") {
        this.documentHandle.set(result.handle);
        this.documentName.set(result.displayName);
        this.documentDirty.set(false);
        this.fileOperationLabel.set(
          this.#i18n.t("operation.saved", { name: result.displayName }),
        );
      } else if (result.status === "failed") {
        this.fileOperationLabel.set(`${result.code}: ${result.message}`);
      } else {
        this.fileOperationLabel.set(undefined);
      }
    } catch {
      this.fileOperationLabel.set(this.#i18n.t("operation.saveFailed"));
    }
  }

  downloadSvg(svg: string, activeViewId: string | undefined): void {
    const url = URL.createObjectURL(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${activeViewId ?? "architecture"}.svg`;
    anchor.click();
    queueMicrotask(() => URL.revokeObjectURL(url));
  }

  async exportPng(
    svg: string,
    activeViewId: string | undefined,
  ): Promise<void> {
    const desktop = this.#desktop;
    if (desktop === undefined) {
      return;
    }
    this.fileOperationLabel.set(this.#i18n.t("operation.renderingPng"));
    try {
      const result = await desktop.exportPng({
        svg,
        scale: this.pngScale(),
        suggestedName: `${activeViewId ?? "architecture"}.png`,
      });
      if (result.status === "exported") {
        this.fileOperationLabel.set(
          this.#i18n.t("operation.exportedPng", {
            name: result.displayName,
            width: result.width,
            height: result.height,
          }),
        );
      } else if (result.status === "failed") {
        this.fileOperationLabel.set(`${result.code}: ${result.message}`);
      } else {
        this.fileOperationLabel.set(undefined);
      }
    } catch {
      this.fileOperationLabel.set(this.#i18n.t("operation.pngFailed"));
    }
  }

  setPngScale(value: unknown): void {
    const scale = Number(value);
    if (Number.isFinite(scale) && scale >= 0.25 && scale <= 8) {
      this.pngScale.set(scale);
    }
  }
}
