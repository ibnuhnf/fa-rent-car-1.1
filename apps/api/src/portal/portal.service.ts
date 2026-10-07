import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type DocumentType } from '@fa/db';
import type {
  BookingDocumentDto,
  BookingDto,
  DriverRatingDto,
  InvoiceDto,
  PaymentDto,
  PortalDocumentConfirmRequest,
  PortalDocumentStagingRequest,
  PortalDocumentStagingResponse,
  PortalMeResponse,
  PortalRequestChange,
  SubmitDriverRatingRequest,
} from '@fa/shared';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

@Injectable()
export class PortalService {
  constructor(
    private readonly database: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  async me(bookingId: string): Promise<PortalMeResponse> {
    const booking = await this.database.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
      include: {
        customer: true,
        items: { include: { vehicle: true } },
        documents: true,
        invoices: { include: { items: true }, orderBy: { version: 'asc' } },
      },
    });
    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: 'Booking tidak ditemukan.',
      });
    }

    const payments = await this.database.payment.findMany({
      where: { invoice: { bookingId } },
      orderBy: { paymentDate: 'asc' },
    });

    const bookingDto: BookingDto & {
      items: Array<BookingDto['items'][number] & { vehicle?: Record<string, unknown> }>;
    } = {
      id: booking.id,
      bookingCode: booking.bookingCode,
      customerId: booking.customerId,
      status: booking.status,
      holdExpiresAt: booking.holdExpiresAt.toISOString(),
      pickupOffice: booking.pickupOffice,
      notes: booking.notes,
      internalNotes: booking.internalNotes,
      items: booking.items.map((item) => ({
        id: item.id,
        bookingId: item.bookingId,
        vehicleId: item.vehicleId,
        startDate: item.startDate.toISOString(),
        endDate: item.endDate.toISOString(),
        withDriver: item.withDriver,
        driverPerDay: item.driverPerDay,
        driverId: item.driverId,
        vehicleAmount: item.vehicleAmount,
        driverAmount: item.driverAmount,
        surchargeAmount: item.surchargeAmount,
        promoDiscount: item.promoDiscount,
        totalAmount: item.totalAmount,
        snapshot: item.snapshot as Record<string, unknown>,
        vehicle: item.vehicle
          ? {
              id: item.vehicle.id,
              brand: item.vehicle.brand,
              model: item.vehicle.model,
              variant: item.vehicle.variant,
              plate: item.vehicle.plate,
              category: item.vehicle.category,
              transmission: item.vehicle.transmission,
            }
          : undefined,
      })),
      documents: booking.documents.map((doc) => ({
        id: doc.id,
        bookingId: doc.bookingId,
        type: doc.type,
        objectKey: doc.objectKey,
        status: doc.status,
        rejectionReason: doc.rejectionReason,
        verifiedBy: doc.verifiedBy,
        verifiedAt: doc.verifiedAt ? doc.verifiedAt.toISOString() : null,
      })),
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
    };

    const invoicesDto: InvoiceDto[] = booking.invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      bookingId: invoice.bookingId,
      version: invoice.version,
      status: invoice.status,
      subtotal: invoice.subtotal,
      discount: invoice.discount,
      totalAmount: invoice.totalAmount,
      bankAccount: invoice.bankAccount as Record<string, unknown>,
      terms: invoice.terms,
      issuedAt: invoice.issuedAt.toISOString(),
      paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
      pdfObjectKey: invoice.pdfObjectKey,
      items: invoice.items.map((item) => ({
        id: item.id,
        invoiceId: item.invoiceId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
        metadata: item.metadata as Record<string, unknown> | null,
      })),
    }));

    const paymentsDto: PaymentDto[] = payments.map((pay) => ({
      id: pay.id,
      invoiceId: pay.invoiceId,
      amount: pay.amount,
      paymentDate: pay.paymentDate.toISOString(),
      bankName: pay.bankName,
      accountHolder: pay.accountHolder,
      proofObjectKey: pay.proofObjectKey,
      confirmedBy: pay.confirmedBy,
      confirmedAt: pay.confirmedAt.toISOString(),
      notes: pay.notes,
    }));

    return {
      booking: bookingDto as never,
      invoices: invoicesDto,
      payments: paymentsDto,
    };
  }

  async stageDocument(
    bookingId: string,
    input: PortalDocumentStagingRequest,
  ): Promise<PortalDocumentStagingResponse> {
    const purpose = input.type === 'KTP' ? 'ktp' : 'sim';
    const result = await this.storage.createUploadUrl({
      purpose,
      contentType: input.contentType,
      sizeBytes: input.byteLength,
      ownerId: bookingId,
    });

    return {
      objectKey: result.key,
      uploadUrl: result.uploadUrl,
      expiresIn: result.expiresInSeconds,
    };
  }

  async confirmDocument(
    bookingId: string,
    input: PortalDocumentConfirmRequest,
  ): Promise<{ document: BookingDocumentDto }> {
    const booking = await this.database.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
    });
    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: 'Booking tidak ditemukan.',
      });
    }
    if (booking.status === 'EXPIRED' || booking.status === 'CANCELLED') {
      throw new BadRequestException({
        code: 'BOOKING_CLOSED',
        message: 'Booking sudah kedaluwarsa atau dibatalkan; dokumen tidak dapat diunggah.',
      });
    }

    const expectedPrefix = `staging/portal/${bookingId}/`;
    if (!input.objectKey.startsWith(expectedPrefix)) {
      throw new BadRequestException({
        code: 'INVALID_OBJECT_KEY',
        message: 'Object key tidak sah untuk pemesanan ini.',
      });
    }

    const document = await this.database.$transaction(async (transaction) => {
      const created = await transaction.bookingDocument.create({
        data: {
          bookingId,
          type: input.type as DocumentType,
          objectKey: input.objectKey,
          status: 'PENDING',
        },
      });

      await this.audit.recordBooking(transaction, {
        actorId: null,
        action: 'DOCUMENT_VERIFIED',
        objectId: bookingId,
        after: {
          documentId: created.id,
          type: created.type,
          objectKey: created.objectKey,
          status: 'PENDING',
          source: 'PORTAL',
        },
      });

      return created;
    });

    return {
      document: {
        id: document.id,
        bookingId: document.bookingId,
        type: document.type,
        objectKey: document.objectKey,
        status: document.status,
        rejectionReason: document.rejectionReason,
        verifiedBy: document.verifiedBy,
        verifiedAt: document.verifiedAt ? document.verifiedAt.toISOString() : null,
      },
    };
  }

  async requestChange(
    bookingId: string,
    input: PortalRequestChange,
  ): Promise<{ success: true }> {
    await this.database.$transaction(async (transaction) => {
      const booking = await transaction.booking.findFirst({
        where: { id: bookingId, deletedAt: null },
      });
      if (!booking) {
        throw new NotFoundException({
          code: 'BOOKING_NOT_FOUND',
          message: 'Booking tidak ditemukan.',
        });
      }
      if (booking.status === 'EXPIRED' || booking.status === 'CANCELLED') {
        throw new BadRequestException({
          code: 'BOOKING_CLOSED',
          message: 'Booking sudah kedaluwarsa atau dibatalkan; permintaan tidak dapat diajukan.',
        });
      }

      const entry = `[PORTAL] [${input.kind}] ${new Date().toISOString()}: ${input.message}`;
      const updatedNotes = booking.internalNotes
        ? `${booking.internalNotes}\n${entry}`
        : entry;

      await transaction.booking.update({
        where: { id: bookingId },
        data: { internalNotes: updatedNotes },
      });

      await this.audit.recordBooking(transaction, {
        actorId: null,
        action: 'BOOKING_REVISED',
        objectId: bookingId,
        after: {
          kind: input.kind,
          message: input.message,
          source: 'PORTAL',
        },
      });
    });

    return { success: true };
  }

  async submitDriverRating(bookingId: string, input: SubmitDriverRatingRequest): Promise<DriverRatingDto> {
    const booking = await this.database.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
      select: { status: true, items: { select: { driverId: true } } },
    });
    if (!booking) throw new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking tidak ditemukan.' });
    if (booking.status !== 'COMPLETED') throw new BadRequestException({ code: 'BOOKING_NOT_COMPLETED', message: 'Rating hanya dapat diberikan setelah booking selesai.' });
    const hasDriver = booking.items.some((i) => i.driverId === input.driverId);
    if (!hasDriver) throw new BadRequestException({ code: 'DRIVER_NOT_IN_BOOKING', message: 'Sopir tidak terdaftar pada booking ini.' });
    try {
      const rating = await this.database.driverRating.create({
        data: { bookingId, driverId: input.driverId, score: input.score, feedback: input.feedback ?? null },
      });
      return { id: rating.id, driverId: rating.driverId, bookingId: rating.bookingId, score: rating.score, feedback: rating.feedback, createdAt: rating.createdAt.toISOString() };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError || (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002')) {
        throw new ConflictException({ code: 'RATING_EXISTS', message: 'Sopir untuk booking ini sudah dinilai.' });
      }
      throw error;
    }
  }

  async generateInvoiceHtml(bookingId: string, version: number): Promise<string> {
    const invoice = await this.database.invoice.findFirst({
      where: { bookingId, version },
      include: {
        items: true,
        booking: { include: { customer: true } },
      },
    });
    if (!invoice) {
      throw new NotFoundException({
        code: 'INVOICE_NOT_FOUND',
        message: `Invoice versi ${version} tidak ditemukan.`,
      });
    }

    const businessSetting = await this.database.setting.findUnique({
      where: { key: 'business' },
    });
    const business = (businessSetting?.value as Record<string, unknown> | null) ?? {};
    const bankAccount = (invoice.bankAccount as Record<string, unknown> | null) ?? {};

    const businessName = escapeHtml((business.name as string) || 'FA RENT CAR');
    const businessAddress = escapeHtml((business.address as string) || 'Kedawung, Cirebon');
    const businessWhatsapp = escapeHtml((business.whatsapp as string) || '-');
    const businessEmail = escapeHtml((business.email as string) || '-');

    const customerName = escapeHtml(invoice.booking.customer.name);
    const customerWhatsapp = escapeHtml(invoice.booking.customer.whatsapp);
    const customerAddress = escapeHtml(invoice.booking.customer.address);

    const bankName = escapeHtml((bankAccount.bankName as string) || '-');
    const accountNumber = escapeHtml((bankAccount.accountNumber as string) || '-');
    const accountHolder = escapeHtml((bankAccount.accountHolder as string) || '-');

    const itemRows = invoice.items
      .map(
        (item, index) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${index + 1}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(item.description)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatRupiah(item.unitPrice)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatRupiah(item.amount)}</td>
        </tr>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${escapeHtml(invoice.invoiceNumber)} - ${businessName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1a202c; padding: 40px; margin: 0; }
    .header { border-bottom: 2px solid #3182ce; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; }
    .company-title { font-size: 24px; font-weight: bold; color: #2b6cb0; margin: 0; }
    .invoice-title { font-size: 20px; font-weight: bold; text-align: right; margin: 0; }
    .details { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .table th { background-color: #ebf8ff; padding: 12px 10px; text-align: left; border-bottom: 2px solid #bee3f8; }
    .summary { width: 300px; margin-left: auto; margin-bottom: 30px; }
    .summary-row { display: flex; justify-content: space-between; padding: 6px 0; }
    .total-row { font-size: 18px; font-weight: bold; border-top: 2px solid #2d3748; padding-top: 10px; color: #2b6cb0; }
    .bank-box { background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-top: 30px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="company-title">${businessName}</h1>
      <p style="margin: 4px 0; color: #4a5568;">${businessAddress}</p>
      <p style="margin: 4px 0; color: #4a5568;">WhatsApp: ${businessWhatsapp} | Email: ${businessEmail}</p>
    </div>
    <div>
      <h2 class="invoice-title">INVOICE</h2>
      <p style="margin: 4px 0; text-align: right; font-weight: 600;">#${escapeHtml(invoice.invoiceNumber)}</p>
      <p style="margin: 4px 0; text-align: right; color: #718096;">Versi: ${invoice.version} | Status: ${escapeHtml(invoice.status)}</p>
      <p style="margin: 4px 0; text-align: right; color: #718096;">Tanggal: ${invoice.issuedAt.toLocaleDateString('id-ID')}</p>
    </div>
  </div>

  <div class="details">
    <div>
      <h3 style="margin: 0 0 8px 0; color: #4a5568; font-size: 14px;">DITUJUKAN KEPADA:</h3>
      <p style="margin: 2px 0; font-weight: 600;">${customerName}</p>
      <p style="margin: 2px 0; color: #4a5568;">${customerWhatsapp}</p>
      <p style="margin: 2px 0; color: #4a5568;">${customerAddress}</p>
    </div>
    <div style="text-align: right;">
      <h3 style="margin: 0 0 8px 0; color: #4a5568; font-size: 14px;">KODE BOOKING:</h3>
      <p style="margin: 2px 0; font-weight: bold; font-size: 16px; color: #2b6cb0;">${escapeHtml(invoice.booking.bookingCode)}</p>
    </div>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th style="width: 40px; text-align: center;">No</th>
        <th>Deskripsi</th>
        <th style="width: 80px; text-align: center;">Durasi</th>
        <th style="width: 140px; text-align: right;">Tarif/Hari</th>
        <th style="width: 140px; text-align: right;">Jumlah</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="summary">
    <div class="summary-row">
      <span>Subtotal:</span>
      <span>${formatRupiah(invoice.subtotal)}</span>
    </div>
    ${
      invoice.discount > 0
        ? `<div class="summary-row" style="color: #e53e3e;">
            <span>Diskon Promo:</span>
            <span>-${formatRupiah(invoice.discount)}</span>
          </div>`
        : ''
    }
    <div class="summary-row total-row">
      <span>Total Tagihan:</span>
      <span>${formatRupiah(invoice.totalAmount)}</span>
    </div>
  </div>

  <div class="bank-box">
    <h4 style="margin: 0 0 10px 0; color: #2d3748;">Informasi Rekening Pembayaran (Transfer Manual)</h4>
    <p style="margin: 4px 0;"><strong>Bank:</strong> ${bankName}</p>
    <p style="margin: 4px 0;"><strong>No. Rekening:</strong> ${accountNumber}</p>
    <p style="margin: 4px 0;"><strong>Atas Nama:</strong> ${accountHolder}</p>
    <p style="margin: 12px 0 0 0; font-size: 12px; color: #718096;">Harap cantumkan kode booking pada berita transfer dan unggah bukti transfer di portal pelanggan.</p>
  </div>
</body>
</html>`;
  }
}
