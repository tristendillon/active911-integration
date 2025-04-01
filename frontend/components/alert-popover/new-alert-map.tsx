'use client';

import type { Alert } from '@/lib/types';
import React from 'react';
import { GoogleMapComponent } from '../google-map-component';
import { useDashboard } from '@/providers/dashboard-provider';
import { WeatherAlertBanner } from '../weather/weather-alert-banner';
import { useWeather } from '@/providers/weather-provider';
interface NewAlertMapProps {
  alert: Alert;
  center: google.maps.LatLngLiteral;
  isFireTV?: boolean;
}

export default function NewAlertMap({ alert, center, isFireTV = false }: NewAlertMapProps) {
  const { password } = useDashboard();
  const { weather, loading } = useWeather();
  const coords = {
    lat: alert.alert.lat,
    lng: alert.alert.lon,
  };

  // Calculate the middle point between user location (center) and alert location (coords)
  const middlePoint = {
    lat: (center.lat + coords.lat) / 2,
    lng: (center.lng + coords.lng) / 2,
  };

  let markers: google.maps.LatLngLiteral[] = [];
  if (password === '') {
    markers = [coords];
  } else {
    markers = [center, coords];
  }

  // Adjust zoom level for Fire TV for better visibility
  const zoomLevel = isFireTV ? 14 : 15;

  return (
    <div className="flex-1 h-full">
      <GoogleMapComponent center={middlePoint} zoom={zoomLevel} className="h-full" markers={markers} showDirections />
      {!loading && weather?.alerts && weather.alerts.length > 0 && (
        <div className={`absolute bottom-1 left-1 flex flex-col gap-2 min-w-[400px]`}>
          {weather.alerts.map((weatherAlert) => (
            <WeatherAlertBanner key={weatherAlert.id} weatherAlert={weatherAlert} isFireTV={isFireTV} />
          ))}
        </div>
      )}
    </div>
  );
}
