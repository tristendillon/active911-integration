'use client';

import React from 'react';
import { useLogs } from '@/providers/logs-provider';
import { formatDistanceToNow } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import InfiniteScroll from 'react-infinite-scroll-component';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp } from 'lucide-react';

const methodColors = {
  GET: 'bg-blue-500',
  POST: 'bg-green-500',
  PUT: 'bg-yellow-500',
  DELETE: 'bg-red-500',
  PATCH: 'bg-purple-500',
  OPTIONS: 'bg-gray-500',
  HEAD: 'bg-gray-400',
};

export const LogsTable = () => {
  const {
    logs = [], // Provide default empty array
    isLoading,
    hasMore,
    fetchMoreLogs,
    selectLog,
    sortField,
    sortDirection,
    setSortField,
    setSortDirection,
  } = useLogs();

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc'); // Default to descending when changing field
    }
  };

  const getMethodColor = (method: string) => {
    return methodColors[method as keyof typeof methodColors] || 'bg-gray-500';
  };

  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />;
  };

  return (
    <div className="flex flex-col h-[600px]">
      <div className="rounded-md border h-full">
        <div
          id="scrollableDiv"
          className="h-full overflow-auto relative border-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-500/30 hover:[&::-webkit-scrollbar-thumb]:bg-gray-500/50"
          style={{ height: '100%', overflow: 'auto' }}
        >
          <InfiniteScroll
            dataLength={logs.length}
            next={fetchMoreLogs}
            hasMore={hasMore}
            loader={
              <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-500"></div>
              </div>
            }
            scrollableTarget="scrollableDiv"
            endMessage={logs.length > 0 && <div className="text-center p-4 text-gray-500 text-sm">All logs loaded</div>}
          >
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[100px] cursor-pointer" onClick={() => handleSort('type')}>
                    <div className="flex items-center">
                      Type
                      {renderSortIcon('type')}
                    </div>
                  </TableHead>
                  <TableHead className="w-[100px] cursor-pointer" onClick={() => handleSort('method')}>
                    <div className="flex items-center">
                      Method
                      {renderSortIcon('method')}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('path')}>
                    <div className="flex items-center">
                      Path
                      {renderSortIcon('path')}
                    </div>
                  </TableHead>
                  <TableHead className="w-[180px] cursor-pointer" onClick={() => handleSort('timestamp')}>
                    <div className="flex items-center">
                      Time
                      {renderSortIcon('timestamp')}
                    </div>
                  </TableHead>
                  <TableHead className="w-[120px] cursor-pointer" onClick={() => handleSort('source_ip')}>
                    <div className="flex items-center">
                      Source
                      {renderSortIcon('source_ip')}
                    </div>
                  </TableHead>
                  <TableHead className="w-[100px] cursor-pointer" onClick={() => handleSort('status_code')}>
                    <div className="flex items-center">
                      Status
                      {renderSortIcon('status_code')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && logs.length === 0 ? (
                  Array.from({ length: 10 }).map((_, index) => (
                    <TableRow key={index} className="animate-pulse">
                      <TableCell className="h-12 bg-gray-800/20"></TableCell>
                      <TableCell className="h-12 bg-gray-800/20"></TableCell>
                      <TableCell className="h-12 bg-gray-800/20"></TableCell>
                      <TableCell className="h-12 bg-gray-800/20"></TableCell>
                      <TableCell className="h-12 bg-gray-800/20"></TableCell>
                      <TableCell className="h-12 bg-gray-800/20"></TableCell>
                    </TableRow>
                  ))
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24 text-gray-500">
                      No logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id + log.source_ip + Math.random()} className="cursor-pointer hover:bg-gray-900/30" onClick={() => selectLog(log)}>
                      <TableCell>
                        <Badge variant="outline" className="bg-gray-800/30">
                          {log.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getMethodColor(log.method)}`}>{log.method}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm truncate max-w-[300px]">
                        {log.path}
                        {log.event_type && <span className="ml-2 text-xs text-gray-400">({log.event_type})</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{new Date(log.timestamp).toLocaleDateString()}</span>
                          <span className="text-xs text-gray-400">{formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.client_id || log.source_ip}
                        {log.direction && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {log.direction}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.status_code && <Badge className={`${log.status_code < 400 ? 'bg-green-500' : 'bg-red-500'}`}>{log.status_code}</Badge>}
                        {log.duration && <span className="ml-2 text-xs text-gray-400">{log.duration}ms</span>}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </InfiniteScroll>
        </div>
      </div>
    </div>
  );
};
