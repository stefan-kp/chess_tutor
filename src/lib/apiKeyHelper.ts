/**
 * Helper utilities for API key management
 */

export type ApiKeySource = 'localStorage' | 'env' | 'none';

export interface ApiKeyInfo {
  key: string | null;
  source: ApiKeySource;
  anonymized: string;
}

/**
 * Anonymize an API key by showing only first 2 and last 2 characters
 * Example: "AIzaSyABC...XYZ123" becomes "AI...23"
 */
export function anonymizeApiKey(key: string | null): string {
  if (!key || key.length < 8) {
    return '••••••••';
  }

  const first2 = key.substring(0, 2);
  const last2 = key.substring(key.length - 2);
  return `${first2}${'•'.repeat(6)}${last2}`;
}

/**
 * Get the current API key and its source
 */
export function getApiKeyInfo(): ApiKeyInfo {
  // Check localStorage first (user-set key takes precedence)
  if (typeof window !== 'undefined') {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey && storedKey.trim()) {
      return {
        key: storedKey,
        source: 'localStorage',
        anonymized: anonymizeApiKey(storedKey),
      };
    }
  }

  // Check environment variable (fallback)
  const envKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (envKey && envKey.trim()) {
    return {
      key: envKey,
      source: 'env',
      anonymized: anonymizeApiKey(envKey),
    };
  }

  // No key found
  return {
    key: null,
    source: 'none',
    anonymized: '••••••••',
  };
}

/**
 * Get user-friendly description of API key source
 */
export function getApiKeySourceDescription(source: ApiKeySource): string {
  switch (source) {
    case 'localStorage':
      return 'User Settings (localStorage)';
    case 'env':
      return 'Environment Variable (.env)';
    case 'none':
      return 'Not configured';
  }
}
