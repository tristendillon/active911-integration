'use client';

import useAmazonDevice from '@/hooks/use-amazon-device';
import type { Alert as AlertType } from '@/lib/types';
import { cn } from '@/lib/utils';
import React, { useEffect, useState } from 'react';
import { CommandShortcut } from '../ui/command';
import { parseCADDetails, cleanResult, type CADDetails } from '@/lib/cad-details-parser';
import { Alert, AlertTitle, AlertDescription, } from '../ui/alert';
import CADDetailsDisplay from './cad-details';

interface NewAlertSidebarProps {
  alert: AlertType;
  units: string[];
}

export default function NewAlertSidebar({ alert, units }: NewAlertSidebarProps) {
  const [parsedDetails, setParsedDetails] = useState<CADDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Format timestamp if available
  const { isFireTV } = useAmazonDevice()
  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return '';

    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) + ' ' + date.toLocaleDateString();
  };

  const handleParse = (details: string) => {
    try {
      if (!details.trim()) {
        setError("Please enter CAD details to parse");
        setParsedDetails(null);
        return;
      }

      const parsed = parseCADDetails(details);
      const cleaned = cleanResult(parsed) as CADDetails;
      setParsedDetails(cleaned);
      setError(null);
    } catch (err) {
      setError(`Error parsing CAD details: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setParsedDetails(null);
    }
  };

  useEffect(() => {
    handleParse(alert.alert.details || '');
  }, [alert.alert.details]);


  return (
    <div className="flex h-full max-w-2xl border-r">

      <div className={cn('bg-secondary', isFireTV ? 'p-8 scale-75 w-[133%] h-[133%] origin-top-left' : 'p-6 overflow-y-auto')}>
        <div className={cn('flex flex-col', isFireTV ? 'gap-8  w-[133%] h-[133%]' : 'gap-6')}>
        {/* Alert description - large and prominent */}
        <div className={cn('rounded-lg border', isFireTV ? 'p-6' : 'p-5')}>
          <div className="flex gap-4">
            <h1 className={cn('font-bold text-red-500', isFireTV ? 'text-6xl mb-4' : 'text-5xl mb-3')}>{alert.alert.description}</h1>
            {alert.alert.stamp && (
              <CommandShortcut
                className={cn(isFireTV ? 'text-lg' : 'text-base')}
              >
                {formatTimestamp(alert.alert.stamp)}
              </CommandShortcut>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {alert.alert.map_address && (
              <div className="col-span-2">
                <span className={cn('font-medium', isFireTV ? 'text-3xl' : 'text-2xl')}>{alert.alert.map_address}</span>
              </div>
            )}
            {alert.alert.place && (
              <div className="col-span-2">
                <span className={cn('font-medium text-muted-foreground block', isFireTV ? 'text-base' : 'text-sm')}>Location:</span>
                <span className={cn('font-medium', isFireTV ? 'text-3xl' : 'text-2xl')}>{alert.alert.place}</span>
              </div>
            )}
          </div>
        </div>
        {alert.alert.units && (
          <div className={cn('rounded-lg border', isFireTV ? 'p-6' : 'p-5')}>
            <h3 className={cn('font-medium', isFireTV ? 'text-xl mb-4' : 'text-lg mb-3')}>Units Assigned</h3>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {alert.alert.units.split(' ').map((unit, i) => (
                <div key={i} className={cn('bg-primary/10 text-primary rounded-md flex items-center', isFireTV ? 'px-4 py-3' : 'px-3 py-2')}>
                  {units.includes(unit) ? (
                    <span className={cn('bg-green-500 rounded-full', isFireTV ? 'w-4 h-4 mr-3' : 'w-3 h-3 mr-2')}></span>
                  ) : (
                    <span className={cn('bg-gray-300 rounded-full', isFireTV ? 'w-4 h-4 mr-3' : 'w-3 h-3 mr-2')}></span>
                  )}
                  <span className={cn('font-medium', isFireTV ? 'text-lg' : 'text-base')}>{unit}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {parsedDetails && (
            <CADDetailsDisplay details={parsedDetails} />
          )}
        </div>
      </div>
    </div>
  </div>
  );
}
