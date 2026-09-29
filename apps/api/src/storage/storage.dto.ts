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

export class RequestUploadUrlDto extends createZodDto(requestUploadUrlSchema) {}
export class RequestDownloadUrlDto extends createZodDto(requestDownloadUrlSchema) {}

export type RequestUploadUrl = z.infer<typeof requestUploadUrlSchema>;
export type RequestDownloadUrl = z.infer<typeof requestDownloadUrlSchema>;
