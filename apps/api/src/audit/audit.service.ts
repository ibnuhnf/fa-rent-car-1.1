import { Injectable } from '@nestjs/common';
import { Prisma, type AuditLog } from '@fa/db';

export type AuditAction =
  | 'AUTH_LOGIN'
  | 'AUTH_REFRESH'
  | 'AUTH_REFRESH_REUSE'
  | 'AUTH_LOGOUT'
  | 'VEHICLE_CREATED'
  | 'VEHICLE_UPDATED'
  | 'VEHICLE_DELETED'
  | 'VEHICLE_PHOTOS_UPLOADED'
  | 'VEHICLE_PHOTO_DELETED'
  | 'VEHICLE_RATE_UPDATED'
  | 'PRICING_RULE_CREATED';

export interface AuditEvent {
  actorId: string;
  action: AuditAction;
  objectId: string;
  objectType?: string;
  before?: Prisma.InputJsonObject;
  after?: Prisma.InputJsonObject;
}

@Injectable()
export class AuditService {
  record(transaction: Prisma.TransactionClient, event: AuditEvent): Promise<AuditLog> {
    return transaction.auditLog.create({
      data: { ...event, objectType: event.objectType ?? 'AUTH_SESSION' },
    });
  }
}
