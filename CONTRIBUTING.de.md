# An C4thedral mitwirken

[English](CONTRIBUTING.md) | [Deutsch](CONTRIBUTING.de.md)

Danke, dass du C4thedral und C4ML verbessern möchtest. Das Projekt ist eine
öffentliche Source-Beta: Nutzbare Funktionen sind implementiert, aber die
Kompatibilitätszusage für die Sprache und einige Frontend-Verträge bleiben
bewusst vorläufig. Den aktuellen Reifegrad und die Veröffentlichungsgrenzen
beschreibt der [Projektstatus](docs/de/project-status.md).

## Bevor du beginnst

Eröffne zuerst ein Issue, bevor du viel Arbeit in eine weitreichende Änderung
an Sprache, Architektur, Abhängigkeiten oder Benutzeroberfläche investierst.
Die [Spezifikation](docs/engineering/specification.md) definiert das akzeptierte
Produktverhalten; die [Testanforderungen](docs/engineering/testing.md) legen die
nötigen Nachweise fest. Syntax im [Benutzerhandbuch](docs/de/user-guide.md) und
in `examples/draft` ist eine Vorschau und keine Kompatibilitätszusage.

C4thedral muss ein eigenständiges System bleiben. Beschreibe andere Produkte
nur anhand allgemeiner Fähigkeiten oder Grenzen. Kopiere weder deren Code,
Grammatik, Dokumentation, Beispiele, Themes, Icons, Testdaten noch
Oberflächenlayouts.

## Entwicklungsumgebung

Verwende Node.js 24.15.0 oder eine neuere 24.x-Version sowie pnpm 11.24.0. Folge
der Anleitung [Aus dem Quellcode bauen](docs/de/build-from-source.md). Führe
vor einem Pull Request Folgendes aus:

```shell
pnpm install --frozen-lockfile
pnpm run check
git diff --check
```

Änderungen am Rendering erfordern zusätzlich eine Sichtprüfung der bewusst
geänderten Ausgabe. Änderungen an nativen Paketen benötigen die betroffenen
betriebssystemspezifischen Prüfungen aus der
[Plattformmatrix](docs/de/platforms.md) und den
[Testanforderungen](docs/engineering/testing.md).

## Pull Requests

Halte jeden Pull Request fokussiert und beschreibe:

- das sichtbare oder architektonische Problem;
- die maßgebliche Spezifikationsgrenze;
- Auswirkungen auf Implementierung und Adapter;
- automatische und visuelle Nachweise; sowie
- bewusst zurückgestellte Arbeiten.

Committe keine erzeugten Build-Ausgaben, Zugangsdaten, vertraulichen
Architekturquellen oder lokalen Rechnerpfade. Änderungen an Abhängigkeiten
müssen dem Update-Gate in der
[Abhängigkeitsdokumentation](docs/engineering/dependencies.md) folgen;
automatische Update-Pull-Requests werden niemals allein wegen einer höheren
Versionsnummer zusammengeführt.

KI-gestützte Beiträge sind willkommen. Der Beitragende bleibt dafür
verantwortlich, den eingereichten Code zu verstehen, Architektur- und
Eigenständigkeitsgrenzen zu schützen, den vollständigen Diff zu prüfen und
dieselben Nachweise wie für von Hand getippten Code zu liefern. Siehe
[Vibe Coding mit fachlicher Verantwortung](docs/de/ki-gestuetzte-entwicklung.md).

Mit dem Einreichen eines Beitrags zur Aufnahme erklärst du dich damit
einverstanden, dass er gemäß den Beitragsbedingungen unter der Apache License
2.0 dieses Repositories lizenziert wird.
