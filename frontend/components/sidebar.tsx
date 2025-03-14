'use client';

import { useDashboard } from '@/providers/dashboard-provider';
import React from 'react';
import AlertItem from './alert-item';

export default function Sidebar() {
  const { alerts, units } = useDashboard();
  if (alerts.loading) {
    // LOADING STATE
    return (
      <div className="w-3/4 bg-secondary grid grid-cols-5 grid-rows-2 h-[calc(100vh-150px)]">
        <div className="bg-blue-500 col-span-2 flex items-center justify-center">
          <h1>TRAFIC ALERTS</h1>
        </div>
      </div>
    );
  }
  return (
    <div className="w-3/4 bg-secondary grid grid-cols-5 grid-rows-2 h-[calc(100vh-150px)]">
      <div className="bg-blue-500 col-span-2 flex items-center justify-center">
        <h1>TRAFIC ALERTS</h1>
      </div>
      <div className="col-span-3 row-span-2 p-2">
        {alerts.data.map((alert) => (
          <AlertItem key={alert.alert.id} units={units} alert={alert} />
        ))}
      </div>
      <div className="bg-red-500 col-span-2 flex items-center justify-center">
        <h1>ROAD CLOSURES</h1>
      </div>
    </div>
  );
}
