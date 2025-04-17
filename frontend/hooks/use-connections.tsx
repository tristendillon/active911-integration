

import { useState, useEffect, useCallback } from 'react';

export interface ConnectionDetail {
  id: string;
  connected_at: string;
  is_authenticated: boolean;
  remote_addr: string;
  last_activity: string;
  messages_sent: number;
  messages_received: number;
  user_agent: string;
  metadata: Record<string, string>;
  last_heartbeat_sent: string | null;
}

interface AllConntections {
  dashboard: ConnectionDetail[];
  client: ConnectionDetail[];
}

export function useConnections(password: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [connections, setConnections] = useState<AllConntections>({
    dashboard: [],
    client: [],
  });

  const fetchConnections = useCallback(async (key: 'dashboard' | 'client') => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/connections/${key}?password=${password}`);
    if (!response.ok) {
      console.error(`Failed to fetch ${key} connections`);
      return;
    }
    const data = await response.json();
    if (!data.success) {
      console.error(`Failed to fetch ${key} connections`);
      return;
    }
    setConnections(prev => ({
      ...prev,
      [key]: data.data,
    }));
  }, [password, setConnections]);

  useEffect(() => {
    setIsLoading(true);
    fetchConnections('dashboard');
    fetchConnections('client');
    setIsLoading(false);
  }, [fetchConnections]);

  const refreshConnections = useCallback(() => {
    setIsLoading(true);
    fetchConnections('dashboard');
    fetchConnections('client');
    setIsLoading(false);
  }, [fetchConnections]);

  return { isLoading, connections, refreshConnections };
}
