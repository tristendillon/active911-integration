import React, { useEffect, useMemo, useState } from 'react';
import { Alert } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { CommandShortcut } from './ui/command';
import { cn } from '@/lib/utils';
import { dashboardEmitter } from '@/hooks/use-dashboard-socket';
import { Skeleton } from './ui/skeleton';

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

export function AlertItemSkeleton({ isFireTV = false, showDetails = true }: { isFireTV?: boolean; showDetails?: boolean }) {
  return (
    <div className={cn('flex flex-col border border-border rounded-md', isFireTV ? 'p-4 gap-3' : 'p-3 gap-2')}>
      <div className="flex flex-row justify-between items-center">
        <Skeleton className={cn(isFireTV ? 'h-7 w-3/4' : 'h-6 w-3/4', 'bg-foreground/20')} />
        <Skeleton className={cn(isFireTV ? 'h-6 w-28' : 'h-5 w-24', 'bg-foreground/20')} />
      </div>
      <Separator />
      {showDetails && (
        <div className="px-4 py-2">
          <Skeleton className="h-5 w-full mb-2 bg-foreground/20" />
          <Skeleton className="h-5 w-5/6 mb-2 bg-foreground/20" />
          <Skeleton className="h-5 w-4/6 mb-2 bg-foreground/20" />
        </div>
      )}
      <div className="flex flex-row justify-between items-center mt-1">
        <Skeleton className={cn(isFireTV ? 'h-6 w-1/3' : 'h-5 w-1/3', 'bg-foreground/20')} />
        <div className={cn('flex flex-row items-center h-full', isFireTV ? 'gap-4' : 'gap-3')}>
          <Skeleton className={cn(isFireTV ? 'h-7 w-16' : 'h-6 w-14', 'bg-foreground/20')} />
          <Skeleton className={cn(isFireTV ? 'h-7 w-16' : 'h-6 w-14', 'bg-foreground/20')} />
        </div>
      </div>
    </div>
  );
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
      dashboardEmitter.emit('new_alert', alert);
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
        <p
          className={`text-base px-4`}
          style={{
            WebkitLineClamp: typeof showDetails === 'object' ? showDetails.lineClamp : 3,
            WebkitBoxOrient: 'vertical',
            display: '-webkit-box',
            overflow: 'hidden',
          }}
        >
          {alert.alert.details === '[Redacted]' ? 'No details available' : alert.alert.details}
        </p>
      )}
      <div className="flex flex-row justify-between items-center">
        <CommandShortcut className={cn(isFireTV ? 'text-base ml-0' : 'ml-0')}>{alert.alert.map_address}</CommandShortcut>
        <div className={cn('flex flex-row items-center h-full flex-wrap max-w-2/3', isFireTV ? 'gap-3' : 'gap-2')}>
          {alert.alert.units
            ?.split(' ')
            .filter(Boolean)
            .filter((unit) => isNaN(Number(unit))) // exclude pure numbers
            .map((unit) => (
              <Badge
                variant={units?.includes(unit) ? 'destructive' : 'default'}
                key={unit}
                className={cn(isFireTV ? 'text-base' : '')}
              >
                {unit}
              </Badge>
            ))}
        </div>
      </div>
    </div>
  );
}
