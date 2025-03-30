import React from 'react';
import { LogsProvider } from '@/providers/logs-provider';
import { LogsTable } from '@/components/logs/logs-table';
import { LogsFilter } from '@/components/logs/logs-filter';
import { LogDetailSidebar } from '@/components/logs/log-detail-sidebar';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'MHK Alerts Logs',
  description: 'Logs for MHK Alerts',
}

interface LogsPageProps {
  params: Promise<{
    pagePassword: string;
  }>;
}

export default async function LogsPage({ params }: LogsPageProps) {
  const { pagePassword } = await params;

  // Use API_PASSWORD for validation
  if (pagePassword !== process.env.PAGE_PASSWORD) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-red-900/20 text-red-500 p-4 rounded-md border border-red-800">Invalid password. Access denied.</div>
      </div>
    );
  }

  return (
    <LogsProvider password={pagePassword}>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <header className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center space-x-4">
              <Link href={`/${pagePassword}`} className="flex items-center text-sm text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold">Request Logs</h1>
            </div>

            <div className="text-sm text-gray-400">Explore and analyze API request history</div>
          </header>

          <LogsFilter />
          <LogsTable />
          <LogDetailSidebar />
        </div>
      </div>
    </LogsProvider>
  );
}
