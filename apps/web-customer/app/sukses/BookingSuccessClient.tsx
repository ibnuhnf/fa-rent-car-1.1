'use client';

import { formatDateTimeWib, formatRupiah } from '@fa/shared';
import { Badge, Button, Card, Icon } from '@fa/ui';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

export function BookingSuccessClient() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code') || 'FA-XXXXX';
  const token = searchParams.get('token') || '';
  const inv = searchParams.get('inv') || 'INV-XXXXX';
  const total = Number(searchParams.get('total') || 0);
  const hold = searchParams.get('hold') || new Date().toISOString();

  const [copied, setCopied] = useState(false);

  const bankRekening = '1234567890';
  const bankName = 'BCA';
  const atasNama = 'FA RENT CAR CIREBON';

  const copyRekening = () => {
    navigator.clipboard.writeText(bankRekening);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const portalHref = `/portal/${token}`;
  const waText = encodeURIComponent(
    `Halo FA RENT CAR, saya sudah melakukan pemesanan.\nKode Booking: ${code}\nNo Invoice: ${inv}\nTotal: ${formatRupiah(total)}\nMohon info verifikasinya. Terima kasih!`,
  );
  const waUrl = `https://wa.me/6285224484488?text=${waText}`;

  return (
    <div className="space-y-6">
      {/* Header Sukses */}
      <div className="text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-success-container text-on-success-container">
          <Icon name="check_circle" size="lg" />
        </div>
        <h1 className="mt-4 font-display text-headline-lg font-bold text-on-surface">
          Pemesanan Berhasil Dibuat!
        </h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Armada Anda telah kami hold sementara. Silakan selesaikan pembayaran dan verifikasi
          dokumen identitas.
        </p>
      </div>

      {/* Ringkasan & Countdown Hold */}
      <Card padding="md" className="border-secondary/30 bg-surface-lowest">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-highest pb-4">
          <div>
            <span className="text-caption uppercase tracking-wider text-on-surface-variant">
              Kode Pemesanan
            </span>
            <p className="font-mono text-title font-bold text-secondary">{code}</p>
          </div>
          <div className="text-right">
            <span className="text-caption text-on-surface-variant">Batas Waktu Hold (2 Jam)</span>
            <p className="font-mono text-body-md font-semibold text-warning">
              {formatDateTimeWib(hold)}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-body-sm">
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Nomor Invoice</span>
            <span className="font-mono font-medium">{inv}</span>
          </div>
          <div className="flex justify-between font-bold text-title">
            <span>Total yang Harus Ditransfer</span>
            <span className="tabular-nums text-secondary">{formatRupiah(total)}</span>
          </div>
        </div>
      </Card>

      {/* Rekening Transfer Resmi */}
      <Card padding="md">
        <h2 className="text-title font-bold text-on-surface">Rekening Pembayaran Resmi</h2>
        <p className="mt-1 text-caption text-on-surface-variant">
          Transfer tepat sesuai nominal tagihan dan simpan bukti transfer untuk diunggah di portal.
        </p>

        <div className="mt-4 rounded-xl border border-surface-highest bg-surface-low p-4">
          <div className="flex items-center justify-between">
            <div>
              <Badge tone="info">Bank {bankName}</Badge>
              <p className="mt-2 font-mono text-headline-md font-bold text-on-surface tracking-wider">
                {bankRekening}
              </p>
              <p className="text-caption text-on-surface-variant">a.n. {atasNama}</p>
            </div>
            <Button size="sm" variant="outline" onClick={copyRekening}>
              {copied ? 'Tersalin!' : 'Salin Nomor Rekening'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Aksi Utama: Buka Portal & WhatsApp */}
      <div className="space-y-3">
        {token ? (
          <Link
            href={portalHref}
            className="flex w-full items-center justify-center gap-2 rounded-button bg-secondary py-3.5 text-center text-body-lg font-bold text-surface-lowest shadow-card-hover hover:bg-secondary/90"
          >
            <Icon name="verified_user" size="md" />
            <span>Buka Portal Pelanggan (Upload Dokumen) &rarr;</span>
          </Link>
        ) : null}

        <a
          href={waUrl}
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-button border border-surface-highest bg-surface-low py-3 text-center text-body-md font-semibold text-on-surface hover:bg-surface-high"
        >
          <Icon name="chat" size="md" className="text-success" />
          <span>Konfirmasi ke WhatsApp Admin</span>
        </a>
      </div>

      <div className="rounded-lg bg-surface-low p-4 text-center text-caption text-on-surface-variant">
        <p>Simpan link portal ini. Anda dapat mengakses kembali status pesanan kapan saja tanpa password.</p>
      </div>
    </div>
  );
}
