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
  center: google.maps.LatLngLiteral;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

interface DashboardProviderProps {
  children: React.ReactNode;
  password: string;
  units: string[];
  center: google.maps.LatLngLiteral;
}

export function DashboardProvider({ children, password, units, center }: DashboardProviderProps) {
  const [isNewAlert, setIsNewAlert] = useState(false);
  const { alerts, setAlerts, loading, emitListener, isConnected } = useAlerts(password);

  return (
    <DashboardContext.Provider
      value={{
        password,
        isNewAlert,
        setIsNewAlert,
        alerts: {
          loading,
          setData: setAlerts,
          data: alerts,
        },
        emitListener,
        units,
        center,
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
