'use client';

interface DeviationDialogProps {
  openingName: string;
  movesCompleted: number;
  onUndo: () => void;
  onStartGame: () => void;
  onContinueExploring?: () => void;
}

export default function DeviationDialog({
  openingName,
  movesCompleted,
  onUndo,
  onStartGame,
  onContinueExploring,
}: DeviationDialogProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md mx-4">
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">🤔</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            You've Left the Opening!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You've studied <span className="font-semibold">{movesCompleted}</span> move
            {movesCompleted !== 1 ? 's' : ''} of the{' '}
            <span className="font-semibold">{openingName}</span>.
          </p>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            This move isn't in your repertoire. What would you like to do?
          </p>
        </div>

        <div className="space-y-3">
          {/* Primary action: Start game */}
          <button
            onClick={onStartGame}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center justify-center gap-2"
          >
            <span>♟️</span>
            <span>Continue Playing (Start Game)</span>
          </button>

          {/* Secondary action: Undo */}
          <button
            onClick={onUndo}
            className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium transition-colors flex items-center justify-center gap-2"
          >
            <span>↩️</span>
            <span>Undo & Return to Opening</span>
          </button>

          {/* Optional: Continue exploring */}
          {onContinueExploring && (
            <button
              onClick={onContinueExploring}
              className="w-full px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 font-medium transition-colors border border-gray-300 dark:border-gray-600 flex items-center justify-center gap-2"
            >
              <span>🔍</span>
              <span>Explore This Variation</span>
            </button>
          )}
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-500 mt-4 text-center">
          Tip: You can always navigate back using the move history
        </p>
      </div>
    </div>
  );
}
