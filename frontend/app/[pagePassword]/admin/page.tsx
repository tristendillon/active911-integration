import { ClientControls } from '@/components/admin/client-controls';
import { ConnectionsTable } from '@/components/admin/connections-table';

interface AdminPageProps {
  params: Promise<{
    pagePassword: string;
  }>;
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { pagePassword } = await params;
  return (
    <main className="py-6 h-full overflow-y-auto">
      <div className='container mx-auto'>
        <header className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-gray-500">Manage system settings and control connected clients</p>
        </header>

        <div className="grid gap-6">
          <ClientControls password={pagePassword} />
          <ConnectionsTable password={pagePassword} />
        </div>
      </div>
    </main>
  );
}
