'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from '@/lib/types';
import { EventEmitter } from 'events';

interface DashboardContextType {
  password: string;
  alerts: {
    loading: boolean;
    data: Alert[];
  };
  emitListener: (eventName: any, listener: (...args: any[]) => void) => void;
  units: string[];
  center: google.maps.LatLngLiteral;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);
const alertEmitter = new EventEmitter();

interface DashboardProviderProps {
  children: React.ReactNode;
  password: string;
  units: string[];
  center: google.maps.LatLngLiteral;
}

export function DashboardProvider({ children, password, units, center }: DashboardProviderProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useMemo(() => {
    const fetchAlerts = async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/alerts?password=${password}`);
      const data = await response.json();
      if (data === null) {
        setAlerts([]);
      } else {
        setAlerts(data);
      }
      setLoading(false);
    };
    fetchAlerts();
  }, [password]);

  useEffect(() => {
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WEBSOCKET_URL}/ws?password=${password}`);

    ws.onmessage = (event) => {
      const eventData = JSON.parse(event.data);
      if (eventData.type === 'alert') {
        const newAlert: Alert = eventData.content;
        setAlerts((prevAlerts) => [...prevAlerts, newAlert]);
        alertEmitter.emit('newAlert', newAlert); // Emit the new alert
      }
    };

    return () => {
      ws.close();
    };
  }, [password]);

  const emitListener = (eventName: string, listener: (...args: any[]) => void) => {
    alertEmitter.on(eventName, listener);
    // Return a cleanup function to remove the listener
    return () => alertEmitter.off(eventName, listener);
  };

  return (
    <DashboardContext.Provider
      value={{
        password,
        alerts: {
          loading,
          data: alerts,
        },
        emitListener,
        units,
        center,
      }}
    >
      {children}
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
