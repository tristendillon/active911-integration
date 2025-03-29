import Dashboard from '@/components/dashboard';
import { DashboardProvider } from '@/providers/dashboard-provider';
import { MapProvider } from '@/providers/map-provider';
import { WeatherProvider } from '@/providers/weather-provider';
import React from 'react';

interface DashboardPageProps {
  params: Promise<{
    pagePassword: string;
    station: string;
  }>;
  searchParams: Promise<{
    sound: string;
  }>;
}

const stationMap = {
  '1': {
    latitude: '39.204728120622434',
    longitude: '-96.58484741069773',
    pageGroups: 'E1,HZMT1,BAT1,BRUSH1',
  },
  '2': {
    latitude: '39.179256319772854',
    longitude: '-96.57359212527663',
    pageGroups: '',
  },
  '3': {
    latitude: '39.18147679643523',
    longitude: '-96.60626449191678',
    pageGroups: '',
  },
  '4': {
    latitude: '39.14057840179767',
    longitude: '-96.66375276388645',
    pageGroups: '',
  },
  '5': {
    latitude: '39.20557624637276',
    longitude: '-96.63577199805684',
    pageGroups: '',
  },
} as const;
export default async function DashboardPage({ params, searchParams }: DashboardPageProps) {
  const { pagePassword, station } = await params;
  const { sound } = await searchParams;

  if (!['1', '2', '3', '4', '5'].includes(station)) {
    return <div>Invalid station</div>;
  }

  const stationData = stationMap[station as keyof typeof stationMap];

  const latCenter = parseFloat(stationData.latitude);
  const lngCenter = parseFloat(stationData.longitude);
  const pageGroupsArray = stationData.pageGroups.split(',');

  const center = {
    lat: latCenter,
    lng: lngCenter,
  };

  return (
    <MapProvider>
      <main className="h-full w-full">
        <WeatherProvider center={center}>
          <DashboardProvider password={pagePassword} units={pageGroupsArray} center={center} sound={sound}>
            <Dashboard />
          </DashboardProvider>
        </WeatherProvider>
      </main>
    </MapProvider>
  );
}
