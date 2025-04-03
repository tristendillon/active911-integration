import DashboardContainer from '@/components/dashboard-container';
import { stations } from '@/lib/data';

interface StationPageProps {
  params: Promise<{
    pagePassword: string;
    station: string;
  }>;
}

export default async function StationPage({ params }: StationPageProps) {
  const { pagePassword, station } = await params;

  if (!stations[station as keyof typeof stations]) {
    return <div>Station not found</div>;
  }

  const stationData = stations[station as keyof typeof stations];

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-0 overflow-hidden">
      <div className="w-full h-screen">
        <DashboardContainer
          password={pagePassword}
          station={{
            id: station,
            pageGroups: stationData.pageGroups.split(','),
            lat: parseFloat(stationData.latitude),
            lng: parseFloat(stationData.longitude),
          }}
        />
      </div>
    </main>
  );
}
