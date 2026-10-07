'use client';

import { formatRupiah } from '@fa/shared';
import { Button, Card, Icon, Input } from '@fa/ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { submitGuestBooking, validatePromoCode } from '../../lib/api';
import { clearCart, getCartItems, removeFromCart, type CartItem } from '../../lib/cart';

export function BookingCheckoutClient() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Form Customer
  const [nik, setNik] = useState('');
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Promo
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [promoMessage, setPromoMessage] = useState<{ text: string; isError?: boolean } | null>(
    null,
  );

  // Submitting
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    setItems(getCartItems());
    const onCartUpdate = () => setItems(getCartItems());
    window.addEventListener('cart-updated', onCartUpdate);
    return () => window.removeEventListener('cart-updated', onCartUpdate);
  }, []);

  const subtotal = items.reduce((sum, item) => sum + (item.estimatedTotal ?? item.dailyRate), 0);
  const total = Math.max(0, subtotal - promoDiscount);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setValidatingPromo(true);
    setPromoMessage(null);
    try {
      const res = await validatePromoCode({
        code: promoCode.trim().toUpperCase(),
        subtotal,
      });
      if (res.valid) {
        setPromoDiscount(res.discount);
        setPromoMessage({ text: `Voucher aktif: Hemat ${formatRupiah(res.discount)}` });
      } else {
        setPromoDiscount(0);
        setPromoMessage({ text: 'Kode promo tidak valid atau kedaluwarsa.', isError: true });
      }
    } catch {
      setPromoDiscount(0);
      setPromoMessage({ text: 'Gagal memvalidasi promo.', isError: true });
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      setError('Keranjang Anda kosong. Pilih mobil terlebih dahulu.');
      return;
    }

    if (!/^\d{16}$/.test(nik)) {
      setError('NIK wajib 16 digit angka sesuai KTP.');
      return;
    }

    if (!/^\+?\d{8,15}$/.test(whatsapp)) {
      setError('Nomor WhatsApp tidak valid.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await submitGuestBooking({
        customer: {
          nik,
          name: name.trim(),
          whatsapp: whatsapp.trim(),
          email: email.trim() || undefined,
          address: address.trim(),
          notes: notes.trim() || undefined,
        },
        items: items.map((item) => ({
          vehicleId: item.vehicleId,
          startDate: item.startDate,
          endDate: item.endDate,
          withDriver: item.withDriver,
        })),
        promoCode: promoDiscount > 0 ? promoCode.trim().toUpperCase() : undefined,
      });

      clearCart();
      const token = res.portalUrl.replace('/portal/', '');
      router.push(
        `/sukses?code=${res.bookingCode}&token=${token}&hold=${encodeURIComponent(
          res.holdExpiresAt,
        )}&total=${res.invoice.totalAmount}&inv=${res.invoice.invoiceNumber}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim pesanan.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isClient) return null;

  if (items.length === 0) {
    return (
      <Card padding="lg" className="text-center">
        <Icon name="shopping_cart" size="lg" className="mx-auto text-on-surface-variant" />
        <h2 className="mt-4 text-title font-bold text-on-surface">Keranjang Anda Kosong</h2>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Pilih mobil yang Anda butuhkan dari katalog kami untuk memulai pemesanan.
        </p>
        <Link
          href="/mobil"
          className="mt-6 inline-block rounded-button bg-secondary px-6 py-2.5 text-label-md font-semibold text-surface-lowest"
        >
          Lihat Katalog Mobil &rarr;
        </Link>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      {/* Kolom Kiri: Form Data Penyewa & Item Keranjang */}
      <div className="space-y-6 lg:col-span-2">
        {error ? (
          <div className="rounded-xl border border-error bg-error-container p-4 text-body-md text-on-error-container">
            <p className="font-semibold">Periksa data Anda</p>
            <p className="mt-1">{error}</p>
          </div>
        ) : null}

        {/* Daftar Mobil yang Dipesan */}
        <Card padding="md">
          <div className="flex items-center justify-between border-b border-surface-highest pb-3">
            <h2 className="text-title font-bold text-on-surface">Mobil Dipilih ({items.length})</h2>
            <Link href="/mobil" className="text-body-sm font-semibold text-secondary hover:underline">
              + Tambah Mobil Lain
            </Link>
          </div>

          <div className="mt-4 divide-y divide-surface-highest">
            {items.map((item) => (
              <div key={item.vehicleId} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div>
                  <h3 className="font-semibold text-on-surface">{item.vehicleName}</h3>
                  <span className="font-mono text-caption text-on-surface-variant">
                    {item.vehiclePlate} · {item.withDriver ? 'Dengan Sopir' : 'Lepas Kunci'}
                  </span>
                  <p className="mt-1 text-caption text-on-surface-variant">
                    {new Date(item.startDate).toLocaleDateString('id-ID')} s.d.{' '}
                    {new Date(item.endDate).toLocaleDateString('id-ID')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="tabular-nums font-bold text-secondary">
                    {formatRupiah(item.estimatedTotal ?? item.dailyRate)}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.vehicleId)}
                    className="mt-1 text-caption text-error hover:underline"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Data Identitas Penyewa */}
        <Card padding="md">
          <h2 className="text-title font-bold text-on-surface">Data Identitas Penyewa</h2>
          <p className="mt-1 text-caption text-on-surface-variant">
            Wajib sesuai KTP &amp; SIM A yang masih berlaku. Dokumen diunggah setelah submit.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="NIK KTP (16 Digit)"
              value={nik}
              onChange={(e) => setNik(e.target.value.replace(/\D/g, '').slice(0, 16))}
              placeholder="3209012345678901"
              required
            />
            <Input
              label="Nama Lengkap"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sesuai KTP"
              required
            />
            <Input
              label="Nomor WhatsApp"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="081234567890"
              required
            />
            <Input
              label="Email (Opsional)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
            />
            <div className="sm:col-span-2">
              <label className="block text-label-md font-semibold text-on-surface mb-1">
                Alamat Domisili Lengkap
              </label>
              <textarea
                className="w-full rounded-button border border-surface-highest bg-surface-low px-3 py-2 text-body-md"
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Jl. Nama Jalan No. X, Kelurahan, Kecamatan, Kota"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-label-md font-semibold text-on-surface mb-1">
                Catatan Tambahan (Opsional)
              </label>
              <textarea
                className="w-full rounded-button border border-surface-highest bg-surface-low px-3 py-2 text-body-md"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Rencana rute, permintaan khusus, jam jemput, dll."
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Kolom Kanan: Ringkasan Tagihan & Submit */}
      <div className="space-y-6">
        <Card padding="md" className="sticky top-24">
          <h2 className="text-title font-bold text-on-surface border-b border-surface-highest pb-3">
            Ringkasan Biaya
          </h2>

          <div className="mt-4 space-y-3 text-body-sm">
            <div className="flex justify-between text-on-surface-variant">
              <span>Subtotal ({items.length} mobil)</span>
              <span className="tabular-nums font-semibold text-on-surface">{formatRupiah(subtotal)}</span>
            </div>

            {promoDiscount > 0 ? (
              <div className="flex justify-between text-success">
                <span>Diskon Promo</span>
                <span className="tabular-nums font-semibold">-{formatRupiah(promoDiscount)}</span>
              </div>
            ) : null}

            <div className="border-t border-surface-highest pt-3 flex justify-between text-title font-bold text-on-surface">
              <span>Total Tagihan</span>
              <span className="tabular-nums text-secondary">{formatRupiah(total)}</span>
            </div>
          </div>

          {/* Kode Promo Box */}
          <div className="mt-6 rounded-xl bg-surface-low p-3">
            <label className="block text-caption font-semibold text-on-surface-variant mb-1">
              Punya Kode Promo?
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="KODE PROMO"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                className="w-full uppercase rounded-button border border-surface-highest bg-surface-lowest px-3 py-1.5 text-body-sm"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                loading={validatingPromo}
                onClick={handleApplyPromo}
              >
                Gunakan
              </Button>
            </div>
            {promoMessage ? (
              <p
                className={`mt-2 text-caption font-medium ${
                  promoMessage.isError ? 'text-error' : 'text-success'
                }`}
              >
                {promoMessage.text}
              </p>
            ) : null}
          </div>

          <Button
            type="submit"
            size="lg"
            variant="secondary"
            className="w-full mt-6"
            loading={submitting}
          >
            Konfirmasi &amp; Dapatkan Invoice &rarr;
          </Button>

          <div className="mt-4 space-y-2 rounded-lg bg-surface-low/50 p-3 text-[11px] text-on-surface-variant">
            <div className="flex items-center gap-1.5 text-on-surface font-semibold">
              <Icon name="verified" size="sm" className="text-secondary" />
              <span>Jaminan Transparansi FA RENT CAR</span>
            </div>
            <p>• 100% Pembayaran di muka via transfer bank resmi.</p>
            <p>• Tanpa uang jaminan/deposit.</p>
            <p>• Armada di-hold 2 jam untuk proses verifikasi &amp; transfer.</p>
          </div>
        </Card>
      </div>
    </form>
  );
}
