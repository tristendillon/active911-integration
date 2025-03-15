'use client';

import { GoogleMap, MarkerF, DirectionsService, DirectionsRenderer } from '@react-google-maps/api';
import { cn } from '@/lib/utils';
import { useCallback, useEffect, useState } from 'react';
import { useMap } from '@/providers/map-provider';
//Map's styling
export const defaultMapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultMapCenter = {
  lat: 39.20477293294785,
  lng: -96.5848473560866,
};

interface GoogleMapComponentProps {
  center: google.maps.LatLngLiteral;
  zoom: number;
  className?: string;
  markers?: google.maps.LatLngLiteral[];
}

export function GoogleMapComponent({ center = defaultMapCenter, zoom = 5, className, markers }: GoogleMapComponentProps) {
  const { map, setMap } = useMap();
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

  // Store a reference to the map when it's loaded
  const onLoad = useCallback(
    (mapInstance: google.maps.Map) => {
      setMap(mapInstance);
    },
    [setMap]
  );

  // Calculate directions when there are exactly 2 markers
  useEffect(() => {
    if (!map) return;

    // Reset directions when markers change
    setDirections(null);

    if (markers && markers.length === 2) {
      const directionsService = new google.maps.DirectionsService();

      directionsService.route(
        {
          origin: markers[0],
          destination: markers[1],
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK) {
            setDirections(result);
          } else {
            console.error(`Directions request failed: ${status}`);

            // If directions fail, just show markers with bounds
            const bounds = new google.maps.LatLngBounds();
            markers.forEach((marker) => {
              bounds.extend(marker);
            });
            map.fitBounds(bounds);
          }
        }
      );
    } else if (markers && markers.length > 2) {
      // Create bounds from all markers
      const bounds = new google.maps.LatLngBounds();
      markers.forEach((marker) => {
        bounds.extend(marker);
      });
      map.fitBounds(bounds);
    } else if (markers && markers.length === 1) {
      // If there's just one marker, center on it
      map.setCenter(markers[0]);
      map.setZoom(zoom);
    } else {
      // If no markers, use the provided center and zoom
      map.setCenter(center);
      map.setZoom(zoom);
    }
  }, [map, markers, center, zoom]);

  return (
    <div className={cn(`w-full h-[calc(100vh-150px)]`, className)}>
      <GoogleMap
        onLoad={onLoad}
        mapContainerStyle={defaultMapContainerStyle}
        center={center}
        zoom={zoom}
        options={{
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: false,
          draggable: false,
          zoomControl: false,
          scrollwheel: false,
          disableDefaultUI: true,
        }}
      >
        {/* Only show markers if we're not showing directions */}
        {markers?.map((marker) => <MarkerF key={`${marker.lat}-${marker.lng}`} position={marker} />)}

        {/* Show directions if available */}
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#FF6666',
                strokeWeight: 12,
              },
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
}
