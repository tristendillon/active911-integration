import Dashboard from '@/components/dashboard';
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
    sound: string;
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
    sound: z.string().optional(),
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
  const { location, pageGroups, sound } = await searchParams;

  const { error: inputError, data: inputData } = inputSchema.safeParse({
    location,
    pageGroups,
    pagePassword,
    sound,
  });

  // Default values if validation fails
  const defaultLocation = '39.204728120622434,-96.58484741069773';
  const defaultPageGroups = 'E1,HZMT1,BAT1';
  let validLocation = defaultLocation;
  let validPageGroups = defaultPageGroups;

  if (!inputError) {
    validLocation = inputData.location;
    validPageGroups = inputData.pageGroups || defaultPageGroups;
  } else {
    console.error('Input validation error:', inputError.errors);
  }

  const locationArray = validLocation.split(',');
  const latitude = locationArray[0];
  const longitude = locationArray[1];
  const pageGroupsArray = validPageGroups.split(',');

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
        <WeatherProvider center={center}>
          <DashboardProvider password={pagePassword} units={pageGroupsArray} center={center} sound={sound}>
            <Dashboard />
          </DashboardProvider>
        </WeatherProvider>
      </main>
    </MapProvider>
  );
}
