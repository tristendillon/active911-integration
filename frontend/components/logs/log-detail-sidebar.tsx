'use client';

import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useLogs, type RequestLog } from '@/providers/logs-provider';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import useSWR from 'swr';
import { Skeleton } from '../ui/skeleton';
const methodColors = {
  GET: 'bg-blue-500',
  POST: 'bg-green-500',
  PUT: 'bg-yellow-500',
  DELETE: 'bg-red-500',
  PATCH: 'bg-purple-500',
  OPTIONS: 'bg-gray-500',
  HEAD: 'bg-gray-400',
};

const fetcher = async (url: string) => {
  const res = await fetch(url, {
    headers: {
      'ngrok-skip-browser-warning': '1',
    },
  });
  if (!res.ok) {
    throw new Error('Failed to fetch');
  }
  const data = await res.json();
  return data.data;
};

export const LogDetailSidebar = () => {
  const { selectedLog, selectLog, password } = useLogs();

  const {
    data: log,
    error,
    isLoading: logLoading,
  } = useSWR<RequestLog>(selectedLog?.id ? `${process.env.NEXT_PUBLIC_API_URL}/logs/${selectedLog.id}?password=${password}` : null, fetcher);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatJSON = (data: any) => {
    try {
      return typeof data === 'string' ? JSON.stringify(JSON.parse(data), null, 2) : JSON.stringify(data, null, 2);
    } catch (e) {
      console.error(e);
      return typeof data === 'string' ? data : JSON.stringify(data);
    }
  };

  const getMethodColor = (method: string) => {
    return methodColors[method as keyof typeof methodColors] || 'bg-gray-500';
  };

  const renderTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{date.toLocaleString()}</span>
          <span className="text-xs text-gray-400">{formatDistanceToNow(date, { addSuffix: true })}</span>
        </div>
      );
    } catch (e) {
      console.error(e);
      return timestamp;
    }
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <Sheet open={!!selectedLog} onOpenChange={(open) => !open && selectLog(null)}>
      <SheetContent className="w-[600px] sm:max-w-full p-0">
        {selectedLog && (
          <div className="h-full flex flex-col">
            <SheetHeader className="p-6 pb-4 border-b">
              <div className="flex justify-between items-center">
                <SheetTitle>Request Details</SheetTitle>
                <Badge className={`${getMethodColor(selectedLog.method)}`}>{selectedLog.method}</Badge>
              </div>
            </SheetHeader>

            <ScrollArea className="flex-1 h-[calc(100%-80px)]">
              <div className="p-6 space-y-8">
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">ID</h3>
                  <p className="text-sm font-mono bg-gray-900/30 p-2 rounded">{selectedLog.id}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Type</h3>
                    <p className="text-sm font-mono bg-gray-900/30 p-2 rounded">{selectedLog.type}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Method</h3>
                    <div className="bg-gray-900/30 p-2 rounded">
                      <Badge className={`${getMethodColor(selectedLog.method)}`}>{selectedLog.method}</Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Path</h3>
                  <p className="text-sm font-mono bg-gray-900/30 p-2 rounded break-all">{selectedLog.path}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Time</h3>
                  <div className="bg-gray-900/30 p-2 rounded">{renderTime(selectedLog.timestamp)}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Source IP</h3>
                    <p className="text-sm font-mono bg-gray-900/30 p-2 rounded">{selectedLog.source_ip}</p>
                  </div>

                  {selectedLog.status_code && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-400 mb-2">Status Code</h3>
                      <div className="bg-gray-900/30 p-2 rounded">
                        <Badge className={`${selectedLog.status_code < 400 ? 'bg-green-500' : 'bg-red-500'}`}>{selectedLog.status_code}</Badge>
                      </div>
                    </div>
                  )}
                </div>

                {selectedLog.client_id && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Client ID</h3>
                    <p className="text-sm font-mono bg-gray-900/30 p-2 rounded">{selectedLog.client_id}</p>
                  </div>
                )}

                {selectedLog.direction && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Direction</h3>
                    <div className="bg-gray-900/30 p-2 rounded">
                      <Badge variant="outline">{selectedLog.direction}</Badge>
                    </div>
                  </div>
                )}

                {selectedLog.duration && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Duration</h3>
                    <p className="text-sm font-mono bg-gray-900/30 p-2 rounded">{selectedLog.duration} ms</p>
                  </div>
                )}

                {selectedLog.event_type && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Event Type</h3>
                    <p className="text-sm font-mono bg-gray-900/30 p-2 rounded">{selectedLog.event_type}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Headers</h3>
                  <div className="border rounded-md overflow-hidden">
                    {logLoading ? (
                      <Skeleton className="w-full h-[300px]" />
                    ) : (
                      <SyntaxHighlighter
                        language="json"
                        style={vscDarkPlus}
                        customStyle={{
                          margin: 0,
                          borderRadius: '0.375rem',
                          maxHeight: '300px',
                          scrollbarWidth: 'thin',
                          scrollbarColor: 'rgba(255, 255, 255, 0.1) transparent',
                          overflowY: 'auto',
                        }}
                        wrapLines={true}
                        className="custom-scrollbar"
                      >
                        {formatJSON(log?.headers)}
                      </SyntaxHighlighter>
                    )}
                  </div>
                </div>

                {log?.body && log.body !== '{}' && log.body !== 'null' && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Body</h3>
                    <div className="border rounded-md overflow-hidden">
                      {logLoading ? (
                        <Skeleton className="w-full h-[300px]" />
                      ) : (
                        <SyntaxHighlighter
                          language="json"
                          style={vscDarkPlus}
                          customStyle={{
                            margin: 0,
                            borderRadius: '0.375rem',
                            maxHeight: '300px',
                            scrollbarWidth: 'thin',
                            scrollbarColor: 'rgba(255, 255, 255, 0.1) transparent',
                            overflowY: 'auto',
                          }}
                          wrapLines={true}
                          className="custom-scrollbar"
                        >
                          {formatJSON(log.body)}
                        </SyntaxHighlighter>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
