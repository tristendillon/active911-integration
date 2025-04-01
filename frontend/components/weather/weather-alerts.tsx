'use client';

import { useWeather } from '@/providers/weather-provider';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Autoplay from 'embla-carousel-autoplay';
import { useEffect, useRef, useState } from 'react';
import { LoadingWeatherAlerts } from './loading-weather-alerts';
import { NoWeatherAlerts } from './no-weather-alerts';
import { CommandShortcut } from '../ui/command';
import { cn } from '@/lib/utils';

const AUTO_SCROLL_DELAY = 90;
interface WeatherAlertsProps {
  isFireTV?: boolean;
}

export default function WeatherAlerts({ isFireTV = false }: WeatherAlertsProps) {
  const { weather, loading } = useWeather();
  const [current, setCurrent] = useState(0);
  const [api, setApi] = useState<CarouselApi | null>(null);
  const plugin = useRef(Autoplay({ delay: AUTO_SCROLL_DELAY * 1000, stopOnInteraction: true }));
  const [timeLeft, setTimeLeft] = useState(AUTO_SCROLL_DELAY);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // Clear any existing timer when component unmounts or when effect reruns
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const startTimer = () => {
      // Clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Reset time to 60 seconds
      setTimeLeft(AUTO_SCROLL_DELAY);

      // Start a new timer that decrements every second
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            return AUTO_SCROLL_DELAY; // Reset to 60 when it reaches 0
          }
          return prev - 1;
        });
      }, 1000);
    };

    if (api) {
      // Start the timer when the API is available
      startTimer();

      // Set up event listener for when slides change
      api.on('select', () => {
        setCurrent(api.selectedScrollSnap());
        startTimer(); // Reset timer when slide changes
      });
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [api]);

  useEffect(() => {
    if (!weather?.alerts || weather.alerts.length === 0) return;

    const scrollIntervals: NodeJS.Timeout[] = [];
    let initialDelayTimeout: NodeJS.Timeout | null = null;

    // Only setup auto-scroll for the current alert's description
    const container = scrollContainerRefs.current[current];
    if (!container) return;

    // Only start auto-scroll if content is overflowing
    const isOverflowing = container.scrollHeight > container.clientHeight;

    if (isOverflowing) {
      // Reset to top when a new slide appears
      container.scrollTop = 0;

      // Delay the start of scrolling by 3 seconds to give users time to start reading
      initialDelayTimeout = setTimeout(() => {
        const interval = setInterval(() => {
          // If we're at the bottom, reset to top after a pause
          if (container.scrollTop + container.clientHeight >= container.scrollHeight) {
            // Pause at the bottom for 3 seconds before resetting
            setTimeout(() => {
              container.scrollTop = 0;
            }, 3000);
          } else {
            // Scroll down slowly, 1px every 100ms
            container.scrollTop += 1;
          }
        }, 100);

        scrollIntervals.push(interval);
      }, 3000); // 3 second initial delay
    }

    // Clean up all intervals and timeouts on unmount or when current changes
    return () => {
      scrollIntervals.forEach((interval) => clearInterval(interval));
      if (initialDelayTimeout) clearTimeout(initialDelayTimeout);
    };
  }, [weather?.alerts, current]);

  // Format the time left in mm:ss format
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className={cn(
      "h-full w-full overflow-hidden flex flex-col",
      isFireTV ? "p-3" : "p-2"
    )}>
      {loading && <LoadingWeatherAlerts isFireTV={isFireTV} />}
      {!loading && !weather?.alerts && <NoWeatherAlerts isFireTV={isFireTV} />}
      {!loading && weather?.alerts && weather.alerts.length > 0 && (
        <div className="w-full flex items-center gap-2 justify-end flex-shrink-0">
          <CommandShortcut className={cn(
            isFireTV ? "text-base" : "text-sm"
          )}>
            {formattedTime}
          </CommandShortcut>
        </div>
      )}
      {!loading && weather?.alerts && weather.alerts.length > 0 && (
        <Carousel setApi={setApi} className="flex flex-col w-full h-full overflow-hidden flex-grow" plugins={[plugin.current]}>
          <CarouselContent className="flex h-full">
            {weather.alerts.map((alert, alertIndex) => (
              <CarouselItem key={alert.id} className="h-full">
                <Card className={cn(
                  "flex flex-col h-full overflow-hidden py-0 md:py-2 lg:py-4",
                  isFireTV ? "gap-1" : "gap-2 md:gap-4 lg:gap-6"
                )}>
                  <CardHeader className={cn(
                    "flex-shrink-0",
                    isFireTV ? "p-3" : "p-2"
                  )}>
                    <div className="flex justify-between items-start">
                      <CardTitle className={cn(
                        isFireTV ? "text-base sm:text-lg" : "text-sm sm:text-base"
                      )}>
                        {alert.event}
                      </CardTitle>
                    </div>
                    <CardDescription className={cn(
                      isFireTV ? "text-sm sm:text-base" : "text-xs sm:text-sm"
                    )}>
                      {alert.headline}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className={cn(
                    "flex-grow flex flex-col overflow-hidden",
                    isFireTV ? "p-1" : "p-2"
                  )}>
                    <div className="flex flex-col h-full overflow-hidden">
                      <div
                        id="auto-scroll"
                        className={cn(
                          "flex flex-col mt-2 overflow-y-hidden flex-grow",
                          isFireTV ? "gap-2 sm:gap-3" : "gap-1 sm:gap-2"
                        )}
                        ref={(el) => {
                          scrollContainerRefs.current[alertIndex] = el;
                        }}
                        style={{
                          scrollBehavior: 'smooth',
                          maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
                        }}
                      >
                        {alert.description.split('\n').map((line, i) => (
                          <p key={i} className={cn(
                            isFireTV ? "text-base" : ""
                          )}>
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="flex justify-center gap-2 mt-2 flex-shrink-0">
            {weather.alerts.map((_, index) => (
              <div key={index} className={cn(
                "rounded-full transition-colors",
                isFireTV ? "h-3 w-3" : "h-2 w-2",
                current === index ? "bg-primary" : "bg-primary/30"
              )} />
            ))}
          </div>
        </Carousel>
      )}
    </div>
  );
}
