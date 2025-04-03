'use client';

import { Weather } from '@/lib/types';
import { createContext, useContext, useEffect, useRef, useState } from 'react';


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

  const fetchWeather = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/weather`);
      const data = await res.json();

      if (res.ok && data.success) {
        setWeather(data.data);
      } else {
        console.error('Failed to fetch weather data:', data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error fetching weather data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Set up WebSocket connection for real-time weather updates
  useEffect(() => {
    // Connect to the WebSocket for dashboard which includes weather updates
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/dashboard`;

    const connectWebSocket = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected for weather updates');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          // Handle weather update messages
          if (message.type === 'weather_update' && message.content) {
            setWeather(message.content);
            setLoading(false);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected, trying to reconnect...');
        setTimeout(connectWebSocket, 3000); // Try to reconnect after 3 seconds
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        ws.close();
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

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
