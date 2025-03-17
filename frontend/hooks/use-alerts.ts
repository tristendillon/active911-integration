'use client';

import type { Alert } from '@/lib/types';
import EventEmitter from 'events';
import { useEffect, useState, useRef } from 'react';

// Create singleton EventEmitter outside the hook to prevent multiple instances
export const alertEmitter = new EventEmitter();
// Increase max listeners to prevent potential warnings
alertEmitter.setMaxListeners(20);

const pingMessage = {
  type: 'ping',
};

export function useAlerts(password: string) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  // Use a ref to track the websocket connection to make cleanup more reliable
  const wsRef = useRef<WebSocket | null>(null);
  // Track if component is mounted to avoid state updates after unmount
  const isMountedRef = useRef(true);

  const fetchAlerts = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/alerts?password=${password}`, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      });
      const data = await response.json();

      if (isMountedRef.current) {
        const alerts = data.data;
        if (alerts === null) {
          setAlerts([]);
        } else {
          setAlerts(alerts);
        }
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const cleanupWebSocket = () => {
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const connectWebSocket = () => {
    // First clean up any existing connection
    cleanupWebSocket();

    const websocket = new WebSocket(`${process.env.NEXT_PUBLIC_WEBSOCKET_URL}/ws/alerts?password=${password}`);
    websocket.onopen = () => {
      if (isMountedRef.current) {
        setIsConnected(true);
        console.log('WebSocket connected');
      }
    };

    websocket.onclose = () => {
      if (isMountedRef.current) {
        setIsConnected(false);
        console.log('WebSocket disconnected');
      }
    };

    websocket.onerror = () => {
      if (isMountedRef.current) {
        setIsConnected(false);
      }
    };

    websocket.onmessage = (event) => {
      try {
        const eventData = JSON.parse(event.data);

        if (eventData.type === 'new_alert') {
          const newAlert: Alert = eventData.content;
          if (isMountedRef.current) {
            // Only emit the event, don't update state here to avoid duplicates
            setAlerts((prevAlerts) => [...prevAlerts, newAlert]);
            alertEmitter.emit(eventData.type, newAlert);
          }
        } else if (eventData.type === 'heartbeat') {
          websocket.send(JSON.stringify(pingMessage));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };

    wsRef.current = websocket;
    return websocket;
  };

  // Initialize WebSocket and fetch alerts on mount
  useEffect(() => {
    isMountedRef.current = true;
    connectWebSocket();
    fetchAlerts();

    return () => {
      isMountedRef.current = false;
      cleanupWebSocket();
      // Clear any listeners on unmount
      alertEmitter.removeAllListeners();
    };
  }, [password]);

  // Handle visibility changes - reconnect when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible, reconnecting WebSocket');
        fetchAlerts();
        connectWebSocket();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const emitListener = (eventName: string, listener: (...args: any[]) => void) => {
    // Remove any existing listeners with the same name to prevent duplicates
    alertEmitter.removeAllListeners(eventName);
    // Add the new listener
    alertEmitter.on(eventName, listener);

    // Return a cleanup function to remove the specific listener
    return () => {
      alertEmitter.removeListener(eventName, listener);
    };
  };

  return {
    alerts,
    setAlerts,
    loading,
    emitListener,
    isConnected,
  };
}
