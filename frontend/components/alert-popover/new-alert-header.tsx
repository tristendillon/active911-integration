'use client';

import type { Alert } from '@/lib/types';
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import useAmazonDevice from '@/hooks/use-amazon-device';

interface NewAlertHeaderProps {
  alert: Alert;
  onDismiss: () => void;
  autoCloseTime: number;
  isFireTV?: boolean;
  turnoutTimeSeconds: number;
}

export default function NewAlertHeader({ alert, onDismiss, autoCloseTime, isFireTV = false, turnoutTimeSeconds }: NewAlertHeaderProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const { isAmazonDevice } = useAmazonDevice();
  useEffect(() => {
    const startTime = Date.now() - turnoutTimeSeconds * 1000;

    // Set up interval to update elapsed time every 10ms for smoother stopwatch
    const intervalId = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 10);

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  // Format elapsed time as mm:ss:ms
  const formatTime = (ms: number): string => {
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  };

  return (
    <header className={cn('bg-background border-b shadow-sm w-full', isFireTV ? 'p-5' : 'p-4')}>
      <div className="w-full flex items-center justify-between">
        <div className={cn('flex items-center', isFireTV ? 'gap-5' : 'gap-4')}>
          {/* Alert icon */}
          <div className={cn('rounded-full bg-red-500 flex items-center justify-center text-white', isFireTV ? 'w-14 h-14' : 'w-10 h-10')}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={isFireTV ? '28' : '24'}
              height={isFireTV ? '28' : '24'}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>

          {/* Alert title */}
          <div>
            <h1 className={cn('font-bold', isFireTV ? 'text-2xl' : 'text-xl')}>New Alert</h1>
            <p className={cn('text-muted-foreground', isFireTV ? 'text-base' : 'text-sm')}>Auto-dismissing in {autoCloseTime} seconds.</p>
          </div>
        </div>

        {/* Agency info if available */}
        {alert.agency && (
          <div className="hidden md:block">
            <p className={cn('font-medium', isFireTV ? 'text-4xl' : 'text-3xl')}>{alert.agency.name}</p>
          </div>
        )}

        <div className="flex items-center gap-4">
          {/* Turnout Timer */}
          <div className={cn('font-mono font-bold text-red-600 bg-red-100 rounded-lg px-3 py-1 border border-red-300', isFireTV ? 'text-3xl' : 'text-2xl')}>
            {formatTime(elapsedMs)}
          </div>

          {/* Dismiss button */}
          {!isAmazonDevice && (
            <button className={cn('bg-primary text-primary-foreground rounded hover:bg-primary/90', isFireTV ? 'px-4 py-2 text-base' : 'px-3 py-1.5 text-sm')} onClick={onDismiss}>
              Dismiss
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
