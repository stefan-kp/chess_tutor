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
}

export interface TacticExercise {
  startPosition: Position;
  solutionMove: Move;
  resultPosition: Position;
  pattern: TacticalPattern;
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
    const moves = chess.moves({ square, verbose: true }) as ChessMove[];
    for (const move of moves) {
      const target = move.to as Square;
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
      for (const square of ray) {
        const occupier = chess.get(square);
        if (occupier) {
          seen.push({ square, piece: occupier, color: occupier.color === "w" ? "white" : "black" });
          if (seen.length === 2) break;
        }
      }
      if (seen.length < 2) continue;
      const [first, second] = seen;
      if (first.color !== opponent || second.color !== opponent) continue;
      const firstValue = pieceValues[first.piece.type];
      const secondValue = pieceValues[second.piece.type];
      const isPin = second.piece.type === "k" || secondValue > firstValue;
      const isSkewer = firstValue > secondValue && firstValue >= 300;
      if (isPin) {
        results.push({ type: "PIN", side, attackerSquares: [slider.square], targetSquares: [first.square], keySquares: [second.square] });
      } else if (isSkewer) {
        results.push({ type: "SKEWER", side, attackerSquares: [slider.square], targetSquares: [first.square, second.square] });
      }
    }
  }
  return results;
}

function squaresAttackedBy(chess: Chess, from: Square): Square[] {
  const moves = chess.moves({ square: from, verbose: true }) as ChessMove[];
  return moves.map(m => m.to as Square);
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
    return [{ type: "DOUBLE_ATTACK", side, attackerSquares: [], targetSquares: threatenedTargets }];
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
    const clone = new Chess(position.fen);
    clone.move(move);
    const patterns = detectTacticsForSide({ fen: clone.fen() }, side);
    for (const pattern of patterns) {
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
  const definitions = gambitDefinitions as GambleDefinition[];
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
  const cases = dataset.cases.filter((c: any) => c.sideToMove === params.side);
  const chosen = cases[0] || dataset.cases[0];
  if (!chosen) {
    throw new Error(`No fixture available for pattern ${params.patternType}`);
  }
  return {
    startPosition: { fen: chosen.initialFen },
    solutionMove: {
      from: chosen.bestMove.uci.substring(0, 2),
      to: chosen.bestMove.uci.substring(2, 4),
      promotion: chosen.bestMove.uci.length > 4 ? chosen.bestMove.uci.substring(4, 5) : undefined,
    },
    resultPosition: { fen: chosen.resultingFen },
    pattern: chosen.expectedPattern,
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
    expectedPattern: chosen.expectedPattern,
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
