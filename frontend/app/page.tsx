"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MHK Alerts Embed",
  description: "Embed configuration for MHK Alerts feed",
};

export default function Home() {
  const [flexAlignment, setFlexAlignment] = useState<"start" | "center" | "end">("start");

  return (
    <div className={`h-full w-full flex flex-col`}>
      <div className="flex gap-2 p-2 border-b">
        <Button
          variant={flexAlignment === "start" ? "default" : "outline"}
          onClick={() => setFlexAlignment("start")}
          size="sm"
        >
          Align Start
        </Button>
        <Button
          variant={flexAlignment === "center" ? "default" : "outline"}
          onClick={() => setFlexAlignment("center")}
          size="sm"
        >
          Align Center
        </Button>
        <Button
          variant={flexAlignment === "end" ? "default" : "outline"}
          onClick={() => setFlexAlignment("end")}
          size="sm"
        >
          Align End
        </Button>
      </div>
      <pre className="text-xs p-2 bg-gray-100 dark:bg-gray-800 border-b overflow-auto">
        {`<iframe src="${process.env.NEXT_PUBLIC_URL}/rssfeed/${flexAlignment}" />`}
      </pre>
      <iframe
        src={`/rssfeed/${flexAlignment}`}
        className="w-full h-full border-0"
        title="RSS Feed Preview"
      />
    </div>
  );
}
