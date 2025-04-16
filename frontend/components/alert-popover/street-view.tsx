'use client';

import { useEffect, useRef, useState } from 'react';
import { useMap } from '@/providers/map-provider';
import { Alert } from '@/lib/types';
import {
  getAlertIcon,
  getLatLngDistances,
} from '@/lib/utils';

const containerStyle = {
  width: '100%',
  height: '300px',
};

interface StreetViewProps {
  alert: Alert;
}

/**
 * Attempts to geocode the provided address, with fallback to alert coordinates
 */
const fetchGeocode = async (fullAddress: string, alert: Alert) => {
  const alertCoords = new google.maps.LatLng(alert.alert.lat, alert.alert.lon);
  const encoded = encodeURIComponent(fullAddress);

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAP_API}`
    );
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      const resultCoords = new google.maps.LatLng(lat, lng);
      const distance = getLatLngDistances(alertCoords, resultCoords);
      return distance <= 100 ? resultCoords : alertCoords;
    }
  } catch (error) {
    console.error('Error in geocoding:', error);
  }

  return alertCoords;
};

const findNearbyPanorama = async (target: google.maps.LatLng) => {
  const streetViewService = new google.maps.StreetViewService();
  let radius = 15;
  const maxRadius = 100;

  while (radius <= maxRadius) {
    try {
      const result = await streetViewService.getPanorama({
        radius,
        location: target,
        preference: google.maps.StreetViewPreference.BEST,
        sources: [
          google.maps.StreetViewSource.OUTDOOR,
          google.maps.StreetViewSource.GOOGLE,
        ],
      });
      return result;
    } catch (error) {
      radius += 10;
      console.error('Error finding panorama:', error);
    }
  }

  throw new Error("No Street View panorama found within range");
};

const StreetView: React.FC<StreetViewProps> = ({ alert }) => {
  const streetViewRef = useRef<HTMLDivElement | null>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const { map } = useMap('popover');

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const delay = setTimeout(() => {
      setIsReady(true);
    }, 5000); // 5 seconds delay before initializing Street View

    return () => clearTimeout(delay);
  }, []);

  useEffect(() => {

    const initStreetView = async () => {
      if (!isReady || !streetViewRef.current) return;

      const fullAddress = `${alert.alert.place}, ${alert.alert.map_address}, ${alert.alert.state}`;
      const target = new google.maps.LatLng(alert.alert.lat, alert.alert.lon);

      try {
        const facingCoords = await fetchGeocode(fullAddress, alert);
        const panoResult = await findNearbyPanorama(target);
        const panoLatLng = panoResult.data.location?.latLng;

        if (!panoLatLng) return;

        const panorama = new google.maps.StreetViewPanorama(streetViewRef.current, {
          pano: panoResult.data.location?.pano,
          panControl: false,
          zoomControl: false,
          addressControl: false,
          linksControl: false,
          enableCloseButton: false,
          fullscreenControl: false,
          motionTracking: false,
          motionTrackingControl: false,
          scrollwheel: false,
          zoom: 0,
        });

        panoramaRef.current = panorama;

        new google.maps.Marker({
          position: target,
          map: panorama,
          icon: {
            url: getAlertIcon(alert.alert.description ?? ''),
            scaledSize: new google.maps.Size(40, 40),
          },
        });

        const initialHeading = google.maps.geometry.spherical.computeHeading(
          panoLatLng,
          facingCoords
        );
        panorama.setPano(panoResult.data.location?.pano ?? '');

        setTimeout(() => {
          panorama.setPov({
            heading: initialHeading,
            pitch: -10,
          });
        }, 100);


      } catch (error) {
        console.error('Error initializing Street View:', error);
      }
    };

    initStreetView();
  }, [isReady, alert, map]);

  return (
    <div className="relative">
      {!isReady && (
        <div className="flex items-center justify-center h-[400px] w-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-accent-foreground/20" />
        </div>
      )}
      <div ref={streetViewRef} style={{ ...containerStyle, display: isReady ? 'block' : 'none' }} />
    </div>
  );
};

export default StreetView;
