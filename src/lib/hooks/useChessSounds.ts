"use client";

import { useRef, useEffect, useCallback } from "react";

export interface ChessSounds {
  playMove: () => void;
  playCapture: () => void;
  playCheck: () => void;
  playVictory: () => void;
  playDefeat: () => void;
  playMoveSound: (captured: boolean) => void;
}

/**
 * Custom hook for managing chess game sounds.
 * Handles audio initialization and provides methods to play various game sounds.
 */
export function useChessSounds(): ChessSounds {
  const moveSound = useRef<HTMLAudioElement | null>(null);
  const captureSound = useRef<HTMLAudioElement | null>(null);
  const checkSound = useRef<HTMLAudioElement | null>(null);
  const victorySound = useRef<HTMLAudioElement | null>(null);
  const defeatSound = useRef<HTMLAudioElement | null>(null);

  // Initialize audio elements
  useEffect(() => {
    if (typeof window !== "undefined") {
      moveSound.current = new Audio("/sounds/move.wav");
      captureSound.current = new Audio("/sounds/capture.wav");
      checkSound.current = new Audio("/sounds/check.wav");
      victorySound.current = new Audio("/sounds/victory.wav");
      defeatSound.current = new Audio("/sounds/defeat.wav");

      // Preload audio files
      [moveSound, captureSound, checkSound, victorySound, defeatSound].forEach(
        (sound) => {
          if (sound.current) {
            sound.current.preload = "auto";
          }
        }
      );
    }

    // Cleanup
    return () => {
      [moveSound, captureSound, checkSound, victorySound, defeatSound].forEach(
        (sound) => {
          if (sound.current) {
            sound.current.pause();
            sound.current = null;
          }
        }
      );
    };
  }, []);

  const playSound = useCallback((sound: HTMLAudioElement | null) => {
    if (sound) {
      // Reset the sound to the beginning if it's still playing
      sound.currentTime = 0;
      sound.play().catch((e) => {
        // Silently handle autoplay restrictions
        if (e.name !== "NotAllowedError") {
          console.error("Audio play failed", e);
        }
      });
    }
  }, []);

  const playMove = useCallback(() => {
    playSound(moveSound.current);
  }, [playSound]);

  const playCapture = useCallback(() => {
    playSound(captureSound.current);
  }, [playSound]);

  const playCheck = useCallback(() => {
    playSound(checkSound.current);
  }, [playSound]);

  const playVictory = useCallback(() => {
    playSound(victorySound.current);
  }, [playSound]);

  const playDefeat = useCallback(() => {
    playSound(defeatSound.current);
  }, [playSound]);

  const playMoveSound = useCallback(
    (captured: boolean) => {
      if (captured) {
        playCapture();
      } else {
        playMove();
      }
    },
    [playCapture, playMove]
  );

  return {
    playMove,
    playCapture,
    playCheck,
    playVictory,
    playDefeat,
    playMoveSound,
  };
}
