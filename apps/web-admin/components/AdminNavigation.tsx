'use client';

import { useRef } from 'react';

import type { AdminUser } from '@fa/shared';
import { BottomTabBar, Brand, Button, Icon, Sidebar } from '@fa/ui';
import { usePathname } from 'next/navigation';

import { LogoutButton } from './LogoutButton';

interface AdminNavigationProps {
  user: AdminUser;
}

interface NavigationItem {
  label: string;
  icon: string;
  href?: string;
  phase?: string;
}

const operationalItems: ReadonlyArray<NavigationItem> = [
  { label: 'Dashboard', icon: 'dashboard', href: '/' },
  { label: 'Kalender', icon: 'calendar_month', href: '/kalender' },
  { label: 'Manajemen Armada', icon: 'garage_home', href: '/armada' },
  { label: 'Manajemen Booking', icon: 'receipt_long', href: '/booking' },
  { label: 'Verifikasi & Pembayaran', icon: 'verified_user', href: '/verifikasi' },
  { label: 'Sopir', icon: 'badge', href: '/sopir' },
  { label: 'Keuangan & Pengeluaran', icon: 'payments', href: '/keuangan' },
  { label: 'Serah Terima & Kondisi', icon: 'assignment_turned_in', phase: 'Fase 3' },
  { label: 'Customer', icon: 'group', phase: 'Fase 3' },
  { label: 'Servis & Dokumen', icon: 'build', href: '/servis' },
  { label: 'GPS & Geofence', icon: 'share_location', phase: 'Fase 4' },
  { label: 'Laporan Operasional', icon: 'monitoring', href: '/laporan' },
  { label: 'Pengaturan & Audit', icon: 'admin_panel_settings', href: '/pengaturan' },
];

function isCurrentPath(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

function UserSummary({ user }: { user: AdminUser }) {
  return (
    <a
      className="flex min-w-0 items-center gap-3 rounded-xl bg-surface-low p-3 transition hover:bg-surface-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
      href="/profil"
    >
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-label-md text-surface-lowest"
      >
        {user.name.slice(0, 1).toUpperCase()}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-body-md font-semibold text-on-surface">
          {user.name}
        </span>
        <span className="block truncate text-caption text-on-surface-variant">
          {user.role === 'SUPERADMIN' ? 'Superadmin' : 'Staff'}
        </span>
      </span>
    </a>
  );
}

function DesktopMenu({ pathname, user }: { pathname: string; user: AdminUser }) {
  const items =
    user.role === 'SUPERADMIN'
      ? [...operationalItems, { label: 'Status Sistem', icon: 'dns', href: '/sistem' }]
      : operationalItems;

  return (
    <Sidebar
      brand={<Brand subtitle="Operations Hub" />}
      footer={
        <div className="space-y-3">
          <UserSummary user={user} />
          <LogoutButton />
        </div>
      }
    >
      <p className="mb-2.5 px-3 text-label-md uppercase tracking-[0.08em] text-on-surface-variant">
        Menu utama
      </p>
      <nav aria-label="Navigasi operasi" className="space-y-1">
        {items.map((item) => {
          if (!item.href) {
            return (
              <button
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-body-md font-medium text-outline opacity-80"
                disabled
                key={item.label}
                title={`${item.label} tersedia pada ${item.phase}`}
                type="button"
              >
                <Icon name={item.icon} size="md" />
                <span className="flex-1">{item.label}</span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.04em]">
                  {item.phase}
                </span>
              </button>
            );
          }

          const isCurrent = isCurrentPath(pathname, item.href);
          return (
            <a
              aria-current={isCurrent ? 'page' : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-body-md font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary ${
                isCurrent
                  ? 'bg-secondary text-surface-lowest shadow-card'
                  : 'text-on-surface-variant hover:bg-surface-low hover:text-on-surface'
              }`}
              href={item.href}
              key={item.label}
            >
              <Icon name={item.icon} size="md" />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>
    </Sidebar>
  );
}

function MobileMenu({ pathname, user }: { pathname: string; user: AdminUser }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const items =
    user.role === 'SUPERADMIN'
      ? [...operationalItems, { label: 'Status Sistem', icon: 'dns', href: '/sistem' }]
      : operationalItems;

  function openMenu() {
    dialogRef.current?.showModal();
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());
  }

  return (
    <>
      <BottomTabBar
        ariaLabel="Navigasi admin"
        items={[
          {
            label: 'Dashboard',
            icon: 'dashboard',
            href: '/',
            active: isCurrentPath(pathname, '/'),
          },
          {
            label: 'Armada',
            icon: 'directions_car',
            href: '/armada',
            active: isCurrentPath(pathname, '/armada'),
          },
          {
            label: 'Booking',
            icon: 'calendar_month',
            href: '/booking',
            active: isCurrentPath(pathname, '/booking'),
          },
          {
            label: 'Verifikasi',
            icon: 'verified_user',
            href: '/verifikasi',
            active: isCurrentPath(pathname, '/verifikasi'),
          },
          { label: 'Menu', icon: 'more_horiz', onClick: openMenu },
        ]}
      />
      <dialog
        aria-labelledby="mobile-menu-title"
        className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-cta border border-surface-highest bg-surface-lowest p-0 text-on-surface shadow-card-hover backdrop:bg-on-surface/40 backdrop:backdrop-blur-xl"
        ref={dialogRef}
      >
        <div aria-hidden className="mx-auto mt-3 h-1 w-10 rounded-full bg-surface-highest" />
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-label-md uppercase tracking-[0.08em] text-secondary">
                Operations Hub
              </p>
              <h2 className="mt-1 text-headline-md" id="mobile-menu-title">
                Menu
              </h2>
            </div>
            <form method="dialog">
              <Button
                ref={closeButtonRef}
                aria-label="Tutup menu"
                icon="close"
                size="md"
                type="submit"
                variant="outline"
              >
                Tutup
              </Button>
            </form>
          </div>
          <div className="mt-5 space-y-3">
            <UserSummary user={user} />
            <nav aria-label="Menu lainnya" className="space-y-1">
              {items.map((item) => {
                if (!item.href) {
                  return (
                    <button
                      className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-body-md text-outline opacity-80"
                      disabled
                      key={item.label}
                      title={`${item.label} tersedia pada ${item.phase}`}
                      type="button"
                    >
                      <Icon name={item.icon} size="md" />
                      <span className="flex-1">{item.label}</span>
                      <span className="text-[10px] font-semibold uppercase">{item.phase}</span>
                    </button>
                  );
                }

                const isCurrent = isCurrentPath(pathname, item.href);
                return (
                  <a
                    aria-current={isCurrent ? 'page' : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-body-md font-semibold transition ${
                      isCurrent
                        ? 'bg-secondary text-surface-lowest'
                        : 'text-on-surface-variant hover:bg-surface-low hover:text-on-surface'
                    }`}
                    href={item.href}
                    key={item.label}
                  >
                    <Icon name={item.icon} size="md" />
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </nav>
            <LogoutButton />
          </div>
        </div>
      </dialog>
    </>
  );
}

export function AdminNavigation({ user }: AdminNavigationProps) {
  const pathname = usePathname();

  return (
    <>
      <DesktopMenu pathname={pathname} user={user} />
      <MobileMenu pathname={pathname} user={user} />
    </>
  );
}
