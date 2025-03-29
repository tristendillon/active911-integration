'use client';

import React from 'react';
import Header from './header';
import NewAlertPopover from './alert-popover/new-alert-popover';
import { GoogleMapComponent } from './google-map-component';
import { useDashboard } from '@/providers/dashboard-provider';
import Sidebar from './sidebar';
export default function Dashboard() {
  const { sound, map } = useDashboard();
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
