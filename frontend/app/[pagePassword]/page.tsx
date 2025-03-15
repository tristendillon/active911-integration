import { GoogleMapComponent } from '@/components/google-map-component';
import Header from '@/components/header';
import Sidebar from '@/components/sidebar';
import { DashboardProvider } from '@/providers/dashboard-provider';
import { MapProvider } from '@/providers/map-provider';
import { WeatherProvider } from '@/providers/weather-provider';
import React from 'react';
import { z } from 'zod';

interface DashboardPageProps {
  params: Promise<{
    pagePassword: string;
  }>;
  searchParams: Promise<{
    location: string;
    pageGroups: string;
  }>;
}

const inputSchema = z
  .object({
    location: z.string().refine(
      (location) => {
        const locationArray = location.split(',');

        if (locationArray.length !== 2) {
          return false;
        }

        const latitude = parseFloat(locationArray[0]);
        const longitude = parseFloat(locationArray[1]);

        if (isNaN(latitude) || isNaN(longitude)) {
          return false;
        }

        return true;
      },
      {
        message: "Invalid location format. Must be in 'latitude,longitude' format.",
      }
    ),
    pageGroups: z.string().refine(
      (pageGroups) => {
        if (!pageGroups) {
          return true; // Allow empty string for no page groups
        }

        const groups = pageGroups.split(',');
        return groups.every((group) => /^[a-zA-Z0-9]+$/.test(group.trim()));
      },
      {
        message: 'Invalid page groups format. Must be a comma-separated list of strings.',
      }
    ),
    pagePassword: z.string(),
  })
  .superRefine((val, ctx) => {
    const locationArray = val.location.split(',');
    const latitude = parseFloat(locationArray[0]);
    const longitude = parseFloat(locationArray[1]);

    if (latitude < -90) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Latitude must be greater than or equal to -90.',
        path: ['location'],
      });
    }

    if (latitude > 90) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Latitude must be less than or equal to 90.',
        path: ['location'],
      });
    }

    if (longitude < -180) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Longitude must be greater than or equal to -180.',
        path: ['location'],
      });
    }

    if (longitude > 180) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Longitude must be less than or equal to 180.',
        path: ['location'],
      });
    }
  });

export default async function DashboardPage({ params, searchParams }: DashboardPageProps) {
  const { pagePassword } = await params;
  const { location, pageGroups } = await searchParams;

  const { error: inputError, data: inputData } = inputSchema.safeParse({
    location,
    pageGroups,
    pagePassword,
  });

  if (inputError) {
    return (
      <div className="text-red-500 flex flex-col gap-2">
        {inputError.errors.map((error) => (
          <div key={error.path.join('.') + error.message}>
            <span className="font-bold">{error.path.join('.')}: </span>
            <span>{error.message}</span>
          </div>
        ))}
      </div>
    );
  }

  const locationArray = inputData.location.split(',');
  const latitude = locationArray[0];
  const longitude = locationArray[1];
  const pageGroupsArray = inputData.pageGroups.split(',');

  if (pagePassword !== process.env.PAGE_PASSWORD) {
    return <div>Invalid password</div>;
  }

  const latCenter = parseFloat(latitude);
  const lngCenter = parseFloat(longitude);

  const center = {
    lat: latCenter,
    lng: lngCenter,
  };

  return (
    <MapProvider>
      <main className="h-full w-full">
        <WeatherProvider>
          <DashboardProvider password={pagePassword} units={pageGroupsArray} center={center}>
            <Header />
            <div className="h-full w-full flex">
              <Sidebar />
              <GoogleMapComponent center={center} zoom={18} />
            </div>
          </DashboardProvider>
        </WeatherProvider>
      </main>
    </MapProvider>
  );
}
