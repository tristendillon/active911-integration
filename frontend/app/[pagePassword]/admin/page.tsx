import { ClientControls } from '@/components/admin/client-controls';

interface AdminPageProps {
  params: Promise<{
    pagePassword: string;
  }>;
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { pagePassword } = await params;
  return (
    <div>
      <h1>Admin Page</h1>
      <ClientControls password={pagePassword} />
    </div>
  );
}
