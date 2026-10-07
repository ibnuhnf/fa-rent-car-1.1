'use client';

import { formatDateTimeWib, formatRupiah, type PortalMeResponse } from '@fa/shared';
import { Badge, Button, Card, Icon } from '@fa/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  confirmPortalDocument,
  requestPortalChange,
  stagePortalDocument,
} from '../../../lib/api';

interface CustomerPortalViewProps {
  initialData: PortalMeResponse;
  token: string;
}

export function CustomerPortalView({ initialData, token }: CustomerPortalViewProps) {
  const router = useRouter();
  const [data, setData] = useState(initialData);

  // Upload Dokumen state
  const [uploadingType, setUploadingType] = useState<'KTP' | 'SIM_A' | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Form Request Change state
  const [requestKind, setRequestKind] = useState<'EXTEND' | 'CHANGE'>('EXTEND');
  const [requestMsg, setRequestMsg] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);

  const { booking, invoices, payments } = data;
  const latestInvoice = invoices[invoices.length - 1];

  const handleFileUpload = async (type: 'KTP' | 'SIM_A', file: File | null) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setUploadError('Format dokumen harus JPG atau PNG.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Ukuran file maksimal 5 MB.');
      return;
    }

    setUploadingType(type);
    setUploadError(null);
    setUploadNotice(null);

    try {
      // 1. Stage upload URL
      const stage = await stagePortalDocument(token, {
        type,
        contentType: file.type as 'image/jpeg' | 'image/png',
        byteLength: file.size,
      });

      // 2. Upload file bytes directly to storage (S3/MinIO)
      const putRes = await fetch(stage.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!putRes.ok) {
        throw new Error('Gagal mengunggah berkas ke penyimpanan.');
      }

      // 3. Confirm document record
      const confirmed = await confirmPortalDocument(token, {
        type,
        objectKey: stage.objectKey,
      });

      setData((prev) => ({
        ...prev,
        booking: {
          ...prev.booking,
          documents: [
            ...prev.booking.documents.filter((d) => d.id !== confirmed.document.id),
            confirmed.document,
          ],
        },
      }));
      setUploadNotice(`Dokumen ${type} berhasil diunggah dan sedang diverifikasi admin.`);
      router.refresh();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Gagal mengunggah dokumen.');
    } finally {
      setUploadingType(null);
    }
  };

  const handleRequestChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestMsg.trim()) return;

    setRequesting(true);
    try {
      await requestPortalChange(token, {
        kind: requestKind,
        message: requestMsg.trim(),
      });
      setRequestSuccess(true);
      setRequestMsg('');
      setTimeout(() => setRequestSuccess(false), 5000);
    } catch {
      alert('Gagal mengirim permintaan. Silakan hubungi WhatsApp kami.');
    } finally {
      setRequesting(false);
    }
  };

  const statusToneMap: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'neutral'> = {
    PENDING_VERIFICATION: 'warning',
    ACTIVE: 'success',
    COMPLETED: 'neutral',
    EXPIRED: 'danger',
    CANCELLED: 'danger',
  };

  const statusLabelMap: Record<string, string> = {
    PENDING_VERIFICATION: 'Menunggu Verifikasi / Pembayaran',
    ACTIVE: 'Aktif / Sedang Disewa',
    COMPLETED: 'Selesai',
    EXPIRED: 'Kedaluwarsa (Hold Habis)',
    CANCELLED: 'Dibatalkan',
  };

  return (
    <div className="space-y-8">
      {/* Header Booking */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="text-caption font-semibold uppercase tracking-wider text-on-surface-variant">
            Portal Pelanggan
          </span>
          <h1 className="font-mono text-headline-lg font-bold text-on-surface">
            {booking.bookingCode}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge tone={statusToneMap[booking.status] ?? 'neutral'}>
              {statusLabelMap[booking.status] ?? booking.status}
            </Badge>
          </div>
        </div>

        {booking.status === 'PENDING_VERIFICATION' ? (
          <div className="rounded-xl border border-warning/40 bg-surface-low p-4 text-right sm:max-w-xs">
            <span className="text-caption text-on-surface-variant">Batas Waktu Hold Mobil</span>
            <p className="font-mono font-bold text-warning text-body-lg">
              {formatDateTimeWib(booking.holdExpiresAt)}
            </p>
            <p className="mt-1 text-[11px] text-on-surface-variant">
              Lakukan transfer dan unggah dokumen sebelum batas waktu berakhir.
            </p>
          </div>
        ) : null}
      </section>

      {/* Rincian Mobil Dipesan */}
      <Card padding="md">
        <h2 className="text-title font-bold text-on-surface">Armada yang Dipesan</h2>
        <div className="mt-4 space-y-3">
          {booking.items.map((item, idx) => (
            <div
              key={item.id}
              className="flex flex-col justify-between gap-2 rounded-xl border border-surface-highest bg-surface-low p-4 sm:flex-row sm:items-center"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Badge tone="info">Mobil #{idx + 1}</Badge>
                  <span className="font-semibold text-on-surface">
                    {item.vehicle?.brand} {item.vehicle?.model}
                  </span>
                  <span className="font-mono text-caption text-on-surface-variant">
                    ({item.vehicle?.plate})
                  </span>
                </div>
                <p className="mt-1 text-caption text-on-surface-variant">
                  {formatDateTimeWib(item.startDate)} s.d. {formatDateTimeWib(item.endDate)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-caption text-on-surface-variant">
                  {item.withDriver ? 'Dengan Sopir' : 'Lepas Kunci'}
                </span>
                <p className="tabular-nums font-bold text-secondary">{formatRupiah(item.totalAmount)}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Verifikasi Dokumen KTP & SIM A */}
      <Card padding="md">
        <h2 className="text-title font-bold text-on-surface">Verifikasi Dokumen Identitas</h2>
        <p className="mt-1 text-caption text-on-surface-variant">
          Foto KTP dan SIM A wajib diunggah untuk verifikasi penyewaan lepas kunci atau dengan sopir.
        </p>

        {uploadError ? (
          <div className="mt-4 rounded-lg bg-error-container p-3 text-caption text-on-error-container">
            {uploadError}
          </div>
        ) : null}

        {uploadNotice ? (
          <div className="mt-4 rounded-lg bg-success-container p-3 text-caption text-on-success-container">
            {uploadNotice}
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Slot KTP */}
          {(['KTP', 'SIM_A'] as const).map((docType) => {
            const existing = booking.documents.find((d) => d.type === docType);
            const isApproved = existing?.status === 'APPROVED';
            const isRejected = existing?.status === 'REJECTED';

            return (
              <div
                key={docType}
                className="flex flex-col justify-between rounded-xl border border-surface-highest bg-surface-low p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-on-surface">
                      {docType === 'KTP' ? 'KTP Asli Penyewa' : 'SIM A (Pengemudi)'}
                    </h3>
                    <p className="text-caption text-on-surface-variant">
                      Format JPG / PNG, maks 5 MB
                    </p>
                  </div>
                  {existing ? (
                    <Badge
                      tone={
                        isApproved
                          ? 'success'
                          : isRejected
                            ? 'danger'
                            : 'warning'
                      }
                    >
                      {existing.status}
                    </Badge>
                  ) : (
                    <Badge tone="neutral">Belum Diunggah</Badge>
                  )}
                </div>

                {isRejected && existing?.rejectionReason ? (
                  <p className="text-caption text-error">
                    Alasan ditolak: {existing.rejectionReason}. Silakan unggah ulang.
                  </p>
                ) : null}

                {booking.status !== 'EXPIRED' && booking.status !== 'CANCELLED' && !isApproved ? (
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-button border border-surface-highest bg-surface-lowest py-2.5 text-center text-label-md font-semibold text-on-surface hover:bg-surface-high">
                    <Icon name="upload" size="sm" />
                    <span>
                      {uploadingType === docType
                        ? 'Mengunggah…'
                        : existing
                          ? 'Unggah Ulang'
                          : 'Unggah Dokumen'}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      className="sr-only"
                      disabled={uploadingType !== null}
                      onChange={(e) => handleFileUpload(docType, e.target.files?.[0] || null)}
                    />
                  </label>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Invoice & Pembayaran */}
      {latestInvoice ? (
        <Card padding="md">
          <div className="flex items-center justify-between border-b border-surface-highest pb-3">
            <div>
              <span className="text-caption uppercase tracking-wider text-on-surface-variant">
                Invoice Resmi #{latestInvoice.invoiceNumber}
              </span>
              <p className="text-body-md font-semibold text-on-surface">
                Status: {latestInvoice.status}
              </p>
            </div>
            <a
              href={`/api/v1/portal/invoices/${latestInvoice.version}/download`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-button bg-secondary px-3.5 py-2 text-label-md font-semibold text-surface-lowest hover:bg-secondary/90"
            >
              <Icon name="receipt" size="sm" />
              <span>Lihat &amp; Cetak Invoice HTML</span>
            </a>
          </div>

          <div className="mt-4 space-y-2 text-body-sm">
            {latestInvoice.items.map((it) => (
              <div key={it.id} className="flex justify-between text-on-surface-variant">
                <span>{it.description}</span>
                <span className="tabular-nums font-medium text-on-surface">{formatRupiah(it.amount)}</span>
              </div>
            ))}
            <div className="border-t border-surface-highest pt-3 flex justify-between font-bold text-title text-on-surface">
              <span>Total Tagihan</span>
              <span className="tabular-nums text-secondary">{formatRupiah(latestInvoice.totalAmount)}</span>
            </div>
          </div>

          {/* Riwayat Pembayaran */}
          {payments.length > 0 ? (
            <div className="mt-6 border-t border-surface-highest pt-4">
              <h3 className="text-body-md font-semibold text-on-surface mb-2">
                Pembayaran yang Dikonfirmasi
              </h3>
              <div className="space-y-2">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg bg-surface-low p-3 text-body-sm"
                  >
                    <div>
                      <span className="font-semibold text-on-surface">{p.bankName}</span>
                      <span className="ml-2 text-caption text-on-surface-variant">
                        {formatDateTimeWib(p.paymentDate)}
                      </span>
                    </div>
                    <span className="tabular-nums font-bold text-success">
                      +{formatRupiah(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      {/* Form Ajukan Perpanjangan / Perubahan Sewa */}
      {booking.status === 'PENDING_VERIFICATION' || booking.status === 'ACTIVE' ? (
        <Card padding="md">
          <h2 className="text-title font-bold text-on-surface">
            Ajukan Perpanjangan / Perubahan Jadwal
          </h2>
          <p className="mt-1 text-caption text-on-surface-variant">
            Pesan Anda akan masuk ke antrean admin operasional untuk diverifikasi ketersediaannya.
          </p>

          {requestSuccess ? (
            <div className="mt-4 rounded-lg bg-success-container p-3 text-caption text-on-success-container">
              Permintaan berhasil dikirim. Admin akan segera menghubungi Anda.
            </div>
          ) : null}

          <form onSubmit={handleRequestChange} className="mt-4 space-y-4">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-body-sm cursor-pointer">
                <input
                  type="radio"
                  name="requestKind"
                  value="EXTEND"
                  checked={requestKind === 'EXTEND'}
                  onChange={() => setRequestKind('EXTEND')}
                />
                <span>Perpanjang Durasi Sewa</span>
              </label>
              <label className="flex items-center gap-2 text-body-sm cursor-pointer">
                <input
                  type="radio"
                  name="requestKind"
                  value="CHANGE"
                  checked={requestKind === 'CHANGE'}
                  onChange={() => setRequestKind('CHANGE')}
                />
                <span>Ubah Tanggal / Ganti Mobil</span>
              </label>
            </div>

            <textarea
              className="w-full rounded-button border border-surface-highest bg-surface-low px-3 py-2 text-body-md"
              rows={3}
              value={requestMsg}
              onChange={(e) => setRequestMsg(e.target.value)}
              placeholder="Jelaskan detail perubahan yang diinginkan (misal: tambah 2 hari sampai tanggal XX)..."
              required
            />

            <Button type="submit" size="md" variant="secondary" loading={requesting}>
              Kirim Permintaan ke Admin
            </Button>
          </form>
        </Card>
      ) : null}

      {/* Info Kantor & Lokasi Pengambilan */}
      <Card padding="md">
        <h2 className="text-title font-bold text-on-surface">Lokasi &amp; Serah Terima Armada</h2>
        <div className="mt-3 space-y-2 text-body-sm text-on-surface-variant">
          <p className="font-semibold text-on-surface">
            Kantor Resmi FA RENT CAR: {booking.pickupOffice}
          </p>
          <p>
            Alamat: Jl. Pilang Raya No.10, Pilangsari, Kec. Kedawung, Kabupaten Cirebon, Jawa Barat 45153
          </p>
          <p className="text-caption">
            * Seluruh unit diserahterimakan dan dikembalikan langsung di kantor resmi.
          </p>
        </div>
      </Card>
    </div>
  );
}
