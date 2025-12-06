import { Chess, Color as ChessJsColor, Move as ChessMove, Piece, Square } from "chess.js";
import gambitDefinitions from "../../fixtures/gambits.json";
import pinFixtures from "../../fixtures/tactics/pin.json";
import skewerFixtures from "../../fixtures/tactics/skewer.json";
import forkFixtures from "../../fixtures/tactics/fork.json";
import discoveredCheckFixtures from "../../fixtures/tactics/discovered_check.json";
import doubleAttackFixtures from "../../fixtures/tactics/double_attack.json";
import overloadingFixtures from "../../fixtures/tactics/overloading.json";
import backRankFixtures from "../../fixtures/tactics/back_rank_weakness.json";
import trappedPieceFixtures from "../../fixtures/tactics/trapped_piece.json";

export type Color = "white" | "black";

export interface Position {
  fen: string;
}

export interface Move {
  from: string;
  to: string;
  promotion?: "q" | "r" | "b" | "n";
}

export type TacticalPatternType =
  | "PIN"
  | "SKEWER"
  | "FORK"
  | "DISCOVERED_ATTACK"
  | "DISCOVERED_CHECK"
  | "DOUBLE_ATTACK"
  | "OVERLOADING"
  | "BACK_RANK_WEAKNESS"
  | "TRAPPED_PIECE";

export interface TacticalPattern {
  type: TacticalPatternType;
  side: Color;
  attackerSquares: string[];
  targetSquares: string[];
  keySquares?: string[];
  explanationKey?: string;
}

export interface GambleDefinition {
  id: string;
  name: string;
  ecoCodes: string[];
  side: Color;
  moveSequenceSan: string[];
}

export interface GambitMatch {
  gambitId: string;
  name: string;
  side: Color;
  matchedMoves: number;
  isExactLine: boolean;
}

export interface TacticalOpportunity {
  move: Move;
  pattern: TacticalPattern;
}

export interface TacticalRisk {
  move: Move;
  opponentPatterns: TacticalPattern[];
}

export interface TacticExerciseParams {
  patternType: TacticalPatternType;
  side: Color;
  maxDepthFromInitial?: number;
  difficulty?: 'easy' | 'medium' | 'hard';  // Difficulty filter
}

export interface PuzzleMove {
  uci: string;
  san: string;
  player: boolean;  // true if player move, false if opponent move
}

export interface TacticExercise {
  startPosition: Position;
  solutionMove: Move;  // First player move (for backward compatibility)
  resultPosition: Position;
  pattern: TacticalPattern;
  moves?: PuzzleMove[];  // Full move sequence (optional for backward compatibility)
  rating?: number;  // Puzzle difficulty rating
}

export interface GeneratedTacticPosition {
  patternType: TacticalPatternType;
  side: Color;
  initialPosition: Position;
  creatingMove: Move;
  resultingPosition: Position;
  expectedPattern: TacticalPattern;
}

export interface GenerateOptions {
  side?: Color;
  caseId?: string;
}

export interface EngineAdapter {
  evaluate(position: Position): number;
}

export interface LibraryConfig {
  engine?: EngineAdapter;
}

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const pieceValues: Record<Piece["type"], number> = { p: 100, n: 300, b: 300, r: 500, q: 900, k: 10000 } as const;
const tacticalFixtures = {
  PIN: pinFixtures,
  SKEWER: skewerFixtures,
  FORK: forkFixtures,
  DISCOVERED_CHECK: discoveredCheckFixtures,
  DISCOVERED_ATTACK: discoveredCheckFixtures,
  DOUBLE_ATTACK: doubleAttackFixtures,
  OVERLOADING: overloadingFixtures,
  BACK_RANK_WEAKNESS: backRankFixtures,
  TRAPPED_PIECE: trappedPieceFixtures,
};

type PieceInfo = { square: Square; piece: Piece };

function attackMap(chess: Chess, side: Color): Map<Square, Square[]> {
  const attacks = new Map<Square, Square[]>();
  for (const { square } of collectPieces(chess, side)) {
    const targets = squaresAttackedBy(chess, square);
    for (const target of targets) {
      if (!attacks.has(target)) attacks.set(target, []);
      attacks.get(target)!.push(square);
    }
  }
  return attacks;
}

