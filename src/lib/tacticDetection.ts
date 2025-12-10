import { Chess, Piece, Square } from "chess.js";

export type TacticType =
  | "win_piece"
  | "win_pawn"
  | "pin"
  | "fork"
  | "skewer"
  | "check"
  | "hanging_piece"
  | "none";

export type DetectedTactic = {
  tactic_type: TacticType;
  affected_squares?: Square[];
  piece_roles?: string[];
  material_delta?: number;
  move: string; // SAN of the best move
};

export interface TacticDetectionInput {
  fen: string;
  playerColor: "white" | "black";
  playerMoveSan: string;
  bestMoveUci: string;
  cpLoss?: number;
  evalLossThreshold?: number;
}

const PIECE_VALUES: Record<Piece["type"], number> = {
  p: 100,
  n: 300,
  b: 300,
  r: 500,
  q: 900,
  k: 10000,
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

function coordsToSquare(file: number, rank: number): Square | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return `${FILES[file]}${rank + 1}` as Square;
}

function squareToCoords(square: Square): { file: number; rank: number } {
  return { file: FILES.indexOf(square[0] as (typeof FILES)[number]), rank: parseInt(square[1]) - 1 };
}

function describePiece(piece: Piece | null): string | null {
  if (!piece) return null;
  const color = piece.color === "w" ? "white" : "black";
  const nameMap: Record<Piece["type"], string> = {
    p: "pawn",
    n: "knight",
    b: "bishop",
    r: "rook",
    q: "queen",
    k: "king",
  };
  return `${color} ${nameMap[piece.type]}`;
}

function uciToMove(uci: string) {
  return {
    from: uci.substring(0, 2),
    to: uci.substring(2, 4),
    promotion: uci.length > 4 ? uci.substring(4, 5) : undefined,
  };
}

export function uciToSan(fen: string, uci: string): string | null {
  try {
    const chess = new Chess(fen);
    const move = chess.move(uciToMove(uci));
    return move ? move.san : null;
  } catch (error) {
    return null;
  }
}

function collectAttacks(chess: Chess, color: "white" | "black") {
  const attackers = new Map<Square, Square[]>();
  const squares: Square[] = [];

  for (let file = 0; file < 8; file++) {
    for (let rank = 0; rank < 8; rank++) {
      const square = coordsToSquare(file, rank);
      if (!square) continue;
      const piece = chess.get(square);
      if (piece && piece.color === (color === "white" ? "w" : "b")) {
        squares.push(square);
      }
    }
  }

  for (const square of squares) {
    for (const target of attackedSquaresFromPiece(chess, square)) {
      if (!attackers.has(target)) attackers.set(target, []);
      attackers.get(target)!.push(square);
    }
  }

  return attackers;
}

function attackedSquaresFromPiece(chess: Chess, square: Square): Square[] {
  const piece = chess.get(square);
  if (!piece) return [];
  const attacks: Square[] = [];
  const deltas = {
    n: [
      [1, 2],
      [2, 1],
      [2, -1],
      [1, -2],
      [-1, -2],
      [-2, -1],
      [-2, 1],
      [-1, 2],
    ],
    k: [
      [1, 1],
      [1, 0],
      [1, -1],
      [0, 1],
      [0, -1],
      [-1, 1],
      [-1, 0],
      [-1, -1],
    ],
  } as const;

  const colorForward = piece.color === "w" ? 1 : -1;
  const { file, rank } = squareToCoords(square);

  if (piece.type === "n" || piece.type === "k") {
    for (const [df, dr] of deltas[piece.type]) {
      const target = coordsToSquare(file + df, rank + dr);
      if (target) attacks.push(target);
    }
    return attacks;
  }

  if (piece.type === "p") {
    for (const df of [-1, 1]) {
      const target = coordsToSquare(file + df, rank + colorForward);
      if (target) attacks.push(target);
    }
    return attacks;
  }

  const directions: number[][] = [];
  if (piece.type === "b" || piece.type === "q") {
    directions.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
  }
  if (piece.type === "r" || piece.type === "q") {
    directions.push([1, 0], [-1, 0], [0, 1], [0, -1]);
  }

  for (const [df, dr] of directions) {
    let step = 1;
    while (true) {
      const target = coordsToSquare(file + df * step, rank + dr * step);
      if (!target) break;
      attacks.push(target);
      const occupier = chess.get(target);
      if (occupier) break;
      step++;
    }
  }

  return attacks;
}

