'use client';

import React, { useEffect, useState } from 'react';
import { format, addDays } from 'date-fns';
import { useWeather } from '@/providers/weather-provider';
import { useDashboard } from '@/providers/dashboard-provider';
import { Button } from './ui/button';
import { useRouter, usePathname } from 'next/navigation';
import { Card, CardContent } from './ui/card';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
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

interface SoundToggleProps {
  sound: boolean;
  toggleSound: () => void;
  isFireTV?: boolean;
}

interface HeaderProps {
  isFireTV?: boolean;
}

export default function Header({ isFireTV = false }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { weather, loading } = useWeather();
  const { sound } = useDashboard();
  const router = useRouter();
  const pathname = usePathname();

  // Update the clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Toggle sound function
  const toggleSound = () => {
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('sound', sound ? 'off' : 'on');
    router.push(`${pathname}?${searchParams.toString()}`);
  };

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

        <div className="flex items-center gap-2">
          {/* Sound Toggle Button */}
          <SoundToggle sound={sound} toggleSound={toggleSound} isFireTV={isFireTV} />
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
      <span className={timeClasses}>{format(currentTime, 'h:mm:ss a')}</span>
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

  const todayWeather = weather.days[0];

  // Adjust sizing for Fire TV
  const containerClasses = isFireTV
    ? 'flex flex-col items-center bg-secondary/50 p-4 rounded-lg border border-border shadow-sm cursor-pointer hover:bg-secondary/70 transition-colors'
    : 'flex flex-col items-center bg-secondary/50 p-3 rounded-lg border border-border shadow-sm cursor-pointer hover:bg-secondary/70 transition-colors';

  // Adjust popover size for Fire TV
  const popoverWidth = isFireTV ? 'w-[420px]' : 'w-[350px]';

  return (
    <div className="hidden md:block">
      <Popover>
        <PopoverTrigger asChild>
          <div className={containerClasses}>
            <CompactDayWeather day={todayWeather} isToday={true} isFireTV={isFireTV} />
          </div>
        </PopoverTrigger>
        <PopoverContent className={`${popoverWidth} p-0`} align="center">
          <Card>
            <CardContent className="p-0">
              <div className="flex overflow-x-auto scrollbar-thin">
                {weather.days.slice(0, 7).map((day, index) => (
                  <CompactDayWeather key={index} day={day} isToday={index === 0} isFireTV={isFireTV} />
                ))}
              </div>
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Compact day weather for the forecast popover
function CompactDayWeather({ day, isToday, isFireTV = false }: DayWeatherProps & { isToday: boolean }) {
  // Wider container for Fire TV
  const containerWidth = isFireTV ? 'w-[170px]' : 'w-[140px]';
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

  return (
    <div className={`flex-shrink-0 ${containerWidth} ${containerPadding} border-r last:border-r-0 border-border`}>
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
          <span>Wind: {Math.round(day.windspeed)}</span>
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
function SoundToggle({ sound, toggleSound, isFireTV = false }: SoundToggleProps) {
  // Adjust button size, icon size, and text for Fire TV
  const buttonSize = isFireTV ? 'sm' : 'lg';
  const iconSize = isFireTV ? 'h-5 w-5' : 'h-4 w-4';
  const buttonPadding = isFireTV ? 'px-3' : '';

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={sound ? 'default' : 'outline'}
        size={buttonSize}
        onClick={toggleSound}
        className={`flex items-center gap-2 transition-all duration-200 ${buttonPadding} ${sound ? 'bg-primary hover:bg-primary/90' : ''}`}
      >
        {sound ? (
          <>
            <SoundOnIcon className={iconSize} />
            <span className={isFireTV ? 'inline' : 'hidden sm:inline'}>Sound On</span>
          </>
        ) : (
          <>
            <SoundOffIcon className={iconSize} />
            <span className={isFireTV ? 'inline' : 'hidden sm:inline'}>Sound Off</span>
          </>
        )}
      </Button>
    </div>
  );
}

// Icon components
function SoundOnIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function SoundOffIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}
