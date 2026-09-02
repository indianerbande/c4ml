# C4thedral unter Ubuntu oder Debian installieren

[English](../en/install-linux.md) | [Deutsch](install-linux.md)

Diese Anleitung ist für das fertige C4thedral-Installationspaket. Du brauchst
weder Node.js noch pnpm und musst keine Entwicklerwerkzeuge einrichten.

## 1. Das richtige Paket herunterladen

Lade die DEB-Datei für deinen Rechner herunter:

- normale Intel-/AMD-PCs: Dateiname endet auf `_amd64.deb`;
- ARM64-Rechner: Dateiname endet auf `_arm64.deb`.

Wenn du nicht weißt, welche Variante du brauchst, öffne ein Terminal und gib
ein:

```shell
dpkg --print-architecture
```

Die Ausgabe `amd64` oder `arm64` muss zum Dateinamen passen.

## 2. C4thedral installieren

Öffne ein Terminal und führe diese beiden Befehle aus:

```shell
cd ~/Downloads
sudo apt install ./c4thedral_0.1.0~beta.1_amd64.deb
```

Auf einem ARM64-Rechner ersetzt du `_amd64.deb` durch `_arm64.deb`:

```shell
sudo apt install ./c4thedral_0.1.0~beta.1_arm64.deb
```

Das `./` vor dem Dateinamen ist wichtig. Ubuntu fragt nach deinem Passwort und
installiert benötigte Systembibliotheken automatisch. Die Eingabe des
Passworts bleibt im Terminal unsichtbar; das ist normal.

Alternativ kannst du die DEB-Datei im Dateimanager doppelt anklicken und im
angezeigten Software-Installer **Installieren** wählen.

## 3. C4thedral starten

Öffne die Anwendungsübersicht, suche nach **C4thedral** und starte die App.
Alternativ funktioniert im Terminal:

```shell
c4thedral
```

C4thedral läuft danach vollständig lokal. Für das Öffnen, Bearbeiten und
Exportieren von C4ML-Dateien ist keine Internetverbindung erforderlich. Git
wird nur benötigt, wenn du die integrierte Source-Control-Ansicht verwendest.

## 4. Eine neuere Version installieren

Lade die neue DEB-Datei herunter und führe denselben `apt install`-Befehl noch
einmal aus. Persönliche Projekte werden dadurch nicht verändert.

## 5. C4thedral entfernen

```shell
sudo apt remove c4thedral
```

Der Paketmanager entfernt die Anwendung. Deine `.c4ml`-Projekte bleiben
unangetastet.

## Wenn etwas nicht funktioniert

- **„Unsupported file“ oder „Datei nicht gefunden“:** Prüfe, ob du im
  Download-Ordner bist und das `./` vor dem Dateinamen angegeben hast.
- **„wrong architecture“ oder „falsche Architektur“:** Vergleiche
  `dpkg --print-architecture` mit `_amd64.deb` beziehungsweise `_arm64.deb`.
- **C4thedral erscheint nicht im Anwendungsmenü:** Melde dich einmal ab und
  wieder an. Du kannst die App sofort mit `c4thedral` starten.
- **Die Installation meldet fehlende Abhängigkeiten:** Verwende `apt install`
  wie oben beschrieben, nicht `dpkg -i`; `apt` löst die Abhängigkeiten auf.

Starte C4thedral nicht mit `--no-sandbox` und ändere nicht selbst die Rechte von
`chrome-sandbox`. Das DEB-Paket installiert die Electron-Sandbox bereits mit
den korrekten, vom System verwalteten Rechten.
