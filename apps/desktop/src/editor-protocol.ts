import { isAbsolute, relative, resolve, sep } from "node:path";

export const editorProtocolScheme = "c4ml";
export const editorProtocolHost = "app";
export const editorEntryUrl = `${editorProtocolScheme}://${editorProtocolHost}/index.html`;

export function resolveEditorAssetPath(
  editorRoot: string,
  requestUrl: string,
): string | undefined {
  let url: URL;
  try {
    url = new URL(requestUrl);
  } catch {
    return undefined;
  }
  if (
    url.protocol !== `${editorProtocolScheme}:` ||
    url.hostname !== editorProtocolHost
  ) {
    return undefined;
  }

  let requestedPath: string;
  try {
    const decodedRequestUrl = decodeURIComponent(requestUrl);
    const pathStart = decodedRequestUrl.indexOf(
      "/",
      `${editorProtocolScheme}://`.length,
    );
    const rawPath = pathStart < 0 ? "" : decodedRequestUrl.slice(pathStart);
    if (rawPath.split(/[\\/]/u).includes("..")) {
      return undefined;
    }
    requestedPath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  } catch {
    return undefined;
  }
  const root = resolve(editorRoot);
  const candidate = resolve(root, requestedPath || "index.html");
  const relativePath = relative(root, candidate);
  if (
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    return undefined;
  }
  return candidate;
}
