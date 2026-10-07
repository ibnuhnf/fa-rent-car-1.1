'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  formatDateTimeWib,
  formatRupiah,
  type BookingDetailResponse,
  type BookingStatus,
  type InvoiceStatus,
} from '@fa/shared';
import { Badge, Button, Card, Icon, Input, type BadgeTone } from '@fa/ui';
import {
  cancelBooking,
  createPayment,
  describeBookingError,
  extendHold,
  verifyDocument,
} from '../../../../lib/browser-booking';

interface BookingDetailViewProps {
  initialData: BookingDetailResponse;
}

const statusMeta: Record<BookingStatus, { label: string; tone: BadgeTone }> = {
  PENDING_VERIFICATION: { label: 'Menunggu Verifikasi', tone: 'warning' },
  ACTIVE: { label: 'Aktif / Disewa', tone: 'success' },
  COMPLETED: { label: 'Selesai', tone: 'neutral' },
  EXPIRED: { label: 'Kedaluwarsa', tone: 'danger' },
  CANCELLED: { label: 'Dibatalkan', tone: 'neutral' },
};

const invoiceStatusMeta: Record<InvoiceStatus, { label: string; tone: BadgeTone }> = {
  UNPAID: { label: 'Belum Bayar', tone: 'warning' },
  PAID: { label: 'Lunas', tone: 'success' },
  PARTIALLY_REFUNDED: { label: 'Refund Sebagian', tone: 'neutral' },
  REFUNDED: { label: 'Refund Penuh', tone: 'neutral' },
  VOID: { label: 'Batal', tone: 'danger' },
};

