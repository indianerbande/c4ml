# C4thedral aus dem Quellcode bauen

[English](../en/build-from-source.md) | [Deutsch](build-from-source.md)

Status: Öffentliche Source-Beta aus einer bereinigten GitHub-Historie

Version: 0.1.0-beta.5

Source-Release: `v0.1.0-beta.5`

C4thedral lässt sich vollständig aus dem öffentlichen Quellcode bauen, nachdem
die gesperrten Abhängigkeiten und die Electron-Laufzeit geladen wurden. Die
installierte Desktop-Anwendung kompiliert C4ML lokal und benötigt weder
Cloud-Konto noch Python, systemweites Node.js oder einen Compiler-Dienst.

## 1. Build-Werkzeuge installieren

Installiere Git, Node.js 24.15.0 oder eine neuere 24.x-Version sowie die in der
[Plattformmatrix](platforms.md) genannten nativen Werkzeuge für dein
Betriebssystem. Aktiviere anschließend die im Repository festgelegte
pnpm-Version:

```shell
corepack enable
corepack prepare pnpm@11.24.0 --activate
node --version
pnpm --version
```

Erwartet werden Node.js 24 und pnpm 11. Native Paketierung bricht bei einer
anderen Node.js-Hauptversion früh und verständlich ab.

## 2. Quellcode klonen und prüfen

```shell
git clone https://github.com/indianerbande/c4ml.git
cd c4ml
pnpm install --frozen-lockfile
pnpm run check
```

`--frozen-lockfile` ist Absicht: Ein Source-Build muss genau den für diesen
Commit geprüften Abhängigkeitsgraphen verwenden und darf nicht stillschweigend
neuere Pakete auswählen.

## 3. Workbench starten

```shell
pnpm run desktop:start
```

Die Anwendung startet mit einem leeren Arbeitsbereich. Öffne mit **File → Open
File** eine einzelne `.c4ml`-Datei oder mit **File → Open Folder** ein Projekt.
Ausführbare Beispiele liegen unter `examples/draft`; die Syntax ist weiterhin
ausdrücklich vorläufig.

## 4. Natives Paket bauen

Führe das vollständige native Gate auf dem Betriebssystem aus, für das das
Paket bestimmt ist:

```shell
pnpm run release:native
```

Die Ergebnisse landen unter `build/desktop/`. macOS erzeugt Anwendung, DMG und
ZIP, Windows ein Squirrel-Setup-EXE und Debian beziehungsweise Ubuntu ein DEB.
Der paketierte Linux-Smoke-Test kann `sudo` ausschließlich benötigen, um den
wegwerfbaren entpackten Chromium-Sandbox-Helfer vor dem Start vorzubereiten.

Selbst gebaute macOS- und Windows-Artefakte tragen nicht die künftige
öffentliche Herausgebersignatur von C4thedral. Betriebssystemwarnungen bei lokal
gebauten oder heruntergeladenen unsignierten Artefakten sind deshalb zu
erwarten. Umgehe die Linux-Warnung niemals mit `--no-sandbox`.

## 5. Experimentelle CLI ausprobieren

```shell
pnpm run c4ml -- check examples/draft/hello-context.c4ml
pnpm run c4ml -- render examples/draft/hello-context.c4ml --output build/example
```

Die CLI ist nützlich, aber weiterhin experimentell und noch kein separat
veröffentlichtes Paket. Aktuelle Fähigkeiten und Plattformdetails beschreiben
die [Projekt-README](../../README.de.md), das
[Benutzerhandbuch](user-guide.md) sowie die Installationsanleitungen für
[Linux](install-linux.md) und [Windows](install-windows.md).

## Checkliste für Maintainer vor einer Veröffentlichung

Vor einer Änderung der Repository-Sichtbarkeit oder dem ersten öffentlichen
Source-Tag:

1. `pnpm audit --prod`, `pnpm run check` und `git diff --check` ausführen;
2. alle erreichbaren Branches, Tags, Actions-Protokolle und Git-Commits auf
   Inhalte prüfen, die nicht öffentlich werden dürfen;
3. sicherstellen, dass veröffentlichte Maintainer-Commits die GitHub-Adresse
   `noreply` verwenden;
4. sicherstellen, dass historische Pull-Request-Refs keine ersetzten
   Commit-Metadaten offenlegen; der schreibgeschützte GitHub-Namensraum
   `refs/pull/*` verlangt ein sauberes öffentliches Repository oder eine
   bestätigte Löschung durch den GitHub-Support;
5. die dokumentierte Annahme veralteter lokaler Host-Nachweise in der
   veröffentlichten Historie bestätigen;
6. prüfen, dass keine überholten zusammengeführten Arbeitsbranches auf dem
   Remote verbleiben;
7. private GitHub-Sicherheitsmeldungen aktivieren und Branch-/Ruleset-Schutz
   nach der Sichtbarkeitsänderung wiederherstellen;
8. einen Clone über die öffentliche HTTPS-Adresse auf einem sauberen Rechner
   prüfen; und
9. den Source-Tag nur vom geprüften `main`-Commit erzeugen.
