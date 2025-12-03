# Stockfish API (v1)

## Welche Informationen brauchen wir?

Der bestehende Code nutzt Stockfish überall dort, wo Spielzüge validiert, bewertet oder nachträglich analysiert werden. Die zentralen Datenpunkte sind:

- **Best move & ponder**: Wird verwendet, um die Computerzüge auszuführen und verpasste Taktiken zu erkennen. Beispiel: Im laufenden Spiel wird der aus `bestMove` abgeleitete Zug sofort gespielt und für Taktikvergleiche gespeichert.【F:src/components/ChessGame.tsx†L448-L517】【F:src/lib/stockfish.ts†L1-L58】
- **Stellungsbewertung (score in Centipawns) & Mattdistanz**: Dient zur Bewertungsanzeige, Berechnung des CP-Verlusts und zum Speichern der Analysehistorie.【F:src/components/ChessGame.tsx†L486-L517】【F:src/app/analysis/page.tsx†L82-L113】
- **Suchtiefe**: Wird gespeichert, um die Qualität der Bewertung anzuzeigen und später wiederzugeben (z.B. in der Historie und bei Analysevergleichen).【F:src/lib/stockfish.ts†L1-L58】【F:src/components/ChessGame.tsx†L290-L305】

Damit lassen sich alle bestehenden Features abdecken: Live-Zugempfehlungen, Move-History mit CP-Loss, Taktik-Erkennung und die schrittweise Analyse importierter Partien.

## API-Endpoint

- **POST `/api/v1/stockfish`**
  - **Body**: `{ fen: string, depth?: number, multiPV?: number }`
    - `fen` – obligatorisch, aktuelle Stellung.
    - `depth` – optional (Standard: 15), Suchtiefe für Stockfish.
    - `multiPV` – optional (Standard: 1), Anzahl der Varianten; aktuell wird die Hauptvariante zurückgegeben.
  - **Response**: `{ evaluation: { bestMove: string, ponder: string | null, score: number, mate: number | null, depth: number } }`
    - `score` und `mate` sind aus Weiß-Perspektive normalisiert, passend zum bestehenden Frontend-Verhalten.【F:src/lib/server/stockfishEngine.ts†L60-L97】

Der Endpunkt kapselt den Stockfish-Worker serverseitig und liefert exakt die Daten, die das Frontend heute schon für Züge, Taktikerkennung und Analyse benötigt. Damit kann die React-Native-App die gleiche Engine-Funktionalität per HTTP nutzen.
