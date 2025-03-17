'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import EventEmitter from 'events';

// Create singleton EventEmitter for logs
export const logEmitter = new EventEmitter();
// Increase max listeners to prevent potential warnings
logEmitter.setMaxListeners(20);

const pingMessage = {
  type: 'ping',
};

export interface RequestLog {
  id: string;
  type: string;
  method: string;
  path: string;
  body?: any;
  headers?: any;
  timestamp: string;
  source_ip: string;
  client_id?: string;
  event_type?: string;
  direction?: string;
  duration?: number;
  status_code?: number;
}

interface LogsContextType {
  password: string;
  logs: RequestLog[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  totalLogs: number;
  selectedLog: RequestLog | null;
  filterType: string;
  filterMethod: string;
  filterPath: string;
  filterMessageType: string;
  filterDirection: string;
  filterClientId: string;
  excludeWebSocketMessages: boolean;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  isWebSocketConnected: boolean;
  fetchMoreLogs: () => Promise<void>;
  selectLog: (log: RequestLog | null) => void;
  setFilterType: (type: string) => void;
  setFilterMethod: (method: string) => void;
  setFilterPath: (path: string) => void;
  setFilterMessageType: (type: string) => void;
  setFilterDirection: (direction: string) => void;
  setFilterClientId: (clientId: string) => void;
  setExcludeWebSocketMessages: (exclude: boolean) => void;
  setSortField: (field: string) => void;
  setSortDirection: (direction: 'asc' | 'desc') => void;
  emitListener: (eventName: string, listener: (...args: any[]) => void) => () => void;
}

const LogsContext = createContext<LogsContextType | undefined>(undefined);

export const useLogs = () => {
  const context = useContext(LogsContext);
  if (!context) {
    throw new Error('useLogs must be used within a LogsProvider');
  }
  return context;
};

interface LogsProviderProps {
  children: React.ReactNode;
  password: string;
}

export const LogsProvider: React.FC<LogsProviderProps> = ({ children, password }) => {
  // State
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalLogs, setTotalLogs] = useState(0);
  const [selectedLog, setSelectedLog] = useState<RequestLog | null>(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);

