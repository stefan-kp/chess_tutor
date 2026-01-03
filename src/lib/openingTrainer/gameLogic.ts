import { Chess, Move } from 'chess.js';
import { OpeningMetadata } from '@/lib/openings';
import { StockfishEvaluation } from '@/lib/stockfish';
import {
  MoveHistoryEntry,
  MoveCategory,
  MoveFeedbackClassification
} from '@/types/openingTraining';
import { STARTING_FEN, MOVE_CATEGORIZATION_THRESHOLDS } from './constants';

/**
 * Pure Business Logic for Opening Training
 *
 * This module contains all the core chess logic WITHOUT any React dependencies.
 * All functions are pure (no side effects) and can be unit tested in isolation.
 */

// ============================================================================
// Move Validation & Execution
// ============================================================================

export interface MoveResult {
  san: string;
  uci: string;
  from: string;
  to: string;
  promotion?: string;
  color: 'w' | 'b';
  piece: string;
  captured?: string;
  flags: string;
}

/**
 * Validate and execute a move on a given position
 * Returns move details if legal, null if illegal
 *
 * PURE FUNCTION: Creates a temporary chess instance, does not mutate anything
 */
export function validateMove(fen: string, san: string): MoveResult | null {
  const chess = new Chess(fen);

  try {
    const move = chess.move(san);
    if (!move) return null;

    return {
      san: move.san,
      uci: move.from + move.to + (move.promotion || ''),
      from: move.from,
      to: move.to,
      promotion: move.promotion,
      color: move.color,
      piece: move.piece,
      captured: move.captured,
      flags: move.flags,
    };
  } catch (error) {
    // chess.move() can throw on invalid input
    return null;
  }
}

/**
 * Apply a move to a position and return the new FEN
 *
 * PURE FUNCTION: Creates a new chess instance, does not mutate anything
 */
export function applyMove(fen: string, san: string): { newFen: string; move: MoveResult } | null {
  const moveResult = validateMove(fen, san);
  if (!moveResult) return null;

  const chess = new Chess(fen);
  chess.move(san);

  return {
    newFen: chess.fen(),
    move: moveResult,
  };
}

/**
 * Build FEN by undoing moves to a specific index in history
 * Returns STARTING_FEN if targetIndex is 0
 *
 * PURE FUNCTION: Replays moves from scratch
 */
export function buildFenAtIndex(moveHistory: MoveHistoryEntry[], targetIndex: number): string {
  if (targetIndex === 0) return STARTING_FEN;
  if (targetIndex > moveHistory.length) return STARTING_FEN;

  // Use the FEN stored in the move history
  // moveHistory[0] is the FEN after the 1st move
  // moveHistory[1] is the FEN after the 2nd move, etc.
  return moveHistory[targetIndex - 1].fen;
}

// ============================================================================
// Opening Theory Logic
// ============================================================================

/**
 * Parse a move sequence from an opening's moves string
 * Example: "1. e4 e5 2. Nf3" → ["e4", "e5", "Nf3"]
 */
export function parseMoveSequence(moveString: string): string[] {
  if (!moveString || moveString.trim() === '') return [];

  const cleaned = moveString
    .replace(/\d+\./g, '') // Remove move numbers
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  return cleaned.split(' ').filter((move) => move.length > 0);
}

/**
 * Check if the current position is still within opening theory
 *
 * @param opening - Opening metadata
 * @param moveHistory - Moves played so far
 * @param proposedMove - Optional: also check if this next move would be in theory
 */
export function isInTheory(
  opening: OpeningMetadata,
  moveHistory: MoveHistoryEntry[],
  proposedMove?: string
): boolean {
  const repertoireMoves = parseMoveSequence(opening.moves);
  const totalMoves = proposedMove
    ? moveHistory.length + 1
    : moveHistory.length;

  // If we've played more moves than the repertoire has, we're past theory
  if (totalMoves > repertoireMoves.length) {
    return false;
  }

  // Check that all played moves match the repertoire
  for (let i = 0; i < moveHistory.length; i++) {
    if (moveHistory[i].san !== repertoireMoves[i]) {
      return false;
    }
  }

  // If checking a proposed move, verify it matches too
  if (proposedMove && totalMoves <= repertoireMoves.length) {
    return proposedMove === repertoireMoves[moveHistory.length];
  }

  return true;
}

/**
 * Get the expected next move(s) from the repertoire at current position
 * For now, returns single main line move (no variants yet)
 * Future: could return multiple moves for different variations
 */
export function getExpectedNextMoves(
  opening: OpeningMetadata,
  currentMoveIndex: number
): string[] {
  const moves = parseMoveSequence(opening.moves);

  if (currentMoveIndex >= moves.length) {
    return [];
  }

  const nextMove = moves[currentMoveIndex];
  return nextMove ? [nextMove] : [];
}

/**
 * Get all variant moves at current position
 * For MVP: same as getExpectedNextMoves (no variants stored in database yet)
 * Future: Parse variation syntax like "1. e4 (1. d4) e5"
 */
export function getAllVariantMoves(
  opening: OpeningMetadata,
  currentMoveIndex: number
): string[] {
  // MVP: No variant support yet, just return main line
  return getExpectedNextMoves(opening, currentMoveIndex);
}

/**
 * Detect if the current FEN has transposed into a different known opening
 * Future implementation: Would query opening database by FEN
 */
export function detectTransposition(
  fen: string,
  allOpenings: OpeningMetadata[]
): { opening: OpeningMetadata; moveIndex: number } | null {
  // TODO: Implement FEN-based opening lookup
  // For now, return null (no transposition detection)
  return null;
}

/**
 * Check if we've reached the end of the opening repertoire
 */
export function isEndOfRepertoire(
  opening: OpeningMetadata,
  currentMoveIndex: number
): boolean {
  const moves = parseMoveSequence(opening.moves);
  return currentMoveIndex >= moves.length;
}

// ============================================================================
// Move Classification
// ============================================================================

/**
 * Classify a user's move based on repertoire matching and engine evaluation
 */
export function classifyMove(
  san: string,
  expectedMoves: string[],
  variantMoves: string[],
  evaluation: StockfishEvaluation,
  previousEvaluation: StockfishEvaluation
): {
  category: MoveCategory;
  evaluationChange: number;
  theoreticalAlternatives: string[];
  isTransposition: boolean;
  newOpening?: OpeningMetadata;
} {
  const isInRepertoire = expectedMoves.includes(san);
  const isVariant = !isInRepertoire && variantMoves.includes(san);

  // Calculate evaluation change (White's perspective)
  const evalChange = evaluation.score - previousEvaluation.score;

  // Determine category
  let category: MoveCategory;

  if (isInRepertoire) {
    category = 'in-theory';
  } else {
    // Not in main repertoire - check if weak or playable
    const cpLoss = Math.abs(evalChange);

    if (cpLoss >= MOVE_CATEGORIZATION_THRESHOLDS.WEAK_MOVE_CP_LOSS) {
      category = 'weak';
    } else {
      category = 'playable';
    }
  }

  // Get theoretical alternatives (excluding the move just played)
  const alternatives = expectedMoves.filter(move => move !== san);

  return {
    category,
    evaluationChange: evalChange,
    theoreticalAlternatives: alternatives,
    isTransposition: false, // TODO: Implement transposition detection
  };
}

// ============================================================================
// Turn & Color Logic
// ============================================================================

/**
 * Determine which color the user is playing based on ECO code
 * A, B, C = White openings (user plays White)
 * D, E = Black defenses (user plays Black)
 */
export function getUserColor(opening: OpeningMetadata): 'white' | 'black' {
  const ecoLetter = opening.eco[0];
  return ['A', 'B', 'C'].includes(ecoLetter) ? 'white' : 'black';
}

/**
 * Check if it's the user's turn to move
 */
export function isUserTurn(opening: OpeningMetadata, moveHistory: MoveHistoryEntry[]): boolean {
  const userColor = getUserColor(opening);
  const moveIndex = moveHistory.length;
  const isWhiteMove = moveIndex % 2 === 0;

  return (userColor === 'white' && isWhiteMove) ||
         (userColor === 'black' && !isWhiteMove);
}

/**
 * Check if it's the opponent's turn to move
 */
export function isOpponentTurn(opening: OpeningMetadata, moveHistory: MoveHistoryEntry[]): boolean {
  return !isUserTurn(opening, moveHistory);
}

/**
 * Determine if opponent should automatically make a move
 * Opponent auto-moves only if:
 * 1. It's their turn
 * 2. We're still in theory
 * 3. We haven't reached end of repertoire
 */
