import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import ChessGame from "./ChessGame";
import { Tutor } from "./Tutor";

interface MockChessboardProps {
    options: {
        onPieceDrop?: (move: { sourceSquare: string; targetSquare: string | null }) => void;
    };
}

interface MockStartOptions {
    personality: { name: string };
    color: 'white' | 'black' | 'random';
}

// Mock dependencies
jest.mock("react-chessboard", () => ({
    Chessboard: ({ options }: MockChessboardProps) => (
        <div data-testid="chessboard" onClick={() => {
            // Simulate a move drop
            if (options.onPieceDrop) {
                options.onPieceDrop({ sourceSquare: "e2", targetSquare: "e4" });
            }
        }}>
            Chessboard Mock
        </div>
    ),
}));

jest.mock("../lib/stockfish", () => {
    const evaluate = jest.fn().mockResolvedValue({
        score: 0.5,
        mate: null,
        bestMove: "e7e5",
        depth: 15
    });
    return {
        __mock: { evaluate },
        Stockfish: jest.fn().mockImplementation(() => ({
            evaluate,
            terminate: jest.fn(),
        })),
    };
});
const { __mock: stockfishMock } = jest.requireMock("../lib/stockfish") as { __mock: { evaluate: jest.Mock } };

jest.mock("./Tutor", () => ({
    Tutor: jest.fn(({ currentFen, userMove, computerMove, evalP0, evalP2, openingData, language }) => (
        <div data-testid="tutor">
            Tutor Mock (Fen: {currentFen})
            {userMove && <span>User Move: {userMove.san}</span>}
            {computerMove && <span>Computer Move: {computerMove.san}</span>}
            {evalP0 && <span>Eval P0: {evalP0.score}</span>}
            {evalP2 && <span>Eval P2: {evalP2.score}</span>}
            {openingData && <span>Opening: {openingData.name}</span>}
            <span>Language: {language}</span>
        </div>
    )),
}));

jest.mock("./GameAnalysisModal", () => ({
    GameAnalysisModal: () => <div data-testid="analysis-modal">Analysis Modal Mock</div>,
}));

jest.mock("./GameOverModal", () => ({
    GameOverModal: ({ onAnalyze }: { onAnalyze: () => void }) => (
        <div data-testid="game-over-modal" onClick={onAnalyze}>Game Over Modal Mock</div>
    ),
}));

jest.mock("./StartScreen", () => ({
    __esModule: true,
    default: ({ onStartGame }: { onStartGame: (options: MockStartOptions) => void }) => (
        <div data-testid="start-screen">
            <button onClick={() => onStartGame({ personality: { name: 'Test Personality' }, color: 'white' })}>
                Start Game
            </button>
        </div>
    ),
}));


describe("ChessGame Component", () => {
    const mockPersonality = {
        id: "test",
        name: "Test Personality",
        systemPrompt: "You are a helpful assistant.",
        image: "🤖",
        description: "Test description",
    };

    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
        jest.useFakeTimers();
        stockfishMock.evaluate.mockResolvedValue({
            score: 0.5,
            mate: null,
            bestMove: "e7e5",
            depth: 15
        });
    });

    it("renders the game board and tutor", async () => {
        await act(async () => {
            render(
                <ChessGame
                    gameId="test-game"
                    initialPersonality={mockPersonality}
                    initialColor="white"
                    onBack={() => {}}
                />
            );
        });
        expect(screen.getByTestId("chessboard")).toBeInTheDocument();
        expect(screen.getByTestId("tutor")).toBeInTheDocument();
    });

    it("handles user move and triggers analysis", async () => {
        render(
            <ChessGame
                gameId="test-game"
                initialPersonality={mockPersonality}
                initialColor="white"
                onBack={() => {}}
            />
        );

        const mockedTutor = jest.mocked(Tutor);
        const initialCalls = mockedTutor.mock.calls.length;

        // Make a move by clicking the mock chessboard
        await act(async () => {
            fireEvent.click(screen.getByTestId("chessboard"));
            jest.runAllTimers();
        });


        // Wait for the component to update
        await waitFor(() => {
            expect(mockedTutor.mock.calls.length).toBeGreaterThan(initialCalls);
        });
    });

    it("restores a PGN game and persists save data without apiKey", async () => {
        await act(async () => {
            render(
                <ChessGame
                    gameId="restore-game"
                    initialPersonality={mockPersonality}
                    initialColor="white"
                    initialPgn="1. e4 e5 2. Nf3 Nc6"
                    onBack={() => {}}
                />
            );
        });

        await waitFor(() => {
            const saves = JSON.parse(localStorage.getItem("chess_tutor_saves") || "[]");
            const saved = saves.find((g: { id: string }) => g.id === "restore-game");
            expect(saved).toBeTruthy();
            expect(saved.pgn).toContain("1. e4 e5");
            expect(saved).not.toHaveProperty("apiKey");
        });
    });

    it("undoes cleanly while analysis is in flight", async () => {
        render(
            <ChessGame
                gameId="undo-game"
                initialPersonality={mockPersonality}
                initialColor="white"
                onBack={() => {}}
            />
        );

        await act(async () => {
            fireEvent.click(screen.getByTestId("chessboard"));
        });

        await act(async () => {
            fireEvent.click(screen.getByText(/undo/i));
            jest.runAllTimers();
        });

        await waitFor(() => {
            const tutor = screen.getByTestId("tutor");
            expect(tutor).not.toHaveTextContent("Computer Move:");
        });
    });

    it("ignores rapid repeated drops once the turn has switched", async () => {
        render(
            <ChessGame
                gameId="rapid-game"
                initialPersonality={mockPersonality}
                initialColor="white"
                onBack={() => {}}
            />
        );

        await waitFor(() => {
            expect(stockfishMock.evaluate).toHaveBeenCalled();
        });

        await waitFor(() => {
            expect(screen.getByTestId("tutor")).toHaveTextContent("Eval P0: 0.5");
        });

        stockfishMock.evaluate.mockClear();

        await act(async () => {
            fireEvent.click(screen.getByTestId("chessboard"));
            fireEvent.click(screen.getByTestId("chessboard"));
            jest.runAllTimers();
        });

        await waitFor(() => {
            expect(stockfishMock.evaluate.mock.calls.length).toBeGreaterThanOrEqual(1);
        });

        const playerTriggeredEvaluations = stockfishMock.evaluate.mock.calls.filter(([fen]: [string]) => typeof fen === "string");
        expect(playerTriggeredEvaluations.length).toBeLessThanOrEqual(2);
    });
});
