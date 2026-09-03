# Install C4thedral on Ubuntu or Debian

[English](install-linux.md) | [Deutsch](../de/install-linux.md)

This guide is for the finished C4thedral installation package. You do not need
Node.js, pnpm, or any developer tools.

## 1. Download the correct package

Download the DEB file for your computer:

- normal Intel/AMD PCs: the file name ends in `_amd64.deb`;
- ARM64 computers: the file name ends in `_arm64.deb`.

If you are unsure which variant you need, open a terminal and run:

```shell
dpkg --print-architecture
```

The output, `amd64` or `arm64`, must match the file name.

## 2. Install C4thedral

Open a terminal and run these two commands:

```shell
cd ~/Downloads
sudo apt install ./c4thedral_0.1.0~beta.3_amd64.deb
```

On an ARM64 computer, replace `_amd64.deb` with `_arm64.deb`:

```shell
sudo apt install ./c4thedral_0.1.0~beta.3_arm64.deb
```

The `./` before the file name is important. Ubuntu asks for your password and
installs required system libraries automatically. No characters appear while
you enter the password; that is normal.

Alternatively, double-click the DEB file in the file manager and choose
**Install** in the software installer.

## 3. Start C4thedral

Open the application overview, search for **C4thedral**, and start it. You can
also run this command in a terminal:

```shell
c4thedral
```

You can also right-click a `.c4ml` file in the file manager and choose
**C4thedral** through **Open With**. The installed application accepts the file
both on first launch and while it is already running.

C4thedral then works entirely locally. Opening, editing, and exporting C4ML
files does not require an internet connection. Git is required only when you
use the integrated Source Control area.

## 4. Install a newer version

Download the new DEB file and run the same `apt install` command again. This
does not modify your personal projects.

## 5. Remove C4thedral

```shell
sudo apt remove c4thedral
```

The package manager removes the application. Your `.c4ml` projects remain
untouched.

## If something does not work

- **“Unsupported file” or “file not found”:** Make sure you are in the download
  directory and included `./` before the file name.
- **“wrong architecture”:** Compare `dpkg --print-architecture` with
  `_amd64.deb` or `_arm64.deb`.
- **C4thedral does not appear in the application menu:** Sign out and back in.
  You can start the app immediately with `c4thedral`.
- **The installation reports missing dependencies:** Use `apt install` as shown
  above, not `dpkg -i`; `apt` resolves the dependencies.

Do not start C4thedral with `--no-sandbox` and do not change the permissions of
`chrome-sandbox` yourself. The DEB package installs the Electron sandbox with
the correct system-managed ownership and permissions.