export function BookingDetailView({ initialData }: BookingDetailViewProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [extending, setExtending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Form pembayaran
  const [payAmount, setPayAmount] = useState('');
  const [payBank, setPayBank] = useState('BCA');
  const [payNotes, setPayNotes] = useState('');
  const [paying, setPaying] = useState(false);

  // Form pembatalan
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  // Dokumen verifikasi
  const [verifyingDocId, setVerifyingDocId] = useState<string | null>(null);

  const { booking, customer, invoices, timeline } = data;
  const latestInvoice = invoices[invoices.length - 1];

  const handleExtendHold = async (minutes: number) => {
    setExtending(true);
    setActionError(null);
    try {
      const result = await extendHold(booking.id, minutes);
      setData((prev) => ({
        ...prev,
        booking: { ...prev.booking, holdExpiresAt: result.holdExpiresAt },
      }));
      setActionNotice(`Hold berhasil diperpanjang sampai ${formatDateTimeWib(result.holdExpiresAt)}`);
      router.refresh();
    } catch (err) {
      setActionError(describeBookingError(err));
    } finally {
      setExtending(false);
    }
  };

  const handleVerifyDoc = async (docId: string, decision: 'APPROVED' | 'REJECTED') => {
    let reason: string | undefined;
    if (decision === 'REJECTED') {
      const inputReason = window.prompt('Masukkan alasan penolakan dokumen:');
      if (!inputReason || inputReason.trim() === '') return;
      reason = inputReason.trim();
    }

    setVerifyingDocId(docId);
    setActionError(null);
    try {
      const res = await verifyDocument(booking.id, docId, { decision, reason });
      setData((prev) => ({
        ...prev,
        booking: {
          ...prev.booking,
          status: res.bookingStatus as BookingStatus,
          documents: prev.booking.documents.map((d) =>
            d.id === docId
              ? {
                  ...d,
                  status: res.document.status,
                  rejectionReason: res.document.rejectionReason,
                  verifiedAt: res.document.verifiedAt,
                }
              : d,
          ),
        },
      }));
      setActionNotice(decision === 'APPROVED' ? 'Dokumen disetujui.' : 'Dokumen ditolak.');
      router.refresh();
    } catch (err) {
      setActionError(describeBookingError(err));
    } finally {
      setVerifyingDocId(null);
    }
  };

  const handleAddPayment = async () => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      setActionError('Masukkan nominal pembayaran yang valid.');
      return;
    }

    setPaying(true);
    setActionError(null);
    try {
      const res = await createPayment(booking.id, {
        amount,
        paidAt: new Date().toISOString(),
        bank: payBank,
        notes: payNotes || undefined,
      });

      setData((prev) => ({
        ...prev,
        booking: { ...prev.booking, status: res.bookingStatus as BookingStatus },
      }));
      setPayAmount('');
      setPayNotes('');
      setActionNotice(`Pembayaran ${formatRupiah(amount)} berhasil dicatat.`);
      router.refresh();
    } catch (err) {
      setActionError(describeBookingError(err));
    } finally {
      setPaying(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelReason.trim()) {
      setActionError('Alasan pembatalan wajib diisi.');
      return;
    }

    setCancelling(true);
    setActionError(null);
    try {
      await cancelBooking(booking.id, { reason: cancelReason.trim() });
      setData((prev) => ({
        ...prev,
        booking: { ...prev.booking, status: 'CANCELLED' },
      }));
      setShowCancel(false);
      setActionNotice('Booking berhasil dibatalkan.');
      router.refresh();
    } catch (err) {
      setActionError(describeBookingError(err));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      {actionError ? (
        <div className="rounded-xl border border-error bg-error-container p-4 text-body-md text-on-error-container">
          <p className="font-semibold">Terjadi kendala</p>
          <p className="mt-1">{actionError}</p>
        </div>
      ) : null}

      {actionNotice ? (
        <div className="rounded-xl border border-secondary bg-surface-low p-4 text-body-md text-secondary">
          <p className="font-semibold">{actionNotice}</p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Kolom Kiri: Status, Armada, Dokumen, Pembayaran */}
        <div className="space-y-6 lg:col-span-2">
          <Card padding="md">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-highest pb-4">
              <div>
                <span className="text-caption uppercase tracking-[0.06em] text-on-surface-variant">
                  Status Pemesanan
                </span>
                <div className="mt-1 flex items-center gap-3">
                  <Badge tone={statusMeta[booking.status].tone}>
                    {statusMeta[booking.status].label}
                  </Badge>
                  <span className="font-mono text-body-md text-on-surface-variant">
                    {booking.bookingCode}
                  </span>
                </div>
              </div>

              {booking.status === 'PENDING_VERIFICATION' ? (
                <div className="text-right">
                  <span className="text-caption text-on-surface-variant">Batas Waktu Hold</span>
                  <p className="font-mono font-semibold text-secondary">
                    {formatDateTimeWib(booking.holdExpiresAt)}
                  </p>
                </div>
              ) : null}
            </div>

            {booking.status === 'PENDING_VERIFICATION' ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-low p-3">
                <div className="flex items-center gap-2 text-body-md text-on-surface">
                  <Icon name="timer" size="md" />
                  <span>Customer butuh waktu transfer? Perpanjang masa hold mobil:</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    loading={extending}
                    onClick={() => handleExtendHold(60)}
                    size="sm"
                    variant="outline"
                  >
                    +1 Jam
                  </Button>
                  <Button
                    loading={extending}
                    onClick={() => handleExtendHold(120)}
                    size="sm"
                    variant="outline"
                  >
                    +2 Jam
                  </Button>
                </div>
              </div>
            ) : null}

            <h3 className="mt-6 font-display text-title text-on-surface">Armada yang Dipesan</h3>

            <div className="mt-4 space-y-3">
              {booking.items.map((item, index) => {
                const snapshot = item.snapshot as {
                  vehicle?: { brand: string; model: string; plate: string };
                  chargeableDays?: number;
                };

                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between gap-3 rounded-xl border border-surface-highest bg-surface-low p-4 sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge tone="info">Mobil #{index + 1}</Badge>
                        <span className="font-semibold text-on-surface">
                          {snapshot.vehicle?.brand} {snapshot.vehicle?.model}
                        </span>
                        <span className="font-mono text-caption text-on-surface-variant">
                          ({snapshot.vehicle?.plate})
                        </span>
                      </div>

                      <p className="mt-2 text-body-md text-on-surface-variant">
                        {formatDateTimeWib(item.startDate)} s.d. {formatDateTimeWib(item.endDate)}
                      </p>

                      <div className="mt-1 flex gap-2 text-caption text-on-surface-variant">
                        <span>Durasi: {snapshot.chargeableDays ?? 1} hari</span>
                        <span>•</span>
                        <span>{item.withDriver ? 'Dengan Sopir' : 'Lepas Kunci'}</span>
                      </div>
                    </div>

                    <div className="text-right sm:self-center">
                      <span className="text-caption text-on-surface-variant">Subtotal Item</span>
                      <p className="tabular-nums font-semibold text-secondary">
                        {formatRupiah(item.totalAmount)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {booking.notes ? (
              <div className="mt-6 rounded-xl bg-surface-low p-4">
                <span className="text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
                  Catatan Tambahan
                </span>
                <p className="mt-1 text-body-md text-on-surface">{booking.notes}</p>
              </div>
            ) : null}
          </Card>

          {/* Verifikasi Dokumen Identitas */}
          <Card padding="md">
            <h3 className="font-display text-title text-on-surface">Dokumen Identitas Penyewa</h3>
            {booking.documents.length === 0 ? (
              <p className="mt-2 text-body-md text-on-surface-variant">
                Belum ada dokumen yang diunggah.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {booking.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-highest bg-surface-low p-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{doc.type}</span>
                        <Badge
                          tone={
                            doc.status === 'APPROVED'
                              ? 'success'
                              : doc.status === 'REJECTED'
                                ? 'danger'
                                : 'warning'
                          }
                        >
                          {doc.status}
                        </Badge>
                      </div>
                      {doc.rejectionReason ? (
                        <p className="mt-1 text-caption text-error">Alasan: {doc.rejectionReason}</p>
                      ) : null}
                    </div>

                    {booking.status === 'PENDING_VERIFICATION' || booking.status === 'ACTIVE' ? (
                      <div className="flex gap-2">
                        <Button
                          loading={verifyingDocId === doc.id}
                          onClick={() => handleVerifyDoc(doc.id, 'APPROVED')}
                          size="sm"
                          variant="secondary"
                        >
                          Setujui
                        </Button>
                        <Button
                          loading={verifyingDocId === doc.id}
                          onClick={() => handleVerifyDoc(doc.id, 'REJECTED')}
                          size="sm"
                          variant="outline"
                        >
                          Tolak
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Rincian Invoice & Pencatatan Pembayaran */}
          {latestInvoice ? (
            <Card padding="md">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-surface-highest pb-4">
                <div>
                  <span className="text-caption uppercase tracking-[0.06em] text-on-surface-variant">
                    Invoice Snapshot (Versi {latestInvoice.version})
                  </span>
                  <h3 className="font-mono font-semibold text-on-surface">
                    {latestInvoice.invoiceNumber}
                  </h3>
                </div>

                <Badge tone={invoiceStatusMeta[latestInvoice.status].tone}>
                  {invoiceStatusMeta[latestInvoice.status].label}
                </Badge>
              </div>

              <div className="mt-4 space-y-2">
                {latestInvoice.items.map((invItem) => (
                  <div
                    key={invItem.id}
                    className="flex items-center justify-between text-body-md text-on-surface"
                  >
                    <span>
                      {invItem.description} ({invItem.quantity}x)
                    </span>
                    <span className="tabular-nums font-medium">
                      {formatRupiah(invItem.amount)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-surface-highest pt-4">
                <div className="font-display text-title text-on-surface">
                  <span>Total Tagihan</span>
                  <span className="ml-3 tabular-nums text-secondary">
                    {formatRupiah(latestInvoice.totalAmount)}
                  </span>
                </div>
                <a
                  className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-label-md font-semibold text-surface-lowest hover:bg-secondary/90"
                  href={`/booking/${booking.id}/invoice/${latestInvoice.version}`}
                  target="_blank"
                >
                  <Icon name="receipt" size="sm" />
                  Cetak / PDF
                </a>
              </div>

              {/* Riwayat Invoice Revisi jika ada lebih dari 1 versi */}
              {invoices.length > 1 ? (
                <div className="mt-4 border-t border-surface-highest pt-3">
                  <span className="text-caption font-semibold uppercase tracking-wider text-on-surface-variant">
                    Riwayat Revisi Invoice ({invoices.length} versi)
                  </span>
                  <div className="mt-2 space-y-1">
                    {invoices.map((inv) => (
                      <div
                        className="flex items-center justify-between text-body-sm text-on-surface-variant"
                        key={inv.id}
                      >
                        <span>
                          Versi {inv.version} ({inv.invoiceNumber}) · {inv.status}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="tabular-nums font-medium">{formatRupiah(inv.totalAmount)}</span>
                          <a
                            className="text-caption text-secondary hover:underline"
                            href={`/booking/${booking.id}/invoice/${inv.version}`}
                            target="_blank"
                          >
                            Lihat
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Form Input Pembayaran Manual */}
              {latestInvoice.status !== 'PAID' &&
              (booking.status === 'PENDING_VERIFICATION' || booking.status === 'ACTIVE') ? (
                <div className="mt-6 border-t border-surface-highest pt-4">
                  <h4 className="text-body-lg font-semibold text-on-surface">
                    Catat Pembayaran Manual
                  </h4>
                  <p className="mt-1 text-caption text-on-surface-variant">
                    Konfirmasi mutasi rekening bank transfer dari customer.
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <Input
                      label="Nominal (Rp)"
                      onChange={(e) => setPayAmount(e.target.value)}
                      type="number"
                      value={payAmount}
                    />
                    <Input
                      label="Bank Tujuan"
                      onChange={(e) => setPayBank(e.target.value)}
                      value={payBank}
                    />
                    <Input
                      label="Catatan / No. Ref"
                      onChange={(e) => setPayNotes(e.target.value)}
                      value={payNotes}
                    />
                  </div>
                  <Button
                    className="mt-3"
                    loading={paying}
                    onClick={handleAddPayment}
                    variant="secondary"
                  >
                    Konfirmasi Pembayaran
                  </Button>
                </div>
              ) : null}
            </Card>
          ) : null}

          {/* Opsi Batalkan Booking */}
          {booking.status === 'PENDING_VERIFICATION' || booking.status === 'ACTIVE' ? (
            <Card padding="md">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-body-lg font-semibold text-on-surface">Batalkan Pemesanan</h4>
                  <p className="text-caption text-on-surface-variant">
                    Pelepasan jadwal mobil yang telah dibooking.
                  </p>
                </div>
                <Button
                  onClick={() => setShowCancel(!showCancel)}
                  size="sm"
                  variant="outline"
                >
                  {showCancel ? 'Tutup' : 'Batalkan Booking'}
                </Button>
              </div>

              {showCancel ? (
                <div className="mt-4 space-y-3 border-t border-surface-highest pt-3">
                  <Input
                    label="Alasan Pembatalan"
                    onChange={(e) => setCancelReason(e.target.value)}
                    value={cancelReason}
                  />
                  <Button
                    loading={cancelling}
                    onClick={handleCancelBooking}
                    variant="outline"
                  >
                    Konfirmasi Pembatalan
                  </Button>
                </div>
              ) : null}
            </Card>
          ) : null}
        </div>

        {/* Kolom Kanan: Info Customer & Timeline History */}
        <div className="space-y-6">
          <Card padding="md">
            <h3 className="font-display text-title text-on-surface">Data Penyewa</h3>

            <div className="mt-4 space-y-3 text-body-md">
              <div>
                <span className="text-caption text-on-surface-variant">Nama Lengkap</span>
                <p className="font-medium text-on-surface">{customer.name}</p>
              </div>

              <div>
                <span className="text-caption text-on-surface-variant">NIK (KTP)</span>
                <p className="font-mono text-on-surface">{customer.nik}</p>
              </div>

              <div>
                <span className="text-caption text-on-surface-variant">WhatsApp</span>
                <p className="font-mono text-on-surface">{customer.whatsapp}</p>
              </div>

              {customer.email ? (
                <div>
                  <span className="text-caption text-on-surface-variant">Email</span>
                  <p className="text-on-surface">{customer.email}</p>
                </div>
              ) : null}

              <div>
                <span className="text-caption text-on-surface-variant">Alamat</span>
                <p className="text-on-surface">{customer.address}</p>
              </div>
            </div>
          </Card>

          <Card padding="md">
            <h3 className="font-display text-title text-on-surface">Riwayat &amp; Timeline</h3>

            {timeline.length === 0 ? (
              <p className="mt-4 text-body-md text-on-surface-variant">Belum ada riwayat aktivitas.</p>
            ) : (
              <div className="mt-4 space-y-4 border-l-2 border-surface-highest pl-4">
                {timeline.map((event) => (
                  <div key={event.id} className="relative">
                    <span className="absolute -left-[21px] top-1 size-2 rounded-full bg-secondary" />
                    <span className="block text-caption text-on-surface-variant">
                      {formatDateTimeWib(event.createdAt)}
                    </span>
                    <span className="block font-medium text-on-surface">{event.action}</span>
                    <span className="block text-caption text-on-surface-variant">
                      Aktor: {event.actorName ?? 'Sistem Otomatis'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
