'use client';

import { useDashboard } from '@/providers/dashboard-provider';
import React from 'react';
import AlertItem from './alert-item';
import WeatherAlerts from './weather/weather-alerts';
import { motion } from 'motion/react';

interface SidebarProps {
  isFireTV?: boolean;
}

export default function Sidebar({ isFireTV = false }: SidebarProps) {
  const { alerts, units } = useDashboard();

  const padding = isFireTV ? "p-3" : "p-2";
  const gap = isFireTV ? "gap-3" : "gap-2";

  return (
    <div className="h-full w-full flex flex-col">
      <motion.div
        layout
        className={`${padding} flex flex-col ${gap} border-r h-full border-border overflow-auto md:col-span-3 md:row-span-3`}
      >
        {alerts.data
          .sort((a, b) => new Date(b.alert.stamp * 1000).getTime() - new Date(a.alert.stamp * 1000).getTime())
          .slice(0, 10)
          .map((alert) => (
            <AlertItem key={alert.alert.id} units={units} alert={alert} isFireTV={false} />
          ))}
      </motion.div>

      <div className="flex md:col-span-2 md:row-span-2 border-r border-b border-border h-full md:max-h-none overflow-hidden">
        <WeatherAlerts isFireTV={false} />
      </div>
    </div>
  );
}
