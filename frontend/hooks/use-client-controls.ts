'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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

interface UseClientControlsOptions {
  password: string;
}

export function useClientControls({ password }: UseClientControlsOptions) {
  const [isConnected, setIsConnected] = useState(false);

  // Track connection ID to ensure we only handle events from the current connection
  const connectionIdRef = useRef(0);
  // Track if component is mounted to avoid state updates after unmount
  const isMountedRef = useRef(true);
  // Track reconnection attempts and timeout
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 5;
  const reconnectBaseDelay = 1000; // 1 second initial delay

  const cleanupWebSocket = useCallback(() => {
    // Clear any pending reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const refreshClients = useCallback(() => {
    if (!isConnected) {
      console.warn('Cannot send refresh: WebSocket not connected');
      return false;
    }

    if (!connectionTracker.activeConnection) {
      console.warn('Cannot send refresh: No active connection');
      return false;
    }

    try {
      const message = {
        type: 'refresh',
      };
      connectionTracker.activeConnection.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending refresh command:', error);
      return false;
    }
  }, [isConnected]);

  const redirectClients = useCallback((url: string) => {
    if (!isConnected) {
      console.warn('Cannot send redirect: WebSocket not connected');
      return false;
    }

    if (!connectionTracker.activeConnection) {
      console.warn('Cannot send redirect: No active connection');
      return false;
    }

    try {
      const message = {
        type: 'redirect',
        content: { url },
      };
      connectionTracker.activeConnection.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending redirect command:', error);
      return false;
    }
  }, [isConnected]);

  const connectWebSocket = useCallback(() => {
    cleanupWebSocket();

    // Reset attempts when explicitly connecting (not reconnecting)
    reconnectAttemptsRef.current = 0;

    const attemptConnect = () => {
      if (!isMountedRef.current) return;

      // Client control WebSocket requires authentication
      if (!password) {
        console.warn('Cannot connect to client control WebSocket: No password provided');
        return;
      }

      // Build WebSocket URL with required password
      const queryParams = `?password=${password}`;
      const wsUrl = `${process.env.NEXT_PUBLIC_WEBSOCKET_URL}/ws/client${queryParams}`;

      try {
        const websocket = new WebSocket(wsUrl);

        // Register this connection and get a unique ID
        const connectionId = connectionTracker.register(websocket);
        connectionIdRef.current = connectionId;

        websocket.onopen = () => {
          if (!isMountedRef.current || !connectionTracker.isActive(connectionId)) return;

          console.log(`Client control WebSocket connected (ID: ${connectionId})`);
          setIsConnected(true);
          reconnectAttemptsRef.current = 0;
          connectionTracker.notifyListeners();
        };

        websocket.onclose = (event) => {
          if (!connectionTracker.isActive(connectionId)) {
            console.log(`Ignoring close event from inactive connection ${connectionId}`);
            return;
          }

          console.log(`Client control WebSocket disconnected (ID: ${connectionId})`);

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

          console.error(`Client control WebSocket error (ID: ${connectionId}):`, error);
          if (isMountedRef.current) {
            setIsConnected(false);
          }
          // Note: We don't clean up here as the onclose handler will be called after error
        };

        websocket.onmessage = (event) => {
          if (!connectionTracker.isActive(connectionId)) return;

          try {
            const eventData = JSON.parse(event.data);

            if (eventData.type === 'heartbeat') {
              websocket.send(JSON.stringify(pingMessage));
            } else if (eventData.type === 'echo') {
              console.log('Received echo from server:', eventData.content);
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

  const connectClients = useCallback(() => {
    if (!isConnected) {
      connectWebSocket();
    }
  }, [connectWebSocket, isConnected]);

  return {
    isConnected,
    refreshClients,
    redirectClients,
    connectClients,
  };
}