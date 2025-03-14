'use client';

import { GoogleMap, MarkerF } from '@react-google-maps/api';

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
}

export function GoogleMapComponent({ center = defaultMapCenter, zoom = 15 }: GoogleMapComponentProps) {
  return (
    <div className="w-full h-[calc(100vh-150px)]">
      <GoogleMap
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
        <MarkerF position={center} />
      </GoogleMap>
    </div>
  );
}
