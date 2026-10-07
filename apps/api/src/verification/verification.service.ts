import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { type BookingStatus, type DocumentStatus, type InvoiceStatus, type Prisma } from '@fa/db';
import {
  formatRupiah,
  type AdminCreatePaymentRequest,
  type AdminPaymentResponse,
  type BookingDocumentsResponse,
  type CancelBookingRequest,
  type CancelBookingResponse,
  type PaymentSummary,
  type VerifyDocumentRequest,
  type VerifyDocumentResponse,
} from '@fa/shared';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedAdmin } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';

type DocumentRow = Prisma.BookingDocumentGetPayload<Record<string, never>>;
type PaymentRow = Prisma.PaymentGetPayload<Record<string, never>>;

function documentDto(document: DocumentRow) {
  return {
    id: document.id,
    bookingId: document.bookingId,
    type: document.type,
    objectKey: document.objectKey,
    status: document.status,
    rejectionReason: document.rejectionReason,
    verifiedBy: document.verifiedBy,
    verifiedAt: document.verifiedAt ? document.verifiedAt.toISOString() : null,
  };
}

function paymentSummary(payment: PaymentRow): PaymentSummary {
  return {
    id: payment.id,
    amount: payment.amount,
    paymentDate: payment.paymentDate.toISOString(),
    bankName: payment.bankName,
    accountHolder: payment.accountHolder,
    confirmedBy: payment.confirmedBy,
    confirmedAt: payment.confirmedAt.toISOString(),
    notes: payment.notes,
  };
}

@Injectable()
export class VerificationService {
  constructor(
    private readonly database: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {}

  async listDocuments(bookingId: string): Promise<BookingDocumentsResponse> {
    const booking = await this.database.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
      include: { documents: { orderBy: [{ type: 'asc' }, { createdAt: 'asc' }] } },
    });
    if (!booking) throw this.notFound();

