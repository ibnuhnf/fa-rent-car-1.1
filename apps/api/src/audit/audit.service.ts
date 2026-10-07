import { Injectable } from '@nestjs/common';
import { Prisma, type AuditLog } from '@fa/db';

export type AuthAuditAction =
  | 'AUTH_LOGIN'
  | 'AUTH_REFRESH'
  | 'AUTH_REFRESH_REUSE'
  | 'AUTH_LOGOUT';

export type VehicleAuditAction =
  | 'VEHICLE_CREATED'
  | 'VEHICLE_UPDATED'
  | 'VEHICLE_DELETED'
  | 'VEHICLE_PHOTOS_UPLOADED'
  | 'VEHICLE_PHOTO_DELETED'
  | 'VEHICLE_RATE_UPDATED'
  | 'PRICING_RULE_CREATED'
  | 'MAINTENANCE_CREATED'
  | 'MAINTENANCE_UPDATED'
  | 'MAINTENANCE_DELETED';

export type StorageAuditAction = 'STORAGE_UPLOAD_URL_ISSUED' | 'STORAGE_DOWNLOAD_URL_ISSUED';

export type BookingAuditAction =
  | 'BOOKING_CREATED'
  | 'BOOKING_HOLD_EXTENDED'
  | 'BOOKING_EXPIRED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_ACTIVATED'
  | 'BOOKING_REVISED'
  | 'BOOKING_COMPLETED'
  | 'DOCUMENT_VERIFIED'
  | 'PAYMENT_RECORDED';

export type HandoverAuditAction = 'HANDOVER_CREATED';

export type AuditAction = AuthAuditAction | VehicleAuditAction | BookingAuditAction | HandoverAuditAction;

export interface HandoverAuditEvent {
  actorId: string;
  action: HandoverAuditAction;
  objectId: string;
  before?: Prisma.InputJsonObject;
  after?: Prisma.InputJsonObject;
}

export interface BookingAuditEvent {
  actorId: string | null;
  action: BookingAuditAction;
  objectId: string;
  before?: Prisma.InputJsonObject;
  after?: Prisma.InputJsonObject;
}

export const BOOKING_OBJECT_TYPE = 'BOOKING';

export interface AuthAuditEvent {
  actorId: string;
  action: AuthAuditAction;
  objectId: string;
  before?: Prisma.InputJsonObject;
  after?: Prisma.InputJsonObject;
}

export interface VehicleAuditEvent {
  actorId: string;
  action: VehicleAuditAction;
  objectId: string;
  objectType: string;
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
    objectType: string,
    event: AuthAuditEvent | VehicleAuditEvent | StorageAuditEvent | BookingAuditEvent | HandoverAuditEvent,
  ): Promise<AuditLog> {
    return transaction.auditLog.create({
      data: { ...event, objectType },
    });
  }

  record(transaction: Prisma.TransactionClient, event: AuthAuditEvent): Promise<AuditLog> {
    return this.append(transaction, AUDIT_OBJECT_TYPES.AUTH_SESSION, event);
  }

  recordVehicle(
    transaction: Prisma.TransactionClient,
    event: VehicleAuditEvent,
  ): Promise<AuditLog> {
    return this.append(transaction, event.objectType, event);
  }

  recordStorage(transaction: Prisma.TransactionClient, event: StorageAuditEvent): Promise<AuditLog> {
    return this.append(transaction, AUDIT_OBJECT_TYPES.STORAGE_OBJECT, event);
  }

  recordBooking(
    transaction: Prisma.TransactionClient,
    event: BookingAuditEvent,
  ): Promise<AuditLog> {
    return this.append(transaction, BOOKING_OBJECT_TYPE, event);
  }

  recordHandover(
    transaction: Prisma.TransactionClient,
    event: HandoverAuditEvent,
  ): Promise<AuditLog> {
    return this.append(transaction, 'HANDOVER', event);
  }
}