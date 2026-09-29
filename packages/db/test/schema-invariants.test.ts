import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const schema = readFileSync(path.join(__dirname, '..', 'prisma', 'schema.prisma'), 'utf8');
const migration = readFileSync(
  path.join(__dirname, '..', 'prisma', 'migrations', '20260930120000_rental_core', 'migration.sql'),
  'utf8',
);

describe('rental schema invariants (docs/rules.md §3)', () => {
  it('models no deposit and no payment gateway', () => {
    expect(schema).not.toMatch(/deposit/i);
    // A gateway would need its own transaction/callback model or gateway id.
    expect(schema).not.toMatch(/model\s+\w*(Transaction|Gateway|Webhook|Callback)\w*\s*\{/i);
    expect(schema).not.toMatch(
      /\b(gatewayRef|gatewayId|paymentToken|externalId|callbackUrl|providerRef)\b/i,
    );
  });

  it('stores all money as integer rupiah', () => {
    expect(schema).not.toMatch(/\b(Float|Decimal)\b/);

    for (const field of [
      'vehicleAmount',
      'driverAmount',
      'surchargeAmount',
      'promoDiscount',
      'totalAmount',
      'subtotal',
      'discount',
      'amount',
      'unitPrice',
      'driverPerDay',
      'multiplierBasisPoints',
      'fixedSurcharge',
    ]) {
      expect(schema).toMatch(new RegExp(`${field}\\s+Int`));
    }
  });

  it('keeps timestamps in Asia/Jakarta-compatible timestamptz(6)', () => {
    expect(schema).not.toMatch(/@db\.Timestamp\b/);
    expect(schema.match(/@db\.Timestamptz\(6\)/g)?.length ?? 0).toBeGreaterThan(30);
  });

  it('soft-deletes the main rental aggregates', () => {
    for (const model of ['Customer', 'Booking']) {
      const block = schema.slice(schema.indexOf(`model ${model} {`));
      expect(block.slice(0, block.indexOf('}'))).toMatch(/deletedAt\s+DateTime\?/);
    }
  });

  it('adds the new enums with the exact rules.md values', () => {
    expect(schema).toMatch(
      /enum BookingStatus \{\s*PENDING_VERIFICATION\s*ACTIVE\s*COMPLETED\s*EXPIRED\s*CANCELLED/,
    );
    expect(schema).toMatch(/enum DocumentType \{\s*KTP\s*SIM_A/);
    expect(schema).toMatch(/enum DocumentStatus \{\s*PENDING\s*APPROVED\s*REJECTED/);
    expect(schema).toMatch(
      /enum InvoiceStatus \{\s*UNPAID\s*PAID\s*PARTIALLY_REFUNDED\s*REFUNDED\s*VOID/,
    );
    expect(schema).toMatch(
      /enum PricingRuleType \{\s*WEEKEND\s*HOLIDAY\s*HIGH_SEASON\s*LONG_DURATION/,
    );
  });

  it('wires the relations onto the existing models', () => {
    const adminUser = schema.slice(
      schema.indexOf('model AdminUser {'),
      schema.indexOf('model AuthSession {'),
    );
    expect(adminUser).toMatch(/verifiedDocuments\s+BookingDocument\[\]/);
    expect(adminUser).toMatch(/confirmedPayments\s+Payment\[\]/);

    const vehicle = schema.slice(
      schema.indexOf('model Vehicle {'),
      schema.indexOf('model VehiclePhoto {'),
    );
    expect(vehicle).toMatch(/bookingItems\s+BookingItem\[\]/);
    expect(vehicle).toMatch(/pricingRules\s+PricingRule\[\]/);
  });

  it('hashes portal tokens as a >= 32 byte digest and never as a sequential id', () => {
    expect(schema).toMatch(
      /tokenHash\s+String\s+@unique\s+@map\("token_hash"\)\s+@db\.VarChar\(64\)/,
    );
  });

  it('never cascades deletes from booking items or payments', () => {
    expect(schema).not.toMatch(/onDelete:\s*Cascade/);

    const bookingItem = schema.slice(
      schema.indexOf('model BookingItem {'),
      schema.indexOf('model BookingDocument {'),
    );
    expect(bookingItem).toMatch(
      /vehicle\s+Vehicle\s+@relation\(fields: \[vehicleId\], references: \[id\], onDelete: Restrict\)/,
    );

    const payment = schema.slice(
      schema.indexOf('model Payment {'),
      schema.indexOf('model PricingRule {'),
    );
    expect(payment).toMatch(
      /invoice\s+Invoice\s+@relation\(fields: \[invoiceId\], references: \[id\], onDelete: Restrict\)/,
    );
  });

  it('indexes the booking date, status, and uniqueness filters', () => {
    for (const index of [
      'bookings_status_idx',
      'bookings_hold_expires_at_idx',
      'bookings_created_at_idx',
      'booking_items_period_idx',
      'booking_access_tokens_token_hash_key',
      'invoices_invoice_number_key',
      'invoices_booking_id_version_key',
      'customers_nik_key',
      'customers_whatsapp_key',
    ]) {
      expect(migration).toContain(index);
    }

    expect(schema).toMatch(/nik\s+String\s+@unique/);
    expect(schema).toMatch(/whatsapp\s+String\s+@unique/);
    expect(schema).toMatch(/bookingCode\s+String\s+@unique/);
    expect(schema).toMatch(/invoiceNumber\s+String\s+@unique/);
    expect(schema).toMatch(/tokenHash\s+String\s+@unique/);
    expect(schema).toMatch(/@@unique\(\[bookingId, version\]/);
  });
});
