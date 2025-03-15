'use client';

import type { Alert } from '@/lib/types';
import React, { useEffect, useState } from 'react';
import { GoogleMapComponent } from '../google-map-component';
import { Marker, MarkerF } from '@react-google-maps/api';

interface NewAlertMapProps {
  alert: Alert;
  center: google.maps.LatLngLiteral;
}

export default function NewAlertMap({ alert, center }: NewAlertMapProps) {
  const coords = {
    lat: alert.alert.lat,
    lng: alert.alert.lon,
  };

  // Calculate the middle point between user location (center) and alert location (coords)
  const middlePoint = {
    lat: (center.lat + coords.lat) / 2,
    lng: (center.lng + coords.lng) / 2,
  };

  return (
    <div className="flex-1 h-full">
      <GoogleMapComponent center={middlePoint} zoom={15} className="h-full" markers={[center, coords]} />
    </div>
  );
}
