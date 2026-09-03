import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const maximumPendingExternalDocuments = 16;

export function externalC4mlDocumentPaths(
  arguments_: readonly string[],
  workingDirectory: string,
): readonly string[] {
  const paths: string[] = [];
  for (const argument of arguments_) {
    const path = externalDocumentPath(argument, workingDirectory);
    if (path !== undefined && !paths.includes(path)) {
      paths.push(path);
    }
  }
  return paths.slice(0, maximumPendingExternalDocuments);
}

export class DesktopExternalDocumentQueue {
  readonly #paths: string[] = [];

  enqueue(paths: readonly string[]): void {
    for (const path of paths) {
      if (
        this.#paths.length >= maximumPendingExternalDocuments ||
        this.#paths.includes(path)
      ) {
        continue;
      }
      this.#paths.push(path);
    }
  }

  take(): string | undefined {
    return this.#paths.shift();
  }

  get pending(): boolean {
    return this.#paths.length > 0;
  }
}

function externalDocumentPath(
  argument: string,
  workingDirectory: string,
): string | undefined {
  if (argument.length === 0 || argument.startsWith("-")) return undefined;
  let path: string;
  if (argument.startsWith("file:")) {
    try {
      path = fileURLToPath(argument);
    } catch {
      return undefined;
    }
  } else {
    path = resolve(workingDirectory, argument);
  }
  return extname(path).toLocaleLowerCase() === ".c4ml" ? path : undefined;
}
