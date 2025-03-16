import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    unoptimized: true,
  },
  env: {
    // Define any environment variables you want to expose to the client
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
    API_PASSWORD: process.env.API_PASSWORD || '',
  },
};

export default nextConfig;
