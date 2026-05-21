import type { Metadata, Viewport } from 'next';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jos Emergency Response System',
  description: 'Rapid emergency response for Jos, Plateau State — Medical, Fire, Security and Civil Safety',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'JosER',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
  keywords: ['emergency', 'Jos', 'Plateau State', 'Nigeria', '911', 'USSD', 'rapid response'],
  authors: [{ name: 'Jos Emergency Response' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f172a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=yes" />
      </head>
      <body className="h-full overflow-hidden">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
