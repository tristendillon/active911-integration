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
  const { isFireTV, isSilk } = useAmazonDevice();
  const [isAmazonDevice, setIsAmazonDevice] = React.useState(false);
  useEffect(() => {
    // Check if this component is running inside an iframe
    const isInsideIframe = window.self !== window.top;
    
    // Check URL parameters for amazon=true
    const urlParams = new URLSearchParams(window.location.search);
    const amazonParam = urlParams.get('amazon');
    setIsAmazonDevice(amazonParam === 'true' || isFireTV || isSilk);
    
    // Apply scaling if Amazon device detected (either by URL param or user agent)
    if ((isFireTV || isSilk || amazonParam === 'true')) {
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
      <NewAlertPopover sound={sound} />
      <div className="h-full w-full flex">
        <div className="hidden md:grid md:w-1/2 bg-secondary md:grid-cols-5 h-screen overflow-hidden">
          <Sidebar isFireTV={isAmazonDevice} />
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