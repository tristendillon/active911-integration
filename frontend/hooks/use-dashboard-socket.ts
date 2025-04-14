'use client';

import type { Alert } from '@/lib/types';
import EventEmitter from 'events';
import { useEffect, useState, useRef, useCallback } from 'react';

// Create singleton EventEmitter outside the hook to prevent multiple instances
export const dashboardEmitter = new EventEmitter();
// Increase max listeners to prevent potential warnings
dashboardEmitter.setMaxListeners(20);

// Create a global connection tracker to prevent multiple connections
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

// Constants for reconnection
const PERIODIC_RECONNECT_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds

interface UseDashboardSocketOptions {
  password?: string;
  page?: number;
  limit?: number;
  station?: string;
}

export function useDashboardSocket({ password, limit = 10, station }: UseDashboardSocketOptions = {}) {
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
  // Track periodic reconnection interval
  const periodicReconnectIntervalRef = useRef<NodeJS.Timeout | null>(null);
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
      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), 10000);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/alerts?${queryParams.toString()}`, { signal: abortController.signal });


      if (!isMountedRef.current) return;

      const data = await response.json();

      const fetchedAlerts = data.data;
      if (fetchedAlerts === null) {
        setAlerts([]);
      } else {
        setAlerts(fetchedAlerts);
        for (const alert of fetchedAlerts) {
          // Check if the alert is recent (within the last 5 minutes)
          const alertTime = new Date(alert.alert.stamp * 1000);
          const currentTime = new Date();
          const timeDifferenceMs = currentTime.getTime() - alertTime.getTime();
          const isRecentAlert = timeDifferenceMs <= 2 * 60 * 1000; // 2 minutes in milliseconds
          if (isRecentAlert) {
            dashboardEmitter.emit('new_alert', alert);
          }
        }
      }

      // Update pagination information based on API response
      setHasNextPage(data.next !== null);
      setTotal(data.total || 0);
      setLoading(false);
      clearTimeout(timeout);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Fetch aborted');
      } else {
        console.error('Error fetching alerts:', error);
      }
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [page, limit, password]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

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

    // Clear periodic reconnect interval
    if (periodicReconnectIntervalRef.current) {
      clearInterval(periodicReconnectIntervalRef.current);
      periodicReconnectIntervalRef.current = null;
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    cleanupWebSocket();

    // Reset attempts when explicitly connecting (not reconnecting)
    reconnectAttemptsRef.current = 0;

    const attemptConnect = () => {
      if (!isMountedRef.current) return;

      // Build WebSocket URL with current password and station
      const queryParams = new URLSearchParams();
      if (password) {
        queryParams.set('password', password);
      }
      if (station) {
        queryParams.set('station', station);
      }

      const wsUrl = `${process.env.NEXT_PUBLIC_WEBSOCKET_URL}/ws/dashboard?${queryParams.toString()}`;

      try {
        const websocket = new WebSocket(wsUrl);

        // Register this connection and get a unique ID
        const connectionId = connectionTracker.register(websocket);
        connectionIdRef.current = connectionId;

        websocket.onopen = () => {
          if (!isMountedRef.current || !connectionTracker.isActive(connectionId)) return;

          console.log(`Dashboard WebSocket connected (ID: ${connectionId})`);
          setIsConnected(true);
          reconnectAttemptsRef.current = 0;
          connectionTracker.notifyListeners();

          // Set up the periodic reconnection interval
          if (periodicReconnectIntervalRef.current) {
            clearInterval(periodicReconnectIntervalRef.current);
          }

          periodicReconnectIntervalRef.current = setInterval(() => {
            if (isMountedRef.current) {
              console.log(`Performing scheduled reconnection after ${PERIODIC_RECONNECT_INTERVAL/60000} minutes`);
              // Force disconnect and reconnect
              if (websocket && websocket.readyState === WebSocket.OPEN) {
                // Mark as manually terminated to prevent auto reconnect in the onclose handler
                (websocket as any).__manuallyTerminated = true;
                websocket.close();
              }
              // Reconnect after a short delay to ensure the previous connection is fully closed
              setTimeout(() => {
                if (isMountedRef.current) {
                  connectWebSocket();
                }
              }, 1000);
            }
          }, PERIODIC_RECONNECT_INTERVAL);
        };

        websocket.onclose = (event) => {
          if (!connectionTracker.isActive(connectionId)) {
            console.log(`Ignoring close event from inactive connection ${connectionId}`);
            return;
          }

          console.log(`Dashboard WebSocket disconnected (ID: ${connectionId})`);

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

          console.error(`Dashboard WebSocket error (ID: ${connectionId}):`, error);
          if (isMountedRef.current) {
            setIsConnected(false);
          }
        };

        websocket.onmessage = (event) => {
          if (!connectionTracker.isActive(connectionId)) return;

          try {
            const eventData = JSON.parse(event.data);

            if (eventData.type === 'new_alert') {
              const newAlert: Alert = eventData.content;
              if (isMountedRef.current) {
                setAlerts((prevAlerts) => [newAlert, ...prevAlerts.slice(0, 10)]);
                dashboardEmitter.emit(eventData.type, newAlert);
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

  // Reconnect when params change
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
  }, [fetchAlerts, connectWebSocket]);

  const emitListener = useCallback((eventName: string, listener: (...args: any[]) => void) => {
    // Add the new listener without removing existing ones
    dashboardEmitter.on(eventName, listener);
    console.log(`Added listener for '${eventName}' event`);

    // Return a cleanup function to remove the specific listener
    return () => {
      dashboardEmitter.removeListener(eventName, listener);
      console.log(`Removed listener for '${eventName}' event`);
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