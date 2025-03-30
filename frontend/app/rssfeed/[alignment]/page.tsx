import React from 'react';
import AlertFeed from '@/components/alert-feed';
import type { Metadata } from 'next';

interface RSSFeedPageProps {
  params: Promise<{
    alignment: 'start' | 'center' | 'end';
  }>;
}

export const metadata: Metadata = {
  title: 'MHK Alerts Feed | Customized Emergency Notifications',
  description: 'Customized alignment for emergency alerts and notifications in Manhattan, Kansas. Position your alert feed for optimal viewing.',
  keywords: ['MHK alerts', 'Manhattan KS', 'emergency alerts', 'custom feed', 'aligned notifications', 'emergency RSS feed'],
  openGraph: {
    title: 'MHK Alerts Feed | Customized Emergency Notifications',
    description: 'Customized alignment for emergency alerts and notifications in Manhattan, Kansas. Position your alert feed for optimal viewing.',
    type: 'website',
  },
};

export default async function RSSFeedPage({ params }: RSSFeedPageProps) {
  const { alignment } = await params;
  return (
    <div>
      <AlertFeed alignment={alignment} />
    </div>
  );
}