function toChessColor(side: Color): ChessJsColor {
  return side === "white" ? "w" : "b";
}

function collectPieces(chess: Chess, side: Color): PieceInfo[] {
  const result: PieceInfo[] = [];
  chess.board().forEach((rank, rankIndex) => {
    rank.forEach((piece, fileIndex) => {
      if (piece && piece.color === toChessColor(side)) {
        const square = `${FILES[fileIndex]}${8 - rankIndex}` as Square;
        result.push({ square, piece });
      }
    });
  });
  return result;
}

function findKing(chess: Chess, side: Color): Square | null {
  const pieces = collectPieces(chess, side);
  const king = pieces.find(p => p.piece.type === "k");
  return king ? king.square : null;
}

function findAttackersOfSquare(chess: Chess, target: Square, attackingSide: Color): Square[] {
  const attackers: Square[] = [];
  const pieces = collectPieces(chess, attackingSide);
  for (const { square } of pieces) {
    const attacks = squaresAttackedBy(chess, square);
    if (attacks.includes(target)) {
      attackers.push(square);
    }
  }
  return attackers;
}

function raySquares(from: Square, df: number, dr: number): Square[] {
  const squares: Square[] = [];
  const fileIndex = FILES.indexOf(from[0] as (typeof FILES)[number]);
  const rankIndex = parseInt(from[1], 10) - 1;
  let step = 1;
  while (true) {
    const file = fileIndex + df * step;
    const rank = rankIndex + dr * step;
    if (file < 0 || file > 7 || rank < 0 || rank > 7) break;
    squares.push(`${FILES[file]}${rank + 1}` as Square);
    step++;
  }
  return squares;
}

function valuable(piece: Piece | null, threshold = 300) {
  return piece ? pieceValues[piece.type] >= threshold : false;
}

function detectPinsAndSkewers(chess: Chess, side: Color): TacticalPattern[] {
  const results: TacticalPattern[] = [];
  const opponent: Color = side === "white" ? "black" : "white";
  const sliders = collectPieces(chess, side).filter(p => ["b", "r", "q"].includes(p.piece.type));

  const directions: Record<Piece["type"], Array<[number, number]>> = {
    b: [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ],
    r: [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ],
    q: [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ],
    k: [],
    n: [],
    p: [],
  };

  for (const slider of sliders) {
    for (const [df, dr] of directions[slider.piece.type]) {
      const ray = raySquares(slider.square, df, dr);
      const seen: Array<PieceInfo & { color: Color }> = [];

      // Collect all pieces on the ray (not just first 2)
      for (const square of ray) {
        const occupier = chess.get(square);
        if (occupier) {
          seen.push({ square, piece: occupier, color: occupier.color === "w" ? "white" : "black" });
        }
      }

      // Need at least 2 pieces for a pin or skewer
      if (seen.length < 2) continue;

      // Check all pairs of opponent pieces on the ray
      for (let i = 0; i < seen.length - 1; i++) {
        const first = seen[i];

        // First piece must be opponent's
        if (first.color !== opponent) continue;

        // Find the next opponent piece after 'first'
        let second: (PieceInfo & { color: Color }) | null = null;
        for (let j = i + 1; j < seen.length; j++) {
          if (seen[j].color === opponent) {
            second = seen[j];
            break;
          }
        }

        if (!second) continue;

        const firstValue = pieceValues[first.piece.type];
        const secondValue = pieceValues[second.piece.type];

        // PIN: The second piece is the king OR more valuable than the first
        // This pins the first piece because moving it would expose the more valuable second piece
        const isPin = second.piece.type === "k" || secondValue > firstValue;

        // SKEWER: The first piece is more valuable than the second
        // This forces the first piece to move, exposing the second piece
        const isSkewer = firstValue > secondValue && firstValue >= 300;

        if (isPin) {
          results.push({
            type: "PIN",
            side,
            attackerSquares: [slider.square],
            targetSquares: [first.square],
            keySquares: [second.square]
          });
          // If we found a pin to the king, that's the most important one for this ray
          if (second.piece.type === "k") break;
        } else if (isSkewer) {
          results.push({
            type: "SKEWER",
            side,
            attackerSquares: [slider.square],
            targetSquares: [first.square, second.square]
          });
        }
      }
    }
  }
  return results;
}

