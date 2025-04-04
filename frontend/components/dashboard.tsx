'use client';
import React, { useEffect } from 'react';
import Header from './header';
import NewAlertPopover from './alert-popover/new-alert-popover';
import { GoogleMapComponent } from './google-map-component';
import { useDashboard } from '@/providers/dashboard-provider';
import Sidebar from './sidebar';
import useAmazonDevice from '@/hooks/use-amazon-device';


export default function Dashboard() {
  const { sound, map } = useDashboard();
  const { isFireTV, isSilk, userAgent } = useAmazonDevice();
  useEffect(() => {
    // Apply scaling if Amazon device detected (either by URL param or user agent)
    if (isFireTV || isSilk || true) {
      let viewport = document.querySelector('meta[name="viewport"]');
      if (!viewport) {
        viewport = document.createElement('meta');
        viewport.setAttribute("name", "viewport");
        document.head.appendChild(viewport);
      }
      console.log("CHANGING VIEWPORT FOR AMAZON DEVICE");
      viewport.setAttribute('content', 'width=device-width, initial-scale=0.5, user-scalable=no');
    }
  }, [isFireTV, isSilk]);

  // Original layout for other devices

  return (
    <>
      <div>IS firetv {String(isFireTV)}</div>
      <div>Is silk {String(isSilk)}</div>
      <div>ua {userAgent}</div>
      <NewAlertPopover sound={sound} />
      <div className="h-full w-full flex">
        <div className="grid w-1/2 bg-secondary grid-cols-5 h-screen overflow-hidden">
          <Sidebar isFireTV={isFireTV} />
        </div>
        <div className="w-full h-full block">
          <Header />
          <div className="w-full h-full relative">
            <GoogleMapComponent center={map.center} zoom={map.zoom} markers={map.markers} />
          </div>
        </div>
      </div>
    </>
);

}