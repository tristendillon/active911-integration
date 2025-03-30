import type { Metadata } from 'next';
import type React from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

type LayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{
    pagePassword: string
  }>
}>

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { pagePassword } = await params;

  if (pagePassword !== process.env.PAGE_PASSWORD) {
    // Public metadata (when password is incorrect)
    return {
      title: 'MHK Public Alerts | Manhattan Emergency Information',
      description: 'Public emergency alert system for Manhattan, Kansas providing real-time updates on local emergencies and weather conditions.',
      keywords: ['Manhattan KS alerts', 'public emergency information', 'MHK public alerts', 'emergency notifications', 'Kansas alerts'],
      openGraph: {
        title: 'MHK Public Alerts | Manhattan Emergency Information',
        description: 'Public emergency alert system for Manhattan, Kansas providing real-time updates on local emergencies and weather conditions.',
        type: 'website',
        locale: 'en_US',
      },
      robots: {
        index: true,
        follow: true,
      }
    };
  }

  // Private metadata (when password is correct)
  return {
    title: 'MHK Alerts Dashboard | Emergency Management System',
    description: 'Authorized access to Manhattan, Kansas emergency management system with real-time alerts, maps and response tools.',
    robots: {
      index: false,
      follow: false,
    }
  };
}

export default async function RootLayout({
  children,
  params
}: LayoutProps) {

  const { pagePassword } = await params;
  const headersList = await headers();
  const pathname = headersList.get('X-PATHNAME')
  if (pagePassword !== process.env.PAGE_PASSWORD && pathname !== '/public/all') {
    redirect('/public/all')
  }


  return children;
}
