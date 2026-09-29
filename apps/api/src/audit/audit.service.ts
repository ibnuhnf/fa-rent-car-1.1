import { Injectable } from '@nestjs/common';
import { Prisma, type AuditLog } from '@fa/db';

export type AuthAuditAction =
  | 'AUTH_LOGIN'
  | 'AUTH_REFRESH'
  | 'AUTH_REFRESH_REUSE'
  | 'AUTH_LOGOUT';

export type StorageAuditAction = 'STORAGE_UPLOAD_URL_ISSUED' | 'STORAGE_DOWNLOAD_URL_ISSUED';

export interface AuthAuditEvent {
  actorId: string;
  action: AuthAuditAction;
  objectId: string;
  before?: Prisma.InputJsonObject;
  after?: Prisma.InputJsonObject;
}

export interface StorageAuditEvent {
  actorId: string;
  action: StorageAuditAction;
  objectId: string;
  before?: Prisma.InputJsonObject;
  after?: Prisma.InputJsonObject;
}

// objectType is fixed per event family; never accept it from a request body.
export const AUDIT_OBJECT_TYPES = {
  AUTH_SESSION: 'AUTH_SESSION',
  STORAGE_OBJECT: 'STORAGE_OBJECT',
} as const;

@Injectable()
export class AuditService {
  private append(
    transaction: Prisma.TransactionClient,
    objectType: (typeof AUDIT_OBJECT_TYPES)[keyof typeof AUDIT_OBJECT_TYPES],
    event: AuthAuditEvent | StorageAuditEvent,
  ): Promise<AuditLog> {
    return transaction.auditLog.create({
      data: { ...event, objectType },
    });
  }

  record(transaction: Prisma.TransactionClient, event: AuthAuditEvent): Promise<AuditLog> {
    return this.append(transaction, AUDIT_OBJECT_TYPES.AUTH_SESSION, event);
  }

  recordStorage(transaction: Prisma.TransactionClient, event: StorageAuditEvent): Promise<AuditLog> {
    return this.append(transaction, AUDIT_OBJECT_TYPES.STORAGE_OBJECT, event);
  }
}
