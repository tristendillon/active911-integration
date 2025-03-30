import type { Metadata } from "next";
import FeedEmbedHelper from '@/components/feed-embed-helper';

export const metadata: Metadata = {
  title: "MHK Alerts Embed",
  description: "Embed configuration for MHK Alerts feed",
};

export default function Home() {
  return (
    <FeedEmbedHelper />
  );
}
