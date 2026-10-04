'use client';

import { useState, type FormEvent } from 'react';

import { useRouter } from 'next/navigation';

import {
  ApiError,
  formatRupiah,
  vehicleRateSchema,
  type AdminVehicleDetail,
  type VehicleRate,
  type VehicleUpdate,
} from '@fa/shared';
import { Badge, Button, ButtonLink, Card, Input } from '@fa/ui';

import {
  deleteVehicle,
  deleteVehiclePhoto,
  getVehicleDetail,
  setVehicleRate,
  stageVehiclePhotos,
  updateVehicle,
  uploadToSignedUrl,
} from '../../../../lib/browser-fleet';
import { vehicleName, vehicleStatusMeta } from '../../../../lib/foundation';
import { PricingRuleForm } from './PricingRuleForm';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

interface VehicleDetailViewProps {
  initialVehicle: AdminVehicleDetail;
  superadmin: boolean;
}

function rateToInputs(rate: VehicleRate | null) {
  return {
    daily: rate ? String(rate.daily) : '',
    weekly: rate?.weekly != null ? String(rate.weekly) : '',
    monthly: rate?.monthly != null ? String(rate.monthly) : '',
    driverPerDay: rate?.driverPerDay != null ? String(rate.driverPerDay) : '',
    overtimeHourly: rate?.overtimeHourly != null ? String(rate.overtimeHourly) : '',
    latePerDay: rate?.latePerDay != null ? String(rate.latePerDay) : '',
  };
}

type RateInputs = ReturnType<typeof rateToInputs>;

function nullableInt(value: string): number | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : Number(trimmed);
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.code === 'PLATE_TAKEN') return 'Plat nomor sudah terdaftar.';
    return error.message;
  }
  return fallback;
}

