'use client';

import React, { createContext, useContext, useState } from 'react';
import { Alert } from '@/lib/types';
import { useDashboardSocket } from '@/hooks/use-dashboard-socket';

interface DashboardContextType {
  password: string;
  station?: string;
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
  connections: {
    dashboard: boolean;
  };
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

interface DashboardProviderProps {
  children: React.ReactNode;
  password?: string;
  station?: string;
  units?: string[];
  center?: google.maps.LatLngLiteral;
  sound?: string;
  markers?: google.maps.LatLngLiteral[];
  zoom?: number;
}

export function DashboardProvider({
  children,
  password,
  station,
  units,
  center = { lat: 39.19319752935804, lng: -96.58534125130507 }, // Default to Manhattan, KS
  sound = 'on',
  markers = [],
  zoom = 14,
}: DashboardProviderProps) {
  const [isNewAlert, setIsNewAlert] = useState(false);

  // Connect to dashboard WebSocket only
  const {
    alerts,
    setAlerts,
    loading,
    emitListener,
    isConnected: dashboardConnected
  } = useDashboardSocket({
    password,
  });

  // Add markers from alerts
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
        station,
        isNewAlert,
        setIsNewAlert,
        map: {
          center,
          zoom,
          markers: markers.length > 0 ? markers : [center],
        },
        alerts: {
          loading,
          setData: setAlerts,
          data: alerts,
        },
        sound: sound === 'on',
        emitListener,
        units: units || [],
        connections: {
          dashboard: dashboardConnected
        }
      }}
    >
      {children}
      <div className="absolute top-1 right-1 p-4 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${dashboardConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <p>Dashboard: {dashboardConnected ? 'Connected' : 'Disconnected'}</p>
        </div>
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