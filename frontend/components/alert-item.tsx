import React, { useEffect, useMemo, useState } from 'react';
import { Alert } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { CommandShortcut } from './ui/command';
import { alertEmitter } from '@/hooks/use-alerts';

interface AlertItemProps {
  units?: string[];
  alert: Alert;
  noEmit?: boolean;
  isFireTV?: boolean;
}

export default function AlertItem({ units, alert, noEmit, isFireTV = false }: AlertItemProps) {
  const recievedAt = useMemo(() => new Date(alert.alert.stamp * 1000), [alert.alert.stamp]);
  const [formatedRecievedAt, setFormatedRecievedAt] = useState(formatDistanceToNow(recievedAt, { addSuffix: true }));

  useEffect(() => {
    const interval = setInterval(() => {
      setFormatedRecievedAt(formatDistanceToNow(recievedAt, { addSuffix: true }));
    }, 1000);
    return () => clearInterval(interval);
  }, [recievedAt]);

  const handleClick = () => {
    if (!noEmit) {
      console.log('Emitting new_alert event for:', alert.alert.description);
      alertEmitter.emit('new_alert', alert);
    }
  };

  // Adjust styles for Fire TV
  const containerPadding = isFireTV ? "p-3" : "p-2";
  const containerGap = isFireTV ? "gap-2" : "gap-1";
  const titleTextSize = isFireTV ? "text-lg font-semibold" : "font-semibold";
  const timeTextSize = isFireTV ? "text-base" : "text-sm";
  const detailsTextSize = isFireTV ? "text-base px-4 overflow-hidden max-h-20 line-clamp-3" : "text-sm px-4 overflow-hidden max-h-16 line-clamp-3";
  const addressTextSize = isFireTV ? "text-base ml-0" : "ml-0";
  const badgeSize = isFireTV ? "text-base" : "";
  const badgeGap = isFireTV ? "gap-3" : "gap-2";

  return (
    <div 
      className={`flex flex-col border border-border rounded-md ${containerPadding} ${containerGap} ${noEmit ? 'cursor-default' : 'cursor-pointer'}`} 
      onClick={handleClick}
    >
      <div className="flex flex-row justify-between items-center">
        <p className={titleTextSize}>{alert.alert.description}</p>
        <CommandShortcut className={timeTextSize}>{formatedRecievedAt}</CommandShortcut>
      </div>
      <Separator />
      <p className={detailsTextSize}>
        {alert.alert.details === '[Redacted]' ? 'No details available' : alert.alert.details}
      </p>
      <div className="flex flex-row justify-between items-center">
        <CommandShortcut className={addressTextSize}>{alert.alert.map_address}</CommandShortcut>
        <div className={`flex flex-row ${badgeGap} items-center h-full`}>
          {alert.alert.units?.split(' ').map((unit) => (
            <Badge 
              variant={units?.includes(unit) ? 'destructive' : 'default'} 
              key={unit}
              className={badgeSize}
            >
              {unit}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
