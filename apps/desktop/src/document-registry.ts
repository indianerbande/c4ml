import { basename, extname } from "node:path";
import { randomUUID } from "node:crypto";

export class DesktopDocumentRegistry {
  readonly #paths = new Map<string, string>();

  register(path: string): string {
    const handle = randomUUID();
    this.#paths.set(handle, path);
    return handle;
  }

  resolve(handle: string | undefined): string | undefined {
    return handle === undefined ? undefined : this.#paths.get(handle);
  }
}

export function safeSuggestedSourceName(value: string): string {
  const candidate = basename(value.trim())
    .replace(/[<>:"/\\|?*\u0000-\u001f]/gu, "-")
    .replace(/[. ]+$/u, "")
    .slice(0, 120);
  if (candidate.length === 0) {
    return "architecture.c4ml";
  }
  return ensureC4mlExtension(candidate);
}

export function ensureC4mlExtension(value: string): string {
  return extname(value).toLowerCase() === ".c4ml" ? value : `${value}.c4ml`;
}
