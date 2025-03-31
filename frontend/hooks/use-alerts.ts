'use client';

import type { Alert } from '@/lib/types';
import EventEmitter from 'events';
import { useEffect, useState, useRef, useCallback } from 'react';

// Create singleton EventEmitter outside the hook to prevent multiple instances
export const alertEmitter = new EventEmitter();
// Increase max listeners to prevent potential warnings
alertEmitter.setMaxListeners(20);

// Create a global connection tracker to prevent multiple connections
// This helps with React.StrictMode double rendering in development
const connectionTracker = {
  activeConnection: null as WebSocket | null,
  connectionId: 0,
  listeners: new Set<() => void>(),

  // Register a new connection and get a unique ID
  register(ws: WebSocket): number {
    // Close any existing connection first
    if (this.activeConnection && this.activeConnection.readyState !== WebSocket.CLOSED) {
      // Set a flag to prevent reconnection attempts on this deliberate close
      (this.activeConnection as any).__manuallyTerminated = true;
      this.activeConnection.close();
    }

    this.activeConnection = ws;
    return ++this.connectionId;
  },

  // Check if this connection is still the active one
  isActive(id: number): boolean {
    return this.connectionId === id;
  },

  // Add status change listener
  addListener(callback: () => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  },

  // Notify listeners of connection status change
  notifyListeners() {
    this.listeners.forEach((listener) => listener());
  },
};

const pingMessage = {
  type: 'ping',
};

interface UseAlertsOptions {
  password?: string;
  page?: number;
  limit?: number;
}

