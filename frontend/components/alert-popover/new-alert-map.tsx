'use client';

import type { Alert } from '@/lib/types';
import React, { useEffect, useState, useMemo } from 'react';
import { GoogleMapComponent } from '../google-map-component';
import { WeatherAlertBanner } from '../weather/weather-alert-banner';
import { useWeather } from '@/providers/weather-provider';
import { useMap } from '@/providers/map-provider';
import { Hydrant } from '@/lib/types';
import { Marker } from '@react-google-maps/api';
import { getAlertIcon } from '@/lib/utils';

interface NewAlertMapProps {
  alert: Alert;
  center: google.maps.LatLngLiteral;
  isFireTV?: boolean;
}

export default function NewAlertMap({ alert, isFireTV = false }: NewAlertMapProps) {
  const { map } = useMap('popover');
  const [hydrants, setHydrants] = useState<Hydrant[]>([]);
  const { weather, loading } = useWeather();
  const coords = useMemo(
    () => ({
      lat: alert.alert.lat,
      lng: alert.alert.lon,
    }),
    [alert.alert.lat, alert.alert.lon]
  );

  const getHydrantsInBounds = async (bounds: google.maps.LatLngBounds) => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/hydrants?south_lat=${bounds.getSouthWest().lat()}&west_lng=${bounds.getSouthWest().lng()}&north_lat=${bounds.getNorthEast().lat()}&east_lng=${bounds.getNorthEast().lng()}`
    );
    const data = await res.json();
    if (res.ok) {
      setHydrants(data.data);
    }
  };

  useEffect(() => {
    if (!map || !coords.lat || !coords.lng) return;

    // Set a reasonable close-up zoom level for alert details
    const ALERT_DETAIL_ZOOM = 18;

    // Center the map on the alert
    map.setCenter(coords);

    // Set zoom level after centering
    map.setZoom(ALERT_DETAIL_ZOOM);

    // Fetch hydrants after map is properly positioned
    setTimeout(() => {
      const bounds = map.getBounds();
      if (bounds) {
        getHydrantsInBounds(bounds);
      }
    }, 100); // Give the map time to update bounds after zoom/center changes
  }, [map, coords]);

  const getColor = (flow_rate: number) => {
    if (flow_rate < 500) {
      return 'red';
    } else if (flow_rate >= 500 && flow_rate < 1000) {
      return 'orange';
    } else if (flow_rate >= 1000 && flow_rate < 1500) {
      return 'green';
    } else {
      return 'blue';
    }
  };

  return (
    <div className="flex-1 h-full">
      {coords.lat === 0 || coords.lng === 0 || !coords.lat || !coords.lng ? (
        <div className="flex-1 h-full flex items-center justify-center">
          <div className="text-2xl font-bold">No coordinates found</div>
        </div>
      ) : (
        <GoogleMapComponent className="h-full" id="popover">
          <Marker
            position={coords}
            icon={{
              url: getAlertIcon(alert.alert.description!),
              scaledSize: new google.maps.Size(40, 40),
            }}
          />
          {hydrants?.map((hydrant) => (
            <Marker
              key={hydrant.id}
              position={{ lat: hydrant.lat, lng: hydrant.lng }}
              icon={{
                url: `/icons/hydrant-${getColor(hydrant.flow_rate ?? 0)}.png`,
                scaledSize: new google.maps.Size(40, 40),
              }}
            />
          ))}
        </GoogleMapComponent>
      )}
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