function detectCheck(chessAfter: Chess): DetectedTactic[] {
  if (chessAfter.inCheck()) {
    const lastMove = chessAfter.history({ verbose: true }).slice(-1)[0];
    const moveSan = lastMove?.san ?? "";
    return [
      {
        tactic_type: "check",
        affected_squares: lastMove?.to ? [lastMove.to as Square] : undefined,
        piece_roles: lastMove?.piece ? [describePiece({ color: lastMove.color, type: lastMove.piece } as Piece)!] : undefined,
        move: moveSan,
      },
    ];
  }
  return [];
}

function detectCapture(chessAfter: Chess, moveSan: string, cpThreshold: number): DetectedTactic[] {
  const lastMove = chessAfter.history({ verbose: true }).slice(-1)[0];
  if (!lastMove || !lastMove.captured) return [];

  const capturedValue = PIECE_VALUES[lastMove.captured as Piece["type"]];
  if (capturedValue < cpThreshold) return [];

  // Conservative safety: ensure opponent has no immediate legal capture on the landing square
  const immediateCounter = chessAfter.moves({ verbose: true }).filter(m => m.to === lastMove.to && m.flags.includes("c"));
  if (immediateCounter.length > 0) return [];

  const tactic: DetectedTactic = {
    tactic_type: capturedValue > 100 ? "win_piece" : "win_pawn",
    affected_squares: lastMove.to ? [lastMove.to as Square] : undefined,
    piece_roles: [
      describePiece({ color: lastMove.color, type: lastMove.piece } as Piece)!,
      describePiece({ color: lastMove.color === "w" ? "b" : "w", type: lastMove.captured } as Piece)!,
    ],
    material_delta: capturedValue,
    move: moveSan,
  };

  return [tactic];
}

function detectPinsAndSkewers(chessAfter: Chess, moverColor: "white" | "black", moveSan: string): DetectedTactic[] {
  const results: DetectedTactic[] = [];
  const mover = moverColor === "white" ? "w" : "b";
  const opponent = moverColor === "white" ? "b" : "w";
  const slidingTypes: Piece["type"][] = ["b", "r", "q"];
  const directions: Record<Piece["type"], number[][]> = {
    b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
    r: [[1, 0], [-1, 0], [0, 1], [0, -1]],
    q: [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]],
    n: [],
    k: [],
    p: [],
  };

  for (const file of FILES) {
    for (let rank = 1; rank <= 8; rank++) {
      const square = `${file}${rank}` as Square;
      const piece = chessAfter.get(square);
      if (!piece || piece.color !== mover || !slidingTypes.includes(piece.type)) continue;

      for (const [df, dr] of directions[piece.type]) {
        let step = 1;
        let firstBlocked: { square: Square; piece: Piece } | null = null;
        let secondBlocked: { square: Square; piece: Piece } | null = null;
        const baseFile = FILES.indexOf(file);
        const baseRank = rank - 1;

        while (true) {
          const next = coordsToSquare(baseFile + df * step, baseRank + dr * step);
          if (!next) break;
          const occupier = chessAfter.get(next);
          if (occupier) {
            if (!firstBlocked) {
              firstBlocked = { square: next, piece: occupier };
            } else {
              secondBlocked = { square: next, piece: occupier };
              break;
            }
          }
          step++;
        }

        if (!firstBlocked || !secondBlocked) continue;

        if (firstBlocked.piece.color === opponent && secondBlocked.piece.color === opponent) {
          const firstValue = PIECE_VALUES[firstBlocked.piece.type];
          const secondValue = PIECE_VALUES[secondBlocked.piece.type];

          if (secondBlocked.piece.type === "k" || secondValue > firstValue) {
            results.push({
              tactic_type: "pin",
              affected_squares: [firstBlocked.square, secondBlocked.square],
              piece_roles: [describePiece(piece)!, describePiece(firstBlocked.piece)!, describePiece(secondBlocked.piece)!],
              move: moveSan,
            });
          } else if (firstValue > secondValue && firstValue >= 500) {
            results.push({
              tactic_type: "skewer",
              affected_squares: [firstBlocked.square, secondBlocked.square],
              piece_roles: [describePiece(piece)!, describePiece(firstBlocked.piece)!, describePiece(secondBlocked.piece)!],
              move: moveSan,
            });
          }
        }
      }
    }
  }

  return results;
}

