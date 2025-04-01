import { CloudOff } from 'lucide-react';

interface NoWeatherAlertsProps {
  isFireTV?: boolean;
}

export function NoWeatherAlerts({ isFireTV = false }: NoWeatherAlertsProps) {
  // Adjust for Fire TV
  const iconSize = isFireTV ? "h-16 w-16" : "h-12 w-12";
  const titleSize = isFireTV ? "text-2xl" : "text-xl";
  const textSize = isFireTV ? "text-base" : "text-sm";
  const padding = isFireTV ? "p-5" : "p-4";
  const marginBottom = isFireTV ? "mb-5" : "mb-4";
  const titleMargin = isFireTV ? "mb-3" : "mb-2";
  
  return (
    <div className={`${padding} h-full flex flex-col items-center justify-center`}>
      <CloudOff className={`${iconSize} text-muted-foreground ${marginBottom}`} />
      <h3 className={`${titleSize} font-medium ${titleMargin}`}>No Weather Alerts</h3>
      <p className={`${textSize} text-muted-foreground text-center`}>There are no active weather alerts for your location at this time.</p>
    </div>
  );
}
