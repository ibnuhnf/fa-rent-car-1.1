import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import '@fa/ui/styles.css';

import './globals.css';

import { buildMetadataJsonLd } from '../lib/seo';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'FA RENT CAR | Rental Mobil Cirebon',
    template: '%s · FA RENT CAR',
  },
  description:
    'Sewa mobil lepas kunci & dengan sopir di Cirebon. 45 armada siap jalan, tarif transparan tanpa biaya siluman, pesan langsung tanpa wajib registrasi akun.',
  openGraph: {
    title: 'FA RENT CAR | Sewa Mobil Lepas Kunci & Dengan Sopir di Cirebon',
    description:
      '45 armada siap jalan. Cek ketersediaan mobil sesuai tanggal, kalkulasi total tarif transparan tanpa biaya siluman, dan pesan langsung tanpa wajib registrasi akun.',
    type: 'website',
    locale: 'id_ID',
    siteName: 'FA RENT CAR',
    url: siteUrl,
  },
  twitter: {
    card: 'summary',
    title: 'FA RENT CAR | Sewa Mobil Lepas Kunci & Dengan Sopir di Cirebon',
    description:
      '45 armada siap jalan. Cek ketersediaan mobil sesuai tanggal, kalkulasi total tarif transparan tanpa biaya siluman, dan pesan langsung tanpa wajib registrasi akun.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="id" data-scroll-behavior="smooth">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildMetadataJsonLd()) }}
        />
        {children}
      </body>
    </html>
  );
}
