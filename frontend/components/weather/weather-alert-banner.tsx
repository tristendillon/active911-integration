'use client';

import type { WeatherAlert } from '@/lib/types';
import { format } from 'date-fns';

interface WeatherAlertBannerProps {
  weatherAlert: WeatherAlert;
  isFireTV?: boolean;
}

export function WeatherAlertBanner({ weatherAlert, isFireTV = false }: WeatherAlertBannerProps) {
  // Function to determine background color based on alert type
  const getBgColor = (event: string) => {
    if (event.toLowerCase().includes('warning')) {
      return 'bg-red-600/50';
    } else if (event.toLowerCase().includes('watch')) {
      return 'bg-orange-500/50';
    } else if (event.toLowerCase().includes('advisory')) {
      return 'bg-yellow-500/50';
    } else {
      return 'bg-blue-500/50'; // Default case for other types
    }
  };

  // Format dates nicely
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, h:mm a');
  };

  // Adjust sizes for Fire TV
  const padding = isFireTV ? 'px-5 py-4' : 'px-4 py-3';
  const titleSize = isFireTV ? 'text-xl' : 'text-lg';
  const contentSize = isFireTV ? 'text-base' : 'text-sm';
  const spacing = isFireTV ? 'mt-2 space-y-2' : 'mt-1 space-y-1';
  const width = isFireTV ? 'max-w-lg' : 'max-w-md';

  return (
    <div className={width}>
      <div className={`rounded-lg shadow-lg ${padding} ${getBgColor(weatherAlert.event)}`}>
        <div className="flex flex-col text-white">
          <div className={`font-bold ${titleSize}`}>{weatherAlert.event}</div>
          <div className={`flex flex-col ${contentSize} ${spacing}`}>
            <div className="flex items-center">
              <span className="font-medium">From:</span>
              <span className="ml-1">{formatDate(weatherAlert.onset)}</span>
            </div>
            <div className="flex items-center">
              <span className="font-medium">Until:</span>
              <span className="ml-1">{formatDate(weatherAlert.ends)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
