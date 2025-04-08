'use client';
import React, { useEffect } from 'react';
import Header from './header';
import NewAlertPopover from './alert-popover/new-alert-popover';
import { GoogleMapComponent } from './google-map-component';
import { useDashboard } from '@/providers/dashboard-provider';
import Sidebar from './sidebar';
import useAmazonDevice from '@/hooks/use-amazon-device';
import { cn, getAlertIcon } from '@/lib/utils';
import { WeatherAlertBanner } from './weather/weather-alert-banner';
import { useWeather } from '@/providers/weather-provider';
import { Marker } from '@react-google-maps/api';
import { useMap } from '@/providers/map-provider';
import { dashboardEmitter } from '@/hooks/use-dashboard-socket';

export default function Dashboard() {
  const { sound, isNewAlert, alerts } = useDashboard();
  const { isFireTV, isSilk } = useAmazonDevice();
  const { weather, loading } = useWeather();
  const { map } = useMap('dashboard');

  useEffect(() => {
    if (!map) return;

    // Default zoom level if we have no alerts or can't calculate bounds
    const DEFAULT_ZOOM = 13;
    const MAX_ZOOM = 16; // Prevent excessive zooming
    const MIN_ZOOM = 11; // Prevent excessive zooming out

    if (alerts.data.length === 0) {
      // If no alerts, set a reasonable default
      map.setZoom(DEFAULT_ZOOM);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    let totalLat = 0;
    let totalLng = 0;
    let validAlertCount = 0;

    // Calculate bounds and sum coordinates for center calculation
    alerts.data.forEach((alert) => {
      if (alert.alert.lat && alert.alert.lon) {
        bounds.extend(new google.maps.LatLng(alert.alert.lat, alert.alert.lon));
        totalLat += alert.alert.lat;
        totalLng += alert.alert.lon;
        validAlertCount++;
      }
    });

    if (validAlertCount === 0) {
      // No valid coordinates found
      map.setZoom(DEFAULT_ZOOM);
      return;
    }

    // Calculate the center of all alerts
    const centerPoint = {
      lat: totalLat / validAlertCount,
      lng: totalLng / validAlertCount,
    };

    // Use the calculated center
    map.setCenter(centerPoint);

    if (!bounds.isEmpty()) {
      // Add padding to the bounds and fit map to them
      const padding = { top: 100, right: 100, bottom: 100, left: 100 };
      map.fitBounds(bounds, padding);

      // Check and adjust zoom level after bounds fitting
      window.setTimeout(() => {
        const currentZoom = map.getZoom();
        if (!currentZoom) return;

        if (alerts.data.length === 1) {
          // For single alert, limit max zoom
          if (currentZoom > MAX_ZOOM) {
            map.setZoom(MAX_ZOOM);
          }
        } else if (currentZoom < MIN_ZOOM) {
          // Make sure we're not zoomed out too far
          map.setZoom(MIN_ZOOM);
        }
      }, 10); // Small delay to allow bounds to apply first
    }
  }, [alerts.data, map]);

  return (
    <div className="w-full h-screen">
      <div className={isFireTV || isSilk ? 'scale-[0.6] origin-top-left w-[166%] h-[166%]' : 'w-full h-full'}>
        <NewAlertPopover sound={sound} />
        {!isNewAlert && (
          <div className="h-full w-full flex">
            <div className="w-1/2 bg-secondary h-full">
              <Sidebar isFireTV={isFireTV} />
            </div>
            <div className="w-full h-full block">
              <Header />
              <div className={cn('w-full relative h-[calc(100%-150px)]', isFireTV || (isSilk && 'h-[calc(166%-150px)]'))}>
                <GoogleMapComponent id="dashboard">
                  {alerts.data.map((alert) => (
                    <Marker
                      key={alert.alert.id}
                      position={{ lat: alert.alert.lat, lng: alert.alert.lon }}
                      icon={{
                        url: getAlertIcon(alert.alert.description!),
                        scaledSize: new google.maps.Size(40, 40),
                      }}
                      onClick={() => {
                        dashboardEmitter.emit('new_alert', alert);
                      }}
                    />
                  ))}
                </GoogleMapComponent>
                {!loading && weather?.alerts && weather.alerts.length > 0 && (
                  <div className={`absolute bottom-1 left-1 flex flex-col gap-2 min-w-[400px]`}>
                    {weather.alerts.map((weatherAlert) => (
                      <WeatherAlertBanner key={weatherAlert.id} weatherAlert={weatherAlert} isFireTV={isFireTV} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
