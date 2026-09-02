# C4thedral: Builds für Desktop-Plattformen

[English](../en/platforms.md) | [Deutsch](platforms.md)

Status: Build-Vertrag akzeptiert; native Paket-, Installations-, Offline- und
Bediennachweise liegen für macOS arm64, Windows x64, Ubuntu arm64 und Ubuntu x64
vor.

Datum: 2026-09-02

Dieses Dokument trennt die Entwicklerwerkzeuge von der an Benutzer
ausgelieferten Laufzeit und beschreibt die betriebssystemspezifischen Build- und
Prüfpfade der C4thedral-Desktop-Anwendung.

## Gemeinsamer Build-Vertrag

- Baue auf dem Zielbetriebssystem. Electron Forge paketiert hostnativ;
  C4thedral behauptet keine Cross-Kompilierung zwischen macOS, Windows und
  Linux.
- Verwende pnpm 11.24.0 und Node.js 24.15.0 oder neuer aus der 24.x-Linie.
  Source-Prüfungen funktionieren derzeit auch unter Node.js 26, die Paketierung
  mit Electron Forge 7.11.2 ist jedoch bewusst auf Node.js 24.x begrenzt.
- `pnpm run desktop:start` ist ein Entwicklungsstart und erzeugt kein
  verteilbares Paket. Auf macOS verwendet er einen gecachten, ad hoc signierten
  `C4thedral.app`-Wrapper. Die Node-24-Sperre gilt für `desktop:package`,
  `desktop:smoke` und `desktop:make`.
- Führe `pnpm install` im Repository-Root aus. Der Download von Abhängigkeiten
  und Electron kann Registry, Mirror oder Cache benötigen. Das installierte
  C4thedral selbst benötigt weder Node.js noch einen Netzwerkdienst.
- Linux-Paket-Smoke und DEB-Erzeugung benötigen auf dem Release-Host zusätzlich
  `sudo`, `dpkg` und `fakeroot`. Der Smoke-Befehl setzt nur den wegwerfbaren
  `chrome-sandbox`-Helfer auf `root:root` und Modus `4755`; er verwendet niemals
  `--no-sandbox`.
- `pnpm run release:native` führt Source-Gate, Paket-Smoke, Maker und
  Artefaktprüfung aus. Hashes und Größen landen in
  `build/desktop/release-evidence/<platform>-<architecture>.json`.
- Git ist fürs Bearbeiten und Rendern optional. Source Control benötigt ein
  lokal installiertes `git`.

Das Repository fixiert `webpack` 5.109.2, `minimizer-webpack-plugin` 5.7.0 und
`terser` 5.51.1 als reine Build-Abhängigkeiten. Native Maker-Helfer müssen mit
derselben Node-24-Laufzeit installiert oder neu gebaut werden. Ein sauberer
Release-Checkout führt deshalb `pnpm install --frozen-lockfile` unter Node.js 24
aus.

Windows-MSI-Installer verschiedener Node-Hauptversionen ersetzen dieselbe
Systeminstallation. Für eine parallele Build-Laufzeit entpackst du das
offizielle Node.js-24.15.0-ZIP in ein Werkzeugverzeichnis und rufst `node.exe`
ausdrücklich auf:

```powershell
$Node24 = "C:\Tools\node-v24.15.0-win-x64\node.exe"
& $Node24 "C:\Anwendungen\npm\node_modules\pnpm\bin\pnpm.cjs" install
& $Node24 "C:\Anwendungen\npm\node_modules\pnpm\bin\pnpm.cjs" run check
& $Node24 "C:\Anwendungen\npm\node_modules\pnpm\bin\pnpm.cjs" run desktop:make
```

Unter macOS/Linux genügt ein Node-24-Binary am Anfang von `PATH`; Node.js 26
muss nicht global entfernt werden.

## Plattformmatrix

| Host | Paketierte Anwendung | `desktop:make` | Anforderungen |
| --- | --- | --- | --- |
| macOS | `.app` | DMG und ZIP | macOS 13 oder neuer. DMG-Helfer können Xcode Command Line Tools benötigen. Entwicklung ad hoc signiert; Releases mit Developer ID und Notarisierung. |
| Windows | Verzeichnis mit `C4thedral.exe` | Squirrel-Setup-EXE | Nativ in PowerShell oder Eingabeaufforderung, nicht WSL. Releases benötigen Windows-Codesignatur. Validiertes Ziel ist x64. |
| Debian/Ubuntu | Verzeichnis mit `C4thedral` | DEB | GNU/glibc x64 oder arm64. Das DEB installiert Menüeintrag und `root:root`/`4755`-Sandbox-Helfer. RPM, Flatpak und Snap gehören noch nicht zum Vertrag. |

## Aktuelle native Nachweise

