import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  afterNextRender,
  computed,
  inject,
  input,
  output,
} from "@angular/core";

import type { CompilerWorkerNavigationTarget } from "./compiler-worker.protocol.js";
import {
  diagramContextMenuCapabilities,
  type DiagramContextMenuAction,
  type DiagramContextMenuPosition,
} from "./diagram-context-menu.js";
import { WorkbenchLocalizationService } from "./workbench-localization.js";

@Component({
  selector: "c4ml-diagram-context-menu",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./diagram-context-menu.component.html",
  styleUrl: "./diagram-context-menu.component.css",
})
export class DiagramContextMenuComponent {
  readonly target = input<CompilerWorkerNavigationTarget | undefined>();
  readonly position = input.required<DiagramContextMenuPosition>();
  readonly connectAvailable = input(false);
  readonly removeFromDiagramAvailable = input(false);
  readonly actionSelected = output<DiagramContextMenuAction>();
  readonly dismissed = output<void>();
  readonly i18n = inject(WorkbenchLocalizationService);
  readonly capabilities = computed(() =>
    diagramContextMenuCapabilities(this.target(), this.connectAvailable()),
  );

  readonly #element = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterNextRender(() =>
      this.#element.nativeElement.querySelector<HTMLButtonElement>("button")?.focus(),
    );
  }

  @HostListener("document:pointerdown", ["$event"])
  onDocumentPointerDown(event: PointerEvent): void {
    if (!this.#element.nativeElement.contains(event.target as Node | null)) {
      this.dismissed.emit();
    }
  }

  @HostListener("document:keydown", ["$event"])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      this.dismissed.emit();
    }
  }

  onMenuKeydown(event: KeyboardEvent): void {
    if (
      event.key !== "ArrowDown" &&
      event.key !== "ArrowUp" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }
    const buttons = [...this.#element.nativeElement.querySelectorAll<HTMLButtonElement>("button")]
      .filter((button) => button.offsetParent !== null);
    if (buttons.length === 0) return;
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : event.key === "ArrowDown"
            ? (current + 1 + buttons.length) % buttons.length
            : (current - 1 + buttons.length) % buttons.length;
    event.preventDefault();
    buttons[next]?.focus();
  }

  @HostListener("window:blur")
  @HostListener("window:resize")
  @HostListener("window:scroll")
  dismiss(): void {
    this.dismissed.emit();
  }

  choose(action: DiagramContextMenuAction): void {
    this.actionSelected.emit(action);
  }
}
