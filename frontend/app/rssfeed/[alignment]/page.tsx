import React from 'react';
import AlertFeed from '@/components/alert-feed';

interface RSSFeedPageProps {
  params: Promise<{
    alignment: 'start' | 'center' | 'end';
  }>;
}

export default async function RSSFeedPage({ params }: RSSFeedPageProps) {
  const { alignment } = await params;
  return (
    <div>
      <AlertFeed alignment={alignment} />
    </div>
  );
}
