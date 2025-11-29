import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DebugProvider } from "@/contexts/DebugContext";

jest.mock("next/navigation", () => ({
    useRouter: jest.fn(() => ({
        push: jest.fn(),
        replace: jest.fn(),
        back: jest.fn(),
    })),
}));

jest.mock("react-chessboard", () => ({
    Chessboard: ({ position }: { position: string }) => (
        <div data-testid="chessboard" data-fen={position} />
    ),
}));

jest.mock("@/lib/stockfish", () => {
    const stockfishInstance = {
        evaluate: jest.fn(),
        terminate: jest.fn(),
    };
    const Stockfish = jest.fn(() => stockfishInstance);
    return {
        __esModule: true,
        Stockfish,
        __mock: { stockfishInstance },
    };
});

jest.mock("@/lib/tacticDetection", () => {
    const detectMissedTactics = jest.fn();
    const uciToSan = jest.fn();
    return {
        __esModule: true,
        detectMissedTactics,
        uciToSan,
        __mock: { detectMissedTactics, uciToSan },
    };
});

const { __mock: stockfishMocks } = jest.requireMock("@/lib/stockfish") as {
    __mock: { stockfishInstance: { evaluate: jest.Mock; terminate: jest.Mock } };
};
const { __mock: tacticMocks } = jest.requireMock("@/lib/tacticDetection") as {
    __mock: { detectMissedTactics: jest.Mock; uciToSan: jest.Mock };
};

const evaluateMock = stockfishMocks.stockfishInstance.evaluate;
const detectMissedTacticsMock = tacticMocks.detectMissedTactics;
const uciToSanMock = tacticMocks.uciToSan;

import AnalysisPage from "../page";

describe("AnalysisPage", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        evaluateMock.mockImplementation((fen: string) => {
            const sideToMove = fen.split(" ")[1];
            const baseEval = sideToMove === "w" ? 0 : 50;
            return Promise.resolve({
                bestMove: "e2e4",
                ponder: null,
                score: baseEval,
                mate: null,
                depth: 12,
            });
        });
        detectMissedTacticsMock.mockReturnValue([]);
        uciToSanMock.mockReturnValue("e4");
    });

    const samplePgn = `
[Event "Casual Game"]
[Site "Berlin GER"]
[Date "1852.??.??"]
[Round "?"]
[White "Adolf Anderssen"]
[Black "Jean Dufresne"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6
`;

    const loadGame = () => {
        render(
            <DebugProvider>
                <AnalysisPage />
            </DebugProvider>
        );
        const textarea = screen.getByPlaceholderText(/Paste PGN or FEN here/i);
        fireEvent.change(textarea, { target: { value: samplePgn } });
        fireEvent.click(screen.getByText(/Start Analysis/i));
    };

    it("replays PGN moves with engine evaluations", async () => {
        loadGame();

        fireEvent.click(screen.getByLabelText(/Next Move/i));

        await waitFor(() => {
            expect(screen.getByText(/Move 1 \/ 6/)).toBeInTheDocument();
            expect(screen.getByText("+0.50")).toBeInTheDocument();
            expect(screen.getByText("-0.50")).toBeInTheDocument();
            expect(screen.getAllByText("e4")[0]).toBeInTheDocument();
        });

        expect(detectMissedTacticsMock).toHaveBeenCalled();
        expect(uciToSanMock).toHaveBeenCalledWith(expect.any(String), "e2e4");
    });

    it("surfaces detected tactics with material context", async () => {
        detectMissedTacticsMock.mockReturnValue([
            {
                tactic_type: "fork",
                affected_squares: ["e5"],
                material_delta: 300,
                piece_roles: ["white knight"],
                move: "Nf3",
            },
        ]);

        loadGame();
        fireEvent.click(screen.getByLabelText(/Next Move/i));

        await waitFor(() => {
            expect(screen.getByText(/fork \(~3.0 pawns\) on e5/)).toBeInTheDocument();
        });
    });

    it("shows an error when the notation cannot be parsed", () => {
        render(
            <DebugProvider>
                <AnalysisPage />
            </DebugProvider>
        );
        const textarea = screen.getByPlaceholderText(/Paste PGN or FEN here/i);
        fireEvent.change(textarea, { target: { value: "invalid" } });
        fireEvent.click(screen.getByText(/Start Analysis/i));

        expect(
            screen.getByText(
                "Could not load that PGN or FEN. Please check the notation."
            )
        ).toBeInTheDocument();
    });
});
