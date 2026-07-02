/**
 * Centralized error handler for Gemini API errors
 */

export interface GeminiErrorInfo {
  isQuotaError: boolean;
  isRateLimitError: boolean;
  userMessage: string;
  technicalMessage: string;
  retryAfterSeconds?: number;
}

/**
 * Parse a Gemini API error and extract useful information
 */
export function parseGeminiError(error: any): GeminiErrorInfo {
  const errorMessage = error?.message || error?.toString() || 'Unknown error';

  // Prefer the structured HTTP status (GoogleGenerativeAIFetchError carries a
  // numeric `status`) over brittle string matching on the message text.
  const status: number | undefined =
    typeof error?.status === 'number' ? error.status : undefined;
  const lower = errorMessage.toLowerCase();
  const is429 = status === 429 || errorMessage.includes('429');

  // 429 with quota wording is a quota error; a bare 429 is a rate limit.
  const isQuotaError =
    lower.includes('quota') ||
    lower.includes('exceeded your current quota') ||
    (is429 && lower.includes('quota'));

  const isRateLimitError = !isQuotaError && (is429 || lower.includes('rate limit'));

  // Extract retry delay if available
  let retryAfterSeconds: number | undefined;
  const retryMatch = errorMessage.match(/retry in (\d+(?:\.\d+)?)s/);
  if (retryMatch) {
    retryAfterSeconds = Math.ceil(parseFloat(retryMatch[1]));
  }

  // Generate user-friendly message
  let userMessage: string;

  if (isQuotaError) {
    if (errorMessage.includes('free_tier')) {
      userMessage = 'You have reached the daily limit for your free API key. Please upgrade to a paid plan or wait until tomorrow to continue.';
    } else {
      userMessage = 'You have exceeded your API quota. Please check your billing details or wait before trying again.';
    }
  } else if (isRateLimitError) {
    userMessage = retryAfterSeconds
      ? `You're sending requests too quickly. Please wait ${retryAfterSeconds} seconds before trying again.`
      : 'You\'re sending requests too quickly. Please wait a moment before trying again.';
  } else if (errorMessage.includes('API key')) {
    userMessage = 'Your API key appears to be invalid. Please check your settings.';
  } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    userMessage = 'Network error. Please check your internet connection and try again.';
  } else {
    userMessage = 'An error occurred while communicating with the AI. Please try again.';
  }

  return {
    isQuotaError,
    isRateLimitError,
    userMessage,
    technicalMessage: errorMessage,
    retryAfterSeconds,
  };
}

/**
 * Check if an error is a Gemini API error
 */
export function isGeminiError(error: any): boolean {
  const message = error?.message || error?.toString() || '';
  return message.includes('GoogleGenerativeAI') ||
         message.includes('generativelanguage.googleapis.com') ||
         message.includes('Gemini');
}
