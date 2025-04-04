'use client';

import { useDashboard } from '@/providers/dashboard-provider';
import React from 'react';
import AlertItem from './alert-item';
import WeatherAlerts from './weather/weather-alerts';
import { motion } from 'motion/react';
import { WeatherAlertBanner } from './weather/weather-alert-banner';
import { useWeather } from '@/providers/weather-provider';

interface SidebarProps {
  isFireTV?: boolean;
}

export default function Sidebar({ isFireTV = false }: SidebarProps) {
  const { alerts, units } = useDashboard();
  const { weather, loading } = useWeather();

  // Adjust padding and spacing for Fire TV
  const padding = isFireTV ? "p-3" : "p-2";
  const gap = isFireTV ? "gap-3" : "gap-2";
  const alertsHeight = isFireTV ? "h-[75vh]" : "h-[70vh]";


  // Mobile layout
  return (
    <>
      {/* Alerts - full width on mobile, 3/5 on desktop */}
      <motion.div
        layout
        className={`${padding} flex flex-col ${alertsHeight} md:h-full ${gap} border-r border-border overflow-auto md:col-span-3 md:row-span-3`}
      >
        {alerts.data
          .sort((a, b) => new Date(b.alert.stamp * 1000).getTime() - new Date(a.alert.stamp * 1000).getTime())
          .slice(0, 10)
          .map((alert) => (
            <AlertItem key={alert.alert.id} units={units} alert={alert} isFireTV={false} />
          ))}
      </motion.div>

      {/* Weather alerts detail - hidden on mobile, visible on desktop */}
      <div className="flex md:col-span-2 md:row-span-2 border-r border-b border-border h-full md:max-h-none overflow-hidden">
        <WeatherAlerts isFireTV={false} />
      </div>
      <div className="flex md:col-span-2 md:row-span-1 border-r border-b border-border max-h-[20vh] md:max-h-none overflow-auto">
        {!loading && weather?.alerts && weather.alerts.length > 0 && (
          <div className={`flex flex-col w-full ${gap} ${padding}`}>
            {weather.alerts.map((weatherAlert) => (
              <WeatherAlertBanner key={weatherAlert.id} weatherAlert={weatherAlert} isFireTV={false} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
