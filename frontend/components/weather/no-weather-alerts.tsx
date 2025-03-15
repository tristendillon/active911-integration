import { CloudOff } from 'lucide-react';

export function NoWeatherAlerts() {
  return (
    <div className="p-4 h-full flex flex-col items-center justify-center">
      <CloudOff className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-xl font-medium mb-2">No Weather Alerts</h3>
      <p className="text-sm text-muted-foreground text-center">There are no active weather alerts for your location at this time.</p>
    </div>
  );
}
