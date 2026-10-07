'use client';

import { Button, Card, Input } from '@fa/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CustomerHeader } from '../../components/CustomerHeader';

export default function CekStatusPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = token.trim();
    if (!cleanToken) {
      setError('Masukkan token akses portal sewa Anda.');
      return;
    }
    router.push(`/portal/${cleanToken}`);
  };

  return (
    <>
      <CustomerHeader />
      <main className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <Card padding="lg">
          <div className="text-center">
            <h1 className="font-display text-headline-md font-bold text-on-surface">
              Cek Status &amp; Dokumen Sewa
            </h1>
            <p className="mt-2 text-body-md text-on-surface-variant">
              Masukkan token akses portal yang Anda peroleh saat membuat pemesanan atau dari pesan WhatsApp.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error ? (
              <div className="rounded-lg bg-error-container p-3 text-caption text-on-error-container">
                {error}
              </div>
            ) : null}

            <Input
              label="Token Akses Portal"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Contoh: 3a1f9e..."
              required
            />

            <Button type="submit" size="lg" variant="secondary" className="w-full">
              Buka Status Pesanan &rarr;
            </Button>
          </form>

          <div className="mt-6 border-t border-surface-highest pt-4 text-center text-caption text-on-surface-variant">
            <p>
              Lupa atau kehilangan token? Hubungi customer service melalui{' '}
              <a
                href="https://wa.me/6285224484488"
                target="_blank"
                rel="noreferrer"
                className="text-secondary font-semibold hover:underline"
              >
                WhatsApp Resmi
              </a>
              .
            </p>
          </div>
        </Card>
      </main>
    </>
  );
}
