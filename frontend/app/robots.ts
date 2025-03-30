import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/', 
          '/rssfeed',
          '/rssfeed/start',
          '/rssfeed/center', 
          '/rssfeed/end',
          '/public/all'
        ],
        disallow: [
          '/api/', 
          '/login/',
          '/*?password=*',
          '/*/logs/',
          '/*/station/',
          '/*/dashboard/'
        ]
      }
    ],
    sitemap: `${process.env.NEXT_PUBLIC_URL}/sitemap.xml`,
  };
}
