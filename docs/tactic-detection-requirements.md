# Taktik-Erkennungsmodul – Requirements

## Ziel und Rolle im System
- Ergänzt die vorhandene Engine- und LLM-Pipeline: wird nach der Engine-Analyse eingeschoben, bevor das LLM Feedback generiert.
- Aufgabe: Wenn der Spieler **nicht** den Engine-Bestzug gespielt hat, identifiziert das Modul, ob der Bestzug ein klassisches taktisches Motiv auslöst (z. B. Figurgewinn, Pin, Fork) und stellt diese Information strukturiert für das LLM bereit.
- Nichts bestehendes wird ersetzt; es liefert nur zusätzliche, konservative Taktik-Hinweise.

## Eingaben (pro Spielerzug)
- Ausgangsstellung als **FEN**.
- **Spielerfarbe**.
- **Gespielter Zug** des Spielers.
- **Engine-Bestzug** für die Ausgangsstellung.
- Optional: 1–2 Halbzüge der **PV** des Bestzugs (z. B. Bestzug + Antwort).
- Optional: **Eval-Infos** vor/nach dem Zug bzw. nach Bestzug, falls zur Filterung genutzt.
- Das Modul ruft selbst **keine Engine** auf; es nutzt nur bereitgestellte Daten.

## Ausgabe
- Liste erkannter Motive (leer, wenn nichts gefunden), jedes mit:
  - `tactic_type` – z. B. `win_material`, `win_pawn`, `pin`, `fork`, `skewer`, `check`, `hanging_piece`, `improve_activity`, `none`.
  - `affected_squares` – optionale Felderliste.
  - `piece_roles` – beteiligte Figuren, inkl. Farbe (z. B. „weißer Läufer“, „schwarzer Springer“).
  - `material_delta` – grobe Materialeinschätzung (Centipawns, z. B. +100 Bauer, +300 Leichtfigur).
  - `move` – der Engine-Bestzug, auf den sich das Motiv bezieht.
- Diese Struktur wird an das LLM weitergereicht, damit es textuelle Hinweise erzeugt (z. B. „Mit Lxd5 hättest du einen Bauern gewinnen können“).

## Wann das Modul aktiv wird
- Nur prüfen, wenn der Engine-Bestzug **vom gespielten Zug abweicht**.
- Optionaler Filter: Eval-Verlust über Schwellwert (z. B. >50–100 Centipawns) als Signal für Relevanz.
- Ziel: Rechenaufwand sparen und Rauschen vermeiden.

## Ablauf pro relevanter Stellung
1. **Stellung herstellen**: FEN laden, Spielerfarbe setzen.
2. **Bestzug anwenden**: Hypothetisch Engine-Bestzug ausführen.
3. **Resultierende Stellung prüfen**: Regelbasierte Checks (ohne neue Engine-Aufrufe) für taktische Muster.
4. **Motive sammeln**: Alle erkannten Motive in strukturierter Form zusammenstellen.
5. **An LLM übergeben**: Zusammen mit gespielt vs. Bestzug und ggf. Eval-Verlust.

## Taktik-Checks (konservativ)
- **Materialgewinn / Capture**
  - Prüfen, ob Bestzug eine gegnerische Figur/Bauern schlägt.
  - Figurwert bestimmen; Plausibilität, dass die schlagende Figur nicht sofort mit klarem Materialverlust verloren geht.
  - Ergebnis: `tactic_type` = `win_piece` oder `win_pawn`.
- **Pin / Fesselung**
  - Nach Bestzug: greift ein Läufer/Turm/Dame eine gegnerische Figur an, hinter der auf derselben Linie König oder wertvolle Figur steht?
  - Ergebnis: `tactic_type` = `pin`.
- **Fork / Gabel**
  - Greift die ziehende Figur gleichzeitig ≥2 wertvolle gegnerische Ziele (z. B. König+Dame, Dame+Turm, zwei Leichtfiguren)?
  - Ergebnis: `tactic_type` = `fork`.
- **Skewer**
  - Linienangriff, bei dem eine höherwertige Figur vor einer weniger wertvollen steht und nach Abzug Material fällt.
  - Ergebnis: `tactic_type` = `skewer`.
- **Schach / direkte Drohung**
  - Bestzug gibt Schach; ggf. kombinieren mit PV-Infos, wenn das Schach Materialgewinn erzwingt.
  - Ergebnis: `tactic_type` = `check` oder kombiniert mit Material-Hinweis.
- **Hanging Piece**
  - Nach Bestzug ist eine gegnerische Figur angegriffen und unzureichend gedeckt.
  - Ergebnis: `tactic_type` = `hanging_piece`.
- **Weiche Motive (optional/später)**
  - Aktivitätsverbesserung, Outpost-Kontrolle, Königssicherheit.
  - Ergebnis: `tactic_type` = `improve_activity` o. Ä.

## Qualität, Priorisierung und Konfiguration
- **Konservativ** melden: lieber weniger Motive als falsche Treffer.
- **Priorisierung** (wenn mehrere Motive): Materialgewinn > Fork > Pin > Check > positionelle Motive.
- **Konfigurierbar**: Schwellwerte für Eval-Verlust, Materialdelta, Prioritätsregeln je Spielstärke.

## Verhalten bei "nichts gefunden"
- Leere Motivliste oder `tactic_type = "none"` liefern.
- Damit kann das bestehende System weiterhin neutralere Hinweise geben (z. B. „Aktivierungschance verpasst“).

## Integrationshinweise
- Modul wird zwischen Engine-Auswertung und LLM-Ausgabe aufgerufen.
- Nutzt bereitgestellte Bestzug- und PV-Daten; keine zusätzlichen Engine-Anfragen nötig.
- Output-Format so halten, dass LLM klar referenzieren kann, was mit dem Bestzug möglich gewesen wäre.
