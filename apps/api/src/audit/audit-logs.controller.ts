import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { auditLogListQuerySchema, auditLogListResponseSchema, type AuditLogListResponse } from '@fa/shared';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../database/prisma.service';

class AuditLogListQueryDto extends createZodDto(auditLogListQuerySchema) {}
class AuditLogListResponseDto extends createZodDto(auditLogListResponseSchema) {}

@ApiTags('Audit logs')
@ApiCookieAuth()
@UseGuards(AdminAuthGuard, RolesGuard)
@Controller('admin/audit-logs')
export class AuditLogsController {
  constructor(private readonly database: PrismaService) {}

  @Get()
  @ApiOkResponse({ type: AuditLogListResponseDto })
  async list(@Query() query: AuditLogListQueryDto): Promise<AuditLogListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = query.action ? { action: query.action } : {};

    const [total, rows] = await this.database.$transaction([
      this.database.auditLog.count({ where }),
      this.database.auditLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          actor: { select: { name: true } },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      logs: rows.map((row) => ({
        id: row.id,
        actorId: row.actorId,
        actorName: row.actor?.name ?? null,
        action: row.action,
        objectType: row.objectType,
        objectId: row.objectId,
        createdAt: row.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
    };
  }
}
