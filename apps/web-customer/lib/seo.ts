export interface LocalBusinessJsonLd {
  '@context': 'https://schema.org';
  '@type': 'AutoRental';
  name: string;
  description: string;
  url: string;
  telephone: string;
  address: {
    '@type': 'PostalAddress';
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    addressCountry: string;
  };
  openingHours: string[];
  geo: {
    '@type': 'GeoCoordinates';
    latitude: number;
    longitude: number;
  };
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001';

export function buildMetadataJsonLd(): LocalBusinessJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'AutoRental',
    name: 'FA RENT CAR',
    description:
      'Layanan sewa mobil terpercaya di Cirebon. Armada lengkap, tarif transparan, tanpa biaya siluman.',
    url: SITE_URL,
    telephone: '+6285224484488',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Jl. Pilang Raya No.10, Pilangsari',
      addressLocality: 'Kedawung, Cirebon',
      addressRegion: 'Jawa Barat',
      addressCountry: 'ID',
    },
    openingHours: ['Mo-Su 00:00-23:59'],
    geo: {
      '@type': 'GeoCoordinates',
      latitude: -6.7626,
      longitude: 108.5174,
    },
  };
}
