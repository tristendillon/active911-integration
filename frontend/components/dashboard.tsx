'use client';

import React, { useState } from 'react';
import Header from './header';
import NewAlertPopover from './alert-popover/new-alert-popover';
import { GoogleMapComponent } from './google-map-component';
import { useDashboard } from '@/providers/dashboard-provider';
import Sidebar from './sidebar';
import { WeatherAlertBanner } from './weather/weather-alert-banner';
import { useWeather } from '@/providers/weather-provider';
export default function Dashboard() {
  const { center, isNewAlert, sound } = useDashboard();
  const { weather, loading } = useWeather();
  return (
    <>
      <NewAlertPopover sound={sound} />

      {!isNewAlert && (
        <>
          <Header />
          <div className="h-full w-full flex">
            <Sidebar />
            <GoogleMapComponent center={center} zoom={18} markers={[center]} />
          </div>
          {!loading && weather?.alerts && weather.alerts.length > 0 && (
            <div className="absolute bottom-1 right-1 flex flex-col gap-2">
              {weather.alerts.map((weatherAlert) => (
                <WeatherAlertBanner key={weatherAlert.id} weatherAlert={weatherAlert} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
