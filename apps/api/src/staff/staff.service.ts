import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, AdminRole } from '@fa/db';
import bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class StaffService {
  constructor(private readonly database: PrismaService) {}

  async list(role?: string) {
    const where: Prisma.AdminUserWhereInput = { deletedAt: null };
    if (role) where.role = role as Prisma.EnumAdminRoleFilter;
    const users = await this.database.adminUser.findMany({
      where,
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
    return { staff: users };
  }

  async create(input: { name: string; email: string; password: string; role: string }, actorId: string) {
    const existing = await this.database.adminUser.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email sudah terdaftar.' });
    }
    const passwordHash = await bcrypt.hash(input.password, 12);
    return this.database.$transaction(async (tx) => {
      const user = await tx.adminUser.create({
        data: { name: input.name, email: input.email, passwordHash, role: input.role as AdminRole },
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'STAFF_CREATED',
          objectType: 'ADMIN_USER',
          objectId: user.id,
          after: { name: user.name, email: user.email, role: user.role } as Prisma.InputJsonObject,
        },
      });
      return user;
    });
  }

  async update(id: string, input: { name?: string; role?: string; password?: string }, actorId: string) {
    const existing = await this.database.adminUser.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException({ code: 'STAFF_NOT_FOUND', message: 'Staff tidak ditemukan.' });
    const data: Prisma.AdminUserUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.role !== undefined) data.role = input.role as AdminRole;
    if (input.password) data.passwordHash = await bcrypt.hash(input.password, 12);
    return this.database.$transaction(async (tx) => {
      const before = { name: existing.name, role: existing.role } as Prisma.InputJsonObject;
      const user = await tx.adminUser.update({
        where: { id },
        data,
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true },
      });
      const after = { name: user.name, role: user.role } as Prisma.InputJsonObject;
      await tx.auditLog.create({
        data: { actorId, action: 'STAFF_UPDATED', objectType: 'ADMIN_USER', objectId: id, before, after },
      });
      return user;
    });
  }

  async disable(id: string, actorId: string) {
    if (id === actorId) {
      throw new BadRequestException({ code: 'CANNOT_DISABLE_SELF', message: 'Tidak dapat menonaktifkan diri sendiri.' });
    }
    const existing = await this.database.adminUser.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundException({ code: 'STAFF_NOT_FOUND', message: 'Staff tidak ditemukan.' });
    if (existing.role === 'SUPERADMIN') {
      const superadminCount = await this.database.adminUser.count({
        where: { role: 'SUPERADMIN', isActive: true, deletedAt: null, id: { not: id } },
      });
      if (superadminCount < 1) {
        throw new BadRequestException({
          code: 'LAST_SUPERADMIN',
          message: 'Harus ada minimal 1 superadmin aktif.',
        });
      }
    }
    return this.database.$transaction(async (tx) => {
      const user = await tx.adminUser.update({
        where: { id },
        data: { isActive: false },
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, updatedAt: true },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'STAFF_DISABLED',
          objectType: 'ADMIN_USER',
          objectId: id,
          before: { isActive: true } as Prisma.InputJsonObject,
          after: { isActive: false } as Prisma.InputJsonObject,
        },
      });
      return user;
    });
  }
}
