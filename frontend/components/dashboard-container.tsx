'use client';

import { useRef, useEffect, useState } from 'react';
import {  useClientListener } from '@/hooks/use-client-listener';
import useAmazonDevice from '@/hooks/use-amazon-device';

interface DashboardContainerProps {
  password: string;
  station?: {
    id: string;
    pageGroups: string[];
    lat: number;
    lng: number;
  };
  sound?: boolean;
}

export default function DashboardContainer({ password, station, sound }: DashboardContainerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const url = station ? `${process.env.NEXT_PUBLIC_URL}/${password}/d/${station.id}?sound=${sound ? 'on' : 'off'}` : `${process.env.NEXT_PUBLIC_URL}/${password}/d?sound=${sound ? 'on' : 'off' }`;
  const [iframeSrc, setIframeSrc] = useState(url);
  const { emitListener } = useClientListener({ password });

  const { isFireTV, isSilk } = useAmazonDevice()

  useEffect(() => {
    if (password === 'public') {
      return
    }
      emitListener('refresh', () => {
        console.log('Refresh event received, reloading iframe content');
        if (iframeRef.current) {
          // Reload the iframe content
          const currentSrc = iframeRef.current.src;
          iframeRef.current.src = 'about:blank';
          setTimeout(() => {
            if (iframeRef.current) {
              iframeRef.current.src = currentSrc;
            }
          }, 100);
        }
      });
    emitListener('redirect', (data: { url: string }) => {
      if (data.url === 'dashboard') {
        setIframeSrc(url);
      } else {
        console.log('Redirect event received:', data);
        if (iframeRef.current && data.url) {
          // Update iframe src to redirect
          setIframeSrc(data.url);
        }
      }
    });
  }, [emitListener, password, url]);

  useEffect(() => {
    if (isFireTV || isSilk) {
      const viewport = iframeRef.current?.querySelector('meta[name="viewport"]')
      if (viewport) {
        viewport.setAttribute('content', 'width=device-width, initial-scale=0.5, user-scalable=no');
      } else {
        // If viewport meta tag doesn't exist, create one
        const newViewport = document.createElement('meta');
        newViewport.setAttribute('name', 'viewport');
        newViewport.setAttribute('content', 'width=device-width, initial-scale=0.5, user-scalable=no');
        const head = iframeRef.current?.querySelector("head")
        head?.appendChild(newViewport)
      }
    }
  }, [isFireTV, isSilk])


  return (
    <div className="w-full h-full flex flex-col">
      {isFireTV && <div>
        Is fire Tv
      </div>}
      {isSilk && <div>
        Is Silk
      </div>}
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        className="w-full h-full border-0"
        title="Dashboard Content"
      />
    </div>
  );
}
