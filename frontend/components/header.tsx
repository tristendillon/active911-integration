'use client';

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useWeather } from '@/providers/weather-provider';
import { useDashboard } from '@/providers/dashboard-provider';
import { Button } from './ui/button';
import { useRouter, usePathname } from 'next/navigation';
import {
  Card,
  CardContent,
} from './ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { Skeleton } from './ui/skeleton';
import { Weather, WeatherDay } from '@/lib/types';
import Image from 'next/image';

// Component Props Interfaces
interface ClockDisplayProps {
  currentTime: Date;
}

interface WeatherDisplayProps {
  weather: Weather | null;
  loading: boolean;
}

interface DayWeatherProps {
  day: WeatherDay;
}


interface SoundToggleProps {
  sound: boolean;
  toggleSound: () => void;
}


export default function Header() {
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

  return (
    <header className="w-full z-10 border-border border-b bg-secondary h-[150px] px-4 md:px-6 shadow-sm">
      <div className="h-full flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Date and Time Display */}
          <ClockDisplay currentTime={currentTime} />

          {/* Weather Information */}
          <WeatherDisplay weather={weather} loading={loading} />
        </div>

        {/* Sound Toggle Button */}
        <SoundToggle sound={sound} toggleSound={toggleSound} />
      </div>
    </header>
  );
}

// Clock component
function ClockDisplay({ currentTime }: ClockDisplayProps) {
  return (
    <div className="flex flex-col bg-secondary/50 p-3 rounded-lg shadow-sm">
      <span className="text-xl sm:text-2xl font-semibold tracking-tight">
        {format(currentTime, 'EEE, MMM d')}
      </span>
      <span className="text-2xl sm:text-3xl font-bold tracking-tight">
        {format(currentTime, 'h:mm:ss a')}
      </span>
    </div>
  );
}

// Weather component
function WeatherDisplay({ weather, loading }: WeatherDisplayProps) {
  if (loading) {
    return <WeatherSkeleton />;
  }

  if (!weather?.days?.length) {
    return (
      <div className="hidden md:flex items-center justify-center h-16">
        <span className="text-xl">Weather Unavailable</span>
      </div>
    );
  }

  const todayWeather = weather.days[0];

  return (
    <div className="hidden md:block">
      <Popover>
        <PopoverTrigger asChild>
          <div className="flex flex-col items-center bg-secondary/50 p-3 rounded-lg border border-border shadow-sm cursor-pointer hover:bg-secondary/70 transition-colors">
            <CompactDayWeather day={todayWeather} isToday={true} />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0" align="center">
          <Card>
            <CardContent className="p-0">
              <div className="flex overflow-x-auto scrollbar-thin">
                {weather.days.slice(0, 7).map((day, index) => (
                  <CompactDayWeather key={index} day={day} isToday={index === 0} />
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
function CompactDayWeather({ day, isToday }: DayWeatherProps & { isToday: boolean }) {
  return (
    <div className="flex-shrink-0 w-[140px] p-3 border-r last:border-r-0 border-border">
      <div className="flex flex-col items-center">
        <span className="text-sm font-medium">
          {isToday ? 'Today' : format(new Date(day.datetime), 'EEE, M/d')}
        </span>

        {day.icon && (
          <div className="relative w-8 h-8 my-1">
            <object
              data={`/icons/${day.icon}.svg`}
              type="image/svg+xml"
              className="w-full h-full"
              aria-label={day.conditions}
            >
              <Image
                src={`/icons/${day.icon}.svg`}
                alt={day.conditions}
                className="w-full h-full"
                width={32}
                height={32}
              />
            </object>
          </div>
        )}

        <div className="text-center">
          <div className="flex justify-center gap-2">
            <span className="font-bold">{Math.round(day.tempmax)}°</span>
            <span className="text-muted-foreground">{Math.round(day.tempmin)}°</span>
          </div>
          <span className="text-xs text-muted-foreground truncate max-w-full block">
            {day.conditions}
          </span>
        </div>

        <div className="flex justify-between w-full mt-1 text-xs">
          <span>Precip: {day.precipprob}%</span>
          <span>Wind: {Math.round(day.windspeed)}</span>
        </div>
      </div>
    </div>
  );
}

function WeatherSkeleton() {
  return (
    <div className="hidden md:flex h-16 w-64 items-center justify-center bg-secondary/50 p-3 rounded-lg border border-border shadow-sm">
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

function SoundToggle({ sound, toggleSound }: SoundToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant={sound ? "default" : "outline"}
        size="sm"
        onClick={toggleSound}
        className={`flex items-center gap-2 transition-all duration-200 ${sound ? 'bg-primary hover:bg-primary/90' : ''}`}
      >
        {sound ? (
          <>
            <SoundOnIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Sound On</span>
          </>
        ) : (
          <>
            <SoundOffIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Sound Off</span>
          </>
        )}
      </Button>
    </div>
  );
}
function SoundOnIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function SoundOffIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}