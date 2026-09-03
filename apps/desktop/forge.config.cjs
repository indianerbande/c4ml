const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");
const electronChecksums = require("electron/checksums.json");

module.exports = {
  outDir: path.resolve(__dirname, "../../build/desktop"),
  packagerConfig: {
    appBundleId: "org.c4ml.desktop",
    appCategoryType: "public.app-category.developer-tools",
    appCopyright: "Copyright C4thedral contributors",
    download: {
      checksums: electronChecksums,
    },
    asar: {
      unpack: "dist/*.node",
    },
    executableName: "C4thedral",
    extendInfo: {
      CFBundleDocumentTypes: [
        {
          CFBundleTypeExtensions: ["c4ml"],
          CFBundleTypeIconFile: "icon.icns",
          CFBundleTypeName: "C4ML Source",
          CFBundleTypeRole: "Editor",
          LSHandlerRank: "Owner",
          LSItemContentTypes: ["org.c4ml.source"],
        },
      ],
      UTExportedTypeDeclarations: [
        {
          UTTypeConformsTo: ["public.plain-text"],
          UTTypeDescription: "C4ML Source",
          UTTypeIdentifier: "org.c4ml.source",
          UTTypeTagSpecification: {
            "public.filename-extension": ["c4ml"],
            "public.mime-type": ["text/x-c4ml"],
          },
        },
      ],
    },
    icon: path.resolve(__dirname, "assets/icon"),
    extraResource: [
      path.resolve(__dirname, "../../build/editor/browser"),
      path.resolve(__dirname, "../../build/editor/3rdpartylicenses.txt"),
      path.resolve(__dirname, "../../LICENSE"),
      path.resolve(__dirname, "THIRD_PARTY_NOTICES.txt"),
      path.resolve(__dirname, "../../packages/font-ibm-plex/fonts/sans"),
    ],
    ignore: [
      /^\/src($|\/)/,
      /^\/scripts($|\/)/,
      /^\/test($|\/)/,
      /^\/node_modules($|\/)/,
      /^\/dist\/main\.js$/,
      /^\/tsconfig(?:\.test)?\.json$/,
      /^\/forge\.config\.cjs$/,
    ],
    prune: false,
  },
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      platforms: ["win32"],
      config: {
        name: "C4thedral",
        authors: "C4thedral contributors",
        description: "C4thedral local architecture workbench, powered by C4ML",
      },
    },
    {
      name: "@electron-forge/maker-dmg",
      platforms: ["darwin"],
      config: {
        name: "C4thedral",
        format: "ULFO",
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
    },
    {
      name: "@electron-forge/maker-deb",
      platforms: ["linux"],
      config: {
        options: {
          name: "c4thedral",
          productName: "C4thedral",
          genericName: "Architecture Workbench",
          description: "Local architecture workbench powered by C4ML",
          productDescription:
            "C4thedral is a local architecture workbench for editing C4ML source and exporting deterministic SVG and PNG diagrams.",
          section: "devel",
          priority: "optional",
          maintainer: "C4thedral contributors",
          homepage: "https://github.com/indianerbande/c4ml",
          bin: "C4thedral",
          icon: path.resolve(__dirname, "assets/icon.png"),
          categories: ["Development"],
          mimeType: ["text/x-c4ml"],
        },
      },
    },
  ],
  hooks: {
    postPackage: async (_forgeConfig, packageResult) => {
      if (packageResult.platform !== "darwin") {
        return;
      }
      for (const outputPath of packageResult.outputPaths) {
        const appPath = outputPath.endsWith(".app")
          ? outputPath
          : path.join(outputPath, "C4thedral.app");
        const result = spawnSync(
          "/usr/bin/codesign",
          ["--sign", "-", "--force", "--deep", appPath],
          { encoding: "utf8" },
        );
        if (result.status !== 0) {
          throw new Error(
            `Final ad-hoc signing failed for ${appPath}: ${result.stderr}`,
          );
        }
      }
    },
  },
  plugins: [
    new FusesPlugin({
      version: FuseVersion.V1,
      resetAdHocDarwinSignature: true,
      strictlyRequireAllFuses: true,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
      [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: false,
      [FuseV1Options.GrantFileProtocolExtraPrivileges]: false,
      [FuseV1Options.WasmTrapHandlers]: true,
    }),
  ],
};
