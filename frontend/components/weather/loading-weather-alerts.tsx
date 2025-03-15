import { Card, CardContent, CardHeader } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

export function LoadingWeatherAlerts() {
  return (
    <div className="h-full w-full pb-5">
      <Card className="h-full">
        <CardHeader>
          <div className="flex justify-between items-start gap-2">
            <Skeleton className="h-6 w-[65%]" />
            <Skeleton className="h-6 w-[30%]" />
          </div>
          <Skeleton className="h-4 w-full mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-[60%]" />
          <Skeleton className="h-4 w-[60%]" />
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="space-y-2 mt-4" key={index}>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
