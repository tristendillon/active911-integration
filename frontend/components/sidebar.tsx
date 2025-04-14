'use client';

import { useDashboard } from '@/providers/dashboard-provider';
import React from 'react';
import AlertItem from './alert-item';
import WeatherAlerts from './weather/weather-alerts';
import { motion } from 'motion/react';
import { useWeather } from '@/providers/weather-provider';
import { AlertItemSkeleton } from './alert-item';
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
        {!alerts.loading && alerts.data.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="rounded-lg p-4 w-full max-w-md">
              <svg className="h-8 w-8 text-red-500 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-medium text-red-600 mb-1">Connection Error</h3>
              <p className="text-sm text-red-600">Failed to fetch alerts. Please check your connection and try again.</p>
            </div>
          </div>
        )}
        {alerts.loading && (
          <div className="flex flex-col gap-4 p-3">
            {Array.from({ length: 11 }).map((_, index) => (
              <AlertItemSkeleton key={index} isFireTV={isFireTV} showDetails={false} />
            ))}
          </div>
        )}
        {!alerts.loading && (
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
        )}
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
