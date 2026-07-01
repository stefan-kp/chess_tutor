# Code-Review chess_tutor

Kompromissloser Architektur- und Security-Review der Next.js 16 / React 19
Schach-Tutor-App (chess.js, stockfish.js, react-chessboard, Google Gemini).
Alle Funde sind am Code verifiziert (Datei:Zeile). Sortiert nach Kritikalität.

> Stand: 2026-07-01. Zeilennummern beziehen sich auf den Stand des Branches
> `claude/source-code-review-doq7sj`.

## Executive Summary

Zwei Cluster dominieren das Risiko:

1. **Betreiber-Key & offene LLM-/Compute-Proxies.** Der Gemini-Key ist als
   `NEXT_PUBLIC_*` konfiguriert und landet im Client-Bundle sowie in der
   Docker-Image-Metadata (K1). Sämtliche server-key-nutzenden bzw.
   rechenintensiven API-Routen (LLM, Stockfish) sind ohne Auth, ohne
   Rate-Limiting und ohne Payload-Limit erreichbar (K2, H1, H2, H4) → direkte
   Kosten- und DoS-Exposition.
2. **Fehlerhafte Analyse-Kernlogik.** Die Evaluationen werden doppelt
   perspektivisch invertiert, wodurch cpLoss und die gesamte
   Blunder-/Taktik-Klassifikation systematisch falsch sind (K3) — ein Unit-Test
   zementiert den Fehler sogar.

Dazu kommen mehrere React-State-Races (Undo/Deviation/Opponent-Move),
Worker-Leaks und ~2.500 Zeilen toter Code.

---

## KRITISCH

### K1 — Betreiber-Gemini-Key wird ins Client-Bundle und Docker-Image kompiliert
`Dockerfile:24-25`, `src/lib/apiKeyHelper.ts:44`, `src/components/APIKeyInput.tsx:12`, README (mehrfach)

`NEXT_PUBLIC_GEMINI_API_KEY` wird von Next.js zur Buildzeit in das öffentliche
JS-Bundle geinlined; das README dokumentiert genau diese Variable als DEN Weg,
den Key zu setzen. Jeder Besucher kann ihn per DevTools/Bundle extrahieren und
auf Kosten des Betreibers nutzen. `ENV NEXT_PUBLIC_GEMINI_API_KEY=...` verewigt
ihn zusätzlich in der Image-Metadata (`docker inspect`) und in jedem Layer.

**Fix:** Auf serverseitiges `GEMINI_API_KEY` umstellen (nur zur Laufzeit per
Env, nie als Build-ARG), LLM-Aufrufe ausschließlich über authentifizierte,
ratelimitierte Server-Routen; `ARG/ENV NEXT_PUBLIC_GEMINI_API_KEY` aus dem
Dockerfile entfernen.

### K2 — `/api/v1/llm/opening-explanation`: unauthentifizierter LLM-Proxy mit frei wählbarem Prompt
`src/app/api/v1/llm/opening-explanation/route.ts:19-27,54-65`

Nutzt `process.env.GEMINI_API_KEY` (Server-Key) ohne Auth, Rate-Limiting oder
Payload-Limit. Der `prompt` kommt ungefiltert vom Client; `systemInstruction`
ist rein advisorisch → beliebiger Gemini-Relay per `curl`. `maxOutputTokens: 150`
begrenzt nur den Output, der Input ist unbegrenzt (reale Kosten pro Request).

**Fix:** Prompt serverseitig aus validierten Feldern (`moveSan`, `category`, …)
bauen statt Freitext anzunehmen; Längenlimit (z. B. Body ≤ 4 KB → 413);
Rate-Limiting pro IP; Origin-Check.

### K3 — Doppelte Perspektiven-Invertierung → cpLoss/Blunder-Klassifikation systematisch falsch
`src/lib/gameState.ts:80-83`, `src/lib/gameAnalysis.ts:30-31,74-76`

