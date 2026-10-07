import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import Script from 'next/script';

import '@fa/ui/styles.css';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Operations Hub | FA RENT CAR',
    template: '%s | Operations Hub',
  },
  description: 'Pusat kendali operasional FA RENT CAR.',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#184fd6',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="id" data-scroll-behavior="smooth">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body>
        {children}
        <Script id="service-worker-registration" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});`}
        </Script>
      </body>
    </html>
  );
}
