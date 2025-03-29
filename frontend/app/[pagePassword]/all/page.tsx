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

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { sound } = await searchParams;

  const latCenter = 39.19319752935804;
  const lngCenter = -96.58534125130507;

  const center = {
    lat: latCenter,
    lng: lngCenter,
  };

  return (
    <MapProvider>
      <main className="h-full w-full">
        <WeatherProvider center={center}>
          <DashboardProvider center={center} sound={sound} markers={[]} zoom={14}>
            <Dashboard />
          </DashboardProvider>
        </WeatherProvider>
      </main>
    </MapProvider>
  );
}