export function useAlerts({ password, limit = 10 }: UseAlertsOptions = {}) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [total, setTotal] = useState(0);

  // Track connection ID to ensure we only handle events from the current connection
  const connectionIdRef = useRef(0);
  // Track if component is mounted to avoid state updates after unmount
  const isMountedRef = useRef(true);
  // Track reconnection attempts and timeout
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 5;
  const reconnectBaseDelay = 1000; // 1 second initial delay

  const fetchAlerts = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      const queryParams = new URLSearchParams();
      queryParams.set('limit', limit.toString());
      queryParams.set('offset', ((page - 1) * limit).toString());
      if (password) {
        queryParams.set('password', password);
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/alerts?${queryParams.toString()}`, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      });

      if (!isMountedRef.current) return;

      const data = await response.json();

      console.log('Fetched alerts:', data);
      const fetchedAlerts = data.data;
      if (fetchedAlerts === null) {
        setAlerts([]);
      } else {
        setAlerts(fetchedAlerts);
      }

      // Update pagination information based on API response
      setHasNextPage(data.next !== null);
      setTotal(data.total || 0);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [page, limit]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts, password]);

  const nextPage = () => {
    setPage((prev) => prev + 1);
  };

  const prevPage = () => {
    setPage((prev) => Math.max(1, prev - 1));
  };

  const cleanupWebSocket = useCallback(() => {
    // Clear any pending reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    cleanupWebSocket();

    // Reset attempts when explicitly connecting (not reconnecting)
    reconnectAttemptsRef.current = 0;

    const attemptConnect = () => {
      if (!isMountedRef.current) return;

      // Build WebSocket URL with current password
      const queryParams = password ? `?password=${password}` : '';
      const wsUrl = `${process.env.NEXT_PUBLIC_WEBSOCKET_URL}/ws/alerts${queryParams}`;

      try {
        const websocket = new WebSocket(wsUrl);

        // Register this connection and get a unique ID
        const connectionId = connectionTracker.register(websocket);
        connectionIdRef.current = connectionId;

        websocket.onopen = () => {
          if (!isMountedRef.current || !connectionTracker.isActive(connectionId)) return;

          console.log(`WebSocket connected (ID: ${connectionId})`);
          setIsConnected(true);
          reconnectAttemptsRef.current = 0;
          connectionTracker.notifyListeners();
        };

        websocket.onclose = (event) => {
          if (!connectionTracker.isActive(connectionId)) {
            console.log(`Ignoring close event from inactive connection ${connectionId}`);
            return;
          }

          console.log(`WebSocket disconnected (ID: ${connectionId})`);

          if (isMountedRef.current) {
            setIsConnected(false);
            connectionTracker.notifyListeners();
          }

          // Don't attempt reconnect if this was manually terminated
          if ((websocket as any).__manuallyTerminated) {
            console.log('Connection was manually terminated, not attempting reconnect');
            return;
          }

          // Try to reconnect if we haven't exceeded max attempts
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;

            // Calculate delay with exponential backoff (1s, 2s, 4s, 8s, 16s)
            const delay = reconnectBaseDelay * Math.pow(2, reconnectAttemptsRef.current - 1);

            console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts}) in ${delay}ms...`);

            // Schedule reconnection attempt
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current && connectionTracker.isActive(connectionId)) {
                attemptConnect();
              }
            }, delay);
          } else {
            console.log('Max reconnect attempts reached');
          }
        };

        websocket.onerror = (error) => {
          if (!connectionTracker.isActive(connectionId)) return;

          console.error(`WebSocket error (ID: ${connectionId}):`, error);
          if (isMountedRef.current) {
            setIsConnected(false);
          }
          // Note: We don't clean up here as the onclose handler will be called after error
        };

        websocket.onmessage = (event) => {
          if (!connectionTracker.isActive(connectionId)) return;

          try {
            const eventData = JSON.parse(event.data);

            if (eventData.type === 'new_alert') {
              const newAlert: Alert = eventData.content;
              if (isMountedRef.current) {
                setAlerts((prevAlerts) => [newAlert, ...prevAlerts]);
                alertEmitter.emit(eventData.type, newAlert);
              }
            } else if (eventData.type === 'heartbeat') {
              websocket.send(JSON.stringify(pingMessage));
            }
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
          }
        };
      } catch (error) {
        console.error('Error creating WebSocket connection:', error);
        // Schedule retry
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = reconnectBaseDelay * Math.pow(2, reconnectAttemptsRef.current - 1);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              attemptConnect();
            }
          }, delay);
        }
      }
    };

    attemptConnect();

    // Return cleanup function
    return () => {
      cleanupWebSocket();
    };
  }, [cleanupWebSocket, password]);

  // Initialize WebSocket and fetch alerts on mount
  useEffect(() => {
    isMountedRef.current = true;

    // Add listener to be notified of connection status changes
    const removeListener = connectionTracker.addListener(() => {
      if (isMountedRef.current) {
        setIsConnected(!!connectionTracker.activeConnection && connectionTracker.activeConnection.readyState === WebSocket.OPEN);
      }
    });

    const cleanup = connectWebSocket();

    return () => {
      isMountedRef.current = false;
      cleanup();
      removeListener();
    };
  }, [connectWebSocket]);

  // Only reconnect when password changes
  useEffect(() => {
    if (!isMountedRef.current) return;
    connectWebSocket();
  }, [password, connectWebSocket]);

  // Handle visibility changes - reconnect when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMountedRef.current) {
        console.log('Page became visible, refreshing data and connection');
        fetchAlerts();
        // Only reconnect if we're not already connected
        if (!connectionTracker.activeConnection || connectionTracker.activeConnection.readyState !== WebSocket.OPEN) {
          connectWebSocket();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchAlerts, connectWebSocket, password]);

  const emitListener = useCallback((eventName: string, listener: (...args: any[]) => void) => {
    // Remove any existing listeners with the same name to prevent duplicates
    alertEmitter.removeAllListeners(eventName);
    // Add the new listener
    alertEmitter.on(eventName, listener);

    // Return a cleanup function to remove the specific listener
    return () => {
      alertEmitter.removeListener(eventName, listener);
    };
  }, []);

  return {
    alerts,
    setAlerts,
    loading,
    emitListener,
    isConnected,
    pagination: {
      page,
      nextPage,
      prevPage,
      hasNextPage,
      total,
    },
  };
}
