import { DOCUMENT } from "@angular/common";
import { Directive, ElementRef, Injectable, inject, type AfterViewInit, type OnDestroy } from "@angular/core";
import { ModalInteractionController } from "./modal-interaction.js";

@Injectable({ providedIn: "root" })
export class ModalInteractionService {
  readonly controller = new ModalInteractionController(inject(DOCUMENT), () => this.attention());
  #audio: AudioContext | undefined;
  #lastAttention = -Infinity;
  #afterClose: (() => void) | undefined;

  afterClose(action: () => void): void {
    if (this.controller.active) this.#afterClose = action;
    else action();
  }

  register(panel: HTMLElement): () => void {
    const unregister = this.controller.register(panel);
    return () => {
      unregister();
      if (!this.controller.active && this.#afterClose !== undefined) {
        const action = this.#afterClose;
        this.#afterClose = undefined;
        queueMicrotask(() => this.afterClose(action));
      }
    };
  }

  /** A quiet local tone; no audio asset, network request, or privileged bridge. */
  attention(): void {
    if (performance.now() - this.#lastAttention < 250) return;
    this.#lastAttention = performance.now();
    try {
      if (typeof AudioContext === "undefined") return;
      this.#audio ??= new AudioContext();
      const context = this.#audio;
      void context.resume().then(() => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const now = context.currentTime;
        oscillator.frequency.value = 660;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.04, now + 0.008);
        gain.gain.linearRampToValueAtTime(0, now + 0.09);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
        oscillator.start(now);
        oscillator.stop(now + 0.1);
      }).catch(() => undefined);
    } catch { /* Unavailable or muted audio never affects modal behavior. */ }
  }
}

@Directive({ selector: "[c4mlModal]" })
export class ModalInteractionDirective implements AfterViewInit, OnDestroy {
  readonly #element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #modals = inject(ModalInteractionService);
  #unregister: (() => void) | undefined;

  ngAfterViewInit(): void {
    this.#unregister = this.#modals.register(this.#element.nativeElement);
  }

  ngOnDestroy(): void { this.#unregister?.(); }
}
