# Install C4thedral on Windows

[English](install-windows.md) | [Deutsch](../de/install-windows.md)

This guide is for the finished C4thedral installer. You do not need Node.js,
pnpm, or any developer tools.

> **Status of `v0.1.0-beta.5`:** This version is published as a source beta;
> no approved native installer is offered for it yet. This guide applies when
> a Windows x64 setup verified on its target system is explicitly provided.
> Until then, follow [Build C4thedral from source](build-from-source.md).

## 1. Download the correct installer

Download this file for a normal 64-bit Windows PC:

```text
C4thedral-VERSION Setup.exe
```

The currently validated native Windows path is Windows x64. To check your
architecture, open **Settings → System → About**. **System type** must say
“64-bit operating system, x64-based processor.”

## 2. Optional: verify the checksum

Open the download folder in Explorer. Right-click an empty area and choose
**Open in Terminal**, then run:

```powershell
Get-FileHash ".\C4thedral-VERSION Setup.exe" -Algorithm SHA256
```

Compare the displayed value with the SHA-256 checksum published with the
download. Do not install the file if they differ.

## 3. Install C4thedral

1. Replace `VERSION` with the version in the provided file name and
   double-click the setup.
2. Wait for installation to finish.
3. Open the Start menu, search for **C4thedral**, and start the application.

Squirrel installs C4thedral for your Windows user account. A normal install
does not require administrator rights. Your `.c4ml` files live outside the
application and are not changed by installation or updates.

The internal beta does not yet carry a Windows publisher signature. Windows
may therefore display **Windows protected your PC**. Use **More info → Run
anyway** only when you received the file from the trusted internal C4thedral
source and verified its checksum. Public builds must be signed before release.

## 4. Open a C4ML file

Start C4thedral and choose **File → Open File…**. Select a file ending in
`.c4ml`. Save changes with `Ctrl+S`. Export SVG and PNG from the **Output**
area.

You can also right-click a `.c4ml` file, choose **Open with**, and select
**C4thedral**. The installed app accepts the file both on first launch and when
it is already running.

C4thedral works entirely locally. Opening, editing, saving, and exporting do
not require an internet connection. Git is needed only for the integrated
Source Control area.

## 5. Install a newer version

Download the new `Setup.exe` and start it as described above. The Squirrel
installer updates the application for your user account. Your projects remain
untouched.

## 6. Remove C4thedral

1. Open **Settings → Apps → Installed apps**.
2. Search for **C4thedral**.
3. Open the menu beside the entry and choose **Uninstall**.

Your `.c4ml` projects are not deleted.

## If something does not work

- **Windows blocks the file:** Verify its source and SHA-256 first. Use the
  SmartScreen exception only for the explicitly provided internal beta.
- **C4thedral does not appear in the Start menu:** Wait a few seconds and search
  again. You can then run the installer once more.
- **The app supposedly needs Node.js:** That is not intended. Use the finished
  `Setup.exe`, not the source tree or a developer build.
- **Source Control reports no repository:** Install Git for Windows and open a
  `.c4ml` file inside a Git repository. Git is optional for all other features.
- **You have a Windows ARM computer:** The current beta is validated only for
  Windows x64. Do not treat it as an approved native ARM build.
