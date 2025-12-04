# LLM Tutor API (v1)

Die mobile App soll dieselben Tutor-Funktionen wie das Web nutzen, ohne eigene Prompts zu pflegen. Die API stellt deshalb zwei Endpunkte bereit:

## `GET /api/v1/personalities`
- Liefert die verfügbaren, vordefinierten Tutor-Charaktere.
- Response: `{ personalities: [{ id, name, description, image }] }`

## `POST /api/v1/llm/chat`
- Baut den System Prompt serverseitig (auf Basis der ausgewählten Personality) und sendet die Anfrage an Gemini.
- Body:
  - `apiKey` (**string**, Pflicht): Nutzer-Gemini-Key (Server erzeugt den System Prompt, nicht die App).
  - `personalityId` (**string**, Pflicht): Eine `id` aus `/api/v1/personalities`.
  - `language` (**string**, Pflicht): Sprache, z.B. `en`, `de`, `fr` (muss zu `SupportedLanguage` passen).
  - `playerColor` (**"white" | "black"**, Pflicht): Spielerfarbe des Users; der Tutor übernimmt die Gegenseite.
  - `message` (**string**, Pflicht): Nutzereingabe oder systemischer Trigger-Text.
  - `context` (optional): Zusätzliche Positions- und Analyseinfos, damit das LLM konkrete Hinweise geben kann.
    - **Move-Exchange-Modus** (`{ type: "move_exchange", ... }`):
      - `userMoveSan`, `tutorMoveSan`: SAN-Notation der letzten Züge.
      - `fenBeforeUser`, `fenAfterUser`, `fenAfterTutor`: Stellungs-FENs (vor/nach den Zügen).
      - `preEvaluation`, `postEvaluation`: Stockfish-Bewertungen (Score/Mate aus Weiß-Perspektive).
      - `openingCandidates`: Liste möglicher Eröffnungen (`{ name, eco? }`).
      - `missedTactics`: String-Liste zu erkannten taktischen Themen.
    - **Allgemeiner Modus**: `{ currentFen?, evaluation?, openingCandidates?, missedTactics? }`
  - `history` (optional): Bisherige Unterhaltung `{ role: "user" | "model", text }[]`; der Server ergänzt immer den System Prompt.
  - `modelName` (optional): Overrides des Default-Modells `gemini-2.5-flash`.
- Response: `{ reply: string }`

### Warum serverseitiger System Prompt?
- Nur vordefinierte Charaktere sind erlaubt (keine generischen Chats).
- Der Prompt erzwingt die Tutor-Rolle (Gegner + Coach), Sprache und Verhaltensregeln.
- Die App übergibt nur Zustand (FEN, Bewertungen, Taktiken) und User-Text; der Server kapselt die Instruktionen.
