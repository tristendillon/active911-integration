'use client';

import { format } from 'date-fns';
import { useDashboard } from '@/providers/dashboard-provider';

export default function Header() {
  const { center, units } = useDashboard();

  const currentTime = new Date();
  return (
    <header className="w-full z-10 border-border border-b bg-secondary h-[150px]">
      <div className="container px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Date and Time */}
          <div className="flex flex-col">
            <span className="text-2xl font-semibold tracking-tight">{format(currentTime, 'EEE, MMM d')}</span>
            <span className="text-3xl font-bold">{format(currentTime, 'h:mm')}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
