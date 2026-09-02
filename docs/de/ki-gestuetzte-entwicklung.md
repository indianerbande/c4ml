# Vibe Coding mit fachlicher Verantwortung

[English](../en/ai-assisted-development.md) | [Deutsch](ki-gestuetzte-entwicklung.md)

Status: Erklärung zur Entwicklung des Projekts

Datum: 2026-09-02

**C4thedral wurde gevibed.** Wesentliche Teile des Projekts entstanden im
Dialog mit KI-Coding-Agenten: Ziele, Grenzen und Beobachtungen wurden in
natürlicher Sprache formuliert; Agenten untersuchten das Repository, schlugen
Änderungen vor oder setzten sie um, führten Prüfungen aus und verfeinerten das
Ergebnis anhand von Rückmeldungen.

Diese Aussage ist weder eine Entschuldigung noch die Behauptung, Fachwissen sei
überflüssig geworden. Sie beschreibt eine Entwicklungsmethode, bei der
erfahrene menschliche Führung und die Umsetzungskapazität von KI einander
verstärken.

## Was wir unter Vibe Coding verstehen

Der Begriff wird unterschiedlich verwendet. In seiner strengsten Bedeutung
kann er heißen, generierten Code zu übernehmen, ohne seine Implementierung
ernsthaft zu beachten. In der breiteren professionellen Bedeutung bezeichnet
er dialogische KI-Unterstützung, bei der ein Mensch das Ergebnis weiterhin
prüft, testet, versteht und verantwortet. [Google Cloud unterscheidet diese
beiden Formen ausdrücklich](https://cloud.google.com/discover/what-is-vibe-coding),
und [GitHub beschreibt den Ablauf](https://github.com/resources/articles/what-is-vibe-coding)
als wiederholten Zyklus aus Anweisen, Formen, Testen und Prüfen.

C4thedral verwendet die zweite Bedeutung. Wir lehnen es ausdrücklich ab, Code
nur deshalb zu akzeptieren, weil er plausibel aussieht, einmal läuft oder
schnell erzeugt wurde. Der Dialog beschleunigt die Umsetzung; er ersetzt keine
Softwareentwicklung.

## Warum wir so arbeiten

Für erfahrene Entwickler oder Architekten entstehen konkrete Vorteile:

- **Mehr Aufmerksamkeit für Architektur und Absicht.** Natürliche Sprache
  transportiert Verhalten, Grenzen und Abwägungen, während der Agent viel
  mechanische Umsetzung übernimmt. GitHub und
  [SAP](https://www.sap.com/germany/resources/what-is-vibe-coding) beschreiben
  die Verschiebung von Wiederholung und Syntax zu Logik, Architektur und
  Nutzerbedürfnissen.
- **Schnellere ausführbare Rückmeldung.** Ideen werden früh zu laufenden
  Kandidaten. Ein Experte kann reales Verhalten beurteilen, statt zu lange nur
  über abstrakte Möglichkeiten zu sprechen.
- **Günstigere Erkundung.** Mehrere Lösungswege, Adaptergrenzen oder
  Oberflächenvarianten können ausprobiert und verworfen werden. Die früheren
  technischen Spikes von C4thedral sind ein Beispiel: Ihre brauchbaren
  Ergebnisse wanderten in Produktionspakete; die Wegwerfimplementierungen
  wurden entfernt.
- **Weniger Wiederholungsarbeit.** Grundgerüste, einfache Transformationen,
  Testfälle, Dokumentationslinks und breite mechanische Refactorings lassen
  sich schnell erzeugen und anschließend als zusammenhängende Änderung prüfen.
- **Weniger störende Kontextwechsel.** Der Agent kann Code, Spezifikationen,
  Testfehler und Dokumentation in einem durchgehenden Ablauf untersuchen; der
  Mensch bleibt beim Problem und bei der Entscheidung.
- **Sichereres großflächiges Refactoring bei vorhandenen Nachweisen.** Eine
  starke Testbasis gibt schnelle Rückmeldung, wenn Pakete, Namen oder Grenzen
  verändert werden. Tests beweisen Qualität nicht allein, machen breite
  Änderungen aber wesentlich sichtbarer.

Das Ergebnis ist Hebelwirkung: Eine erfahrene Person kann eine größere
Umsetzungsfläche führen und prüfen, ohne so zu tun, als sei generierte Ausgabe
bereits ein fertiges Produkt.

## Fachwissen ist die Voraussetzung

Vibe Coding vervielfacht das Urteilsvermögen, das man hineinsteckt. Es kann
schlechtes Urteilsvermögen ebenso wirkungsvoll vervielfachen wie gutes.

Wer produktive Arbeit führt, muss:

- Architektur, Invarianten, Abnahmekriterien und sichere Grenzen festlegen;
- Lösungen erkennen, die nur überzeugend aussehen;
- generierten Code lesen, debuggen, refaktorieren und verwerfen können;
- Domäne und eingesetzten Technologiestack verstehen;
- Folgen für Sicherheit, Abhängigkeiten, Lizenzen und Wartbarkeit beurteilen;
  und
- erkennen, wann automatische Nachweise nicht genügen und native oder visuelle
  Prüfung erforderlich ist.

Red Hats Beitrag über
[Vibe Coding und spezifikationsgetriebene Entwicklung](https://developers.redhat.com/articles/2026/02/17/uncomfortable-truth-about-vibe-coding)
benennt die zentrale Grenze: Code zu erzeugen und nachhaltige Software zu bauen
sind unterschiedliche Aufgaben; auch detaillierte Spezifikationen benötigen
technisches Verständnis. SAP warnt ebenfalls davor, dass plausible Ergebnisse
ohne Geschäftskontext, Kontrollen und Review in realen Umgebungen scheitern
können.

Ein Anfänger kann mit Vibe Coding lernen oder Prototypen bauen. Ein produktives
Projekt benötigt weiterhin jemanden, der technisch qualifiziert ist, jedes
übernommene Ergebnis zu verantworten.

## Wie C4thedral die Verantwortung beim Menschen hält

Der C4thedral-Prozess ist um diese Verantwortung gebaut:

1. `docs/engineering/specification.md` definiert Produktverhalten und
   Architekturgrenzen außerhalb des Gesprächs.
2. `docs/engineering/testing.md` definiert die notwendigen Nachweise.
3. Der Quelltext bleibt maßgeblich – nicht ein Chatprotokoll oder versteckter
   Agentenzustand.
4. Compilerkern, Adapter, Desktop-Berechtigungen und Rendering sind durch
   ausdrückliche Verträge getrennt.
5. Änderungen werden als Diffs geprüft und durch Build, Typprüfung, Tests,
   Public-Source-Hygiene, Abhängigkeitskontrollen sowie spezialisierte
   Architektur-, Worker-, Editor- und Desktop-Gates validiert.
6. Renderingänderungen benötigen Sichtprüfung; native Paketierung und
   sicherheitsrelevantes Verhalten benötigen Nachweise auf der Zielplattform.
7. Abhängigkeiten werden nach Fähigkeit, Lizenz, Laufzeitwirkung,
   Offline-Verhalten, Austauschgrenze und schützenden Tests akzeptiert – nicht
   nach Neuigkeitswert.
8. Umsetzung, automatische Validierung, visuelle oder native Prüfung, Commit
   und Veröffentlichung werden als getrennte Zustände berichtet.

Ein Agent darf einen großen Teil einer Änderung umsetzen, aber diese
Anforderungen nicht absenken. Bestandene Tests sind notwendige Nachweise, kein
Ersatz für Architekturverständnis und Ergebnisprüfung.

## Was KI hier besonders gut beschleunigt

Innerhalb dieser Leitplanken war KI-Unterstützung besonders nützlich für:

- die Überführung detaillierter Architekturverträge in kleine portable
  Schnittstellen;
- wiederholende Adapter und Testmatrizen;
- die Abstimmung von CLI-, Worker- und Desktop-Verhalten;
- das Nachziehen einer Änderung durch Code, Tests, Paketprüfungen und
  Dokumentation;
- schnelle Alternativen, sodass schwache Ansätze früh verworfen werden können;
  und
- die Pflege vollständiger deutscher und englischer Dokumentation mit
  automatischer Paritäts- und Linkprüfung.

Diese Vorteile entstehen, weil das Projekt bereits klare Grenzen besitzt und
weil die ausführende Person die Ergebnisse bewerten kann. Dieselben Prompts
ohne dieses Wissen böten nicht dieselbe Sicherheit.

## Was diese Aussage nicht behauptet

- KI-Ausgabe ist nicht korrekt, nur weil sie kompiliert.
- Automatische Tests decken nicht jeden Bedien-, Sicherheits-, Paketierungs-
  oder Architekturfehler ab.
- Menschliche Verantwortung, Review und Wartung werden nicht an ein Modell
  delegiert.
- Schnelle Umsetzung ist kein Nachweis der Produktionsreife.
- Vibe Coding eignet sich nicht für ungeprüfte Änderungen an sicherheits-,
  finanz-, datenschutz-, compliance- oder anderweitig kritischem Verhalten.

Die Aussage ist enger und belastbarer: Dialogische KI ist ein starker
Engineering-Multiplikator, wenn eine erfahrene Person die Architektur führt,
das Ergebnis versteht und auf ausdrücklichen Nachweisen besteht.

## Weiterlesen

- [Google Cloud: What is vibe coding?](https://cloud.google.com/discover/what-is-vibe-coding)
- [GitHub: What is vibe coding?](https://github.com/resources/articles/what-is-vibe-coding)
- [SAP: Was ist Vibe Coding?](https://www.sap.com/germany/resources/what-is-vibe-coding)
- [Red Hat Developer: The uncomfortable truth about vibe coding](https://developers.redhat.com/articles/2026/02/17/uncomfortable-truth-about-vibe-coding)
