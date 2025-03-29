'use client';

import { useDashboard } from '@/providers/dashboard-provider';
import React from 'react';
import AlertItem from './alert-item';
import WeatherAlerts from './weather/weather-alerts';
import { motion } from 'motion/react';
import { WeatherAlertBanner } from './weather/weather-alert-banner';
import { useWeather } from '@/providers/weather-provider';
export default function Sidebar() {
  const { alerts, units } = useDashboard();
  const { weather, loading } = useWeather();
  return (
    <>
      {/* Weather alerts carousel - visible on mobile at top */}
      <div className="block md:hidden h-[30vh] border-b border-border overflow-hidden">
        <WeatherAlerts />
    </div>

    {/* Alerts - full width on mobile, 3/5 on desktop */}
    <motion.div
      layout
      className="p-2 flex flex-col h-[70vh] md:h-full gap-2 border-r border-border overflow-auto md:col-span-3 md:row-span-3"
    >
      {alerts.data
        .sort((a, b) => new Date(b.alert.stamp * 1000).getTime() - new Date(a.alert.stamp * 1000).getTime())
        .map((alert) => (
          <AlertItem key={alert.alert.id} units={units} alert={alert} />
        ))}
    </motion.div>

    {/* Weather alerts detail - hidden on mobile, visible on desktop */}
    <div className="hidden md:flex md:col-span-2 md:row-span-2 border-r border-b border-border h-full md:max-h-none overflow-hidden">
      <WeatherAlerts />
    </div>
    <div className="hidden md:flex md:col-span-2 md:row-span-1 border-r border-b border-border max-h-[20vh] md:max-h-none overflow-auto">
      {!loading && weather?.alerts && weather.alerts.length > 0 && (
        <div className="flex flex-col w-full gap-2 p-2">
          {weather.alerts.map((weatherAlert) => (
            <WeatherAlertBanner key={weatherAlert.id} weatherAlert={weatherAlert} />
          ))}
        </div>
      )}
      </div>
    </>
  );
}