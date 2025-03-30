'use client';

import type { Alert } from '@/lib/types';
import React from 'react';
import { GoogleMapComponent } from '../google-map-component';
import { useDashboard } from '@/providers/dashboard-provider';

interface NewAlertMapProps {
  alert: Alert;
  center: google.maps.LatLngLiteral;
}

export default function NewAlertMap({ alert, center }: NewAlertMapProps) {
  const { password } = useDashboard()
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

  return (
    <div className="flex-1 h-full">
      <GoogleMapComponent center={middlePoint} zoom={15} className="h-full" markers={markers} showDirections />
    </div>
  );
}
