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
}

export default function AlertItem({ units, alert, noEmit }: AlertItemProps) {
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
      alertEmitter.emit('new_alert', alert);
    }
  };

  return (
    <div className={`flex flex-col border border-border rounded-md p-2 gap-1 ${noEmit ? 'cursor-default' : 'cursor-pointer'}`} onClick={handleClick}>
      <div className="flex flex-row justify-between items-center">
        <p className="font-semibold">{alert.alert.description}</p>
        <CommandShortcut className="text-sm">{formatedRecievedAt}</CommandShortcut>
      </div>
      <Separator />
      <p className="text-sm px-4 overflow-hidden max-h-16 line-clamp-3">{alert.alert.details === '[Redacted]' ? 'No details available' : alert.alert.details}</p>
      <div className="flex flex-row justify-between items-center">
        <CommandShortcut className="ml-0">{alert.alert.map_address}</CommandShortcut>
        <div className="flex flex-row gap-2 items-center h-full">
          {alert.alert.units?.split(' ').map((unit) => (
            <Badge variant={units?.includes(unit) ? 'destructive' : 'default'} key={unit}>
              {unit}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
