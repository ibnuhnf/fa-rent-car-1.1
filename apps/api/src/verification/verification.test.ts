import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedAdmin } from '../auth/auth.types';
import { VerificationService } from './verification.service';

const dummyAdmin: AuthenticatedAdmin = {
  sessionId: '00000000-0000-0000-0000-000000000001',
  expiresAt: '2026-10-07T00:00:00.000Z',
  user: {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Admin Test',
    email: 'admin@test.com',
    role: 'STAFF',
  },
};

describe('VerificationService', () => {
  let service: VerificationService;
  let database: {
    booking: { findFirst: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
    bookingDocument: { update: ReturnType<typeof vi.fn> };
    payment: { aggregate: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
    invoice: { update: ReturnType<typeof vi.fn> };
    auditLog: { create: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let audit: { recordBooking: ReturnType<typeof vi.fn> };
  let storage: { createDownload: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    database = {
      booking: { findFirst: vi.fn(), update: vi.fn() },
      bookingDocument: { update: vi.fn() },
      payment: { aggregate: vi.fn(), create: vi.fn() },
      invoice: { update: vi.fn() },
      auditLog: { create: vi.fn() },
      $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(database)),
    };
    audit = { recordBooking: vi.fn().mockResolvedValue({}) };
    storage = { createDownload: vi.fn().mockResolvedValue('https://storage.local/download-signed') };

    service = new VerificationService(database as never, audit as never, storage as never);
  });

  describe('listDocuments', () => {
    it('mengembalikan dokumen beserta signed download URL', async () => {
      database.booking.findFirst.mockResolvedValue({
        id: 'b-1',
        documents: [
          {
            id: 'doc-1',
            bookingId: 'b-1',
            type: 'KTP',
            objectKey: 'ktp/key-1.jpg',
            status: 'PENDING',
            rejectionReason: null,
            verifiedBy: null,
            verifiedAt: null,
          },
        ],
      });

      const result = await service.listDocuments('b-1');
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0]?.viewUrl).toBe('https://storage.local/download-signed');
      expect(storage.createDownload).toHaveBeenCalledWith('ktp/key-1.jpg');
    });

    it('melempar NotFoundException bila booking tidak ditemukan', async () => {
      database.booking.findFirst.mockResolvedValue(null);
      await expect(service.listDocuments('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('verifyDocument', () => {
    it('menyetujui dokumen dan mentransisikan booking ke ACTIVE jika lunas', async () => {
      const mockBooking = {
        id: 'b-1',
        status: 'PENDING_VERIFICATION',
        documents: [
          {
            id: 'doc-1',
            bookingId: 'b-1',
            type: 'KTP',
            objectKey: 'ktp/key-1.jpg',
            status: 'PENDING',
            rejectionReason: null,
            verifiedBy: null,
            verifiedAt: null,
          },
        ],
        invoices: [{ id: 'inv-1', totalAmount: 500_000, status: 'UNPAID', paidAt: null }],
      };

      database.booking.findFirst
        .mockResolvedValueOnce(mockBooking) // inside verifyDocument
        .mockResolvedValueOnce({
          ...mockBooking,
          documents: [{ ...mockBooking.documents[0], status: 'APPROVED' }],
        }); // inside maybeActivate

      database.bookingDocument.update.mockResolvedValue({
        ...mockBooking.documents[0],
        status: 'APPROVED',
        verifiedBy: dummyAdmin.user.id,
        verifiedAt: new Date(),
      });
      database.payment.aggregate.mockResolvedValue({ _sum: { amount: 500_000 } });

      const result = await service.verifyDocument(
        'b-1',
        'doc-1',
        { decision: 'APPROVED' },
        dummyAdmin,
      );

      expect(result.document.status).toBe('APPROVED');
      expect(result.bookingStatus).toBe('ACTIVE');
      expect(database.booking.update).toHaveBeenCalledWith({
        where: { id: 'b-1' },
        data: { status: 'ACTIVE' },
      });
      expect(audit.recordBooking).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ action: 'DOCUMENT_VERIFIED' }),
      );
    });

    it('menolak dokumen dengan alasan penolakan', async () => {
      const mockBooking = {
        id: 'b-1',
        status: 'PENDING_VERIFICATION',
        documents: [
          {
            id: 'doc-1',
            bookingId: 'b-1',
            type: 'KTP',
            objectKey: 'ktp/key-1.jpg',
            status: 'PENDING',
            rejectionReason: null,
            verifiedBy: null,
            verifiedAt: null,
          },
        ],
        invoices: [{ id: 'inv-1', totalAmount: 500_000, status: 'UNPAID', paidAt: null }],
      };

      database.booking.findFirst
        .mockResolvedValueOnce(mockBooking)
        .mockResolvedValueOnce({
          ...mockBooking,
          documents: [{ ...mockBooking.documents[0], status: 'REJECTED' }],
        });

      database.bookingDocument.update.mockResolvedValue({
        ...mockBooking.documents[0],
        status: 'REJECTED',
        rejectionReason: 'Foto buram',
        verifiedBy: dummyAdmin.user.id,
        verifiedAt: new Date(),
      });
      database.payment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });

      const result = await service.verifyDocument(
        'b-1',
        'doc-1',
        { decision: 'REJECTED', reason: 'Foto buram' },
        dummyAdmin,
      );

      expect(result.document.status).toBe('REJECTED');
      expect(result.document.rejectionReason).toBe('Foto buram');
      expect(result.bookingStatus).toBe('PENDING_VERIFICATION');
    });
  });

  describe('createPayment', () => {
    it('mencatat pembayaran manual dan mengaktifkan booking jika lunas & dokumen OK', async () => {
      const mockBooking = {
        id: 'b-1',
        status: 'PENDING_VERIFICATION',
        invoices: [{ id: 'inv-1', totalAmount: 600_000, status: 'UNPAID', paidAt: null }],
        documents: [{ id: 'doc-1', status: 'APPROVED' }],
      };

      database.booking.findFirst
        .mockResolvedValueOnce(mockBooking)
        .mockResolvedValueOnce(mockBooking);
      database.payment.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 200_000 } }) // sebelum input: sudah terbayar 200rb
        .mockResolvedValueOnce({ _sum: { amount: 600_000 } }); // di maybeActivate: setelah input 400rb
      database.payment.create.mockResolvedValue({
        id: 'pay-1',
        invoiceId: 'inv-1',
        amount: 400_000,
        paymentDate: new Date('2026-10-06T10:00:00.000Z'),
        bankName: 'BCA',
        accountHolder: null,
        confirmedBy: dummyAdmin.user.id,
        confirmedAt: new Date(),
        notes: 'Transfer manual kasir',
      });

      const result = await service.createPayment(
        'b-1',
        {
          amount: 400_000,
          paidAt: '2026-10-06T10:00:00.000Z',
          bank: 'BCA',
          notes: 'Transfer manual kasir',
        },
        dummyAdmin,
      );

      expect(result.payment.amount).toBe(400_000);
      expect(result.paidTotal).toBe(600_000);
      expect(result.invoiceStatus).toBe('PAID');
      expect(result.bookingStatus).toBe('ACTIVE');
      expect(database.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PAID' }) }),
      );
    });

    it('menolak pembayaran yang melebihi sisa tagihan', async () => {
      const mockBooking = {
        id: 'b-1',
        status: 'PENDING_VERIFICATION',
        invoices: [{ id: 'inv-1', totalAmount: 500_000, status: 'UNPAID', paidAt: null }],
      };

      database.booking.findFirst.mockResolvedValue(mockBooking);
      database.payment.aggregate.mockResolvedValue({ _sum: { amount: 400_000 } });

      await expect(
        service.createPayment(
          'b-1',
          {
            amount: 200_000, // sisa hanya 100_000
            paidAt: '2026-10-06T10:00:00.000Z',
            bank: 'BCA',
          },
          dummyAdmin,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('cancel', () => {
    it('membatalkan booking dengan alasan dan mencatat audit log', async () => {
      database.booking.findFirst.mockResolvedValue({
        id: 'b-1',
        status: 'PENDING_VERIFICATION',
      });
      database.booking.update.mockResolvedValue({ id: 'b-1', status: 'CANCELLED' });

      const result = await service.cancel('b-1', { reason: 'Customer batal sewa' }, dummyAdmin);

      expect(result.status).toBe('CANCELLED');
      expect(database.booking.update).toHaveBeenCalledWith({
        where: { id: 'b-1' },
        data: { status: 'CANCELLED' },
      });
      expect(audit.recordBooking).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ action: 'BOOKING_CANCELLED' }),
      );
    });

    it('menolak pembatalan booking yang sudah COMPLETED', async () => {
      database.booking.findFirst.mockResolvedValue({
        id: 'b-1',
        status: 'COMPLETED',
      });

      await expect(
        service.cancel('b-1', { reason: 'Coba batalkan selesai' }, dummyAdmin),
      ).rejects.toThrow(ConflictException);
    });
  });
});
