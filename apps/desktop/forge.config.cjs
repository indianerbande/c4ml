const path = require("node:path");
const { spawnSync } = require("node:child_process");

const { FusesPlugin } = require("@electron-forge/plugin-fuses");
const { FuseV1Options, FuseVersion } = require("@electron/fuses");

module.exports = {
  outDir: path.resolve(__dirname, "../../build/desktop"),
  packagerConfig: {
    appBundleId: "org.c4ml.desktop",
    appCategoryType: "public.app-category.developer-tools",
    appCopyright: "Copyright C4ML contributors",
    asar: true,
    executableName: "C4ML",
    extraResource: [
      path.resolve(__dirname, "../../build/editor/browser"),
      path.resolve(__dirname, "../../build/editor/3rdpartylicenses.txt"),
      path.resolve(__dirname, "../../LICENSE"),
      path.resolve(__dirname, "THIRD_PARTY_NOTICES.txt"),
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
  },
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      platforms: ["win32"],
      config: {
        name: "C4ML",
        authors: "C4ML contributors",
        description: "Local desktop workbench for C4ML architecture models",
      },
    },
    {
      name: "@electron-forge/maker-dmg",
      platforms: ["darwin"],
      config: {
        name: "C4ML",
        format: "ULFO",
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
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
          : path.join(outputPath, "C4ML.app");
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
