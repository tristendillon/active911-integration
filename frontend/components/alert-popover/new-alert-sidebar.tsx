'use client';

import type { Alert } from '@/lib/types';
import { cn } from '@/lib/utils';
import React from 'react';

interface NewAlertSidebarProps {
  alert: Alert;
  units: string[];
  isFireTV?: boolean;
}

export default function NewAlertSidebar({ alert, units, isFireTV = false }: NewAlertSidebarProps) {
  // Format timestamp if available
  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return '';

    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString();
  };

  // Adjust sizes for Fire TV
  const containerPadding = isFireTV ? 'p-8' : 'p-6';
  const gap = isFireTV ? 'gap-8' : 'gap-6';
  const cardPadding = isFireTV ? 'p-6' : 'p-5';
  const descriptionTextSize = isFireTV ? 'text-6xl' : 'text-5xl';
  const descriptionMargin = isFireTV ? 'mb-4' : 'mb-3';
  const detailsTextSize = isFireTV ? 'text-lg' : 'text-base';
  const titleSize = isFireTV ? 'text-xl' : 'text-lg';
  const titleMargin = isFireTV ? 'mb-4' : 'mb-3';
  const labelSize = isFireTV ? 'text-base' : 'text-sm';
  const addressSize = isFireTV ? 'text-3xl' : 'text-2xl';
  const dataSize = isFireTV ? 'text-lg' : 'text-base';
  const unitPadding = isFireTV ? 'px-4 py-3' : 'px-3 py-2';
  const indicatorSize = isFireTV ? 'w-4 h-4' : 'w-3 h-3';
  const indicatorMargin = isFireTV ? 'mr-3' : 'mr-2';
  const unitTextSize = isFireTV ? 'text-lg' : 'text-base';

  return (
    <div className={`w-2xl bg-secondary border-r ${containerPadding} overflow-y-auto`}>
      <div className={`flex flex-col ${gap} max-w-2xl`}>
        {/* Alert description - large and prominent */}
        <div className={`${cardPadding} rounded-lg border`}>
          <h1 className={`${descriptionTextSize} font-bold text-red-500 ${descriptionMargin}`}>{alert.alert.description}</h1>
          <div className={`${detailsTextSize} ${cn(isFireTV && 'line-clamp-7')} overflow-y-hidden whitespace-pre-wrap`}>
            {alert.alert.details?.split(/\\r\\n|\\n|\r\n|\n/).map((line, index) => (
              <React.Fragment key={index}>
                {line.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')}
                {index < (alert.alert.details?.split(/\\r\\n|\\n|\r\n|\n/) || []).length - 1 && <br />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Alert details in a clean card */}
        <div className={`${cardPadding} rounded-lg border`}>
          <h3 className={`${titleSize} font-medium ${titleMargin}`}>Alert Details</h3>
          <div className="grid grid-cols-2 gap-4">
            {alert.alert.map_address && (
              <div className="col-span-2">
                <span className={`${labelSize} font-medium text-muted-foreground block`}>Address:</span>
                <span className={`font-medium ${addressSize}`}>{alert.alert.map_address}</span>
              </div>
            )}
            {alert.alert.place && (
              <div className="col-span-2">
                <span className={`${labelSize} font-medium text-muted-foreground block`}>Location:</span>
                <span className={`font-medium ${addressSize}`}>{alert.alert.place}</span>
              </div>
            )}
            {alert.alert.stamp && (
              <div>
                <span className={`${labelSize} font-medium text-muted-foreground block`}>Time:</span>
                <span className={dataSize}>{formatTimestamp(alert.alert.stamp)}</span>
              </div>
            )}

            {alert.alert.id && (
              <div>
                <span className={`${labelSize} font-medium text-muted-foreground block`}>Reference ID:</span>
                <span className={`font-mono ${dataSize}`}>{alert.alert.id}</span>
              </div>
            )}

            {alert.agency && alert.agency.name && (
              <div>
                <span className={`${labelSize} font-medium text-muted-foreground block`}>Reporting Agency:</span>
                <span className={dataSize}>{alert.agency.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Units assigned */}
        {alert.alert.units && (
          <div className={`${cardPadding} rounded-lg border`}>
            <h3 className={`${titleSize} font-medium ${titleMargin}`}>Units Assigned</h3>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {alert.alert.units.split(' ').map((unit, i) => (
                <div key={i} className={`${unitPadding} bg-primary/10 text-primary rounded-md flex items-center`}>
                  {units.includes(unit) ? (
                    <span className={`${indicatorSize} bg-green-500 rounded-full ${indicatorMargin}`}></span>
                  ) : (
                    <span className={`${indicatorSize} bg-gray-300 rounded-full ${indicatorMargin}`}></span>
                  )}
                  <span className={`${unitTextSize} font-medium`}>{unit}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
