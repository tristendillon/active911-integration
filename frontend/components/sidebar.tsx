'use client';

import { useDashboard } from '@/providers/dashboard-provider';
import React from 'react';
import AlertItem from './alert-item';
import WeatherAlerts from './weather/weather-alerts';

interface SidebarProps {
  isFireTV?: boolean;
}

export default function Sidebar({ isFireTV = false }: SidebarProps) {
  const { alerts, units } = useDashboard();

  // Adjust padding and spacing for Fire TV
  const padding = isFireTV ? "p-3" : "p-2";
  const gap = isFireTV ? "gap-3" : "gap-2";
  // Mobile layout
  return (
      <div className="flex flex-col h-full">
        {/* Alerts section - takes 2/3 of height */}
        <div className={`${padding} flex flex-col h-2/3 ${gap} border-b border-border overflow-auto`}>
          <h2 className="text-2xl font-bold mb-2">Alerts</h2>
          {alerts.data
            .sort((a, b) => new Date(b.alert.stamp * 1000).getTime() - new Date(a.alert.stamp * 1000).getTime())
            .slice(0, 10)
            .map((alert) => (
              <AlertItem key={alert.alert.id} units={units} alert={alert} isFireTV={isFireTV} />
            ))}
        </div>

        {/* Weather alerts section - takes 1/3 of height */}
        <div className="flex flex-col h-1/3 overflow-auto">
          <div className="h-full overflow-hidden">
            <WeatherAlerts isFireTV={isFireTV} />
          </div>
        </div>
      </div>
    );
}
