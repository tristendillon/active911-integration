import React from 'react';
import AlertFeed from '@/components/alert-feed';
import type { Metadata } from 'next';

interface RSSFeedPageProps {
  params: Promise<{
    alignment: 'start' | 'center' | 'end';
  }>;
}

export const metadata: Metadata = {
  title: 'MHK Alerts Feed',
  description: 'RSS-style feed of alerts for Manhattan, KS',
};

export default async function RSSFeedPage({ params }: RSSFeedPageProps) {
  const { alignment } = await params;
  return (
    <div>
      <AlertFeed alignment={alignment} />
    </div>
  );
}
