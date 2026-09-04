/**
 * Lets callers wait until the source editor presents a particular document.
 *
 * The workbench selects documents through signals, and the editor swaps its
 * model when Angular next runs change detection. Authoring transactions and
 * reveal requests therefore ask the gate instead of assuming the switch
 * already happened.
 */
export class SourceEditorActivationGate {
  #activeUri: string | undefined;
  #closed = false;
  readonly #waiters: {
    readonly uri: string;
    readonly resolve: (active: boolean) => void;
  }[] = [];

  get activeUri(): string | undefined {
    return this.#activeUri;
  }

  /**
   * Resolves with `true` once `uri` is presented, or with `false` when a
   * different document is presented first or the editor closes.
   */
  whenActive(uri: string): Promise<boolean> {
    if (this.#closed) return Promise.resolve(false);
    if (this.#activeUri === uri) return Promise.resolve(true);
    return new Promise((resolve) => {
      this.#waiters.push({ uri, resolve });
    });
  }

  /** Records that the editor now presents `uri` and settles waiting callers. */
  activated(uri: string): void {
    this.#activeUri = uri;
    this.#settle(uri);
  }

  /** Records that the editor went away; every waiting caller receives `false`. */
  close(): void {
    this.#closed = true;
    this.#activeUri = undefined;
    this.#settle(undefined);
  }

  #settle(activeUri: string | undefined): void {
    for (const waiter of this.#waiters.splice(0)) {
      waiter.resolve(waiter.uri === activeUri);
    }
  }
}