  // Filtering and sorting state
  const [filterType, setFilterType] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterPath, setFilterPath] = useState('');
  const [filterMessageType, setFilterMessageType] = useState('');
  const [filterDirection, setFilterDirection] = useState('');
  const [filterClientId, setFilterClientId] = useState('');
  const [excludeWebSocketMessages, setExcludeWebSocketMessages] = useState(false);
  const [sortField, setSortField] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Track if filter/sort has changed to reset pagination
  const [filterSortChanged, setFilterSortChanged] = useState(false);

  const LIMIT = 20;
  const isMounted = useRef(true);

  // WebSocket reference
  const wsRef = useRef<WebSocket | null>(null);

  // Keep track of the current offset using a ref to avoid stale state issues
  const currentOffsetRef = useRef(0);

  // Function to fetch logs
  const fetchLogs = async (resetOffset = false) => {
    // Prevent fetching if we're already loading unless it's a reset
    if (isLoading && !resetOffset) return;

    // Reset offset if requested, otherwise use current offset
    if (resetOffset) {
      currentOffsetRef.current = 0;
    }

    try {
      setIsLoading(true);

      // Get the API URL from environment or default to localhost
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

      // Build the URL with filters and sorting - this password must match API_PASSWORD
      let url = `${API_URL}/logs?password=${password}&limit=${LIMIT}&offset=${currentOffsetRef.current}`;

      // Add filters if present
      if (filterType) {
        url += `&type=${filterType}`;
      }

      if (filterMethod) {
        url += `&method=${filterMethod}`;
      }

      if (filterPath) {
        url += `&path=${encodeURIComponent(filterPath)}`;
      }

      if (filterDirection) {
        url += `&direction=${filterDirection}`;
      }

      if (filterClientId) {
        url += `&client_id=${encodeURIComponent(filterClientId)}`;
      }

      // Add WebSocket specific filters
      if (filterMessageType) {
        url += `&event_type=${encodeURIComponent(filterMessageType)}`;
      }

      if (excludeWebSocketMessages) {
        url += `&type=api_request&type=api_response`;
      }

      // Add sorting
      url += `&sort=${sortField}&order=${sortDirection}`;

      console.log(`Fetching logs from ${url}, offset: ${currentOffsetRef.current}`);

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'ngrok-skip-browser-warning': '1',
        },
      });

      if (!response.ok) {
        throw new Error(`Error fetching logs: ${response.statusText}`);
      }

      const data = await response.json();
      // Ensure logs is always an array
      const logsData = Array.isArray(data.data) ? data.data : [];

      if (resetOffset) {
        setLogs(logsData);
      } else {
        // Append new logs to existing ones
        setLogs((prevLogs) => [...prevLogs, ...logsData]);
      }

      // Update the offset value for next fetch
      currentOffsetRef.current += logsData.length;

      // Update state to match ref
      setOffset(currentOffsetRef.current);

      // Determine if there are more logs to fetch
      setHasMore(logsData.length === LIMIT && data.total > currentOffsetRef.current);
      setTotalLogs(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
        setFilterSortChanged(false);
      }
    }
  };

  // WebSocket connection functions
  const cleanupWebSocket = () => {
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const connectWebSocket = () => {
    // First clean up any existing connection
    cleanupWebSocket();

    const API_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8080';
    const websocket = new WebSocket(`${API_URL}/ws/logs?password=${password}`);

    websocket.onopen = () => {
      if (isMounted.current) {
        setIsWebSocketConnected(true);
        console.log('Logs WebSocket connected');
      }
    };

    websocket.onclose = () => {
      if (isMounted.current) {
        setIsWebSocketConnected(false);
        console.log('Logs WebSocket disconnected');
      }
    };

    websocket.onerror = (error) => {
      if (isMounted.current) {
        setIsWebSocketConnected(false);
        console.error('Logs WebSocket error:', error);
      }
    };

    websocket.onmessage = (event) => {
      try {
        const eventData = JSON.parse(event.data);

        if (eventData.type === 'new_log') {
          const newLog: RequestLog = eventData.content;
          if (isMounted.current) {
            // Add to logs state (at the beginning for descending order)
            if (sortDirection === 'desc') {
              setLogs((prevLogs) => [newLog, ...prevLogs]);
            } else {
              setLogs((prevLogs) => [...prevLogs, newLog]);
            }
            // Emit event for other components to react
            logEmitter.emit(eventData.type, newLog);
            // Increment total count
            setTotalLogs((prev) => prev + 1);
          }
        } else if (eventData.type === 'heartbeat') {
          websocket.send(JSON.stringify(pingMessage));
        }
      } catch (error) {
        console.error('Error processing Logs WebSocket message:', error);
      }
    };

    wsRef.current = websocket;
    return websocket;
  };

  // Initialize: Fetch logs and connect WebSocket on mount
  useEffect(() => {
    isMounted.current = true;
    fetchLogs(true);
    connectWebSocket();

    return () => {
      isMounted.current = false;
      cleanupWebSocket();
      // Clear any listeners on unmount
      logEmitter.removeAllListeners();
    };
  }, []);

  // Handle filter/sort changes
  useEffect(() => {
    // Skip initial render
    if (isMounted.current && filterSortChanged) {
      // Reset the offset reference directly to ensure clean state
      currentOffsetRef.current = 0;
      setOffset(0);
      fetchLogs(true);
    }
  }, [filterSortChanged]);

  // Handle visibility changes - reconnect when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible, reconnecting Logs WebSocket');
        fetchLogs(true);
        connectWebSocket();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Fetch more logs for infinite scrolling
  const fetchMoreLogs = async () => {
    if (!hasMore || isLoading) {
      console.log(`Skipping fetch - hasMore: ${hasMore}, isLoading: ${isLoading}`);
      return;
    }

    console.log(`Loading more logs, current offset: ${currentOffsetRef.current}, state offset: ${offset}`);
    await fetchLogs(false);
  };

  // Callback to select a log for detailed view
  const selectLog = useCallback((log: RequestLog | null) => {
    setSelectedLog(log);
  }, []);

  // Handlers for filter and sort changes
  const handleFilterTypeChange = useCallback((type: string) => {
    setFilterType(type);
    setFilterSortChanged(true);
  }, []);

  const handleFilterMethodChange = useCallback((method: string) => {
    setFilterMethod(method);
    setFilterSortChanged(true);
  }, []);

  const handleFilterPathChange = useCallback((path: string) => {
    setFilterPath(path);
    setFilterSortChanged(true);
  }, []);

  const handleFilterDirectionChange = useCallback((direction: string) => {
    setFilterDirection(direction);
    setFilterSortChanged(true);
  }, []);

  const handleFilterClientIdChange = useCallback((clientId: string) => {
    setFilterClientId(clientId);
    setFilterSortChanged(true);
  }, []);

  const handleSortFieldChange = useCallback((field: string) => {
    setSortField(field);
    setFilterSortChanged(true);
  }, []);

  const handleSortDirectionChange = useCallback((direction: 'asc' | 'desc') => {
    setSortDirection(direction);
    setFilterSortChanged(true);
  }, []);

  const handleFilterMessageTypeChange = useCallback((type: string) => {
    setFilterMessageType(type);
    setFilterSortChanged(true);
  }, []);

  const handleExcludeWebSocketMessagesChange = useCallback((exclude: boolean) => {
    setExcludeWebSocketMessages(exclude);
    setFilterSortChanged(true);
  }, []);

  // Event listener function (similar to useAlerts)
  const emitListener = (eventName: string, listener: (...args: any[]) => void) => {
    // Remove any existing listeners with the same name to prevent duplicates
    logEmitter.removeAllListeners(eventName);
    // Add the new listener
    logEmitter.on(eventName, listener);

    // Return a cleanup function to remove the specific listener
    return () => {
      logEmitter.removeListener(eventName, listener);
    };
  };

  const value: LogsContextType = {
    password,
    logs,
    isLoading,
    error,
    hasMore,
    totalLogs,
    selectedLog,
    filterType,
    filterMethod,
    filterPath,
    filterMessageType,
    filterDirection,
    filterClientId,
    excludeWebSocketMessages,
    sortField,
    sortDirection,
    isWebSocketConnected,
    fetchMoreLogs,
    selectLog,
    setFilterType: handleFilterTypeChange,
    setFilterMethod: handleFilterMethodChange,
    setFilterPath: handleFilterPathChange,
    setFilterMessageType: handleFilterMessageTypeChange,
    setFilterDirection: handleFilterDirectionChange,
    setFilterClientId: handleFilterClientIdChange,
    setExcludeWebSocketMessages: handleExcludeWebSocketMessagesChange,
    setSortField: handleSortFieldChange,
    setSortDirection: handleSortDirectionChange,
    emitListener,
  };

  return <LogsContext.Provider value={value}>{children}</LogsContext.Provider>;
};
