'use client';

import React, { useState } from 'react';
import { useLogs } from '@/providers/logs-provider';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const LogsFilter = () => {
  const {
    totalLogs,
    filterType,
    setFilterType,
    filterMethod,
    setFilterMethod,
    filterPath,
    setFilterPath,
    filterDirection,
    setFilterDirection,
    filterClientId,
    setFilterClientId,
    filterMessageType,
    setFilterMessageType,
    excludeWebSocketMessages,
    setExcludeWebSocketMessages,
  } = useLogs();

  const [activeTab, setActiveTab] = useState('http');

  const logTypes = ['api_request', 'api_response', 'websocket', 'system'];
  const httpMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD', 'WEBSOCKET'];
  const websocketMessageTypes = ['new_alert', 'alert_deleted', 'heartbeat', 'ping', 'pong', 'unknown'];
  const directions = ['incoming', 'outgoing'];

  return (
    <Card className="mb-4">
      <CardContent className="pt-4">
        <Tabs defaultValue="http" onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="http">HTTP Filters</TabsTrigger>
            <TabsTrigger value="websocket">WebSocket Filters</TabsTrigger>
          </TabsList>

          <TabsContent value="http" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="w-full sm:w-1/4">
                <label className="text-sm font-medium mb-1 block text-gray-400">Type</label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any type" />
                  </SelectTrigger>
                  <SelectContent>
                    {logTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-1/4">
                <label className="text-sm font-medium mb-1 block text-gray-400">Method</label>
                <Select value={filterMethod} onValueChange={setFilterMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any method" />
                  </SelectTrigger>
                  <SelectContent>
                    {httpMethods.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-1/4">
                <label className="text-sm font-medium mb-1 block text-gray-400">Direction</label>
                <Select value={filterDirection} onValueChange={setFilterDirection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any direction" />
                  </SelectTrigger>
                  <SelectContent>
                    {directions.map((dir) => (
                      <SelectItem key={dir} value={dir}>
                        {dir}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-1/4">
                <label className="text-sm font-medium mb-1 block text-gray-400">Path</label>
                <Input placeholder="Filter by path..." value={filterPath} onChange={(e) => setFilterPath(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="w-full">
                <label className="text-sm font-medium mb-1 block text-gray-400">Client ID</label>
                <Input placeholder="Filter by client ID..." value={filterClientId} onChange={(e) => setFilterClientId(e.target.value)} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="websocket" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="w-full">
                <label className="text-sm font-medium mb-1 block text-gray-400">WebSocket Message Type</label>
                <Select value={filterMessageType} onValueChange={setFilterMessageType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any message type" />
                  </SelectTrigger>
                  <SelectContent>
                    {websocketMessageTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="exclude-ws"
                checked={excludeWebSocketMessages}
                onCheckedChange={(checked) => {
                  if (typeof checked === 'boolean') {
                    setExcludeWebSocketMessages(checked);
                  }
                }}
              />
              <label htmlFor="exclude-ws" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Exclude WebSocket messages
              </label>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-4 text-sm text-gray-400 flex flex-col gap-1">
          <div>Showing {totalLogs} total logs</div>
          {(filterType || filterMethod || filterPath || filterDirection || filterClientId || filterMessageType || excludeWebSocketMessages) && (
            <div className="flex items-center gap-2">
              <div className="text-blue-400">
                Active filters:
                {filterType && ` Type = ${filterType}`}
                {filterMethod && ` Method = ${filterMethod}`}
                {filterDirection && ` Direction = ${filterDirection}`}
                {filterPath && ` Path contains "${filterPath}"`}
                {filterClientId && ` Client ID = ${filterClientId}`}
                {filterMessageType && ` Event type = ${filterMessageType}`}
                {excludeWebSocketMessages && ` (WebSocket messages excluded)`}
              </div>
              <button
                className="text-xs text-red-400 hover:text-red-300"
                onClick={() => {
                  setFilterType('');
                  setFilterMethod('');
                  setFilterPath('');
                  setFilterDirection('');
                  setFilterClientId('');
                  setFilterMessageType('');
                  setExcludeWebSocketMessages(false);
                }}
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
