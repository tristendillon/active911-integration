'use client';

import { WeatherAlertBanner } from '@/components/weather/weather-alert-banner';
import type { Weather } from '@/lib/types';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

interface WeatherProviderProps {
  children: React.ReactNode;
  center: google.maps.LatLngLiteral;
}

interface WeatherContextType {
  weather: Weather | null;
  loading: boolean;
}

const WeatherContext = createContext<WeatherContextType | null>(null);

const testWeather: Weather = {
  latitude: 38.8712,
  longitude: -99.3329,
  resolvedAddress: 'Hays, KS, United States',
  address: 'hays kansas',
  timezone: 'America/Chicago',
  tzoffset: -5,
  days: [
    {
      datetime: '2025-03-14',
      tempmax: 69.2,
      tempmin: 44.2,
      temp: 57.5,
      feelslikemax: 69.2,
      feelslikemin: 35.4,
      feelslike: 56.5,
      precip: 0,
      precipprob: 0,
      precipcover: 0,
      preciptype: ['rain'],
      windspeed: 33.2,
      cloudcover: 11.8,
      visibility: 9.7,
      conditions: 'Clear',
      icon: 'wind',
    },
    {
      datetime: '2025-03-15',
      tempmax: 54.9,
      tempmin: 35,
      temp: 44.3,
      feelslikemax: 54.9,
      feelslikemin: 23.1,
      feelslike: 37.2,
      precip: 0,
      precipprob: 2,
      precipcover: 0,
      preciptype: null,
      windspeed: 28.6,
      cloudcover: 25,
      visibility: 10.1,
      conditions: 'Partially cloudy',
      icon: 'partly-cloudy-day',
    },
    {
      datetime: '2025-03-16',
      tempmax: 63.9,
      tempmin: 24,
      temp: 44.1,
      feelslikemax: 63.9,
      feelslikemin: 18,
      feelslike: 40.7,
      precip: 0,
      precipprob: 0,
      precipcover: 0,
      preciptype: null,
      windspeed: 15,
      cloudcover: 11.5,
      visibility: 10.1,
      conditions: 'Clear',
      icon: 'clear-day',
    },
  ],
  // alerts: [],
  alerts: [
    {
      event: 'Fire Weather Watch',
      headline: 'Fire Weather Watch issued March 14 at 8:36PM CDT until March 15 at 8:00PM CDT by NWS Dodge City KS',
      ends: '2025-03-15T04:45:00',
      endsEpoch: 1742031900,
      onset: '2025-03-15T13:00:00',
      onsetEpoch: 1742061600,
      id: 'urn:oid:2.49.0.1.840.0.5d6731172fc31b0f3ee37ad83d4f6b775d5dac09.003.1',
      language: 'en',
      link: 'http://www.weather.gov',
      description:
        '* AFFECTED AREA...Fire Weather Zone 030 Trego, Fire Weather Zone\n031 Ellis, Fire Weather Zone 043 Scott, Fire Weather Zone 044\nLane, Fire Weather Zone 045 Ness, Fire Weather Zone 046 Rush,\nFire Weather Zone 061 Hamilton, Fire Weather Zone 062 Kearny,\nFire Weather Zone 063 Finney, Fire Weather Zone 064 Hodgeman,\nFire Weather Zone 065 Pawnee, Fire Weather Zone 074 Stanton,\nFire Weather Zone 075 Grant, Fire Weather Zone 076 Haskell,\nFire Weather Zone 077 Gray, Fire Weather Zone 078 Ford, Fire\nWeather Zone 079 Edwards, Fire Weather Zone 080 Kiowa, Fire\nWeather Zone 084 Morton, Fire Weather Zone 085 Stevens, Fire\nWeather Zone 086 Seward, Fire Weather Zone 087 Meade and Fire\nWeather Zone 088 Clark.\n\n* TIMING...From Saturday afternoon through Saturday evening.\n\n* WINDS...North 15 to 25 mph with gusts up to 40 mph.\n\n* RELATIVE HUMIDITY...As low as 13 percent.\n\n* IMPACTS...Any fire that develops will catch and spread\nquickly. Outdoor burning is not recommended.\n',
    },
    {
      event: 'Red Flag Warning',
      headline: 'Red Flag Warning issued March 15 at 2:02AM CDT until March 15 at 8:00PM CDT by NWS Dodge City KS',
      ends: '2025-03-15T10:15:00',
      endsEpoch: 1742051700,
      onset: '2025-03-15T12:00:00',
      onsetEpoch: 1742058000,
      id: 'urn:oid:2.49.0.1.840.0.3fcca733ce36f69bcb35cfc7b3e0ddff9e5607c2.001.2',
      language: 'en',
      link: 'http://www.weather.gov',
      description:
        'The National Weather Service in Dodge City has issued a Red Flag\nWarning for wind and low relative humidity, which is in effect\nfrom noon CDT /11 AM MDT/ today to 8 PM CDT /7 PM MDT/ this\nevening. The Fire Weather Watch is no longer in effect.\n\n* AFFECTED AREA...Fire Weather Zone 030 Trego, Fire Weather Zone\n031 Ellis, Fire Weather Zone 043 Scott, Fire Weather Zone 044\nLane, Fire Weather Zone 045 Ness, Fire Weather Zone 046 Rush,\nFire Weather Zone 061 Hamilton, Fire Weather Zone 062 Kearny,\nFire Weather Zone 063 Finney, Fire Weather Zone 064 Hodgeman,\nFire Weather Zone 065 Pawnee, Fire Weather Zone 074 Stanton,\nFire Weather Zone 075 Grant, Fire Weather Zone 076 Haskell,\nFire Weather Zone 077 Gray, Fire Weather Zone 078 Ford, Fire\nWeather Zone 079 Edwards, Fire Weather Zone 080 Kiowa, Fire\nWeather Zone 084 Morton, Fire Weather Zone 085 Stevens, Fire\nWeather Zone 086 Seward, Fire Weather Zone 087 Meade, Fire\nWeather Zone 088 Clark and Fire Weather Zone 089 Comanche.\n\n* TIMING...From noon CDT /11 AM MDT/ today to 8 PM CDT /7 PM\nMDT/ this evening.\n\n* WINDS...North 20 to 30 mph with gusts up to 45 mph.\n\n* RELATIVE HUMIDITY...As low as 10 percent.\n\n* IMPACTS...Any fire that develops will catch and spread\nquickly. Outdoor burning is not recommended.\n',
    },
  ],
};

