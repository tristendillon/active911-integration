import { MapProvider } from '@/providers/map-provider';
import { WeatherProvider } from '@/providers/weather-provider';
import { DashboardProvider } from '@/providers/dashboard-provider';
import Dashboard from '@/components/dashboard';

interface AllDashboardPageProps {
  params: Promise<{
    pagePassword: string;
  }>;
  searchParams: Promise<{ sound: string }>;
}

export default async function AllDashboardPage({ params, searchParams }: AllDashboardPageProps) {
  const { pagePassword } = await params;
  const { sound } = await searchParams;

  return (
    <MapProvider>
      <DashboardProvider sound={sound} password={pagePassword}>
        <WeatherProvider>
          <Dashboard />
        </WeatherProvider>
      </DashboardProvider>
    </MapProvider>
  );
}
