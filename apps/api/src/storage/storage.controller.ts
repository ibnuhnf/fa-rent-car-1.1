import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuditService } from '../audit/audit.service';
import { AdminAuthGuard, CurrentAdmin } from '../auth/admin-auth.guard';
import type { AuthenticatedAdmin } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import {
  DownloadUrlResponseDto,
  downloadUrlResponseSchema,
  RequestDownloadUrlDto,
  RequestUploadUrlDto,
  UploadUrlResponseDto,
  uploadUrlResponseSchema,
} from './storage.dto';
import { StorageService } from './storage.service';

@ApiTags('Admin storage')
@ApiCookieAuth()
@UseGuards(AdminAuthGuard)
@Controller('admin/storage')
export class StorageController {
  constructor(
    private readonly storage: StorageService,
    private readonly database: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Post('upload-url')
  @HttpCode(200)
  @ApiBody({ type: RequestUploadUrlDto })
  @ApiOkResponse({ type: UploadUrlResponseDto })
  async requestUploadUrl(
    @Body() body: RequestUploadUrlDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    const result = await this.storage.createUploadUrl(body);
    await this.database.$transaction(async (transaction) => {
      await this.audit.recordStorage(transaction, {
        actorId: admin.user.id,
        action: 'STORAGE_UPLOAD_URL_ISSUED',
        objectId: result.key,
        after: {
          purpose: body.purpose,
          contentType: body.contentType,
          sizeBytes: body.sizeBytes,
          expiresInSeconds: result.expiresInSeconds,
        },
      });
    });
    return uploadUrlResponseSchema.parse(result);
  }

  @Get('download-url')
  @ApiQuery({ type: RequestDownloadUrlDto })
  @ApiOkResponse({ type: DownloadUrlResponseDto })
  async requestDownloadUrl(
    @Query() query: RequestDownloadUrlDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    const result = await this.storage.createDownloadUrl(query.key);
    await this.database.$transaction(async (transaction) => {
      await this.audit.recordStorage(transaction, {
        actorId: admin.user.id,
        action: 'STORAGE_DOWNLOAD_URL_ISSUED',
        objectId: query.key,
        after: {
          key: query.key,
          expiresInSeconds: result.expiresInSeconds,
        },
      });
    });
    return downloadUrlResponseSchema.parse(result);
  }
}
