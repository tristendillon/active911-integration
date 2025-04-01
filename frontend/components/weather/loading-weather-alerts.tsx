import { Card, CardContent, CardHeader } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

interface LoadingWeatherAlertsProps {
  isFireTV?: boolean;
}

export function LoadingWeatherAlerts({ isFireTV = false }: LoadingWeatherAlertsProps) {
  // Adjust for Fire TV
  const titleHeight = isFireTV ? "h-7" : "h-6";
  const subtitleHeight = isFireTV ? "h-5" : "h-4";
  const textHeight = isFireTV ? "h-4" : "h-3";
  const spacing = isFireTV ? "space-y-5" : "space-y-4";
  const lineSpacing = isFireTV ? "space-y-3" : "space-y-2";
  const cardPadding = isFireTV ? "p-4" : "";
  
  return (
    <div className="h-full w-full pb-5">
      <Card className={`h-full ${cardPadding}`}>
        <CardHeader>
          <div className="flex justify-between items-start gap-2">
            <Skeleton className={`${titleHeight} w-[65%]`} />
            <Skeleton className={`${titleHeight} w-[30%]`} />
          </div>
          <Skeleton className={`${subtitleHeight} w-full mt-2`} />
        </CardHeader>
        <CardContent className={spacing}>
          <Skeleton className={`${subtitleHeight} w-[60%]`} />
          <Skeleton className={`${subtitleHeight} w-[60%]`} />
          {Array.from({ length: 3 }).map((_, index) => (
            <div className={`${lineSpacing} mt-4`} key={index}>
              <Skeleton className={`${textHeight} w-full`} />
              <Skeleton className={`${textHeight} w-full`} />
              <Skeleton className={`${textHeight} w-full`} />
              <Skeleton className={`${textHeight} w-4/5`} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
