# C4thedral unter Windows installieren

[English](../en/install-windows.md) | [Deutsch](install-windows.md)

Diese Anleitung ist für das fertige C4thedral-Installationsprogramm. Du
brauchst weder Node.js noch pnpm und musst keine Entwicklerwerkzeuge
einrichten.

## 1. Das richtige Installationsprogramm herunterladen

Lade für einen normalen 64-Bit-Windows-PC diese Datei herunter:

```text
C4thedral-0.1.0-beta.2 Setup.exe
```

Die aktuelle Beta ist für Windows x64 gebaut. Wenn du deine Windows-Architektur
prüfen möchtest, öffne **Einstellungen → System → Info**. Unter **Systemtyp**
muss „64-Bit-Betriebssystem, x64-basierter Prozessor“ stehen.

## 2. Optional: Prüfsumme kontrollieren

Öffne den Download-Ordner im Explorer. Klicke mit der rechten Maustaste auf
eine freie Stelle und wähle **Im Terminal öffnen**. Gib dann ein:

```powershell
Get-FileHash ".\C4thedral-0.1.0-beta.2 Setup.exe" -Algorithm SHA256
```

Vergleiche die angezeigte Zeichenfolge mit der SHA-256-Prüfsumme, die zusammen
mit dem Download veröffentlicht wurde. Installiere die Datei nicht, wenn die
Werte verschieden sind.

## 3. C4thedral installieren

1. Doppelklicke auf **C4thedral-0.1.0-beta.2 Setup.exe**.
2. Warte, bis die Installation abgeschlossen ist.
3. Öffne das Startmenü, suche nach **C4thedral** und starte die Anwendung.

Squirrel installiert C4thedral für dein Windows-Benutzerkonto. Eine normale
Installation benötigt keine Administratorrechte. Deine `.c4ml`-Dateien liegen
außerhalb der Anwendung und werden von Installation oder Aktualisierung nicht
verändert.

Die interne Beta ist noch nicht mit einem Windows-Herausgeberzertifikat
signiert. Windows kann deshalb **Der Computer wurde durch Windows geschützt**
anzeigen. Verwende **Weitere Informationen → Trotzdem ausführen** nur, wenn du
die Datei direkt aus der vertrauenswürdigen internen C4thedral-Quelle erhalten
und ihre Prüfsumme kontrolliert hast. Öffentlich verteilte Builds müssen vor
der Freigabe signiert werden.

## 4. Eine C4ML-Datei öffnen

Starte C4thedral und wähle **File → Open File…** beziehungsweise
**Datei → Datei öffnen…**. Wähle eine Datei mit der Endung `.c4ml`. Änderungen
speicherst du mit `Ctrl+S`. SVG und PNG exportierst du im Bereich **Output**.

Du kannst eine `.c4ml`-Datei auch mit der rechten Maustaste anklicken, **Öffnen
mit** wählen und **C4thedral** auswählen. Die installierte App übernimmt die
Datei beim ersten Start ebenso wie im bereits laufenden Zustand.

C4thedral arbeitet danach vollständig lokal. Für Öffnen, Bearbeiten, Speichern
und Exportieren ist keine Internetverbindung erforderlich. Git wird nur für die
integrierte Source-Control-Ansicht benötigt.

## 5. Eine neuere Version installieren

Lade das neue `Setup.exe` herunter und starte es wie oben beschrieben. Der
Squirrel-Installer aktualisiert die Anwendung für dein Benutzerkonto. Deine
Projekte bleiben erhalten.

## 6. C4thedral entfernen

1. Öffne **Einstellungen → Apps → Installierte Apps**.
2. Suche nach **C4thedral**.
3. Öffne das Menü rechts neben dem Eintrag und wähle **Deinstallieren**.

Deine `.c4ml`-Projekte werden dabei nicht gelöscht.

## Wenn etwas nicht funktioniert

- **Windows blockiert die Datei:** Prüfe zuerst Herkunft und SHA-256. Nutze die
  SmartScreen-Ausnahme nur für die ausdrücklich bereitgestellte interne Beta.
- **C4thedral erscheint nicht im Startmenü:** Warte einige Sekunden und suche
  erneut. Du kannst das Installationsprogramm danach noch einmal starten.
- **Die App benötigt angeblich Node.js:** Das ist nicht vorgesehen. Verwende
  das fertige `Setup.exe`, nicht den Quellcode oder einen Entwickler-Build.
- **Source Control zeigt kein Repository:** Installiere Git für Windows und
  öffne eine `.c4ml`-Datei innerhalb eines Git-Repositories. Für alle anderen
  Funktionen ist Git optional.
- **Du hast einen ARM-Windows-Rechner:** Die aktuelle Beta ist nur für Windows
  x64 validiert. Verwende sie dort nicht als freigegebenen nativen ARM-Build.