function squaresAttackedBy(chess: Chess, from: Square): Square[] {
  const piece = chess.get(from);
  if (!piece) return [];

  // For pieces that aren't the current side to move, we need to calculate attacks manually
  // because chess.moves() only returns moves for the side to move
  const currentTurn = chess.turn();
  if (piece.color !== currentTurn) {
    return squaresAttackedByPiece(chess, from, piece);
  }

  const moves = chess.moves({ square: from, verbose: true }) as ChessMove[];
  return moves.map(m => m.to as Square);
}

function squaresAttackedByPiece(chess: Chess, from: Square, piece: Piece): Square[] {
  const attacks: Square[] = [];
  const fileIndex = FILES.indexOf(from[0] as (typeof FILES)[number]);
  const rankIndex = parseInt(from[1], 10) - 1;

  const trySquare = (file: number, rank: number): Square | null => {
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
    return `${FILES[file]}${rank + 1}` as Square;
  };

  switch (piece.type) {
    case "p": {
      // Pawns attack diagonally
      const direction = piece.color === "w" ? 1 : -1;
      const left = trySquare(fileIndex - 1, rankIndex + direction);
      const right = trySquare(fileIndex + 1, rankIndex + direction);
      if (left) attacks.push(left);
      if (right) attacks.push(right);
      break;
    }
    case "n": {
      // Knight moves
      const offsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
      ];
      for (const [df, dr] of offsets) {
        const sq = trySquare(fileIndex + df, rankIndex + dr);
        if (sq) attacks.push(sq);
      }
      break;
    }
    case "b": {
      // Bishop moves (diagonals)
      for (const [df, dr] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const ray = raySquares(from, df, dr);
        for (const sq of ray) {
          attacks.push(sq);
          if (chess.get(sq)) break; // Stop at first piece
        }
      }
      break;
    }
    case "r": {
      // Rook moves (straight lines)
      for (const [df, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ray = raySquares(from, df, dr);
        for (const sq of ray) {
          attacks.push(sq);
          if (chess.get(sq)) break; // Stop at first piece
        }
      }
      break;
    }
    case "q": {
      // Queen moves (diagonals + straight lines)
      for (const [df, dr] of [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ray = raySquares(from, df, dr);
        for (const sq of ray) {
          attacks.push(sq);
          if (chess.get(sq)) break; // Stop at first piece
        }
      }
      break;
    }
    case "k": {
      // King moves (one square in any direction)
      for (const [df, dr] of [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const sq = trySquare(fileIndex + df, rankIndex + dr);
        if (sq) attacks.push(sq);
      }
      break;
    }
  }

  return attacks;
}

function detectFork(chess: Chess, side: Color): TacticalPattern[] {
  const patterns: TacticalPattern[] = [];
  for (const { square } of collectPieces(chess, side)) {
    const attacks = squaresAttackedBy(chess, square);
    const valuableTargets = attacks
      .map(target => ({ target, piece: chess.get(target) }))
      .filter(item => item.piece && item.piece.color !== toChessColor(side) && valuable(item.piece))
      .sort((a, b) => pieceValues[(b.piece as Piece).type] - pieceValues[(a.piece as Piece).type]);
    if (valuableTargets.length >= 2) {
      patterns.push({
        type: "FORK",
        side,
        attackerSquares: [square],
        targetSquares: valuableTargets.slice(0, 2).map(v => v.target),
      });
    }
  }
  return patterns;
}

function detectDiscovered(chess: Chess, side: Color): TacticalPattern[] {
  const patterns: TacticalPattern[] = [];
  const sliders = collectPieces(chess, side).filter(p => ["b", "r", "q"].includes(p.piece.type));
  const opponent: Color = side === "white" ? "black" : "white";

  for (const slider of sliders) {
    const directions: Array<[number, number]> = slider.piece.type === "b"
      ? [[1, 1], [1, -1], [-1, 1], [-1, -1]]
      : slider.piece.type === "r"
        ? [[1, 0], [-1, 0], [0, 1], [0, -1]]
        : [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];

    for (const [df, dr] of directions) {
      const ray = raySquares(slider.square, df, dr);
      let blocker: Square | null = null;
      let target: Square | null = null;
      for (const sq of ray) {
        const occupier = chess.get(sq);
        if (!occupier) continue;
        if (occupier.color === toChessColor(side)) {
          blocker = sq;
        } else {
          target = sq;
          break;
        }
      }
      if (blocker && target) {
        const targetPiece = chess.get(target);
        if (!targetPiece) continue;
        const type: TacticalPatternType = targetPiece.type === "k" ? "DISCOVERED_CHECK" : "DISCOVERED_ATTACK";
        patterns.push({ type, side, attackerSquares: [slider.square], targetSquares: [target], keySquares: [blocker] });
      }
    }
  }
  return patterns;
}

function detectDoubleAttack(chess: Chess, side: Color): TacticalPattern[] {
  const opponentPieces = collectPieces(chess, side === "white" ? "black" : "white");
  const attacks = attackMap(chess, side);
  const threatenedTargets = opponentPieces
    .filter(op => valuable(op.piece) && attacks.has(op.square))
    .map(op => op.square);
  if (threatenedTargets.length >= 2) {
    // Find all pieces that attack at least 2 of the threatened targets
    const attackerSquares = new Set<Square>();
    for (const target of threatenedTargets) {
      const attackers = attacks.get(target) || [];
      for (const attacker of attackers) {
        // Check if this attacker attacks at least 2 targets
        const targetsAttackedByThis = threatenedTargets.filter(t => {
          const attackersOfT = attacks.get(t) || [];
          return attackersOfT.includes(attacker);
        });
        if (targetsAttackedByThis.length >= 2) {
          attackerSquares.add(attacker);
        }
      }
    }
    return [{ type: "DOUBLE_ATTACK", side, attackerSquares: Array.from(attackerSquares), targetSquares: threatenedTargets }];
  }
  return [];
}

function detectOverloading(chess: Chess, side: Color): TacticalPattern[] {
  const patterns: TacticalPattern[] = [];
  const opponent: Color = side === "white" ? "black" : "white";
  const opponentPieces = collectPieces(chess, opponent);
  const opponentDefenses = attackMap(chess, opponent);
  const attackerMap = attackMap(chess, side);
  for (const defender of opponentPieces) {
    const defendedSquares = (opponentDefenses.get(defender.square) || []).filter(sq => {
      const piece = chess.get(sq);
      return piece && piece.color === toChessColor(opponent) && valuable(piece);
    });
    if (defendedSquares.length >= 2 && attackerMap.has(defender.square)) {
      patterns.push({ type: "OVERLOADING", side, attackerSquares: attackerMap.get(defender.square) || [], targetSquares: defendedSquares });
    }
  }
  return patterns;
}

function detectBackRankWeakness(chess: Chess, side: Color): TacticalPattern[] {
  const opponent: Color = side === "white" ? "black" : "white";
  const king = collectPieces(chess, opponent).find(p => p.piece.type === "k");
  if (!king) return [];
  const kingRank = parseInt(king.square[1], 10);
  const backRank = opponent === "white" ? 1 : 8;
  if (kingRank !== backRank) return [];
  const escapeFiles = [FILES.indexOf(king.square[0] as (typeof FILES)[number]) - 1, FILES.indexOf(king.square[0] as (typeof FILES)[number]), FILES.indexOf(king.square[0] as (typeof FILES)[number]) + 1].filter(i => i >= 0 && i < 8);
  const escapeSquares = escapeFiles.map(f => `${FILES[f]}${backRank + (opponent === "white" ? 1 : -1)}` as Square);
  const blocked = escapeSquares.every(sq => chess.get(sq));
  if (!blocked) return [];
  const attackers = collectPieces(chess, side).filter(p => ["q", "r"].includes(p.piece.type));
  for (const attacker of attackers) {
    const sameFile = attacker.square[0] === king.square[0];
    const sameRank = attacker.square[1] === king.square[1];
    if (!sameFile && !sameRank) continue;
    const df = sameFile ? 0 : attacker.square[0] < king.square[0] ? 1 : -1;
    const dr = sameRank ? 0 : attacker.square[1] < king.square[1] ? 1 : -1;
    const pathSquares = raySquares(attacker.square, df, dr);
    let blockedByOpponent = false;
    for (const sq of pathSquares) {
      if (sq === king.square) break;
      if (chess.get(sq)) {
        blockedByOpponent = true;
        break;
      }
    }
    if (!blockedByOpponent) {
      return [{ type: "BACK_RANK_WEAKNESS", side, attackerSquares: [attacker.square], targetSquares: [king.square] }];
    }
  }
  return [];
}

function detectTrappedPieces(chess: Chess, side: Color): TacticalPattern[] {
  const opponent: Color = side === "white" ? "black" : "white";
  const patterns: TacticalPattern[] = [];
  for (const pieceInfo of collectPieces(chess, opponent)) {
    if (pieceInfo.piece.type === "k") continue;
    const moves = chess.moves({ square: pieceInfo.square, verbose: true }) as ChessMove[];
    if (moves.length === 0) {
      patterns.push({ type: "TRAPPED_PIECE", side, attackerSquares: [], targetSquares: [pieceInfo.square] });
    }
  }
  return patterns;
}

export function detectTactics(position: Position): TacticalPattern[] {
  return [
    ...detectTacticsForSide(position, "white"),
    ...detectTacticsForSide(position, "black"),
  ];
}

export function detectTacticsForSide(position: Position, side: Color): TacticalPattern[] {
  const chess = new Chess(position.fen);
  return [
    ...detectPinsAndSkewers(chess, side),
    ...detectFork(chess, side),
    ...detectDiscovered(chess, side),
    ...detectDoubleAttack(chess, side),
    ...detectOverloading(chess, side),
    ...detectBackRankWeakness(chess, side),
    ...detectTrappedPieces(chess, side),
  ];
}

export function findTacticalOpportunitiesForSide(position: Position, side: Color): TacticalOpportunity[] {
  const chess = new Chess(position.fen);
  const opportunities: TacticalOpportunity[] = [];
  const moves = chess.moves({ verbose: true }) as ChessMove[];
  for (const move of moves) {
    if (move.color !== toChessColor(side)) continue;

    // Skip moves that capture the king (they create invalid positions)
    if (move.captured === "k") continue;

    const clone = new Chess(position.fen);
    clone.move(move);

    // Check for trapped piece capture
    // If the move captures a piece that had no legal moves in the initial position, it's capturing a trapped piece
    if (move.captured) {
      const capturedSquare = move.to;
      const initialChess = new Chess(position.fen);
      const capturedPieceMoves = initialChess.moves({ square: capturedSquare, verbose: true }) as ChessMove[];
      if (capturedPieceMoves.length === 0) {
        // The captured piece was trapped
        opportunities.push({
          move: { from: move.from, to: move.to, promotion: move.promotion as Move["promotion"] | undefined },
          pattern: {
            type: "TRAPPED_PIECE",
            side,
            attackerSquares: [move.from],
            targetSquares: [capturedSquare],
          },
        });
      }
    }

    // Check for discovered check/attack
    // A discovered check occurs when moving a piece reveals an attack from another piece
    if (clone.inCheck()) {
      // Find which piece is giving check
      const opponent = side === "white" ? "black" : "white";
      const opponentKingSquare = findKing(clone, opponent);
      if (opponentKingSquare) {
        const attackers = findAttackersOfSquare(clone, opponentKingSquare, side);
        // If the checking piece is not the piece that moved, it's a discovered check
        for (const attacker of attackers) {
          if (attacker !== move.to) {
            const targetPiece = clone.get(opponentKingSquare);
            const type: TacticalPatternType = targetPiece?.type === "k" ? "DISCOVERED_CHECK" : "DISCOVERED_ATTACK";
            opportunities.push({
              move: { from: move.from, to: move.to, promotion: move.promotion as Move["promotion"] | undefined },
              pattern: {
                type,
                side,
                attackerSquares: [attacker],
                targetSquares: [opponentKingSquare],
                keySquares: [move.to], // The piece that moved away
              },
            });
          }
        }
      }
    }

    // Check for overloading
    // Overloading occurs when a defender must choose between two defensive duties
    // Common pattern: a piece defends both a square and the back rank
    if (clone.inCheck()) {
      const opponent = side === "white" ? "black" : "white";
      const opponentKingSquare = findKing(clone, opponent);
      if (opponentKingSquare) {
        // Find pieces that can capture the checking piece
        const opponentMoves = clone.moves({ verbose: true }) as ChessMove[];
        const capturingMoves = opponentMoves.filter(m => m.to === move.to && m.from !== opponentKingSquare);

        // For each capturing move, check if the capturing piece was defending something important
        for (const captureMove of capturingMoves) {
          const defenderSquare = captureMove.from;

          // Check what the defender was defending before it captures
          const beforeCapture = new Chess(position.fen);
          const defenderAttacks = squaresAttackedBy(beforeCapture, defenderSquare);

          // Count how many valuable pieces/squares the defender was protecting
          let defendedCount = 0;
          const defendedSquares: Square[] = [];

          for (const sq of defenderAttacks) {
            const piece = beforeCapture.get(sq);
            if (piece && piece.color === toChessColor(opponent) && valuable(piece)) {
              defendedCount++;
              defendedSquares.push(sq);
            }
          }

          // If the defender was protecting 2+ things (including the square it's on), it's overloaded
          if (defendedCount >= 1 || defenderAttacks.length >= 3) {
            opportunities.push({
              move: { from: move.from, to: move.to, promotion: move.promotion as Move["promotion"] | undefined },
              pattern: {
                type: "OVERLOADING",
                side,
                attackerSquares: [move.to],
                targetSquares: [defenderSquare, move.to],
              },
            });
            break; // Found overloading
          }
        }
      }
    }

    const patterns = detectTacticsForSide({ fen: clone.fen() }, side);
    for (const pattern of patterns) {
      // Skip patterns we handle specially above
      if (pattern.type === "DISCOVERED_CHECK" || pattern.type === "DISCOVERED_ATTACK") continue;
      if (pattern.type === "TRAPPED_PIECE") continue; // We detect this specially above
      if (pattern.type === "OVERLOADING") continue; // We detect this specially above

      opportunities.push({
        move: { from: move.from, to: move.to, promotion: move.promotion as Move["promotion"] | undefined },
        pattern,
      });
    }
  }
  return opportunities;
}

export function findRiskyMoves(position: Position, side: Color): TacticalRisk[] {
  const chess = new Chess(position.fen);
  const risks: TacticalRisk[] = [];
  const moves = chess.moves({ verbose: true }) as ChessMove[];
  const opponent: Color = side === "white" ? "black" : "white";
  for (const move of moves) {
    if (move.color !== toChessColor(side)) continue;

    // Skip moves that capture the king (they create invalid positions)
    if (move.captured === "k") continue;

    const clone = new Chess(position.fen);
    clone.move(move);
    const opponentPatterns = findTacticalOpportunitiesForSide({ fen: clone.fen() }, opponent).map(o => o.pattern);
    if (opponentPatterns.length > 0) {
      risks.push({
        move: { from: move.from, to: move.to, promotion: move.promotion as Move["promotion"] | undefined },
        opponentPatterns,
      });
    }
  }
  return risks;
}

export function identifyGambit(movesSan: string[]): GambitMatch | null {
  const matches = listPossibleGambits(movesSan);
  return matches.length > 0 ? matches[0] : null;
}

export function listPossibleGambits(movesSan: string[]): GambitMatch[] {
  const definitions = (gambitDefinitions as any).gambits as GambleDefinition[];
  const matches: GambitMatch[] = [];
  for (const gambit of definitions) {
    let matched = 0;
    for (let i = 0; i < Math.min(movesSan.length, gambit.moveSequenceSan.length); i++) {
      if (movesSan[i] !== gambit.moveSequenceSan[i]) break;
      matched++;
    }
    if (matched > 0) {
      matches.push({
        gambitId: gambit.id,
        name: gambit.name,
        side: gambit.side,
        matchedMoves: matched,
        isExactLine: matched === gambit.moveSequenceSan.length && matched === movesSan.length,
      });
    }
  }
  return matches.sort((a, b) => b.matchedMoves - a.matchedMoves);
}

export function generateTacticExercise(params: TacticExerciseParams): TacticExercise {
  const dataset = tacticalFixtures[params.patternType];

  // Filter by side
  let cases = dataset.cases.filter((c: any) => c.sideToMove === params.side);

  // Filter by difficulty if specified
  if (params.difficulty) {
    const difficultyRanges = {
      easy: { min: 800, max: 1400 },
      medium: { min: 1400, max: 1800 },
      hard: { min: 1800, max: 2200 },
    };
    const range = difficultyRanges[params.difficulty];
    cases = cases.filter((c: any) => {
      const rating = c.rating || 1500; // Default to medium if no rating
      return rating >= range.min && rating < range.max;
    });
  }

  const pool = cases.length > 0 ? cases : dataset.cases;

  if (pool.length === 0) {
    throw new Error(`No fixture available for pattern ${params.patternType} with difficulty ${params.difficulty || 'any'}`);
  }

  // Pick a random case instead of always the first one
  const chosen = pool[Math.floor(Math.random() * pool.length)];

  return {
    startPosition: { fen: chosen.initialFen },
    solutionMove: {
      from: chosen.bestMove.uci.substring(0, 2),
      to: chosen.bestMove.uci.substring(2, 4),
      promotion: chosen.bestMove.uci.length > 4 ? (chosen.bestMove.uci.substring(4, 5) as Move["promotion"]) : undefined,
    },
    resultPosition: { fen: chosen.resultingFen },
    pattern: chosen.expectedPattern as TacticalPattern,
    moves: chosen.moves,  // Include full move sequence
    rating: chosen.rating,  // Include puzzle rating
  };
}

function pickFixtureCase(patternType: TacticalPatternType, options: GenerateOptions = {}) {
  const dataset = tacticalFixtures[patternType];
  if (!dataset?.cases) {
    throw new Error(`No fixtures registered for pattern ${patternType}`);
  }

  const filtered = options.side ? dataset.cases.filter((c: any) => c.sideToMove === options.side) : dataset.cases;
  const match = options.caseId ? filtered.find((c: any) => c.id === options.caseId) : null;
  const pool = filtered.length > 0 ? filtered : dataset.cases;
  if (pool.length === 0) {
    throw new Error(`No cases available for pattern ${patternType}`);
  }
  const chosen = match || pool[Math.floor(Math.random() * pool.length)];
  return chosen;
}

export function generateTacticPosition(
  patternType: TacticalPatternType,
  options: GenerateOptions = {}
): GeneratedTacticPosition {
  const chosen = pickFixtureCase(patternType, options);
  const moveUci: string = chosen.bestMove.uci;
  const creatingMove: Move = {
    from: moveUci.substring(0, 2),
    to: moveUci.substring(2, 4),
    promotion: moveUci.length > 4 ? (moveUci.substring(4, 5) as Move["promotion"]) : undefined,
  };

  return {
    patternType,
    side: chosen.sideToMove as Color,
    initialPosition: { fen: chosen.initialFen },
    creatingMove,
    resultingPosition: { fen: chosen.resultingFen },
    expectedPattern: chosen.expectedPattern as TacticalPattern,
  };
}

export const generatePinPosition = (options: GenerateOptions = {}) => generateTacticPosition("PIN", options);
export const generateSkewerPosition = (options: GenerateOptions = {}) => generateTacticPosition("SKEWER", options);
export const generateForkPosition = (options: GenerateOptions = {}) => generateTacticPosition("FORK", options);
export const generateDiscoveredCheckPosition = (options: GenerateOptions = {}) => generateTacticPosition("DISCOVERED_CHECK", options);
export const generateDoubleAttackPosition = (options: GenerateOptions = {}) => generateTacticPosition("DOUBLE_ATTACK", options);
export const generateOverloadingPosition = (options: GenerateOptions = {}) => generateTacticPosition("OVERLOADING", options);
export const generateBackRankWeaknessPosition = (options: GenerateOptions = {}) => generateTacticPosition("BACK_RANK_WEAKNESS", options);
export const generateTrappedPiecePosition = (options: GenerateOptions = {}) => generateTacticPosition("TRAPPED_PIECE", options);
