import { compareText } from "./ordering.js";
import { isPortableProjectUri } from "./project.js";

export const architectureAssetManifestVersion = 1 as const;

export type ArchitectureAssetMediaType = "application/json" | "text/markdown" | "text/plain";
export type ArchitectureAssetPurpose = "narrative" | "publication" | "reference";

export interface ArchitectureAssetEntry {
  readonly id: string;
  readonly uri: string;
  readonly mediaType: ArchitectureAssetMediaType;
  readonly purpose: ArchitectureAssetPurpose;
  readonly sha256: string;
  readonly license: string;
  readonly attribution?: string;
}

export interface ArchitectureAssetManifest {
  readonly version: typeof architectureAssetManifestVersion;
  readonly id: string;
  readonly assets: readonly ArchitectureAssetEntry[];
}

export type ArchitectureAssetManifestParseResult =
  | { readonly valid: true; readonly manifest: ArchitectureAssetManifest; readonly error: undefined }
  | { readonly valid: false; readonly manifest: undefined; readonly error: ArchitectureAssetError };

export class ArchitectureAssetError extends Error {
  constructor(
    readonly code: "C4ML-ASSET-001" | "C4ML-ASSET-002",
    message: string,
  ) {
    super(message);
    this.name = "ArchitectureAssetError";
  }
}

export function parseArchitectureAssetManifest(source: string): ArchitectureAssetManifestParseResult {
  let value: unknown;
  try { value = JSON.parse(source); } catch {
    return invalid("An architecture asset manifest must contain valid JSON.");
  }
  try {
    if (!isRecord(value) || value["version"] !== architectureAssetManifestVersion) {
      malformed(`An asset manifest must declare version ${architectureAssetManifestVersion}.`);
    }
    const id = text(value["id"], "asset manifest identity");
    if (!Array.isArray(value["assets"]) || value["assets"].length === 0) {
      malformed("An asset manifest requires at least one asset.");
    }
    const assets = value["assets"].map(parseAsset).sort((left, right) => compareText(left.id, right.id));
    unique(assets.map((asset) => asset.id), "asset identities");
    unique(assets.map((asset) => asset.uri.toLocaleLowerCase("en-US")), "asset paths");
    return { valid: true, manifest: { version: 1, id, assets }, error: undefined };
  } catch (error: unknown) {
    return error instanceof ArchitectureAssetError
      ? { valid: false, manifest: undefined, error }
      : invalid("The architecture asset manifest is malformed.");
  }
}

export function assertArchitectureAssetHash(
  asset: ArchitectureAssetEntry,
  actualSha256: string,
): void {
  if (asset.sha256 !== actualSha256.toLocaleLowerCase("en-US")) {
    throw new ArchitectureAssetError(
      "C4ML-ASSET-002",
      `Asset "${asset.id}" content does not match its declared SHA-256.`,
    );
  }
}

function parseAsset(value: unknown, index: number): ArchitectureAssetEntry {
  if (!isRecord(value)) malformed(`Asset ${index + 1} must be an object.`);
  const id = text(value["id"], `asset ${index + 1} identity`);
  const uri = text(value["uri"], `asset "${id}" path`);
  if (!isPortableProjectUri(uri)) malformed(`Asset "${id}" path must be normalized and local.`);
  const mediaType = value["mediaType"];
  if (mediaType !== "text/plain" && mediaType !== "text/markdown" && mediaType !== "application/json") {
    malformed(`Asset "${id}" uses an unsupported active or binary media type.`);
  }
  const purpose = value["purpose"];
  if (purpose !== "narrative" && purpose !== "publication" && purpose !== "reference") {
    malformed(`Asset "${id}" has an unknown purpose.`);
  }
  const sha256 = text(value["sha256"], `asset "${id}" SHA-256`).toLocaleLowerCase("en-US");
  if (!/^[0-9a-f]{64}$/u.test(sha256)) malformed(`Asset "${id}" requires a hexadecimal SHA-256.`);
  const license = text(value["license"], `asset "${id}" SPDX license`);
  if (!/^[A-Za-z0-9][A-Za-z0-9.+-]*$/u.test(license)) malformed(`Asset "${id}" requires one SPDX license identifier.`);
  const attribution = value["attribution"] === undefined
    ? undefined
    : text(value["attribution"], `asset "${id}" attribution`);
  return { id, uri, mediaType, purpose, sha256, license, ...(attribution === undefined ? {} : { attribution }) };
}

function unique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) malformed(`Architecture ${label} must be unique.`);
}
function text(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) malformed(`Architecture ${label} must not be empty.`);
  return value.trim();
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function invalid(message: string): ArchitectureAssetManifestParseResult {
  return { valid: false, manifest: undefined, error: new ArchitectureAssetError("C4ML-ASSET-001", message) };
}
function malformed(message: string): never {
  throw new ArchitectureAssetError("C4ML-ASSET-001", message);
}
