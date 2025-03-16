'use client';

import type { Alert } from '@/lib/types';
import { useWeather } from '@/providers/weather-provider';
import React from 'react';
import { WeatherAlertBanner } from '../weather/weather-alert-banner';

interface NewAlertSidebarProps {
  alert: Alert;
  units: string[];
}

export default function NewAlertSidebar({ alert, units }: NewAlertSidebarProps) {
  // Format timestamp if available
  const { weather, loading } = useWeather();
  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return '';

    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString();
  };

  return (
    <div className="w-2xl bg-secondary border-r p-6 overflow-y-auto">
      <div className="flex flex-col gap-6 max-w-2xl">
        {/* Alert description - large and prominent */}
        <div className="p-5 rounded-lg border">
          <h1 className="text-5xl font-bold text-red-500 mb-3">{alert.alert.description}</h1>
          <div className="text-base whitespace-pre-wrap">
            {alert.alert.details?.split(/\\r\\n|\\n|\r\n|\n/).map((line, index) => (
              <React.Fragment key={index}>
                {line.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')}
                {index < (alert.alert.details?.split(/\\r\\n|\\n|\r\n|\n/) || []).length - 1 && <br />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Alert details in a clean card */}
        <div className="p-5 rounded-lg border">
          <h3 className="text-lg font-medium mb-3">Alert Details</h3>
          <div className="grid grid-cols-2 gap-4">
            {alert.alert.map_address && (
              <div className="col-span-2">
                <span className="text-sm font-medium text-muted-foreground block">Address:</span>
                <span className="font-medium text-2xl">{alert.alert.map_address}</span>
              </div>
            )}
            {alert.alert.place && (
              <div className="col-span-2">
                <span className="text-sm font-medium text-muted-foreground block">Location:</span>
                <span className="font-medium text-2xl">{alert.alert.place}</span>
              </div>
            )}
            {alert.alert.stamp && (
              <div>
                <span className="text-sm font-medium text-muted-foreground block">Time:</span>
                <span className="text-base">{formatTimestamp(alert.alert.stamp)}</span>
              </div>
            )}

            {alert.alert.id && (
              <div>
                <span className="text-sm font-medium text-muted-foreground block">Reference ID:</span>
                <span className="font-mono text-base">{alert.alert.id}</span>
              </div>
            )}

            {alert.agency && alert.agency.name && (
              <div>
                <span className="text-sm font-medium text-muted-foreground block">Reporting Agency:</span>
                <span className="text-base">{alert.agency.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Units assigned */}
        {alert.alert.units && (
          <div className="p-5 rounded-lg border">
            <h3 className="text-lg font-medium mb-3">Units Assigned</h3>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {alert.alert.units.split(' ').map((unit, i) => (
                <div key={i} className="px-3 py-2 bg-primary/10 text-primary rounded-md flex items-center">
                  {units.includes(unit) ? <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span> : <span className="w-3 h-3 bg-gray-300 rounded-full mr-2"></span>}
                  <span className="text-base font-medium">{unit}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {!loading && weather?.alerts && weather.alerts.length > 0 && (
          <div className="absolute bottom-1 left-1 flex flex-col gap-2">
            {weather.alerts.map((weatherAlert) => (
              <WeatherAlertBanner key={weatherAlert.id} weatherAlert={weatherAlert} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
