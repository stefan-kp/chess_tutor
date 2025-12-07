'use client';

import { MoveFeedback as MoveFeedbackType } from '@/types/openingTraining';
import { formatEvaluation } from '@/lib/openingTrainer/moveValidator';

interface MoveFeedbackProps {
  feedback: MoveFeedbackType;
}

export default function MoveFeedback({ feedback }: MoveFeedbackProps) {
  const { move, classification, evaluation, previousEvaluation, llmExplanation } =
    feedback;

  // Format evaluation change
  const evalChange = classification.evaluationChange !== 0
    ? `${classification.evaluationChange > 0 ? '+' : ''}${(classification.evaluationChange / 100).toFixed(2)}`
    : '0.00';

  // Category badge styling
  const categoryStyles = {
    'in-theory': 'bg-green-100 text-green-800 border-green-300',
    playable: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    weak: 'bg-red-100 text-red-800 border-red-300',
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">
          Move {move.moveNumber}
          {move.color === 'white' ? '.' : '...'} {move.san}
        </h3>
        <div
          className={`px-3 py-1 rounded border text-sm font-medium ${
            categoryStyles[classification.category]
          }`}
        >
          {classification.category.toUpperCase()}
        </div>
      </div>

      {/* Classification details */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              classification.inRepertoire ? 'bg-green-500' : 'bg-gray-400'
            }`}
          ></span>
          <span className="text-gray-700">
            {classification.inRepertoire
              ? 'In repertoire'
              : 'Outside repertoire'}
          </span>
        </div>

        {classification.theoreticalAlternatives &&
          classification.theoreticalAlternatives.length > 0 && (
            <div className="text-sm">
              <span className="text-gray-600">Repertoire alternatives: </span>
              <span className="font-mono text-gray-900">
                {classification.theoreticalAlternatives.join(', ')}
              </span>
            </div>
          )}
      </div>

      {/* Engine evaluation */}
      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 font-medium">Evaluation:</span>
          <span className="font-mono text-gray-900 font-semibold">
            {formatEvaluation(evaluation)}
          </span>
        </div>

        {evaluation.bestMove && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 font-medium">Engine best:</span>
            <span className="font-mono text-gray-900">
              {evaluation.bestMove}
            </span>
          </div>
        )}

        {evalChange && (
          <div
            className={`flex items-center justify-between text-sm ${
              classification.isSignificantSwing ? 'font-bold' : ''
            }`}
          >
            <span className="text-gray-600 font-medium">
              Eval change:
              {classification.isSignificantSwing && (
                <span className="ml-1 text-xs bg-orange-100 text-orange-800 px-1 rounded">
                  Significant
                </span>
              )}
            </span>
            <span
              className={`font-mono ${
                evalChange.startsWith('+')
                  ? 'text-green-700'
                  : 'text-red-700'
              }`}
            >
              {evalChange}
            </span>
          </div>
        )}
      </div>

      {/* LLM Explanation */}
      {llmExplanation && (
        <div className="pt-3 border-t border-gray-200">
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-xs font-bold">AI</span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-700 leading-relaxed">
                {llmExplanation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading state for explanation */}
      {!llmExplanation && classification.category !== 'in-theory' && (
        <div className="pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Generating explanation...</span>
          </div>
        </div>
      )}
    </div>
  );
}
