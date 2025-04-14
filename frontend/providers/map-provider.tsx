'use client';

import { Libraries, useJsApiLoader, GoogleMap } from '@react-google-maps/api';
import { ReactNode, useState, useRef, createContext, useContext } from 'react';

// Define a type for the map context
type MapContextType = {
  map: google.maps.Map | null;
  setMap: (map: google.maps.Map, id?: string) => void;
  getMap: (id?: string) => google.maps.Map | null;
};

// Create a context to store and share the map instances
const MapContext = createContext<MapContextType>({
  map: null,
  setMap: () => {},
  getMap: () => null,
});

// Custom hook to access the map instance
export const useMap = (id?: string) => {
  const context = useContext(MapContext);
  return {
    ...context,
    map: context.getMap(id),
  };
};

const libraries = ['places', 'drawing', 'geometry', 'routes', 'marker'];

export function MapProvider({ children }: { children: ReactNode }) {
  const [maps, setMaps] = useState<Record<string, google.maps.Map>>({});
  const defaultMapId = useRef('default');

  const setMap = (map: google.maps.Map, id?: string) => {
    const mapId = id || defaultMapId.current;
    setMaps(prev => ({
      ...prev,
      [mapId]: map,
    }));
  };

  const getMap = (id?: string) => {
    const mapId = id || defaultMapId.current;
    return maps[mapId] || null;
  };

  const { isLoaded: scriptLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAP_API as string,
    libraries: libraries as Libraries,
  });

  if (loadError) return <p>Encountered error while loading google maps</p>;

  if (!scriptLoaded) return <p>Map Script is loading ...</p>;

  return (
    <MapContext.Provider
      value={{
        map: getMap(),
        setMap,
        getMap
      }}
    >
      {children}
    </MapContext.Provider>
  );
}
