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

  return (
    <div className="w-full h-full overflow-hidden">
      <div className={isFireTV || isSilk ? "scale-[0.5] origin-top-left w-[200%] h-[200%]": "w-full h-full"}>
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
      </div>
    </div>
);

}