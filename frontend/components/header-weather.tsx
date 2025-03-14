import React from 'react';
import { Sun, Moon, Cloud, CloudRain, Droplets, Wind } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

// Define types for props
interface WeatherComponentProps {
  time: Date;
  weatherData?: {
    temp: number;
    condition: string;
    precipitation: string;
    humidity: string;
    wind: string;
  };
}

function fahrenheitToCelsius(fahrenheit: number): number {
  return ((fahrenheit - 32) * 5) / 9;
}

export function WeatherComponent({
  time,
  weatherData = {
    temp: 63,
    condition: 'Clear',
    precipitation: '0%',
    humidity: '43%',
    wind: '16 mph',
  },
}: WeatherComponentProps) {
  // Calculate sun/moon icon fill based on time of day
  const getSunMoonPosition = () => {
    const hour = time.getHours();
    const minute = time.getMinutes();
    const timeInMinutes = hour * 60 + minute;

    // Time ranges (in minutes)
    const dayStart = 6 * 60; // 6 AM
    const dayEnd = 18 * 60; // 6 PM
    const fullDay = 24 * 60; // Full day in minutes

    // Check if it's day or night
    if (timeInMinutes >= dayStart && timeInMinutes <= dayEnd) {
      // Daytime: sun goes from top (noon) to bottom (sunset)
      const dayProgress = Math.min(1, Math.max(0, (timeInMinutes - dayStart) / (dayEnd - dayStart)));
      return {
        isDay: true,
        position: dayProgress,
        color: dayProgress > 0.8 ? '#FFA500' : '#FFD700', // Orange as sunset approaches
      };
    } else {
      // Nighttime: moon fills up as it gets closer to midnight
      let nightProgress;
      if (timeInMinutes > dayEnd) {
        // Evening to midnight
        nightProgress = Math.min(1, (timeInMinutes - dayEnd) / (fullDay - dayEnd));
      } else {
        // Midnight to morning
        nightProgress = Math.max(0, 1 - timeInMinutes / dayStart);
      }
      return {
        isDay: false,
        position: nightProgress,
        color: '#F5F5F5',
      };
    }
  };

  const sunMoonInfo = getSunMoonPosition();

  // Get the appropriate weather icon based on condition
  const getWeatherIcon = () => {
    const condition = weatherData.condition.toLowerCase();
    if (condition.includes('rain') || condition.includes('drizzle') || condition.includes('shower')) {
      return <CloudRain className="h-6 w-6 text-blue-500" />;
    } else if (condition.includes('cloud') || condition.includes('overcast') || condition.includes('fog') || condition.includes('mist')) {
      return <Cloud className="h-6 w-6 text-gray-400" />;
    } else if (sunMoonInfo.isDay) {
      return <Sun className="h-6 w-6 text-amber-500" />;
    } else {
      return <Moon className="h-6 w-6 text-gray-300" />;
    }
  };

  return (
    <Card className="border border-border shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-col space-y-4">
          {/* Temperature and condition section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getWeatherIcon()}
              <div>
                <div className="text-2xl font-bold">
                  {weatherData.temp.toFixed(0)}
                  <span className="text-sm align-top">°F</span>
                  <span className="text-sm font-normal text-muted-foreground ml-1">/{fahrenheitToCelsius(weatherData.temp).toFixed(0)}°C</span>
                </div>
                <div className="text-sm text-muted-foreground">{weatherData.condition}</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Weather metrics */}
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="flex items-center gap-1.5">
              <Droplets className="h-4 w-4 text-blue-500" />
              <span className="text-muted-foreground">Precip: {weatherData.precipitation}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Droplets className="h-4 w-4 text-blue-300" />
              <span className="text-muted-foreground">Humidity: {weatherData.humidity}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Wind className="h-4 w-4 text-gray-500" />
              <span className="text-muted-foreground">Wind: {weatherData.wind}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
