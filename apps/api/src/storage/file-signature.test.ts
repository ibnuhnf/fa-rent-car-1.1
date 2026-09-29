import { describe, expect, it } from 'vitest';
import {
  ALLOWED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  verifyFileSignature,
} from './file-signature';

describe('verifyFileSignature', () => {
  it('exports ALLOWED_MIME_TYPES and MAX_UPLOAD_BYTES', () => {
    expect(ALLOWED_MIME_TYPES).toEqual([
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ]);
    expect(MAX_UPLOAD_BYTES).toBe(5 * 1024 * 1024);
  });

  it('accepts valid image/jpeg (FF D8 FF)', () => {
    expect(verifyFileSignature(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), 'image/jpeg')).toBe(true);
  });

  it('accepts valid image/png (89 50 4E 47 0D 0A 1A 0A)', () => {
    expect(
      verifyFileSignature(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        'image/png',
      ),
    ).toBe(true);
  });

  it('accepts valid application/pdf (25 50 44 46)', () => {
    expect(
      verifyFileSignature(Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]), 'application/pdf'),
    ).toBe(true);
  });

  it('accepts valid image/webp (RIFF .... WEBP)', () => {
    const buf = Buffer.alloc(12);
    buf.write('RIFF', 0);
    buf.writeUInt32LE(0x1a, 4);
    buf.write('WEBP', 8);
    expect(verifyFileSignature(buf, 'image/webp')).toBe(true);
  });

  it('rejects truncated buffers', () => {
    expect(verifyFileSignature(Buffer.from([0xff, 0xd8]), 'image/jpeg')).toBe(false);
    expect(
      verifyFileSignature(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d]), 'image/png'),
    ).toBe(false);
    expect(verifyFileSignature(Buffer.from([0x25, 0x50, 0x44]), 'application/pdf')).toBe(false);
    const webpShort = Buffer.alloc(8);
    webpShort.write('RIFF', 0);
    expect(verifyFileSignature(webpShort, 'image/webp')).toBe(false);
  });

  it('rejects empty buffer', () => {
    expect(verifyFileSignature(Buffer.alloc(0), 'image/jpeg')).toBe(false);
    expect(verifyFileSignature(Buffer.alloc(0), 'image/png')).toBe(false);
    expect(verifyFileSignature(Buffer.alloc(0), 'application/pdf')).toBe(false);
    expect(verifyFileSignature(Buffer.alloc(0), 'image/webp')).toBe(false);
  });

  it('rejects buffers with wrong magic even if long enough', () => {
    expect(
      verifyFileSignature(Buffer.from([0x00, 0xd8, 0xff, 0xe0]), 'image/jpeg'),
    ).toBe(false);
    expect(
      verifyFileSignature(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x09]),
        'image/png',
      ),
    ).toBe(false);
    expect(
      verifyFileSignature(Buffer.from([0x25, 0x50, 0x44, 0x00]), 'application/pdf'),
    ).toBe(false);
  });

  it('returns false for unknown mime', () => {
    expect(
      verifyFileSignature(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), 'image/gif'),
    ).toBe(false);
    expect(
      verifyFileSignature(Buffer.from([0x25, 0x50, 0x44, 0x46]), 'application/octet-stream'),
    ).toBe(false);
  });

  it('rejects webp when RIFF/WEBP offset wrong', () => {
    const buf = Buffer.alloc(12);
    buf.write('RIFF', 1);
    buf.write('WEBP', 8);
    expect(verifyFileSignature(buf, 'image/webp')).toBe(false);
    const buf2 = Buffer.alloc(12);
    buf2.write('RIFF', 0);
    buf2.write('WEBP', 7);
    expect(verifyFileSignature(buf2, 'image/webp')).toBe(false);
  });
});
