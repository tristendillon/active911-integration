import DashboardContainer from '@/components/dashboard-container';

interface AllStationsPageProps {
  params: Promise<{
    pagePassword: string;
  }>;
}

export default async function AllStationsPage({ params }: AllStationsPageProps) {
  const { pagePassword } = await params;

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-0 overflow-hidden">
      <div className="w-full h-screen">
        <DashboardContainer
          password={pagePassword}
        />
      </div>
    </main>
  );
}