    const documents = await Promise.all(
      booking.documents.map(async (document) => {
        let viewUrl: string | null;
        try {
          viewUrl = await this.storage.createDownload(document.objectKey);
        } catch {
          viewUrl = null; // Storage sedang tidak terjangkau; daftar tetap ditampilkan.
        }
        return { ...documentDto(document), viewUrl };
      }),
    );
    return { documents };
  }

  async verifyDocument(
    bookingId: string,
    documentId: string,
    input: VerifyDocumentRequest,
    admin: AuthenticatedAdmin,
  ): Promise<VerifyDocumentResponse> {
    return this.database.$transaction(async (transaction) => {
      const booking = await transaction.booking.findFirst({
        where: { id: bookingId, deletedAt: null },
        include: { documents: true },
      });
      if (!booking) throw this.notFound();

      const document = booking.documents.find((candidate) => candidate.id === documentId);
      if (!document) {
        throw new NotFoundException({
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Dokumen tidak ditemukan pada booking ini.',
        });
      }
      if (booking.status !== 'PENDING_VERIFICATION' && booking.status !== 'ACTIVE') {
        throw new ConflictException({
          code: 'DOCUMENT_VERIFICATION_NOT_ALLOWED',
          message: 'Verifikasi dokumen hanya dapat dilakukan pada booking Menunggu Verifikasi atau Aktif.',
        });
      }

      const updated = await transaction.bookingDocument.update({
        where: { id: documentId },
        data: {
          status: input.decision,
          verifiedBy: admin.user.id,
          verifiedAt: new Date(),
          rejectionReason: input.decision === 'REJECTED' ? (input.reason ?? null) : null,
        },
      });

      await this.audit.recordBooking(transaction, {
        actorId: admin.user.id,
        action: 'DOCUMENT_VERIFIED',
        objectId: bookingId,
        before: { documentId, status: document.status, rejectionReason: document.rejectionReason },
        after: {
          documentId,
          type: document.type,
          status: input.decision,
          reason: input.reason ?? null,
        },
      });

      const bookingStatus = await this.maybeActivate(transaction, bookingId, admin.user.id);
      return { document: documentDto(updated), bookingStatus };
    });
  }

  async createPayment(
    bookingId: string,
    input: AdminCreatePaymentRequest,
    admin: AuthenticatedAdmin,
  ): Promise<AdminPaymentResponse> {
    return this.database.$transaction(async (transaction) => {
      const booking = await transaction.booking.findFirst({
        where: { id: bookingId, deletedAt: null },
        include: { invoices: { orderBy: { version: 'desc' }, take: 1 } },
      });
      if (!booking) throw this.notFound();
      if (booking.status !== 'PENDING_VERIFICATION' && booking.status !== 'ACTIVE') {
        throw new ConflictException({
          code: 'PAYMENT_NOT_ALLOWED',
          message: 'Pembayaran hanya dapat dicatat untuk booking Menunggu Verifikasi atau Aktif.',
        });
      }

      const invoice = booking.invoices[0];
      if (!invoice) {
        throw new NotFoundException({
          code: 'INVOICE_NOT_FOUND',
          message: 'Invoice tidak ditemukan untuk booking ini.',
        });
      }

      const paidBefore = await transaction.payment.aggregate({
        where: { invoice: { bookingId } },
        _sum: { amount: true },
      });
      const paidTotalBefore = paidBefore._sum.amount ?? 0;
      const remaining = invoice.totalAmount - paidTotalBefore;
      if (input.amount > remaining) {
        throw new ConflictException({
          code: 'PAYMENT_EXCEEDS_BALANCE',
          message: `Nominal pembayaran melebihi sisa tagihan. Sisa tagihan: ${formatRupiah(remaining)}.`,
        });
      }

      const now = new Date();
      const paymentId = randomUUID();
      const payment = await transaction.payment.create({
        data: {
          id: paymentId,
          invoiceId: invoice.id,
          amount: input.amount,
          paymentDate: new Date(input.paidAt),
          bankName: input.bank,
          accountHolder: null,
          // Input manual admin tanpa upload file; penanda "tanpa bukti berkas".
          // Ganti dengan objectKey asli bila portal upload bukti diaktifkan.
          proofObjectKey: `manual/${paymentId}`,
          confirmedBy: admin.user.id,
          confirmedAt: now,
          notes: input.notes ?? null,
        },
      });

      const paidTotal = paidTotalBefore + input.amount;
      const fullyPaid = paidTotal >= invoice.totalAmount;
      if (fullyPaid && invoice.status !== 'PAID') {
        await transaction.invoice.update({
          where: { id: invoice.id },
          data: { status: 'PAID', paidAt: now },
        });
      }

      await this.audit.recordBooking(transaction, {
        actorId: admin.user.id,
        action: 'PAYMENT_RECORDED',
        objectId: bookingId,
        after: {
          paymentId,
          invoiceId: invoice.id,
          amount: input.amount,
          paidAt: input.paidAt,
          bank: input.bank,
          notes: input.notes ?? null,
          paidTotal,
          invoiceTotal: invoice.totalAmount,
        },
      });

      const bookingStatus = await this.maybeActivate(transaction, bookingId, admin.user.id);

      return {
        payment: paymentSummary(payment),
        bookingStatus,
        paidTotal,
        invoiceTotal: invoice.totalAmount,
        invoiceStatus: (fullyPaid ? 'PAID' : invoice.status) as InvoiceStatus,
      };
    });
  }

  async cancel(
    bookingId: string,
    input: CancelBookingRequest,
    admin: AuthenticatedAdmin,
  ): Promise<CancelBookingResponse> {
    return this.database.$transaction(async (transaction) => {
      const booking = await transaction.booking.findFirst({
        where: { id: bookingId, deletedAt: null },
      });
      if (!booking) throw this.notFound();
      if (booking.status !== 'PENDING_VERIFICATION' && booking.status !== 'ACTIVE') {
        throw new ConflictException({
          code: 'CANCEL_NOT_ALLOWED',
          message: 'Hanya booking Menunggu Verifikasi atau Aktif yang dapat dibatalkan.',
        });
      }

      await transaction.booking.update({ where: { id: bookingId }, data: { status: 'CANCELLED' } });
      await this.audit.recordBooking(transaction, {
        actorId: admin.user.id,
        action: 'BOOKING_CANCELLED',
        objectId: bookingId,
        before: { status: booking.status },
        after: { status: 'CANCELLED', reason: input.reason },
      });
      return { id: booking.id, status: 'CANCELLED' as BookingStatus };
    });
  }

  /**
   * Booking PENDING_VERIFICATION menjadi ACTIVE saat semua dokumen APPROVED
   * dan total pembayaran terkonfirmasi >= total invoice terakhir.
   */
  private async maybeActivate(
    transaction: Prisma.TransactionClient,
    bookingId: string,
    actorId: string,
  ): Promise<BookingStatus> {
    const booking = await transaction.booking.findFirst({
      where: { id: bookingId },
      include: { documents: true, invoices: { orderBy: { version: 'desc' }, take: 1 } },
    });
    if (!booking) throw this.notFound();
    if (booking.status !== 'PENDING_VERIFICATION') return booking.status;
    const invoice = booking.invoices[0];
    if (!invoice) return booking.status;

    const documentsApproved = booking.documents.every((document) => document.status === 'APPROVED');
    const paid = await transaction.payment.aggregate({
      where: { invoice: { bookingId } },
      _sum: { amount: true },
    });
    const paidTotal = paid._sum.amount ?? 0;
    if (!documentsApproved || paidTotal < invoice.totalAmount) return booking.status;

    await transaction.booking.update({ where: { id: bookingId }, data: { status: 'ACTIVE' } });
    if (invoice.status !== 'PAID') {
      await transaction.invoice.update({
        where: { id: invoice.id },
        data: { status: 'PAID', paidAt: invoice.paidAt ?? new Date() },
      });
    }
    await this.audit.recordBooking(transaction, {
      actorId,
      action: 'BOOKING_ACTIVATED',
      objectId: bookingId,
      before: { status: 'PENDING_VERIFICATION' },
      after: { status: 'ACTIVE', paidTotal, invoiceTotal: invoice.totalAmount },
    });
    return 'ACTIVE';
  }

  private notFound() {
    return new NotFoundException({ code: 'BOOKING_NOT_FOUND', message: 'Booking tidak ditemukan.' });
  }
}

export type { DocumentStatus };
