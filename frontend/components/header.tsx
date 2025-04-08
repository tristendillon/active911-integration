'use client';

import React, { useEffect, useState } from 'react';
import { format, addDays } from 'date-fns';
import { useWeather } from '@/providers/weather-provider';
import { Skeleton } from './ui/skeleton';
import { Weather, WeatherDay } from '@/lib/types';
import Image from 'next/image';

// Component Props Interfaces
interface ClockDisplayProps {
  currentTime: Date;
  isFireTV?: boolean;
}

interface WeatherDisplayProps {
  weather: Weather | null;
  loading: boolean;
  isFireTV?: boolean;
}

interface DayWeatherProps {
  day: WeatherDay;
  isFireTV?: boolean;
}


interface HeaderProps {
  isFireTV?: boolean;
}

export default function Header({ isFireTV = false }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { weather, loading } = useWeather();

  // Update the clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Adjust header height based on device type
  const headerHeight = isFireTV ? 'h-[180px]' : 'h-[150px]';
  // Adjust padding for FireTV
  const headerPadding = isFireTV ? 'px-6' : 'px-4 md:px-6';

  return (
    <header className={`w-full z-10 border-border border-b bg-secondary ${headerHeight} ${headerPadding} shadow-sm`}>
      <div className="h-full flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Date and Time Display */}
          <ClockDisplay currentTime={currentTime} isFireTV={isFireTV} />

          {/* Weather Information */}
          <WeatherDisplay weather={weather} loading={loading} isFireTV={isFireTV} />
        </div>
      </div>
    </header>
  );
}

// Clock component
function ClockDisplay({ currentTime, isFireTV = false }: ClockDisplayProps) {
  // Increased padding and text size for FireTV
  const containerClasses = isFireTV ? 'flex flex-col bg-secondary/50 p-4 rounded-lg shadow-sm' : 'flex flex-col bg-secondary/50 p-3 rounded-lg shadow-sm';

  const dateClasses = isFireTV ? 'text-2xl sm:text-3xl font-semibold tracking-tight' : 'text-xl sm:text-2xl font-semibold tracking-tight';

  const timeClasses = isFireTV ? 'text-3xl sm:text-4xl font-bold tracking-tight' : 'text-2xl sm:text-3xl font-bold tracking-tight';

  return (
    <div className={containerClasses}>
      <span className={dateClasses}>{format(currentTime, 'EEE, MMM d')}</span>
      <span className={timeClasses}>{format(currentTime, 'HH:mm:ss')}</span>
    </div>
  );
}

// Weather component
function WeatherDisplay({ weather, loading, isFireTV = false }: WeatherDisplayProps) {
  if (loading) {
    return <WeatherSkeleton isFireTV={isFireTV} />;
  }

  if (!weather?.days?.length) {
    const textSize = isFireTV ? 'text-2xl' : 'text-xl';
    return (
      <div className={`hidden md:flex items-center justify-center ${isFireTV ? 'h-20' : 'h-16'}`}>
        <span className={textSize}>Weather Unavailable</span>
      </div>
    );
  }

  return (
    <div className="hidden md:block">
      <div className="flex items-center gap-2">
        {weather.days.map((day, index) => (
          <CompactDayWeather key={index} day={day} isToday={index === 0} isFireTV={isFireTV} />
        ))}
      </div>
    </div>
  );
}

// Compact day weather for the forecast popover
function CompactDayWeather({ day, isToday, isFireTV = false }: DayWeatherProps & { isToday: boolean }) {
  // Wider container for Fire TV
  const containerWidth = 'w-[170px]';
  const containerPadding = isFireTV ? 'p-4' : 'p-3';

  // Larger text for Fire TV
  const dateTextSize = isFireTV ? 'text-base font-medium' : 'text-sm font-medium';
  const tempTextSize = isFireTV ? 'text-lg font-bold' : 'font-bold';
  const conditionsTextSize = isFireTV ? 'text-sm text-muted-foreground truncate max-w-full block' : 'text-xs text-muted-foreground truncate max-w-full block';
  const detailsTextSize = isFireTV ? 'text-sm' : 'text-xs';

  // Larger icon for Fire TV
  const iconSize = isFireTV ? 'w-10 h-10 my-2' : 'w-8 h-8 my-1';
  const iconWidth = isFireTV ? 40 : 32;
  const iconHeight = isFireTV ? 40 : 32;

  // Convert wind direction from degrees to cardinal direction
  const getWindDirection = (degrees: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };

  return (
    <div className={`flex-shrink-0 ${containerWidth} ${containerPadding} border-l last:border-r border-border`}>
      <div className="flex flex-col items-center">
        <span className={dateTextSize}>
          {isToday ? 'Today' : format(addDays(new Date(day.datetime), 1), 'EEE, M/d')}
        </span>

        {day.icon && (
          <div className={`relative ${iconSize}`}>
            <object data={`/icons/${day.icon}.svg`} type="image/svg+xml" className="w-full h-full" aria-label={day.conditions}>
              <Image src={`/icons/${day.icon}.svg`} alt={day.conditions} className="w-full h-full" width={iconWidth} height={iconHeight} />
            </object>
          </div>
        )}

        <div className="text-center">
          <div className="flex justify-center gap-2">
            <span className={tempTextSize}>{Math.round(day.tempmax)}°</span>
            <span className="text-muted-foreground">{Math.round(day.tempmin)}°</span>
          </div>
          <span className={conditionsTextSize}>{day.conditions}</span>
        </div>

        <div className={`flex justify-between w-full mt-1 ${detailsTextSize}`}>
          <span>Precip: {day.precipprob}%</span>
          <span>Humid: {Math.round(day.humidity)}%</span>
        </div>

        <div className={`flex justify-center w-full mt-1 ${detailsTextSize}`}>
          <span>Wind: {Math.round(day.windspeed)} mph {getWindDirection(day.winddir)}</span>
        </div>
      </div>
    </div>
  );
}

function WeatherSkeleton({ isFireTV = false }: { isFireTV?: boolean }) {
  // Adjust sizes for Fire TV
  const containerHeight = isFireTV ? 'h-20' : 'h-16';
  const containerWidth = isFireTV ? 'w-72' : 'w-64';
  const containerPadding = isFireTV ? 'p-4' : 'p-3';

  const iconSize = isFireTV ? 'h-14 w-14' : 'h-12 w-12';
  const textHeight1 = isFireTV ? 'h-7' : 'h-6';
  const textWidth1 = isFireTV ? 'w-20' : 'w-16';
  const textHeight2 = isFireTV ? 'h-5' : 'h-4';
  const textWidth2 = isFireTV ? 'w-28' : 'w-24';

  return (
    <div
      className={`hidden md:flex ${containerHeight} ${containerWidth} items-center justify-center bg-secondary/50 ${containerPadding} rounded-lg border border-border shadow-sm`}
    >
      <div className="flex items-center gap-3">
        <Skeleton className={`${iconSize} rounded-full`} />
        <div className="flex flex-col gap-2">
          <Skeleton className={`${textHeight1} ${textWidth1}`} />
          <Skeleton className={`${textHeight2} ${textWidth2}`} />
        </div>
      </div>
    </div>
  );
}
