import {
  isC4mlDesktopApi,
  type C4mlDesktopApi,
} from "@c4ml/desktop-contract";

export function resolveC4mlDesktopApi(
  host: object = globalThis,
): C4mlDesktopApi | undefined {
  const candidate = Reflect.get(host, "c4mlDesktop") as unknown;
  return isC4mlDesktopApi(candidate) ? candidate : undefined;
}
