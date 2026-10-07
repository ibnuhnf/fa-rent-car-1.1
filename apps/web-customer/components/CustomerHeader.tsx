'use client';

import { Brand, ButtonLink, Icon } from '@fa/ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getCartItems } from '../lib/cart';

export function CustomerHeader() {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const update = () => setCartCount(getCartItems().length);
    update();
    window.addEventListener('cart-updated', update);
    return () => window.removeEventListener('cart-updated', update);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-surface-highest bg-surface-lowest/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="hover:opacity-90">
          <Brand subtitle="Rental Mobil Cirebon" />
        </Link>

        <nav className="hidden items-center gap-6 md:flex text-body-md font-medium text-on-surface-variant">
          <Link href="/" className="hover:text-on-surface">Beranda</Link>
          <Link href="/mobil" className="hover:text-on-surface">Katalog Mobil</Link>
          <Link href="/cek-status" className="hover:text-on-surface">Cek Status Sewa</Link>
          <a
            href="https://wa.me/6285224484488"
            target="_blank"
            rel="noreferrer"
            className="hover:text-on-surface"
          >
            Bantuan WA
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/pesan"
            className="relative inline-flex items-center gap-1.5 rounded-button border border-surface-highest bg-surface-low px-3 py-1.5 text-label-md font-semibold text-on-surface hover:bg-surface-high"
          >
            <Icon name="shopping_cart" size="sm" />
            <span>Keranjang</span>
            {cartCount > 0 ? (
              <span className="flex size-5 items-center justify-center rounded-full bg-secondary text-[11px] font-bold text-surface-lowest">
                {cartCount}
              </span>
            ) : null}
          </Link>

          <ButtonLink href="/mobil" variant="secondary" size="sm">
            Pilih Mobil
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
