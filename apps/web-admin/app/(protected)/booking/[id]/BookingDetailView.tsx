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
import { Badge, Button, Card, Icon, type BadgeTone } from '@fa/ui';
import { describeBookingError, extendHold } from '../../../../lib/browser-booking';

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
  const [extendError, setExtendError] = useState<string | null>(null);

  const { booking, customer, invoices, timeline } = data;
  const latestInvoice = invoices[invoices.length - 1];

  const handleExtendHold = async (minutes: number) => {
    setExtending(true);
    setExtendError(null);
    try {
      const result = await extendHold(booking.id, minutes);
      setData((prev) => ({
        ...prev,
        booking: { ...prev.booking, holdExpiresAt: result.holdExpiresAt },
      }));
      router.refresh();
    } catch (err) {
      setExtendError(describeBookingError(err));
    } finally {
      setExtending(false);
    }
  };

  return (
    <div className="space-y-6">
      {extendError ? (
        <div className="rounded-xl border border-error bg-error-container p-4 text-body-md text-on-error-container">
          <p className="font-semibold">Perpanjangan hold gagal</p>
          <p className="mt-1">{extendError}</p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Kolom Kiri: Status & Rincian Armada */}
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

          {/* Rincian Invoice Snapshot */}
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

              <div className="mt-4 border-t border-surface-highest pt-4">
                <div className="flex items-center justify-between font-display text-title text-on-surface">
                  <span>Total Tagihan</span>
                  <span className="tabular-nums text-secondary">
                    {formatRupiah(latestInvoice.totalAmount)}
                  </span>
                </div>
                <p className="mt-1 text-caption text-on-surface-variant">
                  * Pembayaran 100% di muka via transfer bank. Tanpa deposit.
                </p>
              </div>
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