import { useCallback, useEffect, useRef } from 'react';

export function useAlertAudio(soundEnabled: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!soundEnabled) {
      audioRef.current?.pause();
      audioRef.current = null;
      return;
    }

    audioRef.current = new Audio('/alerts/new-alert.mp3');
    audioRef.current.loop = false;
    audioRef.current.volume = 0; // Start with volume at 0 for fade in
    audioRef.current.load(); // Preload audio

    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [soundEnabled]);

  const fadeIn = useCallback((audio: HTMLAudioElement, duration: number = 3000) => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    audio.volume = 0;
    const interval = 50; // Update every 50ms
    const steps = duration / interval;
    const increment = 1 / steps;

    fadeIntervalRef.current = setInterval(() => {
      if (audio.volume < 1) {
        audio.volume = Math.min(1, audio.volume + increment);
      } else {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
      }
    }, interval);
  }, []);

  const fadeOut = useCallback((audio: HTMLAudioElement, duration: number = 1000): Promise<void> => {
    return new Promise((resolve) => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }

      const startVolume = audio.volume;
      const interval = 50; // Update every 50ms
      const steps = duration / interval;
      const decrement = startVolume / steps;

      fadeIntervalRef.current = setInterval(() => {
        if (audio.volume > 0) {
          audio.volume = Math.max(0, audio.volume - decrement);
        } else {
          if (fadeIntervalRef.current) {
            clearInterval(fadeIntervalRef.current);
            fadeIntervalRef.current = null;
          }
          audio.pause();
          audio.currentTime = 0;
          resolve();
        }
      }, interval);
    });
  }, []);

  const playSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.volume = 0; // Start with volume at 0
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            fadeIn(audioRef.current!);
          })
          .catch(() => {
            console.warn('Auto-play prevented. User interaction required.');
          });
      }
    }
  }, [soundEnabled, fadeIn]);

  const stopSound = useCallback(() => {
    if (audioRef.current) {
      fadeOut(audioRef.current).then(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
        }
      });
    }
  }, [fadeOut]);

  return { playSound, stopSound };
}
