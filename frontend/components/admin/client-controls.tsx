'use client';

import { useClientControls } from '@/hooks/use-client-controls';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

interface ClientControlsProps {
  password: string;
}

export function ClientControls({ password }: ClientControlsProps) {
  const { isConnected, refreshClients, redirectClients } = useClientControls({ password });
  const [customUrl, setCustomUrl] = useState('');

  const handleRefresh = () => {
    if (refreshClients()) {
      console.log('Refresh command sent successfully');
    }
  };

  const handleRedirect = (url: string) => {
    if (redirectClients(url)) {
      console.log(`Redirect command sent successfully to ${url}`);
    }
  };

  const handleCustomRedirect = () => {
    if (customUrl && redirectClients(customUrl)) {
      console.log(`Redirect command sent successfully to ${customUrl}`);
    }
  };

  return (
    <div className="border rounded-md p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <p>Admin Control: {isConnected ? 'Connected' : 'Disconnected'}</p>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium mb-2">Refresh All Clients</h3>
          <Button
            onClick={handleRefresh}
            disabled={!isConnected}
            variant="default"
            className="w-full"
          >
            Send Refresh Command
          </Button>
          <p className="text-xs text-gray-500 mt-1">
            Sends a command to all connected dashboards to reload their page
          </p>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">Redirect All Clients</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => handleRedirect('/')}
              disabled={!isConnected}
              variant="secondary"
            >
              Home
            </Button>
            <Button
              onClick={() => handleRedirect('dashboard')}
              disabled={!isConnected}
              variant="secondary"
            >
              Dashboard
            </Button>
            <Button
              onClick={() => handleRedirect('/pagePassword/all')}
              disabled={!isConnected}
              variant="secondary"
            >
              All Alerts
            </Button>
          </div>
          <div className="mt-2 flex gap-2">
            <Input
              type="text"
              placeholder="Enter custom URL"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              disabled={!isConnected}
            />
            <Button
              onClick={handleCustomRedirect}
              disabled={!isConnected || !customUrl}
              variant="secondary"
            >
              Go
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Sends a command to all connected dashboards to navigate to the specified URL
          </p>
        </div>
      </div>
    </div>
  );
}