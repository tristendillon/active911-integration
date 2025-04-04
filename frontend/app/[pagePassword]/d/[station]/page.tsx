import { MapProvider } from '@/providers/map-provider';
import { WeatherProvider } from '@/providers/weather-provider';
import { DashboardProvider } from '@/providers/dashboard-provider';
import Dashboard from '@/components/dashboard';
import { stations } from '@/lib/data';

interface StationDashboardPageProps {
  params: Promise<{
    pagePassword: string;
    station: string;
  }>;
  searchParams: Promise<{ sound: string }>;
}

export default async function StationDashboardPage({ params, searchParams }: StationDashboardPageProps) {
  const { pagePassword, station } = await params;
  const { sound } = await searchParams;

  const stationData = stations[station as keyof typeof stations];

  const center = {
    lat: parseFloat(stationData.latitude),
    lng: parseFloat(stationData.longitude),
  };

  return (
    <MapProvider>
      <DashboardProvider
        password={pagePassword === 'public' ? undefined : pagePassword}
        station={station}
        center={center}
        markers={[center]}
        sound={sound}
      >
        <WeatherProvider>
          <Dashboard />
        </WeatherProvider>
      </DashboardProvider>
    </MapProvider>
  );
}
