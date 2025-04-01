'use client';

import type { Alert } from '@/lib/types';
import React from 'react';

interface NewAlertHeaderProps {
  alert: Alert;
  onDismiss: () => void;
  autoCloseTime: number;
  isFireTV?: boolean;
}

export default function NewAlertHeader({ alert, onDismiss, autoCloseTime, isFireTV = false }: NewAlertHeaderProps) {

  // Adjust sizes for Fire TV
  const headerPadding = isFireTV ? "p-5" : "p-4";
  const iconSize = isFireTV ? "w-14 h-14" : "w-10 h-10";
  const svgSize = isFireTV ? "28" : "24";
  const titleSize = isFireTV ? "text-2xl" : "text-xl";
  const subtitleSize = isFireTV ? "text-base" : "text-sm";
  const agencySize = isFireTV ? "text-4xl" : "text-3xl";
  const buttonSize = isFireTV ? "px-4 py-2 text-base" : "px-3 py-1.5 text-sm";
  const gap = isFireTV ? "gap-5" : "gap-4";
  
  return (
    <header className={`bg-background ${headerPadding} border-b shadow-sm w-full`}>
      <div className="w-full flex items-center justify-between">
        <div className={`flex items-center ${gap}`}>
          {/* Alert icon */}
          <div className={`${iconSize} rounded-full bg-red-500 flex items-center justify-center text-white`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={svgSize}
              height={svgSize}
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
            <h1 className={`${titleSize} font-bold`}>New Alert</h1>
            <p className={`${subtitleSize} text-muted-foreground`}>Auto-dismissing in {autoCloseTime} seconds</p>
          </div>
        </div>

        {/* Agency info if available */}
        {alert.agency && (
          <div className="hidden md:block">
            <p className={`${agencySize} font-medium`}>{alert.agency.name}</p>
          </div>
        )}

        {/* Dismiss button */}
        <button 
          className={`${buttonSize} bg-primary text-primary-foreground rounded hover:bg-primary/90`} 
          onClick={onDismiss}
        >
          Dismiss
        </button>
      </div>
    </header>
  );
}
