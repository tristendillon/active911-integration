import { useCallback, useEffect, useRef } from 'react';

export function useAlertAudio(soundEnabled: boolean) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!soundEnabled) {
      audioRef.current?.pause();
      audioRef.current = null;
      return;
    }

    audioRef.current = new Audio('/alerts/new-alert.mp3');
    audioRef.current.loop = true;
    audioRef.current.load(); // Preload audio

    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [soundEnabled]);

  const playSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          console.warn('Auto-play prevented. User interaction required.');
        });
      }
    }
  }, [soundEnabled]);

  const stopSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  return { playSound, stopSound };
}