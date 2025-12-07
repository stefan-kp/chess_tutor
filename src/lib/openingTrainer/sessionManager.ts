import { v4 as uuidv4 } from 'uuid';
import {
  TrainingSession,
  PersistedTrainingSession,
} from '@/types/openingTraining';
import { SESSION_EXPIRY_DAYS } from './constants';

/**
 * Session Manager for Opening Training
 * Handles creation, persistence, and recovery of training sessions
 */

/**
 * Create a new training session
 */
export function createSession(
  openingId: string,
  openingName: string,
  initialFEN: string,
  initialEvaluation: number = 0
): TrainingSession {
  const now = Date.now();

  return {
    sessionId: uuidv4(),
    openingId,
    openingName,
    startedAt: now,
    lastUpdatedAt: now,
    status: 'active',
    currentFEN: initialFEN,
    currentMoveIndex: 0,
    moveHistory: [],
    deviationMoveIndex: null,
    initialEvaluation,
  };
}

/**
 * Save training session to localStorage
 */
export function saveSession(session: TrainingSession): void {
  if (typeof window === 'undefined') return;

  const key = `openingTraining_session_${session.openingId}`;

  try {
    localStorage.setItem(key, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to save training session:', error);
    // If quota exceeded, try clearing old sessions
    cleanupStaleSessions();
    // Retry save
    try {
      localStorage.setItem(key, JSON.stringify(session));
    } catch (retryError) {
      console.error('Failed to save session after cleanup:', retryError);
    }
  }
}

/**
 * Load training session from localStorage
 * Returns null if session doesn't exist or has expired
 */
export function loadSession(openingId: string): TrainingSession | null {
  if (typeof window === 'undefined') return null;

  const key = `openingTraining_session_${openingId}`;

  try {
    const data = localStorage.getItem(key);
    if (!data) return null;

    const session = JSON.parse(data) as TrainingSession;

    // Check expiration
    const daysSinceUpdate =
      (Date.now() - session.lastUpdatedAt) / (1000 * 60 * 60 * 24);

    if (daysSinceUpdate > SESSION_EXPIRY_DAYS) {
      // Session expired - remove it
      localStorage.removeItem(key);
      return null;
    }

    return session;
  } catch (error) {
    console.error('Failed to load training session:', error);
    return null;
  }
}

/**
 * Delete training session from localStorage
 */
export function deleteSession(openingId: string): void {
  if (typeof window === 'undefined') return;

  const key = `openingTraining_session_${openingId}`;
  localStorage.removeItem(key);
}

/**
 * Update session's last updated timestamp and save
 */
export function updateSession(session: TrainingSession): void {
  session.lastUpdatedAt = Date.now();
  saveSession(session);
}

/**
 * Cleanup stale sessions (older than SESSION_EXPIRY_DAYS)
 * Called when localStorage quota is exceeded
 */
export function cleanupStaleSessions(): void {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  const keys: string[] = [];

  // Collect all openingTraining session keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('openingTraining_session_')) {
      keys.push(key);
    }
  }

  // Check each session and remove if expired
  keys.forEach((key) => {
    try {
      const data = localStorage.getItem(key);
      if (!data) return;

      const session = JSON.parse(data) as TrainingSession;
      const daysSinceUpdate =
        (now - session.lastUpdatedAt) / (1000 * 60 * 60 * 24);

      if (daysSinceUpdate > SESSION_EXPIRY_DAYS) {
        localStorage.removeItem(key);
      }
    } catch (error) {
      // If parsing fails, remove the corrupted entry
      localStorage.removeItem(key);
    }
  });
}

/**
 * Get all active training sessions
 * Useful for displaying a list of in-progress trainings
 */
export function getAllActiveSessions(): TrainingSession[] {
  if (typeof window === 'undefined') return [];

  const sessions: TrainingSession[] = [];
  const now = Date.now();

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('openingTraining_session_')) continue;

    try {
      const data = localStorage.getItem(key);
      if (!data) continue;

      const session = JSON.parse(data) as TrainingSession;

      // Only include non-expired sessions
      const daysSinceUpdate =
        (now - session.lastUpdatedAt) / (1000 * 60 * 60 * 24);

      if (daysSinceUpdate <= SESSION_EXPIRY_DAYS && session.status === 'active') {
        sessions.push(session);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  }

  return sessions;
}