`Stockfish.evaluate()` normalisiert Scores bereits auf Weiß-Perspektive
(`src/lib/stockfish.ts:124-133`, ebenso `src/lib/server/stockfishEngine.ts`).
`buildMoveHistoryItem` behandelt sie aber als „relativ zum Zugrecht" und
invertiert erneut:

```ts
const evalAfterPlayerMove = isWhite ? -p1Eval.score : p1Eval.score;
const cpLoss = evalBefore - evalAfterPlayerMove;   // = p0 + p1 für Weiß
```

Für Weiß ergibt sich `cpLoss = p0 + p1` statt `p0 − p1`. Ein korrekter Zug in
+300-Stellung (danach +300) liefert cpLoss = 600 → „Blunder"; echte Blunder in
Verluststellungen werden maskiert. Propagiert in `detectMissedTactics`, in die
LLM-Prompts und die Game-Over-Analyse. Der Unit-Test zementiert den Bug
(`src/lib/__tests__/gameState.test.ts:33-47`: p0=80, p1=20 → erwartet 100 statt 60).

**Fix:** `const evalAfterPlayerMove = isWhite ? p1Eval.score : -p1Eval.score;`
(analog in `gameAnalysis.ts`); eine einzige Perspektiv-Konvention zentral
dokumentieren; Test korrigieren.

### K4 — Spielergebnis ignoriert Spielerfarbe → Schwarz-Spieler bekommen falsches Ergebnis
`src/components/ChessGame.tsx:313-324`, `src/components/GameOverModal.tsx:238-241`

Bei Schachmatt wird der Ergebnistext allein aus `game.turn()` abgeleitet
(`turn()==='w'` → „You lost"). Spielt der User Schwarz und gewinnt, zeigt die App
„You lost" — während der Sound daneben (der `playerColor` korrekt nutzt) die
Sieg-Fanfare spielt. `GameOverModal` verstärkt es: `winner === "White"` →
„Victory!" (hartkodierte Annahme Spieler = Weiß, kein `playerColor`-Prop).

**Fix:** `playerColor` an `GameOverModal` durchreichen; Ergebnis aus
`winner === playerColor` ableiten.

---

## HOCH

### H1 — `/api/v1/stockfish`: CPU-DoS, `multiPV` ungekappt, keine Concurrency-Limits
`src/app/api/v1/stockfish/route.ts:45-49`, `src/lib/server/stockfishEngine.ts:37-39`

`depth` wird auf 30 gekappt (bereits sehr teuer), `multiPV` nur auf `> 0` geprüft,
**nicht gekappt** → `{"multiPV": 500}` wird 1:1 als `setoption name MultiPV value 500`
gereicht. Jeder Request spawnt einen eigenen Worker (kein Pool/Queue/Limit), kein
Rate-Limiting, `docker-compose.yml` ohne CPU-/Memory-Limits. 100 parallele POSTs
legen den Container lahm.

**Fix:** `const safeMultiPV = Math.min(Math.trunc(parsedMultiPV), 3);`; globales
Semaphor (max. 2 gleichzeitige Evaluierungen, Rest 429); `deploy.resources.limits`
in compose; Rate-Limiting.

### H2 — Kein Auth-/Rate-Limiting-Konzept; `/api/v1/llm/chat` als offener BYOK-Proxy
Alle Routen unter `src/app/api/`, speziell `src/app/api/v1/llm/chat/route.ts:42-63`

Keine Middleware, kein Token, kein IP-Limit. Die Chat-Route nimmt `apiKey` +
`modelName` aus dem Body → der Server ist ein anonymer Relay, mit dem gestohlene
Keys validiert/abgefahren werden können (Missbrauch läuft über die
IP-Reputation des Betreibers). nginx-Beispiel hat Rate-Limiting nur
auskommentiert (`nginx.conf.example:94-95`).

**Fix:** Mind. IP-basiertes Rate-Limiting (Middleware oder nginx `limit_req`),
Origin-/Referer-Prüfung für BYOK-Routen.

### H3 — Fehlende Timeouts/Payload-Limits in Wikipedia- und Chat-Route
`src/app/api/v1/wikipedia/summary/route.ts:9-93`, `src/app/api/v1/llm/chat/route.ts:28-71`

Wikipedia-Route: kein `AbortSignal.timeout` auf beiden `fetch`, keine
Parameter-Längenbegrenzung, `console.log` mit rohem User-Input (Log-Injection
über `\n`), kein Rate-Limiting → Slowloris/Scraping-Proxy. Chat-Route: keine
`maxDuration`, kein Timeout um `chat.sendMessage`, `history`/`message` ohne
Größenlimit, `modelName` ohne Allowlist-Abgleich → Megabyte-History und teure
Modelle erzwingbar.

**Fix:** `AbortSignal.timeout(5000)`/`maxDuration` setzen; Parameter- und
History-Limits; `modelName` gegen Allowlist prüfen; strukturiertes Logging.

### H4 — Stale-`evalP0`-Race verfälscht Historie, cpLoss und Taktik-Erkennung
`src/components/ChessGame.tsx:412-417,446-452,480-511`

`onDrop` verlangt nur, dass *irgendein* `evalP0` existiert, prüft aber nicht, ob
es zur aktuellen Stellung gehört, und setzt es nach dem Zug nie zurück. Bei
schnellen Zügen wird `evalBeforePlayerMove`/`bestMoveUci` einer alten Stellung
mit der frischen FEN kombiniert → falsche cpLoss/Blunder-Werte.

**Fix:** `evalP0` zusammen mit der FEN speichern (`{fen, eval}`) und
`evalP0.fen === gameRef.current.fen()` verlangen bzw. nach jedem Zug auf `null`.

### H5 — Undo während laufender Analyse korrumpiert Brett und Historie
`src/components/ChessGame.tsx:767-779`

Der Undo-Button (a) kürzt `moveHistory` nicht → dauerhafte Desynchronisation,
(b) macht bedingungslos zwei `undo()` (falsch, wenn der Computer noch nicht
gezogen hat), (c) bricht die laufende `onDrop`-Pipeline nicht ab: der per
`setTimeout(…,500)` geplante Computerzug wird nach dem Undo trotzdem angewendet,
wenn zufällig legal. Der tote Hook `useChessGame.ts:260-290,398-412` löst genau
das mit `activeAnalysisIdRef` — der Fix wurde geschrieben, aber nie eingebaut.

### H6 — Opening-Trainer: kein Zugrecht-Check + keine Cancellation asynchroner Gegnerzüge
`src/lib/openingTrainer/sessionOrchestrator.ts:41-102,108-170`, `src/lib/openingTrainer/sessionReducer.ts:283-308`, `src/contexts/OpeningTrainingContext.tsx:134-161`

`processUserMove`/`makeMove` validieren nur Legalität, nicht wessen Zug ist.
Während der 600-ms-Verzögerung des Auto-Gegnerzugs kann der User eine
gegnerische Figur ziehen. `OPPONENT_MOVE_COMPLETED` wird bedingungslos an
`moveHistory` angehängt (keine Phase-/Positionsprüfung); navigiert der User
zurück, wird der auf alter FEN berechnete Zug trotzdem appliziert. Der Guard
`pendingOpponentMove` ist wirkungslos: `OPPONENT_MOVE_QUEUED` wird nirgends
dispatcht (tote Action) → im StrictMode doppelter Gegnerzug.

**Fix:** `OPPONENT_MOVE_QUEUED` synchron vor dem `await` dispatchen; im Reducer
`OPPONENT_MOVE_COMPLETED` nur in Phase `opponent_turn` und bei passender
Vorgänger-FEN akzeptieren; in `makeMove` `isUserTurn()` prüfen.

### H7 — Engine-Worker-Leak im OpeningTrainingContext (stale Closure im Cleanup)
`src/contexts/OpeningTrainingContext.tsx:97-118`

`useEffect` mit `[]`-Deps; das Cleanup referenziert die State-Variable
`stockfish`, die in dieser Closure immer `null` ist → `terminate()` läuft nie.
`orchestrator.destroy()` terminiert bewusst nicht. Jeder Unmount (jede
Navigation zwischen Eröffnungen) leakt einen Stockfish-WebWorker; im StrictMode
sofort zwei Engines.

**Fix:** Engine in lokaler Variable/Ref des Effekts halten und diese im Cleanup
terminieren.

### H8 — `Stockfish`: kein Evaluations-Timeout + serielle Queue → ein Hänger blockiert alles
`src/lib/stockfish.ts:56-138`

`waitUntilReady` hat 5s-Timeout, die Evaluation selbst **keinen**. Antwortet der
Worker nie mit `bestmove` (Crash, ungültiges FEN, Terminierung während Suche),
bleibt das Promise offen — und da `evaluationQueue` alles serialisiert, hängen
danach **alle** künftigen Evaluationen. `terminate()` nullt weder `worker` noch
`isReady`; ein `evaluate()` danach postet in einen toten Worker und hängt ewig.

**Fix:** Timeout pro Evaluation (reject + Listener entfernen); in `terminate()`
`worker=null`, offene Promises rejecten.

### H9 — `getUserColor`: ECO-Buchstabe ≠ Farbe → falsche Seiten-/Orientierungszuweisung
`src/lib/openingTrainer/gameLogic.ts:272-275` (Duplikate in `repertoireNavigation.ts:166-169`, `OpeningTrainer.tsx:163-165`, `FamilySelector.tsx:31-45`)

Heuristik „A,B,C = Weiß; D,E = Schwarz" ist schachlich unhaltbar: Französisch
(C00), Sizilianisch (B20), Caro-Kann (B12) sind Schwarz-Verteidigungen →
Nutzer trainiert Weiß; Damengambit (D06) ist Weiß-Eröffnung → Nutzer bekommt
Schwarz. Die gesamte Zugrecht-/Automove-Logik hängt daran. Die dreifach
duplizierte Heuristik ist zusätzliches Wartungsrisiko.

**Fix:** Trainingsseite explizit pro Eröffnung in den Metadaten hinterlegen.

### H10 — `RemoteEngine`: falsche URL-Priorität — Mobile-Build ruft tote API
`src/lib/engine/RemoteEngine.ts:25-28`

`config.apiUrl || window.location.origin || NEXT_PUBLIC_API_URL || localhost`.
Im Browser ist `window.location.origin` immer truthy → env-Variable nie
erreichbar. Der dokumentierte Capacitor-Fall ruft dann
`capacitor://localhost/api/v1/stockfish` — dort existiert keine API.

**Fix:** `config.apiUrl || process.env.NEXT_PUBLIC_API_URL || window.location.origin`.

### H11 — `classifyMove` nutzt `Math.abs(evalChange)` ohne Farbbezug
`src/lib/openingTrainer/gameLogic.ts:234-249` (Duplikat `moveValidator.ts:33-51`)

`evalChange` ist Weiß-Perspektive, wird aber als Absolutwert als „cpLoss"
genommen. Ein starker Zug des schwarzen Nutzers (−300 zu seinen Gunsten) wird
als `weak` klassifiziert. Mate-Scores (score=0 bei `mate != null`) werden zudem
ignoriert.

**Fix:** Vorzeichenbehafteten Verlust aus Nutzerfarbe:
`const cpLoss = userColor === 'white' ? -evalChange : evalChange;`.

### H12 — `playerMove.ply` existiert in chess.js 1.4.0 nicht → `moveNumber = NaN`
`src/lib/gameState.ts:95`

`Math.ceil(playerMove.ply / 2)` — die `Move`-Klasse von chess.js@1.4.0 hat kein
`ply`. `npx tsc --noEmit` schlägt fehl (TS2339); zur Laufzeit ist der Wert
`undefined` → `NaN` in der Game-Over-Analyse („Move NaN").

**Fix:** `moveNumber` vom Aufrufer / aus `game.moveNumber()` ableiten;
Typecheck in CI erzwingen (siehe H13).

### H13 — Produktivcode kompiliert nicht (strict TS), Typecheck nicht in CI
`src/lib/gameImport.ts:133,135-136` (u. a.)

`game.uuid || game.url` → `string | undefined`; `game.white.username` auf
optional deklariertem `white?` (TS18048). Next 16 baut ohne Typecheck; zur
Laufzeit wirft ein Chess.com-Game ohne `white` einen TypeError, der im `catch`
das Spiel still verwirft. Insgesamt ≥6 Produktiv-Typfehler.

**Fix:** `game.white?.username ?? headers.White ?? 'Unknown'`,
`id: game.uuid ?? game.url ?? crypto.randomUUID()`; `tsc --noEmit` in CI.

### H14 — ~9,4 MB Eröffnungs-JSON statisch ins Client-Bundle importiert
`src/lib/openings.ts:1-6`, `src/lib/openingTrainer/openingLoader.ts:2-6`

ecoA–E + `moveIndex.json` (zusammen ~8,9 MB; Index allein 4,6 MB / 12.377 Keys)
landen im First-Load-JS jeder Seite, die `useChessGame`/OpeningTrainer nutzt.
Die Dateien liegen zusätzlich in `public/` (doppelte Auslieferung).

**Fix:** Zur Laufzeit per `fetch` aus `public/` lazy laden oder Index
serverseitig halten; mindestens `moveIndex.json` aus dem statischen Import
entfernen.

---

## MITTEL

- **M1 — Deviation-Dialog Endlosschleife.** `OpeningTrainer.tsx:107-114,268-272`:
  `handleContinueExploring` setzt nur `showDeviationDialog=false`,
  `deviationMoveIndex` bleibt → Effekt öffnet den Dialog sofort wieder. Zusatz:
  `session===null` → `undefined !== null` triggert Timer vor Init.
- **M2 — Keine Unterverwandlungs-Auswahl.** `ChessGame.tsx:419-423`,
  `OpeningTrainer.tsx:196-201`, `tactics/[pattern]/page.tsx:238-242`:
  `promotion:"q"` hartkodiert; Lichess-Puzzles mit Unterverwandlung scheitern
  zwangsläufig (UCI-Vergleich matcht `…n` nie).
- **M3 — Stale-State bei Schwierigkeitswechsel.** `tactics/[pattern]/page.tsx:422-460`:
  `setDifficulty('medium'); loadNewExercise();` — `loadNewExercise` liest
  `difficulty` aus alter Closure → erstes Puzzle hat alte Schwierigkeit.
- **M4 — `key={fen}`/`key={currentPosition}` erzwingt Chessboard-Remount pro Zug.**
  `tactics/[pattern]/page.tsx:562`, `OpeningTrainer.tsx:490`: Animation wirkungslos,
  Drags brechen ab, unnötige Renderkosten.
- **M5 — Settings: Speichern durch Consent-Checkbox dauerhaft blockiert.**
  `settings/page.tsx:23,29-34`: `consentGiven` startet immer `false`, auch bei
  längst gespeichertem Key.
- **M6 — Analysis-Kommentar-Effekt verwirft laufende LLM-Antworten & sendet doppelt.**
  `analysis/page.tsx:313-393`: Re-run bei jeder `stepDetails`/`comments`-Änderung →
  Cancel-and-Retry doppelt Kosten und Chat-Kontext.
- **M7 — Tutor-Chat wird beim async Wikipedia-Load komplett zurückgesetzt.**
  `Tutor.tsx:311,290-309`: `startChat` hängt an `wikipediaSummary`; Verlauf geht
  verloren, doppelter Gemini-Call, kein Cleanup/Cancellation.
- **M8 — Tutor: Opening-/Resignation-Kontextnachricht mehrfach gesendet.**
  `Tutor.tsx:948-999,902-945`: `currentFen` in Deps + schwacher Guard → jeder Zug
  triggert teuren Kontext-Prompt erneut.
- **M9 — Falsche Referenz-Evaluation nach Rück-Navigation.**
  `sessionOrchestrator.ts:61,201-214`: `getPreviousEvaluation` nimmt immer den
  letzten History-Eintrag, auch bei `wasNavigatedBack` → Baseline verstärkt K3/H11.
- **M10 — Session-Persistenz-Key = ECO-Code (nicht eindeutig).**
  `sessionManager.ts:45,69`: viele Varianten teilen einen ECO → Sessions
  überschreiben sich; falsche Historie geladen.
- **M11 — MultiPV-Parser kaputt & „klebrig".** `stockfish.ts:77-91,113-115`:
  Info-Parser filtert `multipv N`-Zeilen nicht; `MultiPV` wird nie auf 1
  zurückgesetzt. Latent, aber tickende Falle.
- **M12 — Engine-Eval-Cache ignoriert Suchtiefe, „LRU" ist FIFO.**
  `engineService.ts:13,30-57`: Key nur FEN → depth-12-Wert für depth-20-Anfrage.
- **M13 — `lookupPossibleOpenings`: Vollscan über 12.377 Keys pro Zug.**
  `openings.ts:95-108`: `Object.entries` + `startsWith`, `ourPly` je Treffer neu.
  Aufgerufen nach jedem Zug/Navigationsschritt → Präfix-Trie/Map nötig.
- **M14 — `tacticalLibrary.squaresAttackedBy` semantisch inkonsistent je Zugrecht.**
  `tacticalLibrary.ts:298-311`: Für die Seite am Zug werden legale Züge als
  „Angriffe" gewertet → `detectOverloading` blind, `detectFork` asymmetrisch.
- **M15 — Doppelter Footer & hartkodierte Sprache auf Imprint/Privacy.**
  `layout.tsx:36` + `imprint/page.tsx:32`/`privacy/page.tsx:56`; `Header language="en"`.
- **M16 — Massiv hartkodierte englische Strings** trotz vollständigem i18n
  (5 Sprachen): `GameOverModal`, `GameImportModal`, `GameAnalysisModal`,
  Taktik-Seite, `settings/page.tsx`, Ergebnistexte in `ChessGame.tsx:315-330`.
- **M17 — ~2.500 Zeilen toter Code.** Nie importiert: `useChessGame.ts`,
  `useTutorChat.ts`, `useAnalysisSession.ts`, `OpeningTrainingContext.old.tsx`,
  `APIKeyInput.tsx`, `ErrorBoundary.tsx` (→ Hauptspiel hat **keine** Error
  Boundary), `OpeningSelector.tsx`, `MoveFeedback.tsx`, `repertoireNavigation.ts`,
  `feedbackGenerator.ts`; tote Reducer-Actions (`OPPONENT_MOVE_QUEUED`,
  `DEVIATION_DETECTED`, `WIKIPEDIA_LOADED`).
- **M18 — Doppelter Fallback-Bug in opening-explanation.**
  `opening-explanation/route.ts:93-104`: `request.json()` im `catch` erneut
  gelesen (Body verbraucht) → parametrisierter Fallback nie erreicht (toter Zweig).
- **M19 — Docker: aufgeblähtes Image, Runtime-Fetches im Entrypoint.**
  `Dockerfile:12-13,55-62` (dev-`node_modules` + Python-Toolchain ins
  Runtime-Image, hebelt `output:'standalone'` aus); `scripts/docker-entrypoint.sh:25-38`
  (Wikipedia-Fetch + `tsx` beim Start).
- **M20 — Compose-Healthcheck prüft `/` statt `/api/health`** und erwartet
  strikt 200 → flappt bei Redirect. `docker-compose.yml:23-28`.
- **M21 — Fehlende Security-Header** (kein CSP/X-Frame-Options/nosniff im aktiven
  Pfad). `next.config.ts` ohne `headers()`, `nginx.conf.example:63-66` nur im
  auskommentierten HTTPS-Block. Relevant, da API-Keys im localStorage.

---

## NIEDRIG (Auswahl)

- **N1 — Check-Sound & Stalemate-Text unerreichbar.** `ChessGame.tsx:307-336`:
  `inCheck()`-Zweig liegt in `isGameOver()`; `isDraw()` deckt Stalemate mit ab →
  Patt als „Draw!".
- **N2 — Puzzle-Lösung in der Browser-Konsole.** `tactics/[pattern]/page.tsx:115-119,307-313`
  loggt die Lösung jedes Puzzles offen in die DevTools.
- **N3 — `deviationMoveIndex || …` — 0 ist falsy.** `OpeningTrainer.tsx:255,258`:
  Abweichung am ersten Zug (`===0`) fällt auf volle History-Länge zurück; `??` nutzen.
- **N4 — Modals ohne `role="dialog"`/Fokus-Trap/ESC**, klickbare `div`s ohne
  Tastatur-Handler (diverse Komponenten) — Accessibility.
- **N5 — Fehlende Cancellation & Doppel-Fetch bei Wikipedia** (`OpeningTrainer.tsx:121-138`,
  `WikipediaSummary.tsx:21-46`): Out-of-order/`setState` nach Unmount.
- **N6 — StrictMode-Doppel-Requests** (`OpeningsModal.tsx:50-111`) ohne In-Flight-Ref.
- **N7 — Debug-`console.log` in Produktion** (OpeningTrainingContext, ChessGame,
  Tutor); `console.error(error)` mit vollem Fehlerobjekt in API-Routen.
- **N8 — God-Components:** `Tutor.tsx` (1113 Z.), `ChessGame.tsx` (1030 Z.),
  `analysis/page.tsx` (829 Z.); kein Code-Splitting/`next/dynamic`.
- **N9 — `chessFormatDetector` verlangt exakt 6 FEN-Felder** → gängige 4-Feld-FENs
  (EPD/Lichess) als `invalid` abgelehnt; Castling-Regex akzeptiert Duplikate.
- **N10 — `savedGames.ts` ohne SSR-Guard** (`localStorage`-Zugriff ungeschützt).
- **N11 — Modellnamen über drei Stellen inkonsistent** (`gemini-1.5-flash` vs.
  `2.5-flash` vs. `3-pro-preview`); `getAvailableModels` unnötig `async`.

---

## Abhängigkeiten (npm audit, prod)

- **tar ≤ 7.5.15 (hoch):** mehrere Path-Traversal/Symlink-CVEs, transitiv über
  `@capacitor/cli`. `uuid@13.0.0 (moderate):` fehlender Buffer-Bounds-Check.
  `npm audit fix` verfügbar.

---

## Positiv hervorzuheben

- Stockfish-Route validiert FEN via chess.js und kappt `depth`;
  `stockfishEngine.ts` hat einen 15s-Timeout mit sauberem Cleanup.
- `personalities`-Route liefert bewusst nur ein „safe subset" ohne `systemPrompt`.
- Dockerfile nutzt einen non-root User und einen funktionierenden Healthcheck
  auf `/api/health`; CI setzt den Build-ARG des Keys explizit leer.
- LLM-Ausgaben laufen ausschließlich durch `ReactMarkdown` ohne `rehype-raw`
  (HTML wird escaped) → **kein XSS im Frontend gefunden**.
