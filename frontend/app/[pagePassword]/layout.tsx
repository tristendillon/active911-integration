import type { Metadata } from 'next';
import type React from 'react';
import { redirect } from 'next/navigation';

type LayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{
    pagePassword: string
  }>
}>

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { pagePassword } = await params;

  // Allow public routes without redirection
  if (pagePassword === 'public') {
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

  if (pagePassword !== process.env.PAGE_PASSWORD) {
    // Incorrect password metadata
    return {
      title: 'Unauthorized Access',
      description: 'Unauthorized access to Manhattan emergency alert system.',
      robots: {
        index: false,
        follow: false,
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

  // Allow public routes without redirection
  if (pagePassword === 'public') {
    return children;
  }

  // Protect all non-public routes with password
  if (pagePassword !== process.env.PAGE_PASSWORD) {
    redirect('/public');
  }

  return children;
}