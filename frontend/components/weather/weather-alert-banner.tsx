'use client';

import type { WeatherAlert } from '@/lib/types';
import { format } from 'date-fns';

interface WeatherAlertBannerProps {
  weatherAlert: WeatherAlert;
}

export function WeatherAlertBanner({ weatherAlert }: WeatherAlertBannerProps) {
  // Function to determine background color based on alert type
  const getBgColor = (event: string) => {
    if (event.toLowerCase().includes('warning')) {
      return 'bg-red-600';
    } else if (event.toLowerCase().includes('watch')) {
      return 'bg-orange-500';
    } else if (event.toLowerCase().includes('advisory')) {
      return 'bg-yellow-500';
    } else {
      return 'bg-blue-500'; // Default case for other types
    }
  };

  // Format dates nicely
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, h:mm a');
  };

  return (
    <div className="max-w-md">
      <div className={`rounded-lg shadow-lg px-4 py-3 ${getBgColor(weatherAlert.event)}`}>
        <div className="flex flex-col text-white">
          <div className="font-bold text-lg">{weatherAlert.event}</div>
          <div className="flex flex-col sm:flex-row text-sm mt-1 space-y-1 sm:space-y-0 sm:space-x-2">
            <div className="flex items-center">
              <span className="font-medium">From:</span>
              <span className="ml-1">{formatDate(weatherAlert.onset)}</span>
            </div>
            <div className="hidden sm:block">|</div>
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
