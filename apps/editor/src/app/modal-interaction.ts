const focusableSelector = 'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

interface ModalEntry {
  readonly panel: HTMLElement;
  readonly returnFocus: HTMLElement | null;
  lastFocus: HTMLElement | undefined;
}

/** Workbench-only modality. This controller deliberately has no dismiss callback. */
export class ModalInteractionController {
  readonly #stack: ModalEntry[] = [];
  #outsidePointer = false;

  constructor(private readonly document: Document, private readonly attention: () => void) {}

  get active(): boolean { return this.#stack.length > 0; }

  register(panel: HTMLElement): () => void {
    const entry: ModalEntry = { panel, returnFocus: this.document.activeElement as HTMLElement | null, lastFocus: undefined };
    if (!this.active) this.#listen(true);
    this.#stack.push(entry);
    panel.tabIndex = -1;
    queueMicrotask(() => {
      if (this.#top() === entry && !panel.contains(this.document.activeElement)) this.#focus(entry);
    });
    return () => {
      const index = this.#stack.indexOf(entry);
      if (index < 0) return;
      const wasTop = this.#top() === entry;
      this.#stack.splice(index, 1);
      this.#outsidePointer = false;
      if (!this.active) this.#listen(false);
      if (!wasTop) return;
      queueMicrotask(() => {
        const top = this.#top();
        if (entry.returnFocus?.isConnected && (top === undefined || top.panel.contains(entry.returnFocus))) {
          entry.returnFocus.focus({ preventScroll: true });
        } else if (top !== undefined) this.#focus(top);
      });
    };
  }

  #top(): ModalEntry | undefined { return this.#stack.at(-1); }

  #focusable(entry: ModalEntry): HTMLElement[] {
    return Array.from(entry.panel.querySelectorAll<HTMLElement>(focusableSelector))
      .filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
  }

  #focus(entry: ModalEntry): void {
    const previous = entry.lastFocus;
    const available = this.#focusable(entry);
    const target = previous?.isConnected && available.includes(previous)
      ? previous : available.find((element) => element.hasAttribute("data-modal-initial-focus")) ?? available[0] ?? entry.panel;
    target.focus({ preventScroll: true });
  }

  readonly #pointerDown = (event: PointerEvent): void => {
    const top = this.#top();
    if (top === undefined) return;
    this.#outsidePointer = !top.panel.contains(event.target as Node);
    if (this.#outsidePointer) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  readonly #pointerCancel = (): void => { this.#outsidePointer = false; };

  readonly #click = (event: MouseEvent): void => {
    const top = this.#top();
    const notify = this.#outsidePointer;
    this.#outsidePointer = false;
    if (top === undefined || top.panel.contains(event.target as Node)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    // Text selection beginning inside a modal is not an attempted outside click.
    if (notify) this.attention();
  };

  readonly #focusIn = (event: FocusEvent): void => {
    const top = this.#top();
    if (top === undefined) return;
    if (top.panel.contains(event.target as Node)) top.lastFocus = event.target as HTMLElement;
    else this.#focus(top);
  };

  readonly #keyDown = (event: KeyboardEvent): void => {
    const top = this.#top();
    if (top === undefined) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (event.key !== "Tab") return;
    const elements = this.#focusable(top);
    const current = elements.indexOf(this.document.activeElement as HTMLElement);
    if (elements.length === 0 || current < 0 || (event.shiftKey ? current === 0 : current === elements.length - 1)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      (event.shiftKey ? elements.at(-1) ?? top.panel : elements[0] ?? top.panel).focus();
    }
  };

  #listen(add: boolean): void {
    const listen = <K extends keyof DocumentEventMap>(type: K, handler: (event: DocumentEventMap[K]) => void): void => {
      if (add) this.document.addEventListener(type, handler, true);
      else this.document.removeEventListener(type, handler, true);
    };
    listen("pointerdown", this.#pointerDown);
    listen("pointercancel", this.#pointerCancel);
    listen("click", this.#click);
    listen("focusin", this.#focusIn);
    listen("keydown", this.#keyDown);
  }
}
