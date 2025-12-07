'use client';

import { AlertCircle, ExternalLink, X, Settings, Key } from 'lucide-react';
import { GeminiErrorInfo } from '@/lib/geminiErrorHandler';
import { ApiKeyInfo, getApiKeySourceDescription } from '@/lib/apiKeyHelper';
import { useRouter } from 'next/navigation';

interface GeminiErrorModalProps {
  error: GeminiErrorInfo;
  apiKeyInfo: ApiKeyInfo;
  onClose: () => void;
}

export function GeminiErrorModal({ error, apiKeyInfo, onClose }: GeminiErrorModalProps) {
  const router = useRouter();

  const handleGoToSettings = () => {
    onClose();
    router.push('/settings');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <AlertCircle className="text-red-600 dark:text-red-400" size={24} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {error.isQuotaError ? 'API Quota Exceeded' : 'API Error'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* API Key Info */}
          <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Key className="text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" size={18} />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Current API Key:
                </p>
                <p className="text-sm font-mono text-gray-700 dark:text-gray-300">
                  {apiKeyInfo.anonymized}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Source: {getApiKeySourceDescription(apiKeyInfo.source)}
                </p>
              </div>
            </div>
          </div>
          <p className="text-gray-700 dark:text-gray-300">
            {error.userMessage}
          </p>

          {error.retryAfterSeconds && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                You can try again in <strong>{error.retryAfterSeconds} seconds</strong>.
              </p>
            </div>
          )}

          {error.isQuotaError && (
            <div className="space-y-3">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-2">
                  <strong>Solutions:</strong>
                </p>
                <ul className="text-sm text-yellow-800 dark:text-yellow-300 list-disc list-inside space-y-1">
                  {apiKeyInfo.source === 'localStorage' && (
                    <li>Change your API key to a different one with available quota</li>
                  )}
                  <li>Upgrade to a paid Gemini API plan for higher quotas</li>
                  <li>Wait until tomorrow for your free tier quota to reset</li>
                  <li>Use the chess tutor less frequently throughout the day</li>
                  {apiKeyInfo.source === 'env' && (
                    <li>Update the NEXT_PUBLIC_GEMINI_API_KEY environment variable</li>
                  )}
                </ul>
              </div>

              {/* Change API Key button (if from localStorage) */}
              {apiKeyInfo.source === 'localStorage' && (
                <button
                  onClick={handleGoToSettings}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  <Settings size={16} />
                  Change API Key in Settings
                </button>
              )}

              <a
                href="https://ai.google.dev/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                View Gemini API Pricing
                <ExternalLink size={16} />
              </a>

              <a
                href="https://ai.dev/usage"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
              >
                Check Your API Usage
                <ExternalLink size={16} />
              </a>
            </div>
          )}

          {/* Technical details (collapsible) */}
          <details className="mt-4">
            <summary className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
              Technical details
            </summary>
            <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-900 rounded text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
              {error.technicalMessage}
            </pre>
          </details>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