export function VehicleDetailView({ initialVehicle, superadmin }: VehicleDetailViewProps) {
  const router = useRouter();
  const [vehicle, setVehicle] = useState(initialVehicle);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingRate, setSavingRate] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [rateInputs, setRateInputs] = useState<RateInputs>(() => rateToInputs(vehicle.rate));

  const statusMeta = vehicleStatusMeta[vehicle.status];

  async function toggleStatus() {
    if (savingStatus) return;
    setError(undefined);
    setSavingStatus(true);
    try {
      const nextStatus: VehicleUpdate['status'] =
        vehicle.status === 'AVAILABLE' ? 'MAINTENANCE' : 'AVAILABLE';
      const updated = await updateVehicle(vehicle.id, { status: nextStatus });
      setVehicle(updated);
      setNotice(nextStatus === 'AVAILABLE' ? 'Unit ditandai siap sewa.' : 'Unit ditandai perawatan.');
    } catch (submitError) {
      setError(errorMessage(submitError, 'Status belum dapat diubah.'));
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleRateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRate) return;
    setError(undefined);
    setNotice(undefined);

    let rate: VehicleRate;
    try {
      rate = vehicleRateSchema.parse({
        daily: Number(rateInputs.daily),
        weekly: nullableInt(rateInputs.weekly),
        monthly: nullableInt(rateInputs.monthly),
        driverPerDay: nullableInt(rateInputs.driverPerDay),
        overtimeHourly: nullableInt(rateInputs.overtimeHourly),
        latePerDay: nullableInt(rateInputs.latePerDay),
      });
    } catch {
      setError('Tarif harian wajib diisi; tarif lain boleh kosong.');
      return;
    }

    setSavingRate(true);
    try {
      const updated = await setVehicleRate(vehicle.id, rate);
      setVehicle(updated);
      setNotice('Tarif tersimpan.');
    } catch (submitError) {
      setError(errorMessage(submitError, 'Tarif belum dapat disimpan.'));
    } finally {
      setSavingRate(false);
    }
  }

  async function handlePhotoUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(undefined);
    setNotice(undefined);

    const selected = Array.from(files).slice(0, 10);
    const invalid = selected.find(
      (file) =>
        !['image/jpeg', 'image/png'].includes(file.type) || file.size > MAX_PHOTO_BYTES,
    );
    if (invalid) {
      setError('Hanya JPEG/PNG maksimal 5 MB per foto.');
      return;
    }

    setUploading(true);
    try {
      const { uploads } = await stageVehiclePhotos(vehicle.id, {
        files: selected.map((file) => ({
          contentType: file.type as 'image/jpeg' | 'image/png',
          byteLength: file.size,
        })),
      });
      await Promise.all(
        uploads.map((upload, index) => uploadToSignedUrl(upload.url, selected[index] as File)),
      );
      setVehicle(await getVehicleDetail(vehicle.id));
      setNotice(`${uploads.length} foto diunggah.`);
    } catch (uploadError) {
      setError(errorMessage(uploadError, 'Foto belum dapat diunggah.'));
    } finally {
      setUploading(false);
    }
  }

  async function handlePhotoDelete(photoId: string) {
    setError(undefined);
    setNotice(undefined);
    try {
      await deleteVehiclePhoto(vehicle.id, photoId);
      setVehicle((current) => ({
        ...current,
        photos: current.photos.filter((photo) => photo.id !== photoId),
        photoCount: Math.max(0, current.photoCount - 1),
      }));
      setNotice('Foto dihapus.');
    } catch (submitError) {
      setError(errorMessage(submitError, 'Foto belum dapat dihapus.'));
    }
  }

  async function handleDelete() {
    if (!window.confirm('Nonaktifkan unit ini? Data tetap tersimpan sebagai arsip.')) return;
    setError(undefined);
    try {
      await deleteVehicle(vehicle.id);
      router.push('/armada');
    } catch (submitError) {
      setError(errorMessage(submitError, 'Armada belum dapat dinonaktifkan.'));
    }
  }

  const rateFields: ReadonlyArray<{ key: keyof RateInputs; label: string; required?: boolean }> = [
    { key: 'daily', label: 'Harian', required: true },
    { key: 'weekly', label: 'Mingguan' },
    { key: 'monthly', label: 'Bulanan' },
    { key: 'driverPerDay', label: 'Sopir / hari' },
    { key: 'overtimeHourly', label: 'Lembur / jam' },
    { key: 'latePerDay', label: 'Keterlambatan / hari' },
  ];

  return (
    <div className="space-y-6 lg:space-y-8">
      <section>
        <a className="text-caption font-semibold text-secondary hover:underline" href="/armada">
          ← Kembali ke Manajemen Armada
        </a>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-headline-lg-mobile tracking-[-0.02em] text-on-surface sm:text-headline-lg">
            {vehicleName(vehicle)}
          </h1>
          <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
          {vehicle.isDemo ? <Badge tone="warning">Data contoh</Badge> : null}
        </div>
        <p className="mt-2 text-body-md text-on-surface-variant">
          {vehicle.variant || `${vehicle.year} · ${vehicle.category.replace('_', ' ')}`} ·{' '}
          <span className="font-mono">{vehicle.plate}</span>
        </p>
      </section>

      {error ? (
        <p
          className="rounded-lg bg-error-container px-3 py-2.5 text-body-md font-medium text-on-error-container"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-lg bg-success-container px-3 py-2.5 text-body-md font-medium text-on-success-container">
          {notice}
        </p>
      ) : null}

      <Card padding="md">
        <h2 className="text-title text-on-surface">Status & operasional</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
              Tarif harian
            </dt>
            <dd className="mt-1 tabular-nums text-body-lg font-semibold text-secondary">
              {vehicle.dailyRate === null ? 'Belum ditentukan' : formatRupiah(vehicle.dailyRate)}
            </dd>
          </div>
          <div>
            <dt className="text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
              Odometer
            </dt>
            <dd className="mt-1 tabular-nums text-body-lg text-on-surface">
              {vehicle.mileage.toLocaleString('id-ID')} km
            </dd>
          </div>
          <div>
            <dt className="text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
              Foto
            </dt>
            <dd className="mt-1 tabular-nums text-body-lg text-on-surface">{vehicle.photoCount}</dd>
          </div>
        </dl>
        {superadmin ? (
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              loading={savingStatus}
              onClick={toggleStatus}
              variant={vehicle.status === 'AVAILABLE' ? 'outline' : 'secondary'}
            >
              {vehicle.status === 'AVAILABLE' ? 'Tandai perawatan' : 'Tandai siap sewa'}
            </Button>
            <Button onClick={handleDelete} variant="destructive">
              Nonaktifkan unit
            </Button>
          </div>
        ) : (
          <p className="mt-5 text-caption text-on-surface-variant">
            Perubahan status dan penghapusan hanya untuk superadmin.
          </p>
        )}
      </Card>

      <Card padding="md">
        <h2 className="text-title text-on-surface">Tarif</h2>
        <p className="mt-1 text-caption text-on-surface-variant">
          Tarif harian wajib. Tarif lain kosongkan bila tidak berlaku.
        </p>
        <form className="mt-4 space-y-4" onSubmit={handleRateSubmit}>
          <div className="grid gap-4 sm:grid-cols-3">
            {rateFields.map((field) => (
              <Input
                key={field.key}
                disabled={!superadmin}
                inputMode="numeric"
                label={field.label}
                onChange={(event) =>
                  setRateInputs((current) => ({ ...current, [field.key]: event.target.value }))
                }
                required={field.required}
                type="number"
                value={rateInputs[field.key]}
              />
            ))}
          </div>
          {superadmin ? (
            <Button loading={savingRate} type="submit" variant="secondary">
              Simpan tarif
            </Button>
          ) : (
            <p className="text-caption text-on-surface-variant">
              Penyuntingan tarif hanya untuk superadmin.
            </p>
          )}
        </form>
      </Card>

      <Card padding="md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-title text-on-surface">Galeri foto</h2>
          {superadmin ? (
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-button border border-surface-highest bg-surface-lowest px-5 text-sm font-semibold text-on-surface hover:bg-surface-low">
              {uploading ? 'Mengunggah…' : 'Tambah foto'}
              <input
                accept="image/jpeg,image/png"
                className="sr-only"
                disabled={uploading}
                multiple
                onChange={(event) => handlePhotoUpload(event.target.files)}
                type="file"
              />
            </label>
          ) : null}
        </div>
        {vehicle.photos.length === 0 ? (
          <p className="mt-4 text-body-md text-on-surface-variant">Belum ada foto.</p>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {vehicle.photos.map((photo) => (
              <li className="space-y-2" key={photo.id}>
                <div className="aspect-4/3 overflow-hidden rounded-card bg-surface-low">
                  {photo.url ? (
                    <img
                      alt={`Foto ${vehicleName(vehicle)}`}
                      className="size-full object-cover"
                      src={photo.url}
                    />
                  ) : null}
                </div>
                {superadmin ? (
                  <Button
                    onClick={() => handlePhotoDelete(photo.id)}
                    size="sm"
                    variant="outline"
                  >
                    Hapus
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card padding="md">
        <h2 className="text-title text-on-surface">Aturan harga</h2>
        {vehicle.pricingRules.length === 0 ? (
          <p className="mt-2 text-body-md text-on-surface-variant">
            Belum ada aturan harga khusus (weekend/libur/musim).
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {vehicle.pricingRules.map((rule) => (
              <li
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-low px-3 py-2 text-body-md"
                key={rule.id}
              >
                <span className="font-semibold text-on-surface">{rule.name}</span>
                <span className="text-caption text-on-surface-variant">
                  {rule.multiplierBasisPoints != null
                    ? `×${(rule.multiplierBasisPoints / 10_000).toFixed(2)}`
                    : formatRupiah(rule.fixedSurcharge ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {superadmin ? (
          <div className="mt-5 border-t border-surface-highest pt-5">
            <PricingRuleForm
              onCreated={(rule) =>
                setVehicle((current) => ({
                  ...current,
                  pricingRules: [...current.pricingRules, rule],
                }))
              }
              vehicleId={vehicle.id}
            />
          </div>
        ) : null}
      </Card>

      <div>
        <ButtonLink href="/armada" variant="outline">
          Kembali ke daftar
        </ButtonLink>
      </div>
    </div>
  );
}