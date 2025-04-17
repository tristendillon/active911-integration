'use client';

import { useClientControls } from '@/hooks/use-client-controls';
import { Button } from '@/components/ui/button';
import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { HydrantBatchUploadProgress } from '@/lib/types';

interface ClientControlsProps {
  password: string;
}

export function ClientControls({ password }: ClientControlsProps) {
  const { isConnected, refreshClients, redirectClients, connectClients } = useClientControls({ password });
  const [customUrl, setCustomUrl] = useState('');

  // CSV Upload states
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<HydrantBatchUploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Handle file change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      // Make sure it's a CSV file
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setError('Please select a CSV file');
        setCsvFile(null);
        return;
      }
      setCsvFile(file);
      setError(null);
    }
  };

  // Check upload status
  const checkUploadStatus = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/hydrants/status?password=${password}`);

      if (!res.ok) {
        throw new Error('Failed to check upload status');
      }

      const data = await res.json();
      if (data.success) {
        setUploadProgress(data.data);

        // If upload is no longer in progress, stop polling
        if (!data.data.in_progress) {
          if (statusCheckIntervalRef.current) {
            clearInterval(statusCheckIntervalRef.current);
            statusCheckIntervalRef.current = null;
          }
          setUploading(false);
        }
      }
    } catch (err) {
      console.error('Error checking upload status:', err);
    }
  };

  // Process CSV file and upload
  const processCSV = async () => {
    if (!csvFile) return;

    setUploading(true);
    setError(null);
    setUploadProgress(null);

    try {
      // Read the CSV file
      const text = await csvFile.text();
      const lines = text.split('\n');

      // Get header and make sure it matches expected format
      const header = lines[0].trim().split(',');
      const expectedHeaders = ['hydrant_type', 'nozzles', 'status', 'lng', 'lat', 'flow_rate', 'flow_status'];

      const missingHeaders = expectedHeaders.filter(h => !header.includes(h));
      if (missingHeaders.length > 0) {
        throw new Error(`CSV is missing required headers: ${missingHeaders.join(', ')}`);
      }

      // Convert CSV to hydrant objects
      const hydrants = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines

        const values = line.split(',');
        if (values.length !== header.length) {
          console.warn(`Line ${i+1} has ${values.length} values, expected ${header.length}. Skipping.`);
          continue;
        }

        // Create a hydrant object using header positions as keys
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hydrant: any = {};
        for (let j = 0; j < header.length; j++) {
          const key = header[j].trim();
          let value: string | number = values[j].trim();

          // Convert numeric values
          if (['nozzles', 'flow_rate', 'lat', 'lng'].includes(key)) {
            value = parseFloat(value) || 0;
          }

          hydrant[key] = value;
        }

        // Rename hydrant_type to type
        if (hydrant.hydrant_type) {
          hydrant.type = hydrant.hydrant_type;
          delete hydrant.hydrant_type;
        }

        hydrants.push(hydrant);
      }

      if (hydrants.length === 0) {
        throw new Error('No valid hydrant data found in CSV');
      }

      // Upload to API
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/hydrants?password=${password}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(hydrants)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to upload hydrants');
      }

      // Start checking status
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
      }

      // Initial status check
      await checkUploadStatus();

      // Set up interval for checking status
      statusCheckIntervalRef.current = setInterval(checkUploadStatus, 3000);

    } catch (err) {
      console.error('Error uploading hydrants:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload hydrants');
      setUploading(false);
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
        statusCheckIntervalRef.current = null;
      }
    }
  };

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
      }
    };
  }, []);

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

  // Handle reset
  const handleReset = () => {
    setCsvFile(null);
    setError(null);
    setUploadProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="border rounded-md p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <p>Admin Control: {isConnected ? 'Connected' : 'Disconnected'}</p>
          </div>
          {!isConnected && (
            <Button onClick={connectClients}>
              Connect to Clients
            </Button>
          )}
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

      {/* Hydrant CSV Upload */}
      <Card className="p-4">
        <h3 className="text-lg font-medium mb-2">Upload Hydrant Data (CSV)</h3>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500 mb-2">
              Upload a CSV file with the following headers:
              <code className="bg-gray-100 px-1 rounded mx-1">hydrant_type,nozzles,status,lng,lat,flow_rate,flow_status</code>
            </p>

            <div className="flex gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={uploading}
                className="flex-1"
              />
              <Button
                onClick={processCSV}
                disabled={!csvFile || uploading}
                variant="default"
              >
                Upload
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                disabled={uploading}
              >
                Reset
              </Button>
            </div>

            {error && (
              <p className="text-sm text-red-500 mt-2">{error}</p>
            )}
          </div>

          {uploadProgress && (
            <div className="space-y-2">
              <Progress value={uploadProgress.progress} className="w-full h-2" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>
                  Status: {uploadProgress.in_progress ? 'Processing...' : 'Complete'}
                </span>
                <span>
                  {uploadProgress.processed} / {uploadProgress.total} hydrants processed
                </span>
              </div>

              {/* Results summary */}
              {!uploadProgress.in_progress && (
                <div className="text-sm space-y-1 mt-2">
                  <p className="font-medium">Results:</p>
                  <p className="text-green-600">✓ {uploadProgress.successful} hydrants successfully added</p>
                  {uploadProgress.failed > 0 && (
                    <div>
                      <p className="text-red-600">✗ {uploadProgress.failed} hydrants failed</p>
                      {uploadProgress.failedItems && uploadProgress.failedItems.length > 0 && (
                        <div className="mt-2 max-h-40 overflow-y-auto">
                          <p className="font-medium text-xs">Error details:</p>
                          <ul className="text-xs list-disc pl-4 mt-1">
                            {uploadProgress.failedItems.map((item, i) => (
                              <li key={i} className="text-red-600">
                                Row {item.index + 1}: {item.error}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}