import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import type { Environment } from '../config/environment';
import { assertObjectOwnership, StorageService } from './storage.service';

function service() {
  return new StorageService(
    new ConfigService<Environment, true>({
      S3_ENDPOINT: 'http://localhost:9000',
      S3_REGION: 'us-east-1',
      S3_BUCKET: 'test-private',
      S3_ACCESS_KEY: 'synthetic-key',
      S3_SECRET_KEY: 'synthetic-secret-not-a-real-credential',
    }),
  );
}

describe('private staging storage', () => {
  it('uses random object keys and five-minute signatures', async () => {
    const storage = service();
    try {
      const ownerId = randomUUID();
      const upload = await storage.createStagingUpload({
        ownerId,
        contentType: 'image/png',
        byteLength: 128,
      });
      expect(upload.objectKey).toMatch(new RegExp(`^staging/admin/${ownerId}/[a-f0-9-]{36}$`));
      expect(new URL(upload.url).searchParams.get('X-Amz-Expires')).toBe('300');
      expect(upload.expiresIn).toBe(300);
    } finally {
      storage.onModuleDestroy();
    }
  });

  it('rejects oversized or empty files before issuing a signature', async () => {
    const storage = service();
    try {
      const ownerId = randomUUID();
      for (const byteLength of [0, -1, 5 * 1024 * 1024 + 1, 1.5]) {
        await expect(
          storage.createStagingUpload({ ownerId, contentType: 'image/png', byteLength }),
        ).rejects.toThrow();
      }
    } finally {
      storage.onModuleDestroy();
    }
  });

  it('rejects other owners, traversal, and arbitrary object paths', () => {
    const ownerId = randomUUID();
    const key = `staging/admin/${ownerId}/${randomUUID()}`;
    expect(() => assertObjectOwnership(ownerId, key)).not.toThrow();
    expect(() => assertObjectOwnership(randomUUID(), key)).toThrow();
    expect(() => assertObjectOwnership(ownerId, `${key}/../../file`)).toThrow();
    expect(() => assertObjectOwnership(ownerId, 'other/private.pdf')).toThrow();
  });
});

describe('admin storage signed URLs', () => {
  it('createUploadUrl returns a purpose-prefixed UUID key with the verified extension', async () => {
    const storage = service();
    try {
      const result = await storage.createUploadUrl({
        purpose: 'ktp',
        contentType: 'image/png',
        sizeBytes: 42,
      });
      expect(result.key).toMatch(/^ktp\/[a-f0-9-]{36}\.png$/);
      expect(result.expiresInSeconds).toBe(600);
      expect(new URL(result.uploadUrl).searchParams.get('X-Amz-Expires')).toBe('600');
    } finally {
      storage.onModuleDestroy();
    }
  });

  it('createDownloadUrl issues a signed URL whose expiry stays within the limit', async () => {
    const storage = service();
    try {
      const key = `sim/${randomUUID()}.pdf`;
      const result = await storage.createDownloadUrl(key);
      expect(new URL(result.downloadUrl).searchParams.get('X-Amz-Expires')).toBe('600');
      expect(result.expiresInSeconds).toBeLessThanOrEqual(600);
    } finally {
      storage.onModuleDestroy();
    }
  });

  it('derives the key extension from the allowlisted MIME, not from client input', async () => {
    const storage = service();
    try {
      for (const [contentType, ext] of [
        ['image/jpeg', 'jpg'],
        ['image/webp', 'webp'],
        ['application/pdf', 'pdf'],
      ] as const) {
        const result = await storage.createUploadUrl({
          purpose: 'payment_proof',
          contentType,
          sizeBytes: 1024,
        });
        expect(result.key).toMatch(new RegExp(`^payment_proof/[a-f0-9-]{36}\\.${ext}$`));
      }
    } finally {
      storage.onModuleDestroy();
    }
  });

  it('rejects disallowed MIME types and oversized payloads', async () => {
    const storage = service();
    try {
      await expect(
        storage.createUploadUrl({
          purpose: 'ktp',
          contentType: 'image/gif' as never,
          sizeBytes: 10,
        }),
      ).rejects.toThrow();
      await expect(
        storage.createUploadUrl({
          purpose: 'ktp',
          contentType: 'image/png',
          sizeBytes: 5 * 1024 * 1024 + 1,
        }),
      ).rejects.toThrow();
      await expect(storage.createDownloadUrl('')).rejects.toThrow();
    } finally {
      storage.onModuleDestroy();
    }
  });
});