function getAPIUrl(center: google.maps.LatLngLiteral) {
  return `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${center.lat},${center.lng}/2025-03-14/2025-03-16?unitGroup=us&elements=datetime%2Cname%2Caddress%2Clatitude%2Clongitude%2Ctempmax%2Ctempmin%2Ctemp%2Cfeelslikemax%2Cfeelslikemin%2Cfeelslike%2Cprecip%2Cprecipprob%2Cprecipcover%2Cpreciptype%2Cwindspeed%2Ccloudcover%2Cvisibility%2Cconditions%2Cicon&include=days%2Calerts%2Cevents&key=${process.env.NEXT_PUBLIC_WEATHER_API_KEY}&contentType=json`;
}

export function WeatherProvider({ children, center }: WeatherProviderProps) {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fetchWeather = async () => {
    setLoading(true);
    setWeather(testWeather);
    // const res = await fetch(API_URL);
    // const data = await res.json();
    // if (res.ok) {
    //   setWeather(data);
    // } else {
    //   console.error('Failed to fetch weather data');
    // }
    setLoading(false);
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchWeather();
        // Reset the interval when visibility changes to visible
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        intervalRef.current = setInterval(fetchWeather, 60 * 60 * 1000); // 1 hour interval
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial fetch and interval setup
    fetchWeather();
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
