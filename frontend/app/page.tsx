import type { Metadata } from "next";
import FeedEmbedHelper from '@/components/feed-embed-helper';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

export const metadata: Metadata = {
  title: "MHK Alerts Embed",
  description: "Embed configuration for MHK Alerts feed",
};

export default function Home() {
  return (
    <div className="flex flex-col justify-center h-screen p-4 gap-10">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">Click here to view the public alerts dashboard</p>
        <Button className="w-fit" asChild>
          <Link href="/public/all">Public Dashboard</Link>
        </Button>
      </div>
      <Separator className="w-full" />
      <div className="flex flex-col gap-2 w-full h-full">
        <h1 className="text-2xl font-bold">MHK Alerts Embed</h1>
        <p className="text-sm text-muted-foreground">Embed configuration for MHK Alerts feed</p>
        <FeedEmbedHelper />
      </div>

    </div>
  );
}
