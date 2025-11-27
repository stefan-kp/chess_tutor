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
    apiKey?: string | null;
};

const STORAGE_KEY = "chess_tutor_saves";
const LEGACY_KEY = "chess_tutor_save";

const parseSavedGames = (): SavedGame[] => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    try {
        const data = JSON.parse(raw);
        if (!Array.isArray(data)) return [];
        return data.filter(Boolean);
    } catch (e) {
        console.error("Failed to parse saved games", e);
        return [];
    }
};

const persistSavedGames = (games: SavedGame[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
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