| Host | Ergebnis | Noch offen |
| --- | --- | --- |
| macOS 15 arm64 | `0.1.0-beta.1`: App-Smoke, Name, Version, Original-Icon, Ad-hoc-Tiefensignatur, DMG-Prüfsumme und ZIP-Integrität unter Node.js 24.15.0 bestanden. | Developer ID und Notarisierung. |
| Windows 11 x64 | Source-Gate, Squirrel-Build, `check:native-release`, Paket- und installierter Offline-Smoke ohne System-Node, Installationszyklus sowie sichtbare Datei-, SVG/PNG- und Dirty-Close-Abläufe bestanden. Setup: 158.852.096 Bytes, SHA-256 `4263b2516ac7db3d3b842000ffdc6cf32c62f804563f7b1c0dfa0d937cd2cbb1`. | Windows-Codesignatur. |
| Ubuntu 24.10 arm64 | DEB-Build/-Prüfung, APT-Zyklus, `root:root`/`4755`, netzisolierter Smoke und sichtbare Datei-, SVG/PNG- und Source-Control-Abläufe bestanden. | Keine Linux-arm64-spezifische Beta-Arbeit. |
| Ubuntu 26.04.1 x64 | 562 Tests, Paketprüfung, APT-Zyklus, zwei netzisolierte Smokes und sichtbare Datei-/Export-, Source-Control-, Dirty-Close- und Mindesthöhenabläufe bestanden. DEB-SHA-256: `ce5282e014f595f19ea7a672fadec4f11aebc294088122ca030ae59f96b238f1`; Executable-SHA-256: `199529b21d6f5cb8bb5d3425952ffd11413df9336dafa54ae9ceb8ef3bc2cc92`. | Keine Linux-x64-spezifische Beta-Arbeit. |

Das Linux-DEB ist Absicht. Ein portables Archiv kann auf Systemen mit
eingeschränkten User-Namespaces den erforderlichen Root-Besitzer und
Setuid-Modus nicht sicher herstellen. APT übernimmt die im DEB gespeicherten
Rechte. C4thedral schaltet die Sandbox nicht ab und verlangt keine manuellen
Reparaturen. Siehe [Linux-Installation](install-linux.md).

## Von C4thedral verantwortete Laufzeitunterschiede

- Das Schließen aller Fenster beendet die App auf Windows/Linux; auf macOS
  bleibt sie aktiv und erzeugt beim Aktivieren wieder ein Fenster.
- Windows erhält App-User-Model-ID und Squirrel-Startbehandlung.
- macOS verwendet Command-, Windows/Linux Control-Kürzel. Monaco-Vorschläge
  verwenden `Cmd+I` beziehungsweise `Ctrl+Space`.
- Projektmanifeste verwenden relative URIs mit `/`; native Pfade bleiben im
  Node-Desktop-Adapter.
- PNG-Export wählt genau ein natives resvg-Binary. Nicht unterstützte oder
  32-Bit-Ziele scheitern sichtbar.

## Native Prüfung

Nach einem sauberen Checkout auf jedem Zielhost:

```shell
node --version
pnpm --version
pnpm install
pnpm exec node --version
pnpm run check
pnpm run desktop:smoke
pnpm run desktop:make
pnpm run check:native-release
```

Nach `pnpm install --frozen-lockfile` unter Node 24 ist
`pnpm run release:native` der einzelne Release-Befehl. Prüfe das Artefakt danach
auf einem Rechner ohne systemweites Node.js:

1. normal installieren; unter Debian/Ubuntu mit
   `sudo apt install ./c4thedral_<version>_<architecture>.deb`;
2. starten;
3. `.c4ml` öffnen, bearbeiten, speichern, schließen und wieder öffnen;
4. SVG und PNG exportieren;
5. bei installiertem Git Source Control ausüben;
6. Betrieb ohne Netzwerk bestätigen; und
7. Anwendung entfernen, ohne Projektdaten zu löschen.

Linux prüft zusätzlich DEB-Metadaten, Desktop-Eintrag sowie `root:root` und
Modus `4755` von `chrome-sandbox`. Ein Host liefert nur Nachweis für sich
selbst. Anleitungen gibt es für [Windows](install-windows.md) und
[Debian/Ubuntu](install-linux.md).

## Quellen der Plattformwerkzeuge

- [Electron: Installation und Plattformen](https://www.electronjs.org/docs/latest/tutorial/installation)
- [Electron: Fensterlebenszyklus](https://www.electronjs.org/docs/latest/tutorial/tutorial-first-app)
- [Electron Forge: Build-Lebenszyklus](https://www.electronforge.io/core-concepts/build-lifecycle)
- [Electron Forge Makers](https://www.electronforge.io/config/makers)
- [ZIP Maker](https://www.electronforge.io/config/makers/zip)
- [DEB Maker](https://www.electronforge.io/config/makers/deb)
