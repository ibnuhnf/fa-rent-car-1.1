import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from './file-signature';
import { STORAGE_PURPOSES } from './storage.types';

export const requestUploadUrlSchema = z
  .object({
    purpose: z.enum(STORAGE_PURPOSES),
    contentType: z.enum(ALLOWED_MIME_TYPES),
    sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  })
  .strict();

export const requestDownloadUrlSchema = z.object({ key: z.string().min(1) }).strict();

export const uploadUrlResponseSchema = z
  .object({
    uploadUrl: z.string().url(),
    key: z.string().min(1),
    expiresInSeconds: z.number().int().positive(),
  })
  .strict();

export const downloadUrlResponseSchema = z
  .object({
    downloadUrl: z.string().url(),
    expiresInSeconds: z.number().int().positive(),
  })
  .strict();

export class RequestUploadUrlDto extends createZodDto(requestUploadUrlSchema) {}
export class RequestDownloadUrlDto extends createZodDto(requestDownloadUrlSchema) {}
export class UploadUrlResponseDto extends createZodDto(uploadUrlResponseSchema) {}
export class DownloadUrlResponseDto extends createZodDto(downloadUrlResponseSchema) {}

export type RequestUploadUrl = z.infer<typeof requestUploadUrlSchema>;
export type RequestDownloadUrl = z.infer<typeof requestDownloadUrlSchema>;
export type UploadUrlResponse = z.infer<typeof uploadUrlResponseSchema>;
export type DownloadUrlResponse = z.infer<typeof downloadUrlResponseSchema>;
