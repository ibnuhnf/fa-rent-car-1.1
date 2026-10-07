import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Maintenance } from '@fa/db';
import type { CreateMaintenanceRequest, UpdateMaintenanceRequest } from '@fa/shared';
import type { AuthenticatedAdmin } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class MaintenancesService {
  constructor(private readonly database: PrismaService) {}

  async list(vehicleId: string) {
    const vehicle = await this.database.vehicle.findFirst({ where: { id: vehicleId, deletedAt: null }, select: { id: true } });
    if (!vehicle) throw new NotFoundException({ code: 'VEHICLE_NOT_FOUND', message: 'Kendaraan tidak ditemukan.' });
    const rows = await this.database.maintenance.findMany({ where: { vehicleId }, orderBy: { serviceDate: 'desc' } });
    return { maintenances: rows.map(toDto) };
  }

  async documents(vehicleId: string) {
    const { maintenances } = await this.list(vehicleId);
    const reminders = maintenances.filter((m) => m.nextServiceDate !== null || m.nextOdometer !== null);
    return { documents: { PAJAK: reminders, STNK: reminders, ASURANSI: reminders } };
  }

  async create(vehicleId: string, input: CreateMaintenanceRequest, admin: AuthenticatedAdmin) {
    return this.database.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findFirst({ where: { id: vehicleId, deletedAt: null }, select: { id: true } });
      if (!vehicle) throw new NotFoundException({ code: 'VEHICLE_NOT_FOUND', message: 'Kendaraan tidak ditemukan.' });
      const item = await tx.maintenance.create({ data: { ...input, vehicleId } });
      await tx.auditLog.create({ data: { actorId: admin.user.id, action: 'MAINTENANCE_CREATED', objectType: 'MAINTENANCE', objectId: item.id, after: snapshot(item) } });
      return toDto(item);
    });
  }

  async update(id: string, input: UpdateMaintenanceRequest, admin: AuthenticatedAdmin) {
    return this.database.$transaction(async (tx) => {
      const current = await tx.maintenance.findUnique({ where: { id } });
      if (!current) throw new NotFoundException({ code: 'MAINTENANCE_NOT_FOUND', message: 'Catatan perawatan tidak ditemukan.' });
      const item = await tx.maintenance.update({ where: { id }, data: input });
      await tx.auditLog.create({ data: { actorId: admin.user.id, action: 'MAINTENANCE_UPDATED', objectType: 'MAINTENANCE', objectId: id, before: snapshot(current), after: snapshot(item) } });
      return toDto(item);
    });
  }

  async remove(id: string): Promise<void> {
    const item = await this.database.maintenance.findUnique({ where: { id }, select: { id: true } });
    if (!item) throw new NotFoundException({ code: 'MAINTENANCE_NOT_FOUND', message: 'Catatan perawatan tidak ditemukan.' });
    throw new ConflictException({ code: 'MAINTENANCE_DELETE_RESTRICTED', message: 'Catatan perawatan tidak dapat dihapus karena model tidak mendukung soft delete.' });
  }
}

function snapshot(item: Maintenance): Prisma.InputJsonObject {
  return { vehicleId: item.vehicleId, serviceDate: item.serviceDate.toISOString(), odometer: item.odometer, cost: item.cost, description: item.description, nextServiceDate: item.nextServiceDate?.toISOString() ?? null, nextOdometer: item.nextOdometer };
}

function toDto(item: Maintenance) {
  return { ...item, serviceDate: item.serviceDate.toISOString(), nextServiceDate: item.nextServiceDate?.toISOString() ?? null, createdAt: item.createdAt.toISOString() };
}
