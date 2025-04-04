'use client';
import React from 'react';
import Header from './header';
import NewAlertPopover from './alert-popover/new-alert-popover';
import { GoogleMapComponent } from './google-map-component';
import { useDashboard } from '@/providers/dashboard-provider';
import Sidebar from './sidebar';
import useAmazonDevice from '@/hooks/use-amazon-device';
import { cn } from '@/lib/utils';


export default function Dashboard() {
  const { sound, map } = useDashboard();
  const { isFireTV, isSilk } = useAmazonDevice();
  console.log(map.zoom)
  return (
    <div className="w-full h-screen">
      <div className={isFireTV || isSilk ? "scale-[0.75] origin-top-left w-[150%] h-[150%]": "w-full h-full"}>
        <NewAlertPopover sound={sound} />
        <div className="h-full w-full flex">
          <div className="grid w-1/2 bg-secondary grid-cols-5 h-full">
            <Sidebar isFireTV={isFireTV} />
          </div>
          <div className="w-full h-full block">
            <Header />
            <div className={cn("w-full relative h-[calc(100vh-150px)]", isFireTV || isSilk && "h-[calc(150vh-150px)]")}>
              <GoogleMapComponent center={map.center} zoom={map.zoom} markers={map.markers} />
            </div>
          </div>
        </div>
      </div>
    </div>
);

}