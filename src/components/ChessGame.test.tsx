import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import ChessGame from "./ChessGame";
import { Chess } from "chess.js";

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
    Tutor: ({ currentFen, userMove, computerMove, evalP0, evalP2, openingData, language }: any) => (
        <div data-testid="tutor">
            Tutor Mock (Fen: {currentFen})
            {userMove && <span>User Move: {userMove.san}</span>}
            {computerMove && <span>Computer Move: {computerMove.san}</span>}
            {evalP0 && <span>Eval P0: {evalP0.score}</span>}
            {evalP2 && <span>Eval P2: {evalP2.score}</span>}
            {openingData && <span>Opening: {openingData.name}</span>}
            <span>Language: {language}</span>
        </div>
    ),
}));

// Mock APIKeyInput to avoid portal issues or complex interactions if needed, 
// but since we integrated it into the start screen, we can test the interaction directly.
APIKeyInput: ({ onKeySubmit }: any) => (
    <button onClick={() => onKeySubmit("test-key")} data-testid="api-key-trigger">
        Set API Key
    </button>
),
}));

jest.mock("./GameAnalysisModal", () => ({
    GameAnalysisModal: () => <div data-testid="analysis-modal">Analysis Modal Mock</div>,
}));

jest.mock("./GameOverModal", () => ({
    GameOverModal: () => <div data-testid="game-over-modal">Game Over Modal Mock</div>,
}));

describe("ChessGame Component", () => {
    beforeEach(() => {
        localStorage.clear();
        jest.clearAllMocks();
    });

    it("renders the start screen initially", () => {
        render(<ChessGame />);
        expect(screen.getByText("Chess Tutor AI")).toBeInTheDocument();
        expect(screen.getByText("1. Settings")).toBeInTheDocument();
        expect(screen.getByText("2. Start Game")).toBeInTheDocument();
    });

    it("starts the game after entering API key and selecting a personality", async () => {
        render(<ChessGame />);

        // 1. Enter API Key
        const keyInput = screen.getByPlaceholderText("AIzaSy...");
        fireEvent.change(keyInput, { target: { value: "test-api-key" } });

        // 2. Select Personality (now enabled)
        fireEvent.click(screen.getByText("Drunk Russian GM"));

        await waitFor(() => {
            expect(screen.getByTestId("chessboard")).toBeInTheDocument();
            expect(screen.getByTestId("tutor")).toBeInTheDocument();
        });
    });

    it("handles user move and triggers analysis", async () => {
        render(<ChessGame />);

        // 1. Enter API Key
        const keyInput = screen.getByPlaceholderText("AIzaSy...");
        fireEvent.change(keyInput, { target: { value: "test-api-key" } });

        // 2. Select Personality
        fireEvent.click(screen.getByText("Drunk Russian GM"));

        await waitFor(() => screen.getByTestId("chessboard"));

        // Make a move
        fireEvent.click(screen.getByTestId("chessboard"));

        // Wait for analysis and computer move
        await waitFor(() => {
            expect(screen.getByText(/User Move:/)).toBeInTheDocument();
            expect(screen.getByText(/Eval P2:/)).toBeInTheDocument();
        }, { timeout: 10000 });
    }, 15000);
});
