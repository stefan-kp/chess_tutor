import { Chess, Move } from "chess.js";

import { OpeningMetadata } from "@/lib/openings";
import { StockfishEvaluation } from "@/lib/stockfish";
import { detectMissedTactics, uciToSan, DetectedTactic } from "@/lib/tacticDetection";
import { MoveHistoryItem } from "@/components/GameOverModal";

const PIECE_VALUES: Record<string, number> = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 0,
};

export type CapturedState = {
    whitePiecesLost: string[];
    blackPiecesLost: string[];
    whiteLostScore: number;
    blackLostScore: number;
};

export function getCapturedState(game: Chess): CapturedState {
    const history = game.history({ verbose: true });
    const whitePiecesLost: string[] = [];
    const blackPiecesLost: string[] = [];
    let whiteLostScore = 0;
    let blackLostScore = 0;

    history.forEach((move) => {
        if (!move.captured) return;

        if (move.color === "w") {
            blackPiecesLost.push(move.captured);
            blackLostScore += PIECE_VALUES[move.captured] || 0;
            return;
        }

        whitePiecesLost.push(move.captured);
        whiteLostScore += PIECE_VALUES[move.captured] || 0;
    });

    return {
        whitePiecesLost,
        blackPiecesLost,
        whiteLostScore,
        blackLostScore,
    };
}

interface BuildMoveHistoryItemArgs {
    computerMove: Move;
    evalP0: StockfishEvaluation;
    fenAfterComputerMove: string;
    fenBeforePlayerMove: string;
    openingData: OpeningMetadata[];
    p1Eval: StockfishEvaluation;
    p2Eval: StockfishEvaluation;
    playerColor: "white" | "black";
    playerMove: Move;
}

export function buildMoveHistoryItem(args: BuildMoveHistoryItemArgs): {
    historyItem: MoveHistoryItem;
    missedTactics: DetectedTactic[];
} {
    const {
        computerMove,
        evalP0,
        fenAfterComputerMove,
        fenBeforePlayerMove,
        openingData,
        p1Eval,
        p2Eval,
        playerColor,
        playerMove,
    } = args;

    const isWhite = playerColor === "white";
    // evalP0/p1Eval scores are already normalized to White's perspective by
    // Stockfish.evaluate(); cpLoss is how much the player's own eval dropped.
    const cpLoss = isWhite
        ? evalP0.score - p1Eval.score
        : p1Eval.score - evalP0.score;
    const bestMoveSan = uciToSan(fenBeforePlayerMove, evalP0.bestMove);
    const missedTactics = detectMissedTactics({
        fen: fenBeforePlayerMove,
        playerColor,
        playerMoveSan: playerMove.san,
        bestMoveUci: evalP0.bestMove,
        cpLoss,
    });

    return {
        historyItem: {
            moveNumber: parseInt(playerMove.before.split(" ")[5], 10) || 1,
            playerMove: playerMove.san,
            playerColor,
            fenBeforePlayerMove,
            evalBeforePlayerMove: evalP0,
            fenAfterPlayerMove: playerMove.after,
            evalAfterPlayerMove: p1Eval,
            computerMove: computerMove.san,
            fenAfterComputerMove,
            evalAfterComputerMove: p2Eval,
            opening: openingData.length > 0 ? openingData[0].name : undefined,
            move: playerMove.san,
            evalBefore: evalP0.score,
            evalAfter: p1Eval.score,
            bestMove: evalP0.bestMove,
            bestMoveSan,
            cpLoss,
            missedTactics,
        },
        missedTactics,
    };
}

