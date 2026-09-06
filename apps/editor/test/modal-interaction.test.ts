import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { ModalInteractionController } from "../src/app/modal-interaction.js";

interface FakeElement {
  tabIndex: number;
  isConnected: boolean;
  contains(target: unknown): boolean;
  hasAttribute(name: string): boolean;
  querySelectorAll(): FakeElement[];
  getClientRects(): number[];
  focus(): void;
}

function harness() {
  const handlers = new Map<string, (event: unknown) => void>();
  const document = {
    activeElement: undefined as unknown,
    addEventListener: (type: string, handler: (event: unknown) => void) => handlers.set(type, handler),
    removeEventListener: (type: string) => handlers.delete(type),
  };
  function element(children: FakeElement[] = []): FakeElement {
    const result: FakeElement = {
      tabIndex: 0, isConnected: true,
      contains: (target: unknown): boolean => target === result || children.some((child) => child.contains(target)),
      hasAttribute: () => false,
      querySelectorAll: () => children,
      getClientRects: () => [1],
      focus: () => { document.activeElement = result; },
    };
    return result;
  }
  const input = element();
  const cancel = element();
  const panel = element([input, cancel]);
  const background = element();
  document.activeElement = background;
  const attention = vi.fn();
  const controller = new ModalInteractionController(document as unknown as Document, attention);
  const close = controller.register(panel as unknown as HTMLElement);
  function emit(type: string, target: unknown, extra = {}) {
    const event = { target, key: "", shiftKey: false, preventDefault: vi.fn(), stopImmediatePropagation: vi.fn(), ...extra };
    handlers.get(type)?.(event);
    return event;
  }
  return { document, input, cancel, panel, background, attention, controller, close, emit, handlers, element };
}

describe("explicit modal interaction", () => {
  it("keeps the route-offset drag from input to background inside the modal session", () => {
    const h = harness();
    h.input.focus();
    expect(h.emit("pointerdown", h.input).preventDefault).not.toHaveBeenCalled();
    const releaseClick = h.emit("click", h.background);
    expect(releaseClick.stopImmediatePropagation).toHaveBeenCalled();
    expect(h.controller.active).toBe(true);
    expect(h.document.activeElement).toBe(h.input);
    expect(h.attention).not.toHaveBeenCalled();
  });
  it("blocks outside clicks, signals attention, and leaves explicit buttons usable", () => {
    const h = harness();
    expect(h.emit("pointerdown", h.background).preventDefault).toHaveBeenCalled();
    expect(h.emit("click", h.background).stopImmediatePropagation).toHaveBeenCalled();
    expect(h.attention).toHaveBeenCalledOnce();
    expect(h.controller.active).toBe(true);
    h.emit("pointerdown", h.cancel);
    expect(h.emit("click", h.cancel).stopImmediatePropagation).not.toHaveBeenCalled();
    h.close();
    expect(h.controller.active).toBe(false);
    expect(h.handlers.size).toBe(0);
  });
  it("does not dismiss on Escape and preserves ordinary input and button activation", () => {
    const h = harness();
    expect(h.emit("keydown", h.input, { key: "Escape" }).preventDefault).toHaveBeenCalled();
    expect(h.controller.active).toBe(true);
    for (const key of ["3", "ArrowLeft", "Enter", " "]) {
      expect(h.emit("keydown", h.cancel, { key }).preventDefault).not.toHaveBeenCalled();
    }
  });
  it("contains focus and restores the invoking control after explicit close", async () => {
    const h = harness();
    await Promise.resolve();
    expect(h.document.activeElement).toBe(h.input);
    h.emit("keydown", h.input, { key: "Tab", shiftKey: true });
    expect(h.document.activeElement).toBe(h.cancel);
    h.emit("keydown", h.cancel, { key: "Tab" });
    expect(h.document.activeElement).toBe(h.input);
    h.emit("focusin", h.input);
    h.background.focus();
    h.emit("focusin", h.background);
    expect(h.document.activeElement).toBe(h.input);
    h.close();
    await Promise.resolve();
    expect(h.document.activeElement).toBe(h.background);
  });
  it("protects only the topmost modal and restores the previous modal", async () => {
    const h = harness();
    await Promise.resolve();
    const secondButton = h.element();
    const second = h.element([secondButton]);
    const closeSecond = h.controller.register(second as unknown as HTMLElement);
    await Promise.resolve();
    expect(h.document.activeElement).toBe(secondButton);
    h.emit("pointerdown", h.cancel);
    expect(h.emit("click", h.cancel).stopImmediatePropagation).toHaveBeenCalled();
    closeSecond();
    await Promise.resolve();
    expect(h.document.activeElement).toBe(h.input);
    expect(h.controller.active).toBe(true);
  });
});

describe("all workbench dialogs use explicit dismissal", () => {
  for (const name of ["app", "route-editor", "placement-editor", "semantic-editor", "settings-panel", "system-context-wizard"]) {
    it(`protects every modal in ${name}`, async () => {
      const template = await readFile(new URL(`../src/app/${name}.component.html`, import.meta.url), "utf8");
      const modals = template.match(/<[^>]*aria-modal="true"[^>]*>/g) ?? [];
      expect(modals.length).toBeGreaterThan(0);
      for (const modal of modals) expect(modal).toContain("c4mlModal");
      expect(template).not.toMatch(/<[^>]*class="[^"]*backdrop[^"]*"[^>]*\(click\)=/);
    });
  }
});
