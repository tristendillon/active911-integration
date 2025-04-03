import { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Dashboard | Active911',
  description: 'Active911 Dashboard Display',
};

interface DashboardLayoutProps {
  params: Promise<{ pagePassword: string }>;
  children: React.ReactNode;
}

export default async function DashboardLayout({ params, children }: DashboardLayoutProps) {
  // Handle public access
  const { pagePassword } = await params;
  if (pagePassword === 'public') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col p-0 m-0 overflow-hidden">
        {children}
      </div>
    );
  }

  // Verify password in dashboard mode
  if (pagePassword !== process.env.PAGE_PASSWORD) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col p-0 m-0 overflow-hidden">
      {children}
    </div>
  );
}
