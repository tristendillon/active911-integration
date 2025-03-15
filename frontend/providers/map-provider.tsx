'use client';

import { Libraries, useJsApiLoader, GoogleMap } from '@react-google-maps/api';
import { ReactNode, useState, useRef, createContext, useContext } from 'react';

// Define a type for the map context
type MapContextType = {
  map: google.maps.Map | null;
  setMap: (map: google.maps.Map) => void;
};

// Create a context to store and share the map instance
const MapContext = createContext<MapContextType>({
  map: null,
  setMap: () => {},
});

// Custom hook to access the map instance
export const useMap = () => useContext(MapContext);

const libraries = ['places', 'drawing', 'geometry', 'routes'];

export function MapProvider({ children }: { children: ReactNode }) {
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const { isLoaded: scriptLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAP_API as string,
    libraries: libraries as Libraries,
  });

  if (loadError) return <p>Encountered error while loading google maps</p>;

  if (!scriptLoaded) return <p>Map Script is loading ...</p>;

  return <MapContext.Provider value={{ map, setMap }}>{children}</MapContext.Provider>;
}
