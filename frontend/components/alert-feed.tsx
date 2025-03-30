'use client'

import { useAlerts } from '@/hooks/use-alerts'
import React from 'react'
import AlertItem from './alert-item';

export default function AlertFeed({ alignment }: { alignment: string }) {
  const limit = 10;
  const { alerts, loading, isConnected, pagination: { hasNextPage, page, nextPage, prevPage, total } } = useAlerts({
    limit,
  });

  return (
    <div className={`w-full flex justify-${alignment}`}>
      <div className="w-full max-w-4xl">

      <div className="flex items-center justify-end my-4">
        <div className="flex items-center gap-2">
          {loading ? (
            <div className="flex items-center">
              <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse mr-2"></div>
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : isConnected ? (
            <div className="flex items-center">
              <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm text-muted-foreground">Connected</span>
            </div>
          ) : (
            <div className="flex items-center">
              <div className="h-2 w-2 bg-red-500 rounded-full mr-2"></div>
              <span className="text-sm text-muted-foreground">Disconnected</span>
            </div>
          )}
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg">
          <p className="text-sm text-muted-foreground">No alerts to display</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {alerts.map((alert) => (
            <AlertItem key={alert.alert.id} alert={alert} noEmit />
          ))}
        </div>
      )}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={prevPage}
          disabled={page === 1 || loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        {total > limit && (
          <span className="text-sm">
            Page {page} / {Math.ceil(total / limit)}
          </span>
        )}
        <button
          onClick={nextPage}
          disabled={!hasNextPage || loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
          </button>
        </div>
      </div>
    </div>
  );
}
