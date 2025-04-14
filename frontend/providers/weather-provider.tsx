'use client';

import { Weather } from '@/lib/types';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useDashboard } from './dashboard-provider';


interface WeatherProviderProps {
  children: React.ReactNode;
}

interface WeatherContextType {
  weather: Weather | null;
  loading: boolean;
}

const WeatherContext = createContext<WeatherContextType | null>(null);

export function WeatherProvider({ children }: WeatherProviderProps) {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { emitListener } = useDashboard()

  const fetchWeather = async () => {
    try {
      setLoading(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/weather`, {
          signal: controller.signal
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setWeather(data.data);
        } else {
          console.error('Failed to fetch weather data:', data.error || 'Unknown error');
        }
        clearTimeout(timeoutId);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.error('Weather fetch request timed out');
        }
        throw error;
      }
    } catch (error) {
      console.error('Error fetching weather data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch initial weather data
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchWeather();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial fetch
    fetchWeather();

    // Set up a fallback refresh every hour in case WebSocket updates fail
    intervalRef.current = setInterval(fetchWeather, 60 * 60 * 1000); // 1 hour interval

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    emitListener("new_weather", (data) => {
      console.log("New Weather Data")
      console.log(data)
    })

  }, [emitListener])


  return (
    <WeatherContext.Provider
      value={{
        weather,
        loading,
      }}
    >
      {children}
    </WeatherContext.Provider>
  );
}

export function useWeather() {
  const weather = useContext(WeatherContext);
  if (!weather) {
    throw new Error('useWeather must be used within a WeatherProvider');
  }
  return weather;
}
