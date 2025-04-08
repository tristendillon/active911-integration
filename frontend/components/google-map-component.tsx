'use client';

import { GoogleMap } from '@react-google-maps/api';
import { cn } from '@/lib/utils';
import { useCallback } from 'react';
import { useMap } from '@/providers/map-provider';
import { TrafficLayer } from '@react-google-maps/api';
export const defaultMapContainerStyle = {
  width: '100%',
  height: '100%',
};

// Default center coordinates (Manhattan, KS)
const defaultMapCenter = {
  lat: 39.20477293294785,
  lng: -96.5848473560866,
};

// Default zoom level for map initialization
const DEFAULT_ZOOM = 13;

interface GoogleMapComponentProps {
  className?: string;
  children?: React.ReactNode;
  id?: string;
}

export function GoogleMapComponent({ className, children, id }: GoogleMapComponentProps) {
  const { setMap } = useMap();

  // Store a reference to the map when it's loaded
  const onLoad = useCallback(
    (mapInstance: google.maps.Map) => {
      setMap(mapInstance, id);
    },
    [setMap, id]
  );

  return (
    <div className={cn(`w-full h-full`, className)}>
      <GoogleMap
        id={id}
        onLoad={onLoad}
        mapContainerStyle={defaultMapContainerStyle}
        center={defaultMapCenter}
        zoom={DEFAULT_ZOOM}
        options={{
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: false,
          draggable: false,
          zoomControl: false,
          scrollwheel: false,
          disableDefaultUI: true,
          mapTypeId: google.maps.MapTypeId.HYBRID,
          minZoom: 9, // Prevent excessive zooming out
          maxZoom: 20, // Prevent excessive zooming in
        }}
      >
        <TrafficLayer
          options={{
            autoRefresh: true,
          }}
        />
        {children}
      </GoogleMap>
    </div>
  );
}
