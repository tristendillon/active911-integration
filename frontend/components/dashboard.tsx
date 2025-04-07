'use client';
import React from 'react';
import Header from './header';
import NewAlertPopover from './alert-popover/new-alert-popover';
import { GoogleMapComponent } from './google-map-component';
import { useDashboard } from '@/providers/dashboard-provider';
import Sidebar from './sidebar';
import useAmazonDevice from '@/hooks/use-amazon-device';
import { cn } from '@/lib/utils';
import { WeatherAlertBanner } from './weather/weather-alert-banner';
import { useWeather } from '@/providers/weather-provider';


export default function Dashboard() {
  const { sound, map, isNewAlert } = useDashboard();
  const { isFireTV, isSilk } = useAmazonDevice();
  const { weather, loading } = useWeather()
  return (
    <div className="w-full h-screen">
      <div className={isFireTV || isSilk  ? "scale-[0.6] origin-top-left w-[166%] h-[166%]": "w-full h-full"}>
        <NewAlertPopover sound={sound} />
        {!isNewAlert && (
          <div className="h-full w-full flex">
            <div className="w-1/2 bg-secondary h-full">
              <Sidebar isFireTV={isFireTV} />
            </div>
            <div className="w-full h-full block">
              <Header />
              <div className={cn("w-full relative h-[calc(100%-150px)]", isFireTV || isSilk  && "h-[calc(166%-150px)]")}>
                <GoogleMapComponent center={map.center} zoom={map.zoom} markers={map.markers} />
                {!loading && weather?.alerts && weather.alerts.length > 0 && (
                  <div className={`absolute bottom-1 left-1 flex flex-col gap-2 min-w-[400px]`}>
                    {weather.alerts.map((weatherAlert) => (
                      <WeatherAlertBanner key={weatherAlert.id} weatherAlert={weatherAlert} isFireTV={isFireTV} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
);

}