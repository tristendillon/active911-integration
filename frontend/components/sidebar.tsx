'use client';

import { useDashboard } from '@/providers/dashboard-provider';
import React from 'react';
import AlertItem from './alert-item';
import WeatherAlerts from './weather/weather-alerts';
import { motion } from 'motion/react';
import { useWeather } from '@/providers/weather-provider';

interface SidebarProps {
  isFireTV?: boolean;
}

export default function Sidebar({ isFireTV = false }: SidebarProps) {
  const limit = 10

  const { alerts, units, pagination } = useDashboard();
  const {weather, loading} = useWeather()
  const padding = isFireTV ? "p-3" : "p-2";
  const gap = isFireTV ? "gap-3" : "gap-2";
  return (
    <div className="h-full w-full flex flex-col">
      <div className="overflow-auto md:col-span-3 md:row-span-3 border-r h-full border-border">
        <motion.div
          layout
          className={`${padding} flex flex-col ${gap}`}
        >
          {alerts.data
            .sort((a, b) => new Date(b.alert.stamp * 1000).getTime() - new Date(a.alert.stamp * 1000).getTime())
            .slice(0, 10)
            .map((alert) => (
              <AlertItem key={alert.alert.id} units={units} alert={alert} isFireTV={false} />
            ))}
        </motion.div>
        {pagination.total > limit && (
          <>
            <div className="flex items-center justify-between mx-6 pb-2">
              <button
                onClick={pagination.prevPage}
                disabled={pagination.page === 1 || loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm">
                Page {pagination.page} / {Math.ceil(pagination.total / limit)}
              </span>
              <button
                onClick={pagination.nextPage}
                disabled={!pagination.hasNextPage || loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
      {!loading && weather?.alerts && weather?.alerts.length !== 0 && (
        <div className="flex md:col-span-2 md:row-span-2 border-r border-b border-border h-full md:max-h-none overflow-hidden">
          <WeatherAlerts weather={weather} loading={loading} />
        </div>
      )}
    </div>
  );
}
