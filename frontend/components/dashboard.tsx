'use client';
import React from 'react';
import Header from './header';
import NewAlertPopover from './alert-popover/new-alert-popover';
import { GoogleMapComponent } from './google-map-component';
import { useDashboard } from '@/providers/dashboard-provider';
import Sidebar from './sidebar';
import useAmazonDevice from '@/hooks/use-amazon-device';

export default function Dashboard() {
  const { sound, map } = useDashboard();
  const { isFireTV, isSilk } = useAmazonDevice();
  const isAmazonDevice = isFireTV || isSilk;

  // Special layout for Fire TV and Silk browser
  if (isAmazonDevice) {
    return (
      <>
        <NewAlertPopover sound={sound} />
        <div className="h-screen w-full flex flex-row">
          {/* Left Sidebar - 30% width on Fire TV */}
          <div className="w-3/10 bg-secondary h-screen overflow-auto">
            <Sidebar />
          </div>
          
          {/* Right Content - 70% width */}
          <div className="w-7/10 h-screen flex flex-col">
            {/* Header at top */}
            <div className="w-full">
              <Header />
            </div>
            
            {/* Map fills remaining space */}
            <div className="w-full flex-grow">
              <GoogleMapComponent 
                center={map.center} 
                zoom={map.zoom} 
                markers={map.markers} 
              />
            </div>
          </div>
        </div>
      </>
    );
  }

  // Original layout for other devices
  return (
    <>
      <NewAlertPopover sound={sound} />
      <div className="block lg:hidden">
        <Header />
      </div>
      <div className="h-full w-full flex flex-col lg:flex-row">
        <div className="w-full bg-secondary grid grid-cols-1 md:grid-cols-5 h-screen overflow-hidden">
          <Sidebar />
        </div>
        <div className="w-full h-full hidden lg:block">
          <Header />
          <div className="w-full h-[50vh] lg:h-[calc(100vh-150px)]">
            <GoogleMapComponent center={map.center} zoom={map.zoom} markers={map.markers} />
          </div>
        </div>
      </div>
    </>
  );
}