export function shouldOpponentAutoMove(
  opening: OpeningMetadata,
  moveHistory: MoveHistoryEntry[],
  deviationMoveIndex: number | null
): boolean {
  // If user has deviated from theory, no auto-moves
  if (deviationMoveIndex !== null) {
    return false;
  }

  // If at end of repertoire, no auto-moves
  if (isEndOfRepertoire(opening, moveHistory.length)) {
    return false;
  }

  // Must be opponent's turn
  if (!isOpponentTurn(opening, moveHistory)) {
    return false;
  }

  // Must still be in theory
  if (!isInTheory(opening, moveHistory)) {
    return false;
  }

  return true;
}

/**
 * Get the opponent's next move from the repertoire
 */
export function getOpponentNextMove(
  opening: OpeningMetadata,
  currentMoveIndex: number
): string | null {
  const moves = parseMoveSequence(opening.moves);

  if (currentMoveIndex >= moves.length) {
    return null;
  }

  return moves[currentMoveIndex];
}

// ============================================================================
// Deviation Tracking
// ============================================================================

/**
 * Find the index where the user first deviated from theory
 * Returns null if still in theory
 */
export function findDeviationPoint(
  opening: OpeningMetadata,
  moveHistory: MoveHistoryEntry[]
): number | null {
  const repertoireMoves = parseMoveSequence(opening.moves);

  for (let i = 0; i < moveHistory.length; i++) {
    // Skip opponent moves (we only care about user deviations)
    const userColor = getUserColor(opening);
    const moveColor = moveHistory[i].color;
    const isUserMove =
      (userColor === 'white' && moveColor === 'white') ||
      (userColor === 'black' && moveColor === 'black');

    if (!isUserMove) continue;

    // Check if this move matches theory
    if (i >= repertoireMoves.length || moveHistory[i].san !== repertoireMoves[i]) {
      return i;
    }
  }

  return null;
}

/**
 * Reset deviation tracking if user navigated back and is now in theory again
 *
 * @param currentDeviation - Current deviation index (or null)
 * @param navigationIndex - Index user navigated to
 * @param newMove - New move user is about to make
 * @param opening - Opening metadata
 * @param moveHistory - Current move history (before new move)
 * @returns Updated deviation index (null if back in theory)
 */
export function resetDeviationIfBackInTheory(
  currentDeviation: number | null,
  navigationIndex: number,
  newMove: string,
  opening: OpeningMetadata,
  moveHistory: MoveHistoryEntry[]
): number | null {
  // If we navigated before the deviation point
  if (currentDeviation !== null && navigationIndex < currentDeviation) {
    // Check if the new move is in theory
    if (isInTheory(opening, moveHistory, newMove)) {
      // Back in theory! Reset deviation
      return null;
    }
  }

  return currentDeviation;
}

// ============================================================================
// Wikipedia Integration
// ============================================================================

/**
 * Extract the family name from a full opening name
 * Example: "French Defense: Winawer Variation, Advance" → "French Defense"
 */
export function extractOpeningFamily(openingName: string): string {
  // Split on colon to get the main family
  const parts = openingName.split(':');
  return parts[0].trim();
}

/**
 * Check if an opening has Wikipedia data available
 */
export function hasWikipediaPage(opening: OpeningMetadata): boolean {
  return !!opening.wikipediaSlug;
}

/**
 * Determine if Wikipedia context should be included in LLM prompts
 */
export function shouldUseWikipediaContext(opening: OpeningMetadata): boolean {
  // Use Wikipedia if available and not too obscure
  return hasWikipediaPage(opening);
}

// ============================================================================
// Multi-Variation Support (Family Training)
// ============================================================================

/**
 * Node in the variation tree
 * Each node represents a position after a move, with children for possible continuations
 */
export interface VariationTreeNode {
  move: string; // SAN notation of the move leading to this position
  children: Map<string, VariationTreeNode>; // key = SAN, value = child node
  variations: OpeningMetadata[]; // Openings that pass through this position
  isEndOfLine: boolean; // True if this is the end of at least one variation
}

/**
 * Root of the variation tree (starting position)
 */
export interface VariationTree {
  children: Map<string, VariationTreeNode>;
  allVariations: OpeningMetadata[];
  familyName: string;
}

/**
 * Build a variation tree from multiple openings
 * This allows efficient lookup of which variations are still possible
 */
