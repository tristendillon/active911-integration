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

interface ViewControlsProps {
  zoomIn: () => void;
  zoomOut: () => void;
  toggleFullscreen: () => void;
  zoomLevel: number;
  isFullscreen: boolean;
}

export default function Header() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { weather, loading } = useWeather();
  const { sound } = useDashboard();
  const router = useRouter();
  const pathname = usePathname();
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Update the clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Check fullscreen status when it changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Toggle sound function
  const toggleSound = () => {
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('sound', sound ? 'off' : 'on');
    router.push(`${pathname}?${searchParams.toString()}`);
  };

  // Zoom functions
  const zoomIn = () => {
    if (zoomLevel < 150) {
      const newZoom = zoomLevel + 10;
      setZoomLevel(newZoom);
      document.body.style.zoom = `${newZoom}%`;
    }
  };

  const zoomOut = () => {
    if (zoomLevel > 70) {
      const newZoom = zoomLevel - 10;
      setZoomLevel(newZoom);
      document.body.style.zoom = `${newZoom}%`;
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
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

        <div className="flex items-center gap-2">
          {/* View Controls (Zoom and Fullscreen) */}
          <ViewControls 
            zoomIn={zoomIn}
            zoomOut={zoomOut}
            toggleFullscreen={toggleFullscreen}
            zoomLevel={zoomLevel}
            isFullscreen={isFullscreen}
          />

          {/* Sound Toggle Button */}
          <SoundToggle sound={sound} toggleSound={toggleSound} />
        </div>
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

// New View Controls Component
function ViewControls({ zoomIn, zoomOut, toggleFullscreen, zoomLevel, isFullscreen }: ViewControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={zoomOut}
        className="flex items-center gap-1"
        title="Zoom Out"
      >
        <ZoomOutIcon className="h-4 w-4" />
        <span className="hidden sm:inline">-</span>
      </Button>
      
      <span className="text-xs font-medium hidden sm:block">{zoomLevel}%</span>
      
      <Button
        variant="outline"
        size="sm"
        onClick={zoomIn}
        className="flex items-center gap-1"
        title="Zoom In"
      >
        <ZoomInIcon className="h-4 w-4" />
        <span className="hidden sm:inline">+</span>
      </Button>
      
      <Button
        variant={isFullscreen ? "default" : "outline"}
        size="sm"
        onClick={toggleFullscreen}
        className={`flex items-center ${isFullscreen ? 'bg-primary hover:bg-primary/90' : ''}`}
        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
      >
        {isFullscreen ? (
          <FullscreenExitIcon className="h-4 w-4" />
        ) : (
          <FullscreenIcon className="h-4 w-4" />
        )}
      </Button>
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

// Icon components
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

// New icon components for zoom and fullscreen
function ZoomInIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

function ZoomOutIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}

function FullscreenIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function FullscreenExitIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
      <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
      <path d="M3 16h3a2 2 0 0 1 2 2v3" />
      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
    </svg>
  );
}
