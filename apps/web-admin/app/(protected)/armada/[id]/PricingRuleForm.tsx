'use client';

import { useState, type FormEvent } from 'react';

import {
  ApiError,
  pricingRuleCreateSchema,
  type PricingRule,
  type PricingRuleCreate,
  type PricingRuleType,
} from '@fa/shared';
import { Button, Input, Segmented } from '@fa/ui';

import { addPricingRule } from '../../../../lib/browser-fleet';

const TYPES: ReadonlyArray<{ value: PricingRuleType; label: string }> = [
  { value: 'WEEKEND', label: 'Weekend' },
  { value: 'HOLIDAY', label: 'Libur nasional' },
  { value: 'HIGH_SEASON', label: 'Musim ramai' },
  { value: 'LONG_DURATION', label: 'Durasi panjang' },
];

interface PricingRuleFormProps {
  vehicleId: string;
  onCreated: (rule: PricingRule) => void;
}

export function PricingRuleForm({ vehicleId, onCreated }: PricingRuleFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<PricingRuleType>('WEEKEND');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [mode, setMode] = useState<'multiplier' | 'surcharge'>('multiplier');
  const [value, setValue] = useState('1.1');
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError(undefined);

    let payload: PricingRuleCreate;
    try {
      payload = pricingRuleCreateSchema.parse({
        name: name.trim(),
        type,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        multiplierBasisPoints: mode === 'multiplier' ? Math.round(Number(value) * 10_000) : null,
        fixedSurcharge: mode === 'surcharge' ? Math.round(Number(value)) : null,
      });
    } catch {
      setError('Periksa nama, tanggal, dan nilai. Isi salah satu: pengali atau tambahan tetap.');
      return;
    }

    setSaving(true);
    try {
      onCreated(await addPricingRule(vehicleId, payload));
      setName('');
      setStartDate('');
      setEndDate('');
    } catch (submitError) {
      setError(
        submitError instanceof ApiError ? submitError.message : 'Aturan harga belum dapat disimpan.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <p className="text-caption text-on-surface-variant">
        Aturan baru untuk unit ini. Hanya satu jenis penyesuaian yang boleh diisi.
      </p>
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
          label="Nama aturan"
          onChange={(event) => setName(event.target.value)}
          required
          value={name}
        />
        <label className="space-y-1.5">
          <span className="block text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
            Jenis
          </span>
          <select
            className="min-h-11 w-full rounded-lg border border-surface-highest bg-surface-low px-3 text-body-md text-on-surface outline-none focus:border-secondary focus:bg-surface-lowest focus:ring-2 focus:ring-secondary/20"
            onChange={(event) => setType(event.target.value as PricingRuleType)}
            value={type}
          >
            {TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Mulai"
          onChange={(event) => setStartDate(event.target.value)}
          required
          type="datetime-local"
          value={startDate}
        />
        <Input
          label="Selesai"
          onChange={(event) => setEndDate(event.target.value)}
          required
          type="datetime-local"
          value={endDate}
        />
      </div>

      <Segmented
        ariaLabel="Jenis penyesuaian harga"
        onChange={(next) => {
          setMode(next);
          setValue(next === 'multiplier' ? '1.1' : '0');
        }}
        options={[
          { value: 'multiplier', label: 'Pengali' },
          { value: 'surcharge', label: 'Tambahan tetap' },
        ]}
        value={mode}
      />

      <Input
        hint={
          mode === 'multiplier'
            ? 'Contoh 1.1 = harga naik 10%. Rentang 1.0–10.0.'
            : 'Nominal rupiah tetap yang ditambahkan.'
        }
        inputMode="decimal"
        label={mode === 'multiplier' ? 'Pengali' : 'Tambahan (Rp)'}
        onChange={(event) => setValue(event.target.value)}
        required
        type="number"
        value={value}
      />

      <Button loading={saving} type="submit" variant="secondary">
        Tambah aturan harga
      </Button>
    </form>
  );
}