import React from 'react';
import AlertFeed from '@/components/alert-feed';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MHK Alerts Feed',
  description: 'RSS-style feed of alerts for Manhattan, KS',
};

export default function RSSFeedPage() {
  return (
    <div>
      <AlertFeed alignment="center" />
    </div>
  );
}
