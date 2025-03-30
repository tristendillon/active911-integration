import React from 'react';
import AlertFeed from '@/components/alert-feed';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MHK Alerts Feed | Real-time Emergency Notifications',
  description: 'Live emergency alerts and notifications for Manhattan, Kansas in an RSS-style feed format. Stay informed about local emergencies.',
  keywords: ['MHK alerts', 'Manhattan KS', 'emergency alerts', 'live feed', 'emergency notifications', 'RSS feed'],
  openGraph: {
    title: 'MHK Alerts Feed | Real-time Emergency Notifications',
    description: 'Live emergency alerts and notifications for Manhattan, Kansas in an RSS-style feed format. Stay informed about local emergencies.',
    type: 'website',
  },
};

export default function RSSFeedPage() {
  return (
    <div>
      <AlertFeed alignment="center" />
    </div>
  );
}
