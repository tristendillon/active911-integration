'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from '@/lib/types';
import { useAlerts } from '@/hooks/use-alerts';

interface DashboardContextType {
  password: string;
  isNewAlert: boolean;
  setIsNewAlert: React.Dispatch<React.SetStateAction<boolean>>;
  alerts: {
    loading: boolean;
    data: Alert[];
    setData: React.Dispatch<React.SetStateAction<Alert[]>>;
  };
  emitListener: (eventName: any, listener: (...args: any[]) => void) => void;
  units: string[];
  map: {
    center: google.maps.LatLngLiteral;
    zoom: number;
    markers: google.maps.LatLngLiteral[];
  };
  sound: boolean;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

interface DashboardProviderProps {
  children: React.ReactNode;
  password?: string;
  units?: string[];
  center: google.maps.LatLngLiteral;
  sound: string;
  markers?: google.maps.LatLngLiteral[];
  zoom?: number;
}

export function DashboardProvider({ children, password, units, center, sound, markers, zoom }: DashboardProviderProps) {
  const [isNewAlert, setIsNewAlert] = useState(false);
  const { alerts, setAlerts, loading, emitListener, isConnected } = useAlerts(password);
  if (markers && markers.length === 0) {
    alerts.forEach((alert) => {
      if (alert.alert.lat && alert.alert.lon) {
        markers.push({
          lat: alert.alert.lat,
          lng: alert.alert.lon,
        });
      }
    });
  }
  return (
    <DashboardContext.Provider
      value={{
        password: password || '',
        isNewAlert,
        setIsNewAlert,
        map: {
          center,
          zoom: zoom || 18,
          markers: markers || [center],
        },
        alerts: {
          loading,
          setData: setAlerts,
          data: alerts,
        },
        sound: sound ? sound === 'on' : false,
        emitListener,
        units: units || [],
      }}
    >
      {children}
      <div className="absolute top-1 right-1 p-4 flex gap-2 items-center">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <p>{isConnected ? 'Connected' : 'Disconnected'}</p>
      </div>
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within an DashboardProvider');
  }
  return context;
}
