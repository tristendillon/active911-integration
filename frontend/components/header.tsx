'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { WeatherComponent } from './header-weather';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Sun, Cloud, CloudRain } from 'lucide-react';

interface HeaderProps {
  center: google.maps.LatLngLiteral;
  units: string[];
}

interface WeatherResponse {
  coord: {
    lon: number;
    lat: number;
  };
  weather: {
    id: number;
    main: string;
    description: string;
    icon: string;
  }[];
  base: string;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
    sea_level: number;
    grnd_level: number;
  };
  visibility: number;
  wind: {
    speed: number;
    deg: number;
    gust: number;
  };
  rain?: {
    '1h': number;
  };
  clouds: {
    all: number;
  };
  dt: number;
  sys: {
    type: number;
    id: number;
    country: string;
    sunrise: number;
    sunset: number;
  };
  timezone: number;
  id: number;
  name: string;
  cod: number;
}

const testWeather: WeatherResponse = {
  coord: {
    lon: 7.367,
    lat: 45.133,
  },
  weather: [
    {
      id: 501,
      main: 'Cloudy',
      description: 'overcast clouds',
      icon: '10d',
    },
  ],
  base: 'stations',
  main: {
    temp: 61,
    feels_like: 60,
    temp_min: 29,
    temp_max: 60,
    pressure: 1021,
    humidity: 43,
    sea_level: 1021,
    grnd_level: 910,
  },
  visibility: 10000,
  wind: {
    speed: 16,
    deg: 121,
    gust: 3.47,
  },
  rain: {
    '1h': 0,
  },
  clouds: {
    all: 83,
  },
  dt: 1726660758,
  sys: {
    type: 1,
    id: 6736,
    country: 'US',
    sunrise: 1726636384,
    sunset: 1726680975,
  },
  timezone: 7200,
  id: 3165523,
  name: 'Metro City',
  cod: 200,
};

export default function Header({ center, units }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherResponse | null>(testWeather);
  const { lat, lng } = center;

  useEffect(() => {
    const abortController = new AbortController();
    const timer = setInterval(
      () => {
        setCurrentTime(new Date());
      },
      1000,
      abortController.signal
    );

    // Fetch weather data every 30 minutes
    const fetchWeather = async () => {
      try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=imperial&appid=${process.env.NEXT_PUBLIC_WEATHER_API_KEY}`, {
          signal: abortController.signal,
        });
        const data = await response.json();
        setWeather(data);
      } catch (error) {
        console.error('Error fetching weather:', error);
      }
    };

    // fetchWeather();
    // const weatherTimer = setInterval(fetchWeather, 1800000, abortController.signal); // 30 minutes

    return () => {
      abortController.abort();
    };
  }, [lat, lng]);

  // Function to get forecast data for the next 3 days
  const getForecastData = () => {
    return [
      { day: 'Saturday', highTemp: 49, lowTemp: 31, condition: 'sunny' },
      { day: 'Sunday', highTemp: 52, lowTemp: 39, condition: 'sunny' },
      { day: 'Monday', highTemp: 61, lowTemp: 48, condition: 'rainy' },
    ];
  };

  const forecast = getForecastData();

  // Function to get the right weather icon
  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'sunny':
        return <Sun className="h-5 w-5 text-amber-500" />;
      case 'rainy':
        return <CloudRain className="h-5 w-5 text-blue-500" />;
      default:
        return <Cloud className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <header className="w-full fixed top-0 z-50 bg-background border-b">
      <div className="container px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Date and Time */}
          <div className="flex flex-col">
            <span className="text-2xl font-semibold tracking-tight">{format(currentTime, 'EEE, MMM d')}</span>
            <span className="text-3xl font-bold">{format(currentTime, 'h:mm')}</span>
          </div>

          {/* Logo */}
          <div className="hidden md:flex items-center justify-center">
            <div className="h-14 w-14 rounded-full bg-teal-600 flex items-center justify-center">
              <div className="text-white text-xs font-semibold flex flex-col items-center">
                <span>RESCUE</span>
                <div className="bg-white w-10 mt-1 rounded-sm">
                  <span className="text-teal-600 text-xs">SQUAD</span>
                </div>
              </div>
            </div>
          </div>

          {/* Current Weather */}
          {weather && (
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-medium">{weather.name}</span>
                <span className="text-sm text-muted-foreground">CA</span>
              </div>
              <span className="text-sm text-muted-foreground">{weather.weather[0].main}</span>
              <div className="flex items-baseline">
                <span className="text-3xl font-bold">{Math.round(weather.main.temp)}°</span>
                <span className="text-xs text-muted-foreground ml-1">F</span>
                <div className="ml-2 text-xs text-muted-foreground">
                  <span>↑ {weather.main.temp_max.toFixed(0)}°</span> <span>↓ {weather.main.temp_min.toFixed(0)}°</span>
                </div>
              </div>
            </div>
          )}

          {/* Forecast */}
          <div className="hidden lg:block">
            <Card className="border-none shadow-none">
              <CardContent className="p-0">
                {forecast.map((day, index) => (
                  <div key={index} className="flex items-center justify-between py-1 gap-4">
                    <span className="text-sm font-medium w-20">{day.day}</span>
                    <div className="flex items-center justify-center w-6">{getWeatherIcon(day.condition)}</div>
                    <div className="text-sm">
                      <span className="font-medium">{day.highTemp}°</span> <span className="text-muted-foreground">{day.lowTemp}°</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </header>
  );
}
