import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@fa/db';
import type { CreateHandoverRequest, HandoverDto } from '@fa/shared';
import { AuditService } from '../audit/audit.service';
import { chargeableDays, randomCode } from '../bookings/bookings.service';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class HandoversService {
  constructor(
    private readonly database: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(bookingItemId: string, input: CreateHandoverRequest, adminId: string): Promise<HandoverDto> {
    const item = await this.database.bookingItem.findUnique({
      where: { id: bookingItemId },
      include: {
        booking: {
          include: {
            invoices: {
              orderBy: { version: 'desc' },
              take: 1,
            },
          },
        },
        vehicle: true,
      },
    });
    if (!item) {
      throw new NotFoundException({ code: 'ITEM_NOT_FOUND', message: 'Item booking tidak ditemukan.' });
    }

    const handover = await this.database.$transaction(async (tx) => {
      const created = await tx.handover.create({
        data: {
          bookingItemId,
          type: input.type,
          odometer: input.odometer,
          fuelLevel: input.fuelLevel,
          notes: input.notes ?? null,
          damageReport: input.damageReport ? JSON.parse(JSON.stringify(input.damageReport)) : undefined,
          photoKeys: input.photoKeys,
          extraFee: input.extraFee,
          signedByName: input.signedByName,
          recordedBy: adminId,
        },
      });

      await this.audit.recordHandover(tx, {
        actorId: adminId,
        action: 'HANDOVER_CREATED',
        objectId: created.id,
        after: {
          bookingItemId,
          type: input.type,
          extraFee: input.extraFee,
          signedByName: input.signedByName,
        },
      });

      // Update vehicle odometer
      await tx.vehicle.update({
        where: { id: item.vehicleId },
        data: { mileage: Math.max(item.vehicle.mileage, input.odometer) },
      });

      // CHECKIN flows
      if (input.type === 'CHECKIN') {
        // Auto-invoice revision on extraFee > 0
        if (input.extraFee > 0) {
          // Update item surcharge and totalAmount
          const newSurcharge = item.surchargeAmount + input.extraFee;
          const newTotal = item.totalAmount + input.extraFee;
          await tx.bookingItem.update({
            where: { id: bookingItemId },
            data: {
              surchargeAmount: newSurcharge,
              totalAmount: newTotal,
            },
          });

          await this.createInvoiceRevision(tx, item.booking, input.extraFee, bookingItemId);
        }

        // Check if all items in the booking are checked in
        const allItems = await tx.bookingItem.findMany({
          where: { bookingId: item.bookingId },
          include: { handovers: true },
        });

        const allCheckedIn = allItems.every((it) =>
          it.id === bookingItemId
            ? true
            : it.handovers.some((h) => h.type === 'CHECKIN'),
        );

        if (allCheckedIn) {
          await tx.booking.update({
            where: { id: item.bookingId },
            data: { status: 'COMPLETED' },
          });

          await this.audit.recordBooking(tx, {
            actorId: adminId,
            action: 'BOOKING_COMPLETED',
            objectId: item.bookingId,
            before: { status: item.booking.status },
            after: { status: 'COMPLETED' },
          });
        }
      }

      return created;
    });

    return {
      id: handover.id,
      bookingItemId: handover.bookingItemId,
      type: handover.type,
      odometer: handover.odometer,
      fuelLevel: handover.fuelLevel,
      notes: handover.notes,
      damageReport: handover.damageReport as Record<string, unknown> | null,
      photoKeys: handover.photoKeys,
      extraFee: handover.extraFee,
      signedByName: handover.signedByName,
      signedAt: handover.signedAt.toISOString(),
      recordedBy: handover.recordedBy,
      createdAt: handover.createdAt.toISOString(),
    };
  }

  private async createInvoiceRevision(
    tx: Prisma.TransactionClient,
    booking: {
      id: string;
      invoices: Array<{ version: number; status: string; totalAmount: number }>;
    },
    extraFee: number,
    bookingItemId: string,
  ) {
    const allItems = await tx.bookingItem.findMany({
      where: { bookingId: booking.id },
      include: { vehicle: true },
    });
    const subtotal = allItems.reduce((sum, it) => sum + it.totalAmount, 0);

    const paidSum = await tx.payment.aggregate({
      where: { invoice: { bookingId: booking.id } },
      _sum: { amount: true },
    });
    const paidTotal = paidSum._sum.amount ?? 0;

    const latestVersion = booking.invoices[0]?.version ?? 1;
    const now = new Date();

    const invoiceItems = allItems.map((it) => {
      const days = chargeableDays(it.startDate, it.endDate);
      const baseDesc = `${it.vehicle.brand} ${it.vehicle.model} (${it.vehicle.plate}) — ${days} hari`;
      return {
        description: baseDesc,
        quantity: days,
        unitPrice: Math.round((it.totalAmount - (it.id === bookingItemId ? extraFee : 0)) / days),
        amount: it.totalAmount - (it.id === bookingItemId ? extraFee : 0),
      };
    });

    if (extraFee > 0) {
      invoiceItems.push({
        description: `Biaya Tambahan Serah Terima (Check-in Item ${bookingItemId.slice(0, 8)})`,
        quantity: 1,
        unitPrice: extraFee,
        amount: extraFee,
      });
    }

    return tx.invoice.create({
      data: {
        invoiceNumber: randomCode('INV', now),
        bookingId: booking.id,
        version: latestVersion + 1,
        status: paidTotal >= subtotal ? 'PAID' : 'UNPAID',
        paidAt: paidTotal >= subtotal ? now : null,
        subtotal,
        totalAmount: subtotal,
        bankAccount: await this.bankAccount(tx),
        items: {
          create: invoiceItems,
        },
      },
      include: { items: true },
    });
  }

  private async bankAccount(tx: Prisma.TransactionClient): Promise<Prisma.InputJsonObject> {
    const setting = await tx.setting.findUnique({ where: { key: 'business' } });
    const value = setting?.value;
    if (typeof value === 'object' && value !== null && 'bankAccount' in value) {
      return (value as { bankAccount: Prisma.InputJsonObject }).bankAccount;
    }
    return {
      bankName: 'BCA',
      accountNumber: '1234567890',
      accountHolder: 'FA RENT CAR',
    };
  }

  async listByBooking(bookingId: string): Promise<HandoverDto[]> {
    const handovers = await this.database.handover.findMany({
      where: { bookingItem: { bookingId } },
      orderBy: { createdAt: 'asc' },
    });

    return handovers.map((h) => ({
      id: h.id,
      bookingItemId: h.bookingItemId,
      type: h.type,
      odometer: h.odometer,
      fuelLevel: h.fuelLevel,
      notes: h.notes,
      damageReport: h.damageReport as Record<string, unknown> | null,
      photoKeys: h.photoKeys,
      extraFee: h.extraFee,
      signedByName: h.signedByName,
      signedAt: h.signedAt.toISOString(),
      recordedBy: h.recordedBy,
      createdAt: h.createdAt.toISOString(),
    }));
  }

  async generatePdfHtml(bookingId: string): Promise<string> {
    const booking = await this.database.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: true,
        items: {
          include: {
            vehicle: true,
            handovers: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking tidak ditemukan.' });
    }

    const formatCurrency = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;
    const formatDate = (date: Date) =>
      date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

    const itemsHtml = booking.items
      .map((item) => {
        const checkout = item.handovers.find((h) => h.type === 'CHECKOUT');
        const checkin = item.handovers.find((h) => h.type === 'CHECKIN');

        return `
        <div class="item-card">
          <div class="item-header">
            <h3>${item.vehicle.brand} ${item.vehicle.model} - <strong>${item.vehicle.plate}</strong></h3>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Detail</th>
                <th>Serah Terima (Check-Out)</th>
                <th>Pengembalian (Check-In)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Odometer</strong></td>
                <td>${checkout ? `${checkout.odometer.toLocaleString('id-ID')} km` : '-'}</td>
                <td>${checkin ? `${checkin.odometer.toLocaleString('id-ID')} km` : '-'}</td>
              </tr>
              <tr>
                <td><strong>Bahan Bakar</strong></td>
                <td>${checkout ? `${checkout.fuelLevel}%` : '-'}</td>
                <td>${checkin ? `${checkin.fuelLevel}%` : '-'}</td>
              </tr>
              <tr>
                <td><strong>Catatan / Kerusakan</strong></td>
                <td>${checkout?.notes || '-'}</td>
                <td>${checkin?.notes || '-'}</td>
              </tr>
              <tr>
                <td><strong>Biaya Tambahan</strong></td>
                <td>${checkout?.extraFee ? formatCurrency(checkout.extraFee) : '-'}</td>
                <td>${checkin?.extraFee ? formatCurrency(checkin.extraFee) : '-'}</td>
              </tr>
              <tr>
                <td><strong>Waktu & Penandatangan</strong></td>
                <td>${checkout ? `${formatDate(checkout.signedAt)} (${checkout.signedByName})` : '-'}</td>
                <td>${checkin ? `${formatDate(checkin.signedAt)} (${checkin.signedByName})` : '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Berita Acara Serah Terima — ${booking.bookingCode}</title>
  <style>
    @page { size: A4; margin: 1.5cm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1f2937;
      line-height: 1.5;
      font-size: 13px;
      margin: 0;
      padding: 20px;
    }
    .header {
      border-bottom: 2px solid #111827;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand { font-size: 20px; font-weight: bold; color: #111827; }
    .brand-sub { font-size: 11px; color: #4b5563; }
    .doc-title { text-align: right; }
    .doc-title h2 { margin: 0; font-size: 16px; text-transform: uppercase; color: #111827; }
    .doc-title p { margin: 2px 0 0; color: #6b7280; font-size: 12px; }
    .booking-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      background: #f9fafb;
      padding: 12px 16px;
      border-radius: 6px;
      margin-bottom: 20px;
    }
    .booking-info p { margin: 3px 0; }
    .item-card { margin-bottom: 25px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
    .item-header { background: #f3f4f6; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
    .item-header h3 { margin: 0; font-size: 14px; }
    .data-table { width: 100%; border-collapse: collapse; text-align: left; }
    .data-table th, .data-table td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
    .data-table th { background: #f9fafb; font-size: 11px; text-transform: uppercase; color: #4b5563; }
    .signatures {
      margin-top: 40px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      text-align: center;
      page-break-inside: avoid;
    }
    .sig-box { padding: 0 20px; }
    .sig-line { margin-top: 60px; border-top: 1px solid #111827; padding-top: 4px; font-weight: bold; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">FA RENT CAR</div>
      <div class="brand-sub">Sewa Mobil Lepas Kunci & Driver — Cirebon & Sekitarnya</div>
    </div>
    <div class="doc-title">
      <h2>Berita Acara Serah Terima</h2>
      <p>Kode: ${booking.bookingCode}</p>
    </div>
  </div>

  <div class="booking-info">
    <div>
      <p><strong>Penyewa:</strong> ${booking.customer.name}</p>
      <p><strong>WhatsApp:</strong> ${booking.customer.whatsapp}</p>
      <p><strong>Status Sewa:</strong> ${booking.status}</p>
    </div>
    <div>
      <p><strong>Lokasi Pengambilan:</strong> ${booking.pickupOffice}</p>
      <p><strong>Tanggal Cetak:</strong> ${formatDate(new Date())}</p>
    </div>
  </div>

  ${itemsHtml}

  <div class="signatures">
    <div class="sig-box">
      <p>Petugas FA RENT CAR</p>
      <div class="sig-line">Petugas Operasional</div>
    </div>
    <div class="sig-box">
      <p>Penyewa / Penerima Kuasa</p>
      <div class="sig-line">${booking.customer.name}</div>
    </div>
  </div>
</body>
</html>`;
  }
}

