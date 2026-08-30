import {
  isC4mlDesktopApi,
  isC4mlPreviewApi,
  type C4mlDesktopApi,
  type C4mlPreviewApi,
} from "@c4ml/desktop-contract";

export function resolveC4mlDesktopApi(
  host: object = globalThis,
): C4mlDesktopApi | undefined {
  const candidate = Reflect.get(host, "c4mlDesktop") as unknown;
  return isC4mlDesktopApi(candidate) ? candidate : undefined;
}

export function resolveC4mlPreviewApi(
  host: object = globalThis,
): C4mlPreviewApi | undefined {
  const candidate = Reflect.get(host, "c4mlPreview") as unknown;
  return isC4mlPreviewApi(candidate) ? candidate : undefined;
}
