import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Active911 Integration',
  description: 'Responsive emergency alert system with real-time notifications, mapping, and weather alerts',
  keywords: ['emergency', 'alert system', 'real-time', 'notifications', 'mapping', 'weather alerts'],
  openGraph: {
    title: 'Active911 Integration',
    description: 'Responsive emergency alert system with real-time notifications, mapping, and weather alerts',
    url: 'https://yourdomain.com',
    siteName: 'Active911 Integration',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Active911 Integration',
    description: 'Responsive emergency alert system with real-time notifications, mapping, and weather alerts',
  },
  metadataBase: new URL('https://yourdomain.com'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full w-full !scroll-smooth dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full w-full overflow-hidden`}>{children}</body>
    </html>
  );
}
