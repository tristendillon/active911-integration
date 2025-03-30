import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://yoursite.com';

  return [
    // Main landing page
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    // RSS Feed pages
    {
      url: `${baseUrl}/rssfeed`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/rssfeed/start`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/rssfeed/center`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/rssfeed/end`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.7,
    },
    // Public alert page
    {
      url: `${baseUrl}/public/all`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    }
  ];
}
