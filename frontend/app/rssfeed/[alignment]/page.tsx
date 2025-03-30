import React from 'react';
import AlertFeed from '@/components/alert-feed';
export default function RSSFeedPage({ params }: { params: { alignment: string } }) {
  return (
    <div>
      <AlertFeed alignment={params.alignment} />
    </div>
  );
}
