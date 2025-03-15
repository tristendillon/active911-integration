'use client';

import type { Alert } from '@/lib/types';
import EventEmitter from 'events';
import { useEffect, useState } from 'react';

const alertEmitter = new EventEmitter();

const pingMessage = {
  type: 'ping',
};

export function useAlerts(password: string) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false); // Added connected status

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

  const connectWebSocket = () => {
    const websocket = new WebSocket(`${process.env.NEXT_PUBLIC_WEBSOCKET_URL}/ws?password=${password}`);

    websocket.onopen = () => {
      setIsConnected(true); // Set connected status to true when the socket opens
    };

    websocket.onclose = () => {
      setIsConnected(false); // Set connected status to false when the socket closes
    };

    websocket.onmessage = (event) => {
      const eventData = JSON.parse(event.data);
      if (eventData.type === 'alert') {
        const newAlert: Alert = eventData.content;
        setAlerts((prevAlerts) => [...prevAlerts, newAlert]);
        alertEmitter.emit('newAlert', newAlert); // Emit the new alert
      } else if (eventData.type === 'heartbeat') {
        websocket.send(JSON.stringify(pingMessage)); // Send ping message on heartbeat
      }
    };

    return { websocket };
  };

  useEffect(() => {
    const { websocket } = connectWebSocket();
    setWs(websocket);
    fetchAlerts();

    return () => {
      websocket.close();
    };
  }, [password]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchAlerts();
        if (ws) {
          ws.close();
        }
        const { websocket } = connectWebSocket();
        setWs(websocket);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [ws]);

  const emitListener = (eventName: string, listener: (...args: any[]) => void) => {
    alertEmitter.on(eventName, listener);
    // Return a cleanup function to remove the listener
    return () => alertEmitter.off(eventName, listener);
  };

  return {
    alerts,
    loading,
    emitListener,
    isConnected, // Return the connected status
  };
}
