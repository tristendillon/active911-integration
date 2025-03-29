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

  if (pagePassword !== process.env.PAGE_PASSWORD) {
    return {
      title: 'MHK Public Alerts',
      description: 'Public alert system for Manhattan, KS'
    };
  }

  return {
    title: 'MHK Alerts',
    description: 'Alert system for Manhattan, KS'
  };
}

export default async function RootLayout({
  children,
  params
}: LayoutProps) {

  const { pagePassword } = await params;

  if (pagePassword !== process.env.PAGE_PASSWORD && pagePassword !== 'public') {
    redirect('/public/all')
  }


  return children;
}
