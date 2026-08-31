const [major, minor] = process.versions.node.split(".").map(Number);

if (major !== 24 || minor < 15) {
  console.error(
    [
      `C4ML desktop packaging requires Node.js 24.15 or newer within the Node.js 24 line; found ${process.version}.`,
      "The installed application still uses Electron's bundled runtime and does not require system Node.js.",
      "See PLATFORMS.md for portable Windows, macOS, and Linux build-runtime setup.",
    ].join("\n"),
  );
  process.exit(1);
}
