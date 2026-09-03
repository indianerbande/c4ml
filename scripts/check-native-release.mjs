import { createHash } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repositoryRoot = resolve(import.meta.dirname, "..");
const desktopRoot = join(repositoryRoot, "apps", "desktop");
const buildRoot = join(repositoryRoot, "build", "desktop");
const makeRoot = join(buildRoot, "make");
const packageJson = JSON.parse(
  await readFile(join(desktopRoot, "package.json"), "utf8"),
);
const productName = packageJson.productName;
const version = packageJson.version;
const platform = process.platform;
const architecture = process.arch;

if (process.versions.node !== "24.15.0" && !/^24\.(?:1[5-9]|[2-9]\d)\./u.test(process.versions.node)) {
  throw new Error(
    `Native release evidence requires Node.js 24.15.0 or newer within the 24.x line; found ${process.version}.`,
  );
}

const packagedRoot = join(
  buildRoot,
  `${productName}-${platform}-${architecture}`,
);
const packagedExecutable =
  platform === "darwin"
    ? join(packagedRoot, `${productName}.app`, "Contents", "MacOS", productName)
    : platform === "win32"
      ? join(packagedRoot, `${productName}.exe`)
      : join(packagedRoot, productName);

assertFile(packagedExecutable, "packaged executable");
assertFile(makeRoot, "Forge make output", true);

const madeFiles = await listFiles(makeRoot);
let distributables;
if (platform === "darwin") {
  const applicationRoot = join(packagedRoot, `${productName}.app`);
  const plistPath = join(applicationRoot, "Contents", "Info.plist");
  const packagedIcon = join(
    applicationRoot,
    "Contents",
    "Resources",
    readPlistValue(plistPath, "CFBundleIconFile"),
  );
  if (readPlistValue(plistPath, "CFBundleName") !== productName) {
    throw new Error("The packaged macOS application name does not match the release identity.");
  }
  if (readPlistValue(plistPath, "CFBundleShortVersionString") !== version) {
    throw new Error("The packaged macOS application version does not match the release identity.");
  }
  if (
    readPlistValue(
      plistPath,
      "CFBundleDocumentTypes:0:CFBundleTypeExtensions:0",
    ) !== "c4ml" ||
    readPlistValue(
      plistPath,
      "CFBundleDocumentTypes:0:CFBundleTypeRole",
    ) !== "Editor"
  ) {
    throw new Error("The packaged macOS application does not own editable .c4ml documents.");
  }
  if (
    readPlistValue(
      plistPath,
      "UTExportedTypeDeclarations:0:UTTypeIdentifier",
    ) !== "org.c4ml.source"
  ) {
    throw new Error("The packaged macOS application is missing its C4ML document type.");
  }
  assertFile(packagedIcon, "packaged macOS icon");
  const sourceIcon = join(desktopRoot, "assets", "icon.icns");
  if ((await sha256(packagedIcon)) !== (await sha256(sourceIcon))) {
    throw new Error("The packaged macOS icon does not match the reviewed C4thedral icon.");
  }
  distributables = [
    join(makeRoot, `${productName}.dmg`),
    findUnique(
      madeFiles,
      (path) => basename(path) === `${productName}-darwin-${architecture}-${version}.zip`,
      "current macOS ZIP",
    ),
  ];
  runRequired("/usr/bin/codesign", [
    "--verify",
    "--deep",
    "--strict",
    packagedRoot + `/${productName}.app`,
  ]);
  runRequired("/usr/bin/hdiutil", ["verify", distributables[0]]);
  runRequired("/usr/bin/unzip", ["-t", distributables[1]]);
} else if (platform === "linux") {
  const debianArchitecture = architecture === "x64" ? "amd64" : architecture;
  const debianVersion = version.replace(
    /(\d)[_.+-]?((?:RC|rc|pre|dev|beta|alpha)[_.+-]?\d*)$/u,
    "$1~$2",
  );
  const debianPackage = findUnique(
    madeFiles,
    (path) =>
      basename(path) ===
      `c4thedral_${debianVersion}_${debianArchitecture}.deb`,
    "current Linux DEB",
  );
  const packageFields = runRequired("dpkg-deb", [
    "--field",
    debianPackage,
    "Package",
    "Version",
    "Architecture",
  ]);
  const expectedFields = [
    "Package: c4thedral",
    `Version: ${debianVersion}`,
    `Architecture: ${debianArchitecture}`,
  ];
  for (const field of expectedFields) {
    if (!packageFields.includes(field)) {
      throw new Error(`Linux DEB metadata is missing ${field}.`);
    }
  }
  const packageContents = runRequired("dpkg-deb", ["--contents", debianPackage]);
  if (!/^-rwsr-xr-x root\/root\s+\d+ .*\/chrome-sandbox$/mu.test(packageContents)) {
    throw new Error(
      "Linux DEB must install chrome-sandbox as root:root with mode 4755.",
    );
  }
  if (!/usr\/share\/applications\/c4thedral\.desktop$/mu.test(packageContents)) {
    throw new Error("Linux DEB is missing its desktop menu entry.");
  }
  if (
    !/\/usr\/bin\/c4thedral -> \.\.\/lib\/c4thedral\/C4thedral$/mu.test(
      packageContents,
    )
  ) {
    throw new Error(
      "Linux DEB is missing the c4thedral command or it targets the wrong executable.",
    );
  }
  distributables = [debianPackage];
} else if (platform === "win32") {
  distributables = [
    findUnique(
      madeFiles,
      (path) => path.toLowerCase().endsWith(".exe") && basename(path).includes(productName),
      "Squirrel Setup executable",
    ),
    findUnique(
      madeFiles,
      (path) => path.toLowerCase().endsWith(".nupkg") && basename(path).includes(productName),
      "Squirrel package",
    ),
    findUnique(madeFiles, (path) => basename(path) === "RELEASES", "Squirrel RELEASES index"),
  ];
} else {
  throw new Error(`Unsupported native release host: ${platform}/${architecture}.`);
}

