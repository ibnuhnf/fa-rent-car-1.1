'use client';

import { useState, type FormEvent } from 'react';

import { useRouter } from 'next/navigation';

import {
  ApiError,
  vehicleCreateSchema,
  type VehicleCategory,
  type VehicleCreate,
  type VehicleFuelType,
  type VehicleTransmission,
} from '@fa/shared';
import { Button, Card, Input } from '@fa/ui';

import { createVehicle } from '../../../../lib/browser-fleet';

const CATEGORIES: ReadonlyArray<VehicleCategory> = ['MPV', 'SUV', 'CITY_CAR', 'SEDAN', 'VAN'];
const TRANSMISSIONS: ReadonlyArray<VehicleTransmission> = ['MANUAL', 'AUTOMATIC'];
const FUEL_TYPES: ReadonlyArray<VehicleFuelType> = ['GASOLINE', 'DIESEL', 'HYBRID', 'ELECTRIC'];

interface FormState {
  brand: string;
  model: string;
  variant: string;
  year: string;
  plate: string;
  color: string;
  transmission: VehicleTransmission;
  category: VehicleCategory;
  fuelType: VehicleFuelType;
  capacity: string;
  luggageCount: string;
  mileage: string;
  facilities: string;
  description: string;
}

const initialState: FormState = {
  brand: '',
  model: '',
  variant: '',
  year: '2024',
  plate: '',
  color: '',
  transmission: 'AUTOMATIC',
  category: 'MPV',
  fuelType: 'GASOLINE',
  capacity: '7',
  luggageCount: '2',
  mileage: '0',
  facilities: '',
  description: '',
};

function toPayload(state: FormState): VehicleCreate {
  return vehicleCreateSchema.parse({
    brand: state.brand.trim(),
    model: state.model.trim(),
    variant: state.variant.trim(),
    year: Number(state.year),
    plate: state.plate.trim(),
    color: state.color.trim(),
    transmission: state.transmission,
    category: state.category,
    fuelType: state.fuelType,
    capacity: Number(state.capacity),
    luggageCount: Number(state.luggageCount),
    mileage: Number(state.mileage),
    facilities: state.facilities
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    description: state.description.trim(),
  });
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'PLATE_TAKEN') return 'Plat nomor sudah terdaftar.';
    return error.message;
  }
  return 'Armada belum dapat disimpan. Periksa isian lalu coba lagi.';
}

export function VehicleCreateForm() {
  const router = useRouter();
  const [state, setState] = useState<FormState>(initialState);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError(undefined);

    let payload: VehicleCreate;
    try {
      payload = toPayload(state);
    } catch {
      setError('Periksa kembali isian: tahun, plat, kapasitas, dan fasilitas wajib valid.');
      return;
    }

    setSaving(true);
    try {
      const created = await createVehicle(payload);
      router.push(`/armada/${created.id}`);
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card padding="md">
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error ? (
          <p
            className="rounded-lg bg-error-container px-3 py-2.5 text-body-md font-medium text-on-error-container"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Merek"
            onChange={(event) => update('brand', event.target.value)}
            required
            value={state.brand}
          />
          <Input
            label="Model"
            onChange={(event) => update('model', event.target.value)}
            required
            value={state.model}
          />
          <Input
            label="Varian"
            onChange={(event) => update('variant', event.target.value)}
            value={state.variant}
          />
          <Input
            inputMode="numeric"
            label="Tahun"
            onChange={(event) => update('year', event.target.value)}
            required
            type="number"
            value={state.year}
          />
          <Input
            label="Plat nomor"
            onChange={(event) => update('plate', event.target.value.toUpperCase())}
            required
            value={state.plate}
          />
          <Input
            label="Warna"
            onChange={(event) => update('color', event.target.value)}
            required
            value={state.color}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-1.5">
            <span className="block text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
              Transmisi
            </span>
            <select
              className="min-h-11 w-full rounded-lg border border-surface-highest bg-surface-low px-3 text-body-md text-on-surface outline-none focus:border-secondary focus:bg-surface-lowest focus:ring-2 focus:ring-secondary/20"
              onChange={(event) => update('transmission', event.target.value as VehicleTransmission)}
              value={state.transmission}
            >
              {TRANSMISSIONS.map((value) => (
                <option key={value} value={value}>
                  {value === 'AUTOMATIC' ? 'Matic' : 'Manual'}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="block text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
              Kategori
            </span>
            <select
              className="min-h-11 w-full rounded-lg border border-surface-highest bg-surface-low px-3 text-body-md text-on-surface outline-none focus:border-secondary focus:bg-surface-lowest focus:ring-2 focus:ring-secondary/20"
              onChange={(event) => update('category', event.target.value as VehicleCategory)}
              value={state.category}
            >
              {CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {value.replace('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="block text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
              Bahan bakar
            </span>
            <select
              className="min-h-11 w-full rounded-lg border border-surface-highest bg-surface-low px-3 text-body-md text-on-surface outline-none focus:border-secondary focus:bg-surface-lowest focus:ring-2 focus:ring-secondary/20"
              onChange={(event) => update('fuelType', event.target.value as VehicleFuelType)}
              value={state.fuelType}
            >
              {FUEL_TYPES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            inputMode="numeric"
            label="Kapasitas kursi"
            onChange={(event) => update('capacity', event.target.value)}
            required
            type="number"
            value={state.capacity}
          />
          <Input
            inputMode="numeric"
            label="Jumlah koper"
            onChange={(event) => update('luggageCount', event.target.value)}
            required
            type="number"
            value={state.luggageCount}
          />
          <Input
            inputMode="numeric"
            label="Odometer (km)"
            onChange={(event) => update('mileage', event.target.value)}
            required
            type="number"
            value={state.mileage}
          />
        </div>

        <Input
          hint="Pisahkan dengan koma, mis. AC, Audio, GPS"
          label="Fasilitas"
          onChange={(event) => update('facilities', event.target.value)}
          value={state.facilities}
        />

        <div className="space-y-1.5">
          <label
            className="block text-label-md uppercase tracking-[0.06em] text-on-surface-variant"
            htmlFor="vehicle-description"
          >
            Deskripsi
          </label>
          <textarea
            className="min-h-28 w-full rounded-lg border border-surface-highest bg-surface-low px-3 py-2 text-body-md text-on-surface outline-none focus:border-secondary focus:bg-surface-lowest focus:ring-2 focus:ring-secondary/20"
            id="vehicle-description"
            onChange={(event) => update('description', event.target.value)}
            value={state.description}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button loading={saving} type="submit" variant="secondary">
            Simpan armada
          </Button>
          <Button onClick={() => router.push('/armada')} variant="outline">
            Batal
          </Button>
        </div>
      </form>
    </Card>
  );
}