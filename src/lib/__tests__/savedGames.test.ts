import { deleteSavedGame, loadSavedGames, upsertSavedGame } from "../savedGames";

const baseGame = {
    id: "game-1",
    fen: "8/8/8/8/8/8/8/8 w - - 0 1",
    pgn: "1. e4 e5",
    selectedPersonality: {
        id: "coach",
        name: "Coach",
        description: "A patient chess coach",
        systemPrompt: "Teach chess",
        image: "C",
    },
    playerColor: "white" as const,
    updatedAt: 100,
    evaluation: { score: 25, mate: null, depth: 12 },
    language: "en" as const,
};

describe("savedGames", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("returns an empty list for malformed persisted JSON", () => {
        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
        localStorage.setItem("chess_tutor_saves", "{broken");

        expect(loadSavedGames()).toEqual([]);
        consoleErrorSpy.mockRestore();
    });

    it("sorts saves newest first and does not persist api keys", () => {
        upsertSavedGame({
            ...baseGame,
            id: "older",
            updatedAt: 10,
        });
        upsertSavedGame({
            ...baseGame,
            id: "newer",
            updatedAt: 20,
        });

        const games = loadSavedGames();
        const persisted = JSON.parse(localStorage.getItem("chess_tutor_saves") || "[]");

        expect(games.map((game) => game.id)).toEqual(["newer", "older"]);
        expect(persisted[0]).not.toHaveProperty("apiKey");
        expect(persisted[1]).not.toHaveProperty("apiKey");
    });

    it("deletes a save by id", () => {
        upsertSavedGame(baseGame);

        deleteSavedGame(baseGame.id);

        expect(loadSavedGames()).toEqual([]);
    });
});