function detectFork(chessAfter: Chess, moverColor: "white" | "black", moveSan: string): DetectedTactic[] {
  const lastMove = chessAfter.history({ verbose: true }).slice(-1)[0];
  if (!lastMove?.to) return [];
  const targetSquare = lastMove.to as Square;
  const mover = moverColor === "white" ? "w" : "b";
  const attackedSquares = attackedSquaresFromPiece(chessAfter, targetSquare);
  const threatenedValuables = attackedSquares
    .map(square => ({ square, piece: chessAfter.get(square) }))
    .filter(item => item.piece && item.piece.color !== mover)
    .map(item => ({ square: item.square, piece: item.piece as Piece, value: PIECE_VALUES[(item.piece as Piece).type] }))
    .filter(item => item.value >= 300)
    .sort((a, b) => b.value - a.value);
  if (threatenedValuables.length < 2) return [];

  const pieceDescriptions = threatenedValuables.slice(0, 2).map(v => describePiece(v.piece)!).filter(Boolean);
  return [
    {
      tactic_type: "fork",
      affected_squares: threatenedValuables.slice(0, 2).map(v => v.square),
      piece_roles: pieceDescriptions,
      move: moveSan,
    },
  ];
}

function detectHangingPieces(chessAfter: Chess, moverColor: "white" | "black", moveSan: string): DetectedTactic[] {
  const moverAttackers = collectAttacks(chessAfter, moverColor);
  const opponentColor = moverColor === "white" ? "black" : "white";
  const opponentAttackers = collectAttacks(chessAfter, opponentColor);
  const results: DetectedTactic[] = [];

  for (const [square, attackers] of moverAttackers) {
    const targetPiece = chessAfter.get(square);
    if (!targetPiece || targetPiece.color === (moverColor === "white" ? "w" : "b")) continue;

    const defenders = opponentAttackers.get(square) || [];
    if (attackers.length > 0 && defenders.length === 0) {
      results.push({
        tactic_type: "hanging_piece",
        affected_squares: [square],
        piece_roles: [describePiece(targetPiece)!],
        material_delta: PIECE_VALUES[targetPiece.type],
        move: moveSan,
      });
    }
  }

  return results;
}

export function detectMissedTactics({
  fen,
  playerColor,
  playerMoveSan,
  bestMoveUci,
  cpLoss,
  evalLossThreshold = 50,
}: TacticDetectionInput): DetectedTactic[] {
  if (cpLoss !== undefined && cpLoss < evalLossThreshold) return [];

  const bestMoveSan = uciToSan(fen, bestMoveUci);
  if (!bestMoveSan || bestMoveSan === playerMoveSan) return [];

  const chess = new Chess(fen);
  const move = chess.move(uciToMove(bestMoveUci));
  if (!move) return [];

  const chessAfter = chess; // already has move applied
  const detectionResults: DetectedTactic[] = [];

  detectionResults.push(...detectCapture(chessAfter, move.san, 50));
  detectionResults.push(...detectCheck(chessAfter));
  detectionResults.push(...detectPinsAndSkewers(chessAfter, playerColor, move.san));
  detectionResults.push(...detectFork(chessAfter, playerColor, move.san));
  detectionResults.push(...detectHangingPieces(chessAfter, playerColor, move.san));

  // Return empty array if no tactics detected (cleaner than returning "none" type)
  return detectionResults;
}

/**
 * Helper function to check if tactics were detected.
 * Use this instead of checking array length to ensure type safety.
 */
export function hasTactics(tactics: DetectedTactic[] | null | undefined): boolean {
  return tactics != null && tactics.length > 0;
}

/**
 * Filter out "none" type tactics for backward compatibility with old data.
 * New code should use empty arrays, but this handles legacy data.
 */
export function filterMeaningfulTactics(tactics: DetectedTactic[] | null | undefined): DetectedTactic[] {
  if (!tactics) return [];
  return tactics.filter(t => t.tactic_type !== "none");
}
