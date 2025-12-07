'use client';

import { useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { OpeningMetadata } from '@/lib/openings';
import { useOpeningTraining } from '@/contexts/OpeningTrainingContext';
import { loadSession } from '@/lib/openingTrainer/sessionManager';
import { parseMoveSequence, getUserColor } from '@/lib/openingTrainer/repertoireNavigation';
import { getWikipediaSummary } from '@/lib/openingTrainer/wikipediaService';
import { WikipediaSummary as WikipediaSummaryType } from '@/types/openingTraining';
import { extractFamilyName } from '@/lib/openingTrainer/openingFamilies';
import WikipediaSummary from './WikipediaSummary';
import { Tutor } from '@/components/Tutor';
import { Personality } from '@/lib/personalities';
import { SupportedLanguage } from '@/lib/i18n/translations';

interface OpeningTrainerProps {
  opening: OpeningMetadata;
  personality: Personality;
  apiKey: string;
  language: SupportedLanguage;
}

export default function OpeningTrainer({ opening, personality, apiKey, language }: OpeningTrainerProps) {
  const {
    session,
    chess,
    stockfish,
    currentFeedback,
    initializeSession,
    makeMove,
    navigateToMove,
  } = useOpeningTraining();

  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>(
    'white'
  );
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [existingSession, setExistingSession] = useState<any>(null);
  const [wikipediaSummary, setWikipediaSummary] = useState<WikipediaSummaryType | null>(null);

  useEffect(() => {
    checkForExistingSession();
  }, [opening.eco]);

  // Fetch Wikipedia summary for the opening (using family name for better results)
  useEffect(() => {
    const fetchWikipediaSummary = async () => {
      try {
        // Extract family name (e.g., "French Defense" from "French Defense: Exchange Variation")
        // This ensures we find the Wikipedia article for the main opening, not specific variations
        const familyName = extractFamilyName(opening.name);
        console.log(`[Wikipedia] Looking up: "${familyName}" (from "${opening.name}")`);

        const summary = await getWikipediaSummary(familyName);
        setWikipediaSummary(summary);
      } catch (err) {
        console.error('Failed to fetch Wikipedia summary:', err);
        // Silently fail - Wikipedia is nice-to-have, not critical
      }
    };

    fetchWikipediaSummary();
  }, [opening.name]);

  const checkForExistingSession = () => {
    const saved = loadSession(opening.eco);

    if (saved && saved.moveHistory.length > 0) {
      // Found existing session with moves
      setExistingSession(saved);
      setShowRecoveryDialog(true);
      setIsInitializing(false);
    } else {
      // No existing session or empty session - start fresh
      initSession(false);
    }
  };

  const initSession = async (forceNew: boolean = false) => {
    setIsInitializing(true);
    setError(null);
    setShowRecoveryDialog(false);

    try {
      await initializeSession(opening, forceNew);

      // Determine board orientation from opening
      // ECO D and E are typically Black defenses
      const orientation = ['D', 'E'].includes(opening.eco[0]) ? 'black' : 'white';
      setBoardOrientation(orientation);
    } catch (err) {
      console.error('Session initialization error:', err);
      setError('Failed to initialize training session');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleResumeSession = () => {
    initSession(false);
  };

  const handleStartFresh = () => {
    initSession(true);
  };

  const handlePieceDrop = (
    sourceSquare: string,
    targetSquare: string
  ): boolean => {
    if (!chess) return false;

    try {
      // Create a temporary clone to test if the move is legal
      // WITHOUT modifying the actual chess instance
      const testChess = new Chess();
      testChess.loadPgn(chess.pgn());

      // Try to make the move on the clone
      const move = testChess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', // Always promote to queen for simplicity
      });

      if (move === null) {
        // Illegal move
        return false;
      }

      // Move was legal - process it on the actual chess instance via makeMove
      makeMove(move.san);
      return true;
    } catch (error) {
      console.error('Move error:', error);
      return false;
    }
  };

  // Session recovery dialog
  if (showRecoveryDialog && existingSession) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[500px]">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Resume Training?
            </h2>
            <p className="text-gray-600 mb-6">
              You have an existing training session for this opening with{' '}
              <span className="font-semibold">
                {existingSession.moveHistory.length} move
                {existingSession.moveHistory.length !== 1 ? 's' : ''}
              </span>
              . Would you like to resume where you left off or start fresh?
            </p>

            <div className="space-y-3">
              <button
                onClick={handleResumeSession}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Resume Session
              </button>
              <button
                onClick={handleStartFresh}
                className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Start Fresh
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-4 text-center">
              Last updated:{' '}
              {new Date(existingSession.lastUpdated).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[500px]">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400">Initializing training session...</p>
            {!stockfish && (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading chess engine...</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="font-semibold text-red-900 mb-2">Error</h3>
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => initSession()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!session || !chess) {
    return (
      <div className="space-y-6">
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">No active session</p>
        </div>
      </div>
    );
  }

  const currentPosition = chess.fen();
  const moveCount = session.moveHistory.length;

  // Determine user's color based on opening ECO code
  const userColor = getUserColor(opening);

  // Build opening practice mode prop for Tutor
  const repertoireMoves = parseMoveSequence(opening.moves);
  const lastMove = session.moveHistory.length > 0
    ? session.moveHistory[session.moveHistory.length - 1]
    : null;

  // Determine which color the tutor is playing
  const tutorColor = userColor === 'white' ? 'black' : 'white';

  // Find last user move and last tutor move
  const userMoves = session.moveHistory.filter(
    m => m.color === userColor
  );
  const tutorMoves = session.moveHistory.filter(
    m => m.color === tutorColor
  );

  const lastUserMove = userMoves.length > 0 ? userMoves[userMoves.length - 1] : null;
  const lastTutorMove = tutorMoves.length > 0 ? tutorMoves[tutorMoves.length - 1] : null;

  const openingPracticeMode = {
    openingName: opening.name,
    openingEco: opening.eco,
    repertoireMoves,
    currentMoveIndex: session.moveHistory.length,
    isInTheory: session.deviationMoveIndex === null,
    deviationMoveIndex: session.deviationMoveIndex,
    lastUserMove: lastUserMove ? {
      from: lastUserMove.uci.substring(0, 2),
      to: lastUserMove.uci.substring(2, 4),
      san: lastUserMove.san,
      color: lastUserMove.color === 'white' ? 'w' : 'b',
      piece: lastUserMove.san[0].toLowerCase(),
      flags: '',
      captured: undefined,
      promotion: lastUserMove.uci.length > 4 ? lastUserMove.uci[4] : undefined
    } as any : null,
    lastTutorMove: lastTutorMove ? {
      from: lastTutorMove.uci.substring(0, 2),
      to: lastTutorMove.uci.substring(2, 4),
      san: lastTutorMove.san,
      color: lastTutorMove.color === 'white' ? 'w' : 'b',
      piece: lastTutorMove.san[0].toLowerCase(),
      flags: '',
      captured: undefined,
      promotion: lastTutorMove.uci.length > 4 ? lastTutorMove.uci[4] : undefined
    } as any : null,
    currentFeedback: currentFeedback ? {
      category: currentFeedback.classification.category,
      evaluationChange: currentFeedback.classification.evaluationChange,
      theoreticalAlternatives: currentFeedback.classification.theoreticalAlternatives
    } : null,
    wikipediaSummary: wikipediaSummary?.extract || undefined
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main board area */}
      <div className="lg:col-span-2 space-y-4">
        {/* Board */}
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4"
          role="region"
          aria-label="Chess board"
        >
          <Chessboard
            key={currentPosition}
            options={{
              position: currentPosition,
              onPieceDrop: ({ sourceSquare, targetSquare }) => {
                if (!targetSquare) return false;
                return handlePieceDrop(sourceSquare, targetSquare);
              },
              boardOrientation: boardOrientation,
              darkSquareStyle: { backgroundColor: '#779954' },
              lightSquareStyle: { backgroundColor: '#e9edcc' },
              animationDurationInMs: 200,
            }}
          />
        </div>

        {/* Move controls */}
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4"
          role="region"
          aria-label="Move history and navigation"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Move History</h3>
            <div className="flex gap-2" role="group" aria-label="Move navigation">
              <button
                onClick={() =>
                  navigateToMove(Math.max(0, session.currentMoveIndex - 1))
                }
                disabled={session.currentMoveIndex === 0}
                className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Go to previous move"
              >
                ← Back
              </button>
              <button
                onClick={() =>
                  navigateToMove(
                    Math.min(moveCount - 1, session.currentMoveIndex + 1)
                  )
                }
                disabled={session.currentMoveIndex >= moveCount - 1}
                className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Go to next move"
              >
                Forward →
              </button>
            </div>
          </div>

          {/* Move list */}
          <div
            className="space-y-2 max-h-[200px] overflow-y-auto"
            role="list"
            aria-label="List of moves played"
          >
            {moveCount === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No moves yet. Make your first move!
              </p>
            ) : (
              session.moveHistory.map((move, index) => (
                <div
                  key={index}
                  onClick={() => navigateToMove(index)}
                  role="listitem"
                  className={`p-2 rounded cursor-pointer transition-colors ${
                    index === session.currentMoveIndex
                      ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700'
                      : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                  aria-label={`Move ${move.moveNumber}${
                    move.color === 'white' ? '.' : '...'
                  } ${move.san}, classified as ${move.classification.category}`}
                  aria-current={index === session.currentMoveIndex ? 'true' : undefined}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-sm font-semibold">
                      {move.moveNumber}
                      {move.color === 'white' ? '.' : '...'} {move.san}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        move.classification.category === 'in-theory'
                          ? 'bg-green-100 text-green-800'
                          : move.classification.category === 'playable'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {move.classification.category}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Sidebar - tutor and info */}
      <div className="space-y-4">
        {/* Tutor Chat */}
        {apiKey ? (
          <Tutor
            game={chess}
            currentFen={currentPosition}
            userMove={null}  // Will be updated in Phase 2
            computerMove={null}
            stockfish={stockfish}
            evalP0={null}
            evalP2={null}
            openingData={[]}
            missedTactics={[]}
            onAnalysisComplete={() => {}}
            apiKey={apiKey}
            personality={personality}
            language={language}
            playerColor={userColor}
            onCheckComputerMove={() => {}}
            resignationContext={null}
            openingPracticeMode={openingPracticeMode}
          />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="text-center">
              <div className="text-4xl mb-4">🔑</div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                API Key Required
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                To chat with your coach, please set up your Gemini API key in the settings.
              </p>
              <button
                onClick={() => window.location.href = '/onboarding'}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Set Up API Key
              </button>
            </div>
          </div>
        )}

        {/* Wikipedia summary */}
        <WikipediaSummary
          openingName={opening.name}
          wikipediaSlug={opening.wikipediaSlug}
        />

        {/* Session info */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Opening:</span>
            <span className="font-medium text-gray-900 dark:text-white">{opening.eco}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Moves played:</span>
            <span className="font-medium text-gray-900 dark:text-white">{moveCount}</span>
          </div>
          {session.deviationMoveIndex !== null && (
            <div className="pt-2 border-t border-gray-300 dark:border-gray-600">
              <span className="inline-block px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 rounded text-xs">
                Off-book since move {session.deviationMoveIndex + 1}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
