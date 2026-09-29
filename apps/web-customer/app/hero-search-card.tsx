'use client';

import { useState } from 'react';

import { Button, Icon, Segmented } from '@fa/ui';

const WHATSAPP_NUMBER = '6285224484488';

const START_VALUE = '15 Agu 2026, 09:00 WIB';
const END_VALUE = '18 Agu 2026, 09:00 WIB';
const LOCATION_VALUE = 'Kantor FA RENT CAR, Kedawung';
const AVAILABLE_UNITS = 18;

type ServiceMode = 'lepas-kunci' | 'dengan-sopir';

function buildWhatsappUrl(mode: ServiceMode) {
  const serviceLabel = mode === 'dengan-sopir' ? 'Dengan Sopir (+Rp 200.000/hari)' : 'Lepas Kunci';
  const message = [
    'Halo FA RENT CAR, saya ingin menyewa mobil.',
    `Layanan: ${serviceLabel}`,
    `Mulai: ${START_VALUE}`,
    `Selesai: ${END_VALUE}`,
    `Lokasi: ${LOCATION_VALUE}`,
  ].join('\n');

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function ReadonlyField({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col justify-end gap-2">
      <span className="flex items-center gap-1.5 text-label-md font-semibold uppercase tracking-[0.06em] text-on-surface-variant">
        <Icon className="text-secondary" name={icon} size="sm" />
        {label}
      </span>
      <div className="flex h-12 w-full items-center rounded-lg border border-surface-highest bg-surface-low px-4 text-body-md font-medium text-on-surface">
        {value}
      </div>
    </div>
  );
}

export function HeroSearchCard() {
  const [mode, setMode] = useState<ServiceMode>('lepas-kunci');

  return (
    <div className="relative z-10 w-full max-w-[1040px] rounded-cta border border-surface-highest bg-surface-lowest p-6 shadow-card-hover -mb-24">
      <div className="flex flex-col justify-between gap-4 border-b border-surface-highest pb-4 sm:flex-row sm:items-center">
        <Segmented<ServiceMode>
          ariaLabel="Pilih jenis layanan sewa"
          className="w-full sm:w-auto"
          onChange={setMode}
          options={[
            { value: 'lepas-kunci', label: <span className="font-semibold">Lepas Kunci</span> },
            {
              value: 'dengan-sopir',
              label: (
                <span className="flex items-center justify-center gap-1.5">
                  <span>Dengan Sopir</span>
                  <span className="rounded-full bg-secondary-fixed px-2 py-0.5 text-label-md text-on-secondary-fixed-variant">
                    +Rp 200.000/hari
                  </span>
                </span>
              ),
            },
          ]}
          value={mode}
        />
        <p className="flex items-center gap-2 text-label-md text-on-surface-variant">
          <Icon className="text-secondary" name="verified" size="sm" />
          Tarif sudah termasuk pajak, tanpa biaya tersembunyi
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 items-end gap-5 md:grid-cols-3">
        <ReadonlyField icon="calendar_today" label="Tanggal & Jam Mulai" value={START_VALUE} />
        <ReadonlyField icon="event_available" label="Tanggal & Jam Selesai" value={END_VALUE} />
        <ReadonlyField icon="location_on" label="Lokasi Pengambilan" value={LOCATION_VALUE} />
      </div>

      <Button
        className="mt-6 w-full"
        icon="search"
        size="lg"
        variant="secondary"
        onClick={() => window.open(buildWhatsappUrl(mode), '_blank', 'noopener,noreferrer')}
      >
        Cari Mobil Tersedia ({AVAILABLE_UNITS} Unit)
      </Button>
    </div>
  );
}
