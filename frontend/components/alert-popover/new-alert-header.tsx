'use client';

import type { Alert } from '@/lib/types';
import React from 'react';

interface NewAlertHeaderProps {
  alert: Alert;
  onDismiss: () => void;
  autoCloseTime: number;
  onPlaySound: () => void;
}

export default function NewAlertHeader({ alert, onDismiss, autoCloseTime, onPlaySound }: NewAlertHeaderProps) {
  return (
    <header className="bg-background p-4 border-b shadow-sm w-full">
      <div className="w-full flex items-center  justify-between">
        <div className="flex items-center gap-4">
          {/* Alert icon */}
          <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
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
            <h1 className="text-xl font-bold">New Alert</h1>
            <p className="text-sm text-muted-foreground">Auto-dismissing in {autoCloseTime} seconds</p>
          </div>
        </div>

        {/* Agency info if available */}
        {alert.agency && (
          <div className="hidden md:block">
            <p className="text-3xl font-medium">{alert.agency.name}</p>
          </div>
        )}

        {/* Dismiss button */}
        <button className="px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </header>
  );
}
