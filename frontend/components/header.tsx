'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { weatherCodes } from '@/lib/weather-codes';
import Image from 'next/image';
import { useDashboard } from '@/providers/dashboard-provider';

export default function Header() {
  const { center, units } = useDashboard();

  const currentTime = new Date();
  return (
    <header className="w-full z-50 border-border border-b bg-secondary h-[150px]">
      <div className="container px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Date and Time */}
          <div className="flex flex-col">
            <span className="text-2xl font-semibold tracking-tight">{format(currentTime, 'EEE, MMM d')}</span>
            <span className="text-3xl font-bold">{format(currentTime, 'h:mm')}</span>
          </div>

          {/* Logo
          <div className="hidden md:flex items-center justify-center">
            <div className="h-14 w-14 rounded-full bg-teal-600 flex items-center justify-center">
              <div className="text-white text-xs font-semibold flex flex-col items-center">
                <span>RESCUE</span>
                <div className="bg-white w-10 mt-1 rounded-sm">
                  <span className="text-teal-600 text-xs">SQUAD</span>
                </div>
              </div>
            </div>
          </div> */}

          {/* Current Weather */}
          {/* {weather && (
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-medium">{weather.data.time}</span>
                <span className="text-sm text-muted-foreground">CA</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {weatherCodes.weatherCode[weather.data.values.weatherCode.toString() as keyof typeof weatherCodes.weatherCode] ?? 'Unknown'}
              </span>
              <div className="flex items-baseline">
                <span className="text-3xl font-bold">{Math.round(weather.data.values.temperature)}°</span>
                <span className="text-xs text-muted-foreground ml-1">F</span>
                <div className="ml-2 text-xs text-muted-foreground">
                  <span>↑ {forecast?.timelines.daily[0].values.temperatureMax.toFixed(0)}°</span> <span>↓ {forecast?.timelines.daily[0].values.temperatureMin.toFixed(0)}°</span>
                </div>
              </div>
            </div>
          )} */}

          {/* Forecast
          <div className="hidden lg:block">
            <Card className="border-none shadow-none">
              <CardContent className="p-0">
                {forecast.timelines.daily.slice(0, 3).map((day, index) => (
                  <div key={index} className="flex items-center justify-between py-1 gap-4">
                    <span className="text-sm font-medium w-20 capitalize">{format(new Date(day.time), 'EEEEEEE').toLowerCase()}</span>
                    <div className="flex items-center justify-center w-6">
                      <Image src={`/icons/${day.values.weatherCodeMax}.png`} alt={'Weather Icon'} width={24} height={24} />
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">{day.values.temperatureMax.toFixed(0)}°</span>{' '}
                      <span className="text-muted-foreground">{day.values.temperatureMin.toFixed(0)}°</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div> */}
        </div>
      </div>
    </header>
  );
}
