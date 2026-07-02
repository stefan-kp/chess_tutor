import { Personality } from "./personalities";
import { StockfishEvaluation } from "./stockfish";
import { SupportedLanguage } from "./i18n/translations";

export type SavedGame = {
    id: string;
    fen: string;
    pgn?: string;
    selectedPersonality: Personality;
    playerColor: "white" | "black";
    updatedAt: number;
    evaluation?: Pick<StockfishEvaluation, "score" | "mate" | "depth"> | null;
    language?: SupportedLanguage;
};

const STORAGE_KEY = "chess_tutor_saves";
const LEGACY_KEY = "chess_tutor_save";
// Cap the number of persisted games so the list cannot grow without bound and
// blow the localStorage quota (each game carries a full PGN + personality).
const MAX_SAVED_GAMES = 50;

const isValidSavedGame = (game: unknown): game is SavedGame =>
    !!game &&
    typeof game === "object" &&
    typeof (game as SavedGame).id === "string" &&
    typeof (game as SavedGame).fen === "string" &&
    typeof (game as SavedGame).updatedAt === "number" &&
    !!(game as SavedGame).selectedPersonality;

const parseSavedGames = (): SavedGame[] => {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    try {
        const data = JSON.parse(raw);
        if (!Array.isArray(data)) return [];
        return data.filter(isValidSavedGame).map((game) => {
            if ("apiKey" in game) {
                const safeGame = { ...(game as SavedGame & { apiKey?: string | null }) };
                delete safeGame.apiKey;
                return safeGame;
            }
            return game;
        });
    } catch (e) {
        console.error("Failed to parse saved games", e);
        return [];
    }
};

const persistSavedGames = (games: SavedGame[]) => {
    try {
        // Keep only the most recent games within the cap.
        const trimmed = [...games]
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .slice(0, MAX_SAVED_GAMES);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
        // QuotaExceededError etc. must not bubble up and unmount the app.
        console.error("Failed to persist saved games", e);
    }
};

const loadLegacySave = (): SavedGame[] => {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (!legacy) return [];

    try {
        const parsed = JSON.parse(legacy);
        if (parsed && parsed.fen && parsed.selectedPersonality) {
            const legacyGame: SavedGame = {
                id: parsed.id || `legacy-${Date.now()}`,
                fen: parsed.fen,
                pgn: parsed.pgn,
                selectedPersonality: parsed.selectedPersonality,
                playerColor: parsed.playerColor || "white",
                updatedAt: parsed.updatedAt || Date.now(),
                evaluation: parsed.evaluation || null,
            };
            return [legacyGame];
        }
    } catch (e) {
        console.error("Failed to migrate legacy save", e);
    }

    return [];
};

export const loadSavedGames = (): SavedGame[] => {
    const existing = parseSavedGames();
    if (existing.length > 0) {
        return existing.sort((a, b) => b.updatedAt - a.updatedAt);
    }

    const legacy = loadLegacySave();
    if (legacy.length > 0) {
        persistSavedGames(legacy);
        localStorage.removeItem(LEGACY_KEY);
        return legacy.sort((a, b) => b.updatedAt - a.updatedAt);
    }

    return [];
};

export const upsertSavedGame = (game: SavedGame) => {
    const games = parseSavedGames();
    const index = games.findIndex(g => g.id === game.id);
    const updatedGames = index >= 0
        ? games.map(g => (g.id === game.id ? game : g))
        : [...games, game];

    persistSavedGames(updatedGames);
};

export const deleteSavedGame = (id: string) => {
    const games = parseSavedGames().filter(g => g.id !== id);
    persistSavedGames(games);
};
