import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from "@angular/core";
import { isDesktopProjectName } from "@c4ml/desktop-contract";
import { ModalInteractionDirective } from "./modal-interaction.directive.js";
import { WorkbenchDocumentFacade } from "./workbench-document.facade.js";
import { WorkbenchLocalizationService } from "./workbench-localization.js";

@Component({
  selector: "c4ml-new-project",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalInteractionDirective],
  templateUrl: "./new-project.component.html",
  styleUrl: "./new-project.component.css",
})
export class NewProjectComponent {
  readonly i18n = inject(WorkbenchLocalizationService);
  readonly documents = inject(WorkbenchDocumentFacade);
  readonly created = output<void>();
  readonly cancelled = output<void>();
  readonly name = signal("");
  readonly busy = signal(false);
  readonly error = signal<string | undefined>(undefined);
  readonly valid = computed(() => isDesktopProjectName(this.name()));

  updateName(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
    this.error.set(undefined);
  }

  async create(): Promise<void> {
    if (!this.valid() || this.busy()) return;
    this.busy.set(true);
    this.error.set(undefined);
    try {
      if (await this.documents.openProject({ name: this.name() })) this.created.emit();
      else this.error.set(this.documents.fileOperationLabel());
    } finally {
      this.busy.set(false);
    }
  }
}
