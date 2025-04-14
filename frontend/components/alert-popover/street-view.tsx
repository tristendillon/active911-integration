'use client';

import { useEffect, useRef, useState } from 'react';
import { useMap } from '@/providers/map-provider';
import { Alert, Hydrant } from '@/lib/types';
import {
  getAlertIcon,
  getFlowRateColor,
  getLatLngDistances,
} from '@/lib/utils';
import { ArrowBigUp } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '500px',
};

interface StreetViewProps {
  alert: Alert;
  hydrants: Hydrant[];
}

/**
 * Attempts to geocode the provided address, with fallback to alert coordinates
 * if geocoding fails or returns a location too far from the alert
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

      // If geocoded result is too far from alert location, use alert coordinates instead
      return distance <= 100 ? resultCoords : alertCoords;
    }
  } catch (error) {
    console.error('Error in geocoding:', error);
  }

  return alertCoords; // Fallback to alert coordinates
};

/**
 * Find the closest valid Street View panorama within a reasonable radius
 */
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
      console.error('Error in finding nearby panorama:', error);
    }
  }

  throw new Error("Could not find a Street View panorama within range");
};

const StreetView: React.FC<StreetViewProps> = ({ alert, hydrants }) => {
  const streetViewRef = useRef<HTMLDivElement | null>(null);
  const panoramaRef = useRef<google.maps.StreetViewPanorama | null>(null);
  const { map } = useMap('popover');

  const [currentHeading, setCurrentHeading] = useState(0);
  const [angleToHydrant, setAngleToHydrant] = useState(0);
  const [angleToTarget, setAngleToTarget] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const [isTargetInView, setIsTargetInView] = useState(true);

  // Check if target is in view based on current heading
  const checkTargetInView = (currentHeading: number, targetAngle: number) => {
    const angleDiff = ((targetAngle - currentHeading + 540) % 360) - 180;
    return Math.abs(angleDiff) <= 55;
  };

  // Function to look at target
  const lookAtTarget = () => {
    if (panoramaRef.current && angleToTarget !== 0) {
      panoramaRef.current.setPov({
        heading: angleToTarget,
        pitch: -10,
      });
    }
  };

  useEffect(() => {
    const initStreetView = async () => {
      if (!streetViewRef.current) return;

      const fullAddress = `${alert.alert.place}, ${alert.alert.map_address}, ${alert.alert.state}`;
      const target = new google.maps.LatLng(alert.alert.lat, alert.alert.lon);

      try {
        // Get coordinates to face when initializing the view
        const facingCoords = await fetchGeocode(fullAddress, alert);

        // Find the closest street view panorama
        const panoResult = await findNearbyPanorama(target);
        const panoLatLng = panoResult.data.location?.latLng;

        if (!panoLatLng) {
          console.error("Invalid panorama location data");
          return;
        }

        // Initialize Street View panorama
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

        // Add target marker (alert location)
        new google.maps.Marker({
          position: target,
          map: panorama,
          icon: {
            url: getAlertIcon(alert.alert.description ?? ''),
            scaledSize: new google.maps.Size(40, 40),
          },
        });

        // Find and mark the closest hydrant
        const closestHydrant = findClosestHydrant(hydrants, target);
        if (closestHydrant) {
          const hydrantLatLng = new google.maps.LatLng(
            closestHydrant.lat,
            closestHydrant.lng
          );

          new google.maps.Marker({
            position: hydrantLatLng,
            map: panorama,
            icon: {
              url: `/icons/hydrant-${getFlowRateColor(
                closestHydrant.flow_rate ?? 0
              )}.png`,
              scaledSize: new google.maps.Size(40, 40),
            },
          });

          // Calculate angle to hydrant
          const angle = google.maps.geometry.spherical.computeHeading(
            panoLatLng,
            hydrantLatLng
          );
          setAngleToHydrant(angle);
        }

        // Calculate angle to target (alert location)
        const angleToTargetValue = google.maps.geometry.spherical.computeHeading(
          panoLatLng,
          target
        );
        setAngleToTarget(angleToTargetValue);

        // Calculate initial heading toward facing coordinates
        const initialHeading = google.maps.geometry.spherical.computeHeading(
          panoLatLng,
          facingCoords
        );

        // Set up panorama with initial position
        panorama.setPano(panoResult.data.location?.pano ?? '');

        // Set initial POV after a short delay to ensure panorama is ready
        setTimeout(() => {
          panorama.setPov({
            heading: initialHeading,
            pitch: -10,
          });

          // Check if target is in view after initial positioning
          setTimeout(() => {
            const isInView = checkTargetInView(initialHeading, angleToTargetValue);
            setIsTargetInView(isInView);

            // If target not in view after 3 seconds, automatically rotate to it
            if (!isInView) {
              setTimeout(lookAtTarget, 3000);
            }
          }, 500);
        }, 100);

        // Listen for point-of-view changes
        panorama.addListener('pov_changed', () => {
          const pov = panorama.getPov();
          setCurrentHeading(pov.heading);

          // Update if target is in view
          if (angleToTargetValue !== 0) {
            const inView = checkTargetInView(pov.heading, angleToTargetValue);
            setIsTargetInView(inView);
          }
        });
      } catch (error) {
        console.error('Error initializing Street View:', error);
      }
    };

    initStreetView();
  }, [alert, map, hydrants]);

  // Update direction arrow based on current heading and hydrant angle
  useEffect(() => {
    if (angleToHydrant === 0) return;

    const angleDiff = ((angleToHydrant - currentHeading + 540) % 360) - 180;

    if (Math.abs(angleDiff) <= 55) {
      setDirection(null); // hydrant is in view
    } else {
      setDirection(angleDiff > 0 ? 'right' : 'left');
    }
  }, [currentHeading, angleToHydrant]);

  const findClosestHydrant = (hydrants: Hydrant[], target: google.maps.LatLng) => {
    if (!hydrants.length) return null;

    return hydrants.reduce((closest, hydrant) => {
      const distance = getLatLngDistances(
        target,
        new google.maps.LatLng(hydrant.lat, hydrant.lng)
      );
      return distance < closest.distance
        ? { distance, hydrant }
        : closest;
    }, { distance: Infinity, hydrant: null as Hydrant | null }).hydrant;
  };

  const getRotation = (dir: 'left' | 'right') => (dir === 'right' ? 90 : -90);


  useEffect(() => {
    // Only look at target if it's not in view on mount
    if (!isTargetInView) {
      lookAtTarget();
    }
  }, []);

  return (
    <div className="relative">
      <div ref={streetViewRef} style={containerStyle} />
      {direction && (
        <div className="absolute top-4 right-4 z-50 bg-white rounded-full shadow-md p-2">
          <ArrowBigUp
            className="text-black transition-transform duration-300"
            style={{
              transform: `rotate(${getRotation(direction)}deg)`,
            }}
            size={32}
          />
        </div>
      )}
    </div>
  );
};

export default StreetView;