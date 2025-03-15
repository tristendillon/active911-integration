import { Card, CardContent, CardHeader } from './ui/card';
import { Skeleton } from './ui/skeleton';

export function LoadingWeatherAlerts() {
  return (
    <div className="h-full w-full">
      <Card className="h-[80%]">
        <CardHeader>
          <div className="flex justify-between items-start">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-4 w-full mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-48" />
          <div className="space-y-2 mt-4">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-center gap-2 mt-4">
        <Skeleton className="h-2 w-2 rounded-full" />
        <Skeleton className="h-2 w-2 rounded-full" />
      </div>
    </div>
  );
}