for (const path of distributables) {
  assertFile(path, "distributable");
}

const artifacts = await Promise.all(
  [packagedExecutable, ...distributables].map(async (path) => ({
    path: path.slice(repositoryRoot.length + 1).replaceAll("\\", "/"),
    bytes: (await stat(path)).size,
    sha256: await sha256(path),
  })),
);
const evidence = {
  schemaVersion: 1,
  productName,
  version,
  platform,
  architecture,
  node: process.version,
  artifacts,
};
const evidenceRoot = join(buildRoot, "release-evidence");
const evidencePath = join(evidenceRoot, `${platform}-${architecture}.json`);
await mkdir(evidenceRoot, { recursive: true });
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
console.log(JSON.stringify(evidence, null, 2));
console.log(`Native release evidence written to ${evidencePath}`);

function assertFile(path, label, directory = false) {
  if (!existsSync(path)) {
    throw new Error(`Missing ${label}: ${path}`);
  }
  if (directory === false) {
    if (!statSync(path).isFile()) {
      throw new Error(`${label} is not a file: ${path}`);
    }
  } else if (!statSync(path).isDirectory()) {
    throw new Error(`${label} is not a directory: ${path}`);
  }
}

async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

function readPlistValue(path, key) {
  const result = spawnSync("/usr/libexec/PlistBuddy", [
    "-c",
    `Print :${key}`,
    path,
  ], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`Could not read ${key} from ${path}:\n${result.stderr}`);
  }
  return result.stdout.trim();
}

async function listFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path)));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files;
}

function findUnique(paths, predicate, label) {
  const matches = paths.filter(predicate);
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one ${label}; found ${matches.length}.`);
  }
  return matches[0];
}

function runRequired(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed:\n${result.stdout}${result.stderr}`,
    );
  }
  return result.stdout;
}
