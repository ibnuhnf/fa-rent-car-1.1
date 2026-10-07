import { Injectable } from '@nestjs/common';
import type { Prisma } from '@fa/db';
import type { BusinessSettings } from '@fa/shared';
import { PrismaService } from '../database/prisma.service';

const DEFAULT_BUSINESS: BusinessSettings = {
  name: '',
  address: '',
  whatsapp: '',
  phone: '',
  email: '',
  holdMinutes: 120,
  bufferMinutes: 0,
  bankAccount: { bankName: '', accountNumber: '', accountHolder: '' },
  waTemplate: '',
};

@Injectable()
export class SettingsService {
  constructor(private readonly database: PrismaService) {}

  async getBusiness(): Promise<BusinessSettings> {
    const setting = await this.database.setting.findUnique({ where: { key: 'business' } });
    if (!setting) return DEFAULT_BUSINESS;
    const val = setting.value as Record<string, unknown>;
    return {
      name: typeof val.name === 'string' ? val.name : DEFAULT_BUSINESS.name,
      address: typeof val.address === 'string' ? val.address : DEFAULT_BUSINESS.address,
      whatsapp: typeof val.whatsapp === 'string' ? val.whatsapp : DEFAULT_BUSINESS.whatsapp,
      phone: typeof val.phone === 'string' ? val.phone : DEFAULT_BUSINESS.phone,
      email: typeof val.email === 'string' ? val.email : DEFAULT_BUSINESS.email,
      holdMinutes: typeof val.holdMinutes === 'number' ? val.holdMinutes : DEFAULT_BUSINESS.holdMinutes,
      bufferMinutes: typeof val.bufferMinutes === 'number' ? val.bufferMinutes : DEFAULT_BUSINESS.bufferMinutes,
      bankAccount: val.bankAccount && typeof val.bankAccount === 'object'
        ? val.bankAccount as BusinessSettings['bankAccount']
        : DEFAULT_BUSINESS.bankAccount,
      waTemplate: typeof val.waTemplate === 'string' ? val.waTemplate : DEFAULT_BUSINESS.waTemplate,
      pickupInstructions: typeof val.pickupInstructions === 'string' ? val.pickupInstructions : undefined,
    };
  }

  async updateBusiness(
    input: Partial<BusinessSettings>,
    actorId: string,
  ): Promise<BusinessSettings> {
    return this.database.$transaction(async (tx) => {
      const current = await this.getBusiness();
      const next: BusinessSettings = { ...current, ...input };
      const before = JSON.parse(JSON.stringify(current)) as Prisma.InputJsonObject;
      const after = JSON.parse(JSON.stringify(next)) as Prisma.InputJsonObject;
      await tx.setting.upsert({
        where: { key: 'business' },
        create: { key: 'business', value: after },
        update: { value: after },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'SETTINGS_UPDATED',
          objectType: 'SETTING',
          objectId: 'business',
          before,
          after,
        },
      });
      return next;
    });
  }
}
