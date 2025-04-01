import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';

interface DashboardPageProps {
  params: Promise<{
    pagePassword: string;
  }>;
}

const stationMap = {
  '1': {
    name: 'Headquarters',
  },
  '2': {
    name: 'Station 2',
  },
  '3': {
    name: 'Station 3',
  },
  '4': {
    name: 'Station 4',
  },
  '5': {
    name: 'Station 5',
  },
} as const;

export default async function StationSelectionPage({ params }: DashboardPageProps) {
  const { pagePassword } = await params;

  if (pagePassword !== process.env.PAGE_PASSWORD) {
    return <div>Invalid password</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen h-full bg-background">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-center">Select a Station</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(stationMap).map(([id, station]) => (
              <Link
                key={id}
                href={`/${pagePassword}/${id}`}
                className="flex w-full justify-center items-center py-2 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors h-10"
              >
                {station.name}
              </Link>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-center text-sm text-muted-foreground w-full">Select a station to view its dashboard</p>
        </CardFooter>
      </Card>
    </div>
  );
}
