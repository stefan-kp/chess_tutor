import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import ChessGame from "./ChessGame";

// Mock dependencies
jest.mock("react-chessboard", () => ({
    Chessboard: ({ options }: any) => (
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
    return {
        Stockfish: jest.fn().mockImplementation(() => ({
            evaluate: jest.fn().mockResolvedValue({
                score: 0.5,
                mate: null,
                bestMove: "e7e5",
                depth: 15
            }),
            terminate: jest.fn(),
        })),
    };
});

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
    GameOverModal: () => <div data-testid="game-over-modal">Game Over Modal Mock</div>,
}));

jest.mock("./StartScreen", () => ({
    __esModule: true,
    default: ({ onStartGame }: { onStartGame: (options: any) => void }) => (
        <div data-testid="start-screen">
            <button onClick={() => onStartGame({ personality: { name: 'Test Personality' }, color: 'white' })}>
                Start Game
            </button>
        </div>
    ),
}));


describe("ChessGame Component", () => {
    const mockPersonality = {
        name: "Test Personality",
        systemPrompt: "You are a helpful assistant.",
        image: "🤖",
    };

    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
        jest.useFakeTimers();
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
        const Tutor = require('./Tutor').Tutor;
        render(
            <ChessGame
                gameId="test-game"
                initialPersonality={mockPersonality}
                initialColor="white"
                onBack={() => {}}
            />
        );

        const initialCalls = Tutor.mock.calls.length;

        // Make a move by clicking the mock chessboard
        await act(async () => {
            fireEvent.click(screen.getByTestId("chessboard"));
            jest.runAllTimers();
        });


        // Wait for the component to update
        await waitFor(() => {
            expect(Tutor.mock.calls.length).toBeGreaterThan(initialCalls);
        });
    });
});
