import { randomUUID } from 'node:crypto';
import { HeadBucketCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAX_UPLOAD_BYTES, SIGNED_URL_TTL_SECONDS } from '@fa/shared';
import { z } from 'zod';
import type { Environment } from '../config/environment';
import { createStorageClient } from './storage-client';

const uploadSchema = z.object({
  ownerId: z.uuid(),
  contentType: z.enum(['image/jpeg', 'image/png', 'application/pdf']),
  byteLength: z.number().int().min(1).max(MAX_UPLOAD_BYTES),
});

export function assertObjectOwnership(ownerId: string, objectKey: string) {
  z.uuid().parse(ownerId);
  const prefix = `staging/admin/${ownerId}/`;
  if (
    !objectKey.startsWith(prefix) ||
    !z.uuid().safeParse(objectKey.slice(prefix.length)).success
  ) {
    throw new Error('Private object is outside the authorized scope');
  }
}

@Injectable()
export class StorageService implements OnModuleDestroy {
  private readonly client;
  private readonly bucket: string;

  constructor(config: ConfigService<Environment, true>) {
    this.client = createStorageClient(
      {
        S3_ENDPOINT: config.get('S3_ENDPOINT', { infer: true }),
        S3_REGION: config.get('S3_REGION', { infer: true }),
        S3_ACCESS_KEY: config.get('S3_ACCESS_KEY', { infer: true }),
        S3_SECRET_KEY: config.get('S3_SECRET_KEY', { infer: true }),
      },
      { presigning: true },
    );
    this.bucket = config.get('S3_BUCKET', { infer: true });
  }

  async check() {
    await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
  }

  // Staging only: domain uploads must inspect bytes before accepting a document.
  async createStagingUpload(input: z.infer<typeof uploadSchema>) {
    const valid = uploadSchema.parse(input);
    const objectKey = `staging/admin/${valid.ownerId}/${randomUUID()}`;
    const url = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        ContentType: valid.contentType,
        ContentLength: valid.byteLength,
      }),
      { expiresIn: SIGNED_URL_TTL_SECONDS },
    );
    return { objectKey, url, expiresIn: SIGNED_URL_TTL_SECONDS };
  }

  async createStagingDownload(ownerId: string, objectKey: string) {
    assertObjectOwnership(ownerId, objectKey);
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        ResponseContentDisposition: 'attachment',
      }),
      { expiresIn: SIGNED_URL_TTL_SECONDS },
    );
  }

  // Callers must have already authorized the request; this only signs the key.
  async createDownload(objectKey: string) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      { expiresIn: SIGNED_URL_TTL_SECONDS },
    );
  }

  onModuleDestroy() {
    this.client.destroy();
  }
}