export function buildVariationTree(variations: OpeningMetadata[], familyName: string): VariationTree {
  const tree: VariationTree = {
    children: new Map(),
    allVariations: variations,
    familyName,
  };

  for (const opening of variations) {
    const moves = parseMoveSequence(opening.moves);
    let currentChildren = tree.children;

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const isLast = i === moves.length - 1;

      if (!currentChildren.has(move)) {
        currentChildren.set(move, {
          move,
          children: new Map(),
          variations: [],
          isEndOfLine: false,
        });
      }

      const node = currentChildren.get(move)!;
      node.variations.push(opening);

      if (isLast) {
        node.isEndOfLine = true;
      }

      currentChildren = node.children;
    }
  }

  return tree;
}

/**
 * Get the node at a specific position in the variation tree
 * Returns null if the move sequence doesn't exist in any variation
 */
export function getTreeNodeAtPosition(
  tree: VariationTree,
  moveHistory: MoveHistoryEntry[]
): VariationTreeNode | null {
  if (moveHistory.length === 0) {
    // Return a virtual root node
    return {
      move: '',
      children: tree.children,
      variations: tree.allVariations,
      isEndOfLine: false,
    };
  }

  let currentChildren = tree.children;
  let currentNode: VariationTreeNode | null = null;

  for (const entry of moveHistory) {
    const node = currentChildren.get(entry.san);
    if (!node) {
      return null; // Move sequence not in any variation
    }
    currentNode = node;
    currentChildren = node.children;
  }

  return currentNode;
}

/**
 * Get all variations that match the current move history
 */
export function getMatchingVariations(
  tree: VariationTree,
  moveHistory: MoveHistoryEntry[]
): OpeningMetadata[] {
  const node = getTreeNodeAtPosition(tree, moveHistory);
  return node ? node.variations : [];
}

/**
 * Get all possible next moves from the current position across all matching variations
 * Returns moves with their associated variations
 */
export function getAllPossibleNextMoves(
  tree: VariationTree,
  moveHistory: MoveHistoryEntry[]
): Array<{ move: string; variations: OpeningMetadata[] }> {
  const node = getTreeNodeAtPosition(tree, moveHistory);
  if (!node) return [];

  const result: Array<{ move: string; variations: OpeningMetadata[] }> = [];

  for (const [move, childNode] of node.children) {
    result.push({
      move,
      variations: childNode.variations,
    });
  }

  return result;
}

/**
 * Check if a move is in any of the loaded variations
 */
export function isMoveInVariationTree(
  tree: VariationTree,
  moveHistory: MoveHistoryEntry[],
  proposedMove: string
): boolean {
  const node = getTreeNodeAtPosition(tree, moveHistory);
  if (!node) return false;
  return node.children.has(proposedMove);
}

/**
 * Get the specific variation name(s) that match the exact move sequence
 * This identifies which variation the user is currently playing
 */
export function identifyCurrentVariation(
  tree: VariationTree,
  moveHistory: MoveHistoryEntry[]
): { exact: OpeningMetadata[]; possible: OpeningMetadata[] } {
  const node = getTreeNodeAtPosition(tree, moveHistory);
  if (!node) {
    return { exact: [], possible: [] };
  }

  // Exact matches: variations that end exactly at this position
  const exact = node.variations.filter(v => {
    const moves = parseMoveSequence(v.moves);
    return moves.length === moveHistory.length;
  });

  // Possible: variations that could continue from here
  const possible = node.variations.filter(v => {
    const moves = parseMoveSequence(v.moves);
    return moves.length > moveHistory.length;
  });

  return { exact, possible };
}

/**
 * Check if we're still in theory (any variation)
 */
export function isInAnyVariation(
  tree: VariationTree,
  moveHistory: MoveHistoryEntry[]
): boolean {
  return getTreeNodeAtPosition(tree, moveHistory) !== null;
}

/**
 * Get a human-readable description of the current position in the variation tree
 */
export function describeCurrentPosition(
  tree: VariationTree,
  moveHistory: MoveHistoryEntry[]
): {
  matchingCount: number;
  nextMoves: string[];
  currentVariationNames: string[];
  isEndOfLine: boolean;
} {
  const node = getTreeNodeAtPosition(tree, moveHistory);

  if (!node) {
    return {
      matchingCount: 0,
      nextMoves: [],
      currentVariationNames: [],
      isEndOfLine: false,
    };
  }

  const nextMoves = Array.from(node.children.keys());
  const variationNames = [...new Set(node.variations.map(v => v.name))];

  return {
    matchingCount: node.variations.length,
    nextMoves,
    currentVariationNames: variationNames,
    isEndOfLine: node.isEndOfLine && nextMoves.length === 0,
  };
}
