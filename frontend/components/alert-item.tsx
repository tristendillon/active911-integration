import React, { useEffect, useMemo, useState } from 'react';
import { Alert } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { CommandShortcut } from './ui/command';
import { alertEmitter } from '@/hooks/use-alerts';
import { cn } from '@/lib/utils';

interface AlertItemProps {
  units?: string[];
  alert: Alert;
  noEmit?: boolean;
  isFireTV?: boolean;
  showDetails?:
    | {
        lineClamp?: number;
        maxHeight?: string;
      }
    | boolean;
}

export default function AlertItem({ units, alert, noEmit, isFireTV = false, showDetails = true }: AlertItemProps) {
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
  return (
    <div className={cn('flex flex-col border border-border rounded-md', isFireTV ? 'p-3 gap-2' : 'p-2 gap-1', noEmit ? 'cursor-default' : 'cursor-pointer')} onClick={handleClick}>
      <div className="flex flex-row justify-between items-center">
        <p className={cn(isFireTV ? 'text-lg font-semibold' : 'font-semibold')}>{alert.alert.description}</p>
        <CommandShortcut className={cn(isFireTV ? 'text-base' : 'text-sm')}>{formatedRecievedAt}</CommandShortcut>
      </div>
      <Separator />
      {showDetails && (
        <p className={`text-base px-4 line-clamp-${typeof showDetails === 'object' ? showDetails.lineClamp : 3}`}>
          {alert.alert.details === '[Redacted]' ? 'No details available' : alert.alert.details}
        </p>
      )}
      <div className="flex flex-row justify-between items-center">
        <CommandShortcut className={cn(isFireTV ? 'text-base ml-0' : 'ml-0')}>{alert.alert.map_address}</CommandShortcut>
        <div className={cn('flex flex-row items-center h-full', isFireTV ? 'gap-3' : 'gap-2')}>
          {alert.alert.units?.split(' ').map((unit) => (
            <Badge variant={units?.includes(unit) ? 'destructive' : 'default'} key={unit} className={cn(isFireTV ? 'text-base' : '')}>
              {unit}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
