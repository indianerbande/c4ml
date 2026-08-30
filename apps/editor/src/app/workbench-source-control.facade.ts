import { Injectable, computed, inject, signal } from "@angular/core";

import type {
  DesktopSourceControlAction,
  DesktopSourceControlChange,
  DesktopSourceControlFileStatus,
  DesktopSourceControlSnapshot,
} from "@c4ml/desktop-contract";

import { resolveC4mlDesktopApi } from "./desktop-bridge.js";
import { WorkbenchDocumentFacade } from "./workbench-document.facade.js";
import { WorkbenchLocalizationService } from "./workbench-localization.js";

@Injectable({ providedIn: "root" })
export class WorkbenchSourceControlFacade {
  readonly snapshot = signal<DesktopSourceControlSnapshot | undefined>(undefined);
  readonly commitMessage = signal("");
  readonly busy = signal(false);
  readonly feedback = signal<string | undefined>(undefined);
  readonly stagedChanges = computed(() =>
    (this.snapshot()?.changes ?? []).filter(
      ({ indexStatus }) => indexStatus !== undefined,
    ),
  );
  readonly workingTreeChanges = computed(() =>
    (this.snapshot()?.changes ?? []).filter(
      ({ workingTreeStatus }) => workingTreeStatus !== undefined,
    ),
  );
  readonly branchLabel = computed(() => {
    const snapshot = this.snapshot();
    return (
      snapshot?.branch ??
      (snapshot?.detachedHead === undefined
        ? undefined
        : this.#i18n.t("git.detached", { commit: snapshot.detachedHead }))
    );
  });

  readonly #desktop = resolveC4mlDesktopApi();
  readonly #documents = inject(WorkbenchDocumentFacade);
  readonly #i18n = inject(WorkbenchLocalizationService);
  readonly available = this.#desktop !== undefined;

  updateCommitMessage(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLTextAreaElement) {
      this.commitMessage.set(target.value.slice(0, 4096));
    }
  }

  async refresh(): Promise<void> {
    await this.#run("refresh");
  }

  async stage(change: DesktopSourceControlChange): Promise<void> {
    await this.#run("stage", [change.path]);
  }

  async unstage(change: DesktopSourceControlChange): Promise<void> {
    await this.#run("unstage", [change.path]);
  }

  async stageAll(): Promise<void> {
    await this.#run("stage-all");
  }

  async unstageAll(): Promise<void> {
    await this.#run("unstage-all");
  }

  async commit(): Promise<void> {
    if (this.#documents.projectDirty()) {
      this.feedback.set(this.#i18n.t("git.saveFirst"));
      return;
    }
    const message = this.commitMessage().trim();
    if (message.length === 0) {
      this.feedback.set(this.#i18n.t("git.messageRequired"));
      return;
    }
    if (await this.#run("commit", undefined, message)) {
      this.commitMessage.set("");
      this.feedback.set(this.#i18n.t("git.committed"));
    }
  }

  async push(): Promise<void> {
    if (await this.#run("push")) {
      this.feedback.set(this.#i18n.t("git.pushed"));
    }
  }

  statusLabel(status: DesktopSourceControlFileStatus | undefined): string {
    return status === undefined ? "" : this.#i18n.t(`git.status.${status}`);
  }

  statusCode(status: DesktopSourceControlFileStatus | undefined): string {
    switch (status) {
      case "added":
        return "A";
      case "conflicted":
        return "!";
      case "copied":
        return "C";
      case "deleted":
        return "D";
      case "renamed":
        return "R";
      case "type-changed":
        return "T";
      case "untracked":
        return "?";
      case "modified":
        return "M";
      default:
        return "";
    }
  }

  async #run(
    action: DesktopSourceControlAction,
    paths?: readonly string[],
    message?: string,
  ): Promise<boolean> {
    if (this.busy()) return false;
    const handle = this.#documents.documentHandle();
    if (this.#desktop === undefined || handle === undefined) {
      this.snapshot.set(undefined);
      this.feedback.set(
        this.#desktop === undefined
          ? this.#i18n.t("git.desktopOnly")
          : this.#i18n.t("git.openFirst"),
      );
      return false;
    }
    this.busy.set(true);
    this.feedback.set(
      this.#i18n.t(action === "push" ? "git.pushing" : "git.working"),
    );
    try {
      const result = await this.#desktop.sourceControl({
        handle,
        action,
        ...(paths === undefined ? {} : { paths }),
        ...(message === undefined ? {} : { message }),
      });
      if (this.#documents.documentHandle() !== handle) {
        this.feedback.set(undefined);
        return false;
      }
      if (result.status === "failed") {
        if (result.code === "C4ML-DESKTOP-GIT-001") {
          this.snapshot.set(undefined);
          this.feedback.set(this.#i18n.t("git.notRepository"));
        } else {
          this.feedback.set(`${result.code}: ${result.message}`);
        }
        return false;
      }
      this.snapshot.set(result.snapshot);
      if (action !== "commit" && action !== "push") {
        this.feedback.set(undefined);
      }
      return true;
    } catch {
      this.feedback.set(this.#i18n.t("git.failed"));
      return false;
    } finally {
      this.busy.set(false);
    }
  }
}
