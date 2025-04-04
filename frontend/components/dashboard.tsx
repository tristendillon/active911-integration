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
  useAmazonDevice() // Fixes scaling on amazon devices "maybe"

  // Original layout for other devices
  return (
    <>
      <NewAlertPopover sound={sound} />
      <div className="block lg:hidden">
        <Header />
      </div>
      <div className="h-full w-full flex flex-col lg:flex-row">
        <div className="w-1/2 bg-secondary grid grid-cols-1 md:grid-cols-5 h-screen overflow-hidden">
          <Sidebar />
        </div>
        <div className="w-full h-full hidden lg:block">
          <Header />
          <div className="w-full h-full relative">
            <GoogleMapComponent center={map.center} zoom={map.zoom} markers={map.markers} />
          </div>
        </div>
      </div>
    </>
  );
}