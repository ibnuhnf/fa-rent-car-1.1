import { describe, expect, it } from 'vitest';

import { buildMetadataJsonLd } from './seo';

describe('buildMetadataJsonLd', () => {
  it('builds valid schema.org AutoRental JSON-LD payload', () => {
    const jsonLd = buildMetadataJsonLd();

    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('AutoRental');
    expect(jsonLd.name).toBe('FA RENT CAR');
    expect(jsonLd.address.addressLocality).toContain('Kedawung, Cirebon');
    expect(jsonLd.telephone).toBe('+6285224484488');
  });
});
