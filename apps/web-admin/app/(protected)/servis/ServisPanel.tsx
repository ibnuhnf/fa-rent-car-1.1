'use client';

import {
  formatDateTimeWib,
  formatRupiah,
  type MaintenanceDto,
  type VehicleDocumentsResponse,
} from '@fa/shared';
import { Badge, Button, Card, EmptyState, Input } from '@fa/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createMaintenance } from '../../../lib/browser-operations';

export interface VehicleOption {
  id: string;
  brand: string;
  model: string;
  variant: string;
  plate: string;
  mileage: number;
  status: string;
}

interface ServisPanelProps {
  vehicles: VehicleOption[];
  selectedVehicleId: string;
  maintenances: MaintenanceDto[];
  documents: VehicleDocumentsResponse['documents'];
  superadmin: boolean;
}

export function ServisPanel({
  vehicles,
  selectedVehicleId,
  maintenances: initialMaintenances,
  superadmin,
}: ServisPanelProps) {
  const router = useRouter();
  const [vehicleId, setVehicleId] = useState(selectedVehicleId);
  const [maintenances, setMaintenances] = useState<MaintenanceDto[]>(initialMaintenances);

  // Form state
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().slice(0, 16));
  const [odometer, setOdometer] = useState('');
  const [cost, setCost] = useState('');
  const [description, setDescription] = useState('');
  const [nextServiceDate, setNextServiceDate] = useState('');
  const [nextOdometer, setNextOdometer] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);

  const handleVehicleChange = (newId: string) => {
    setVehicleId(newId);
    setError(null);
    setNotice(null);
    router.push(`/servis?vehicleId=${newId}`);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId) {
      setError('Pilih armada terlebih dahulu.');
      return;
    }
    const parsedOdo = Number(odometer);
    const parsedCost = Number(cost);
    if (!odometer || isNaN(parsedOdo) || parsedOdo < 0) {
      setError('Masukkan angka odometer yang valid.');
      return;
    }
    if (!cost || isNaN(parsedCost) || parsedCost < 0) {
      setError('Masukkan biaya servis yang valid.');
      return;
    }
    if (!description.trim()) {
      setError('Keterangan perawatan wajib diisi.');
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const created = await createMaintenance(vehicleId, {
        serviceDate: new Date(serviceDate).toISOString(),
        odometer: parsedOdo,
        cost: parsedCost,
        description: description.trim(),
        nextServiceDate: nextServiceDate ? new Date(nextServiceDate).toISOString() : undefined,
        nextOdometer: nextOdometer ? Number(nextOdometer) : undefined,
      });

      setMaintenances((prev) => [created, ...prev]);
      setDescription('');
      setCost('');
      setOdometer('');
      setNextServiceDate('');
      setNextOdometer('');
      setNotice('Catatan servis berhasil ditambahkan.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mencatat servis.');
    } finally {
      setSaving(false);
    }
  };

  const totalCost = maintenances.reduce((acc, m) => acc + m.cost, 0);

  return (
    <div className="space-y-6">
      {/* Pemilih Armada */}
      <Card padding="md">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <label htmlFor="vehicle-select" className="block text-label-md font-semibold text-on-surface">
              Pilih Armada Kendaraan
            </label>
            <p className="text-caption text-on-surface-variant">
              Lihat riwayat perawatan dan pengingat servis per armada.
            </p>
          </div>
          <select
            id="vehicle-select"
            className="rounded-button border border-surface-highest bg-surface-low px-4 py-2.5 text-body-md font-medium text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            value={vehicleId}
            onChange={(e) => handleVehicleChange(e.target.value)}
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.brand} {v.model} ({v.plate}) — Odo: {v.mileage.toLocaleString('id-ID')} km
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Ringkasan Armada Terpilih */}
      {selectedVehicle ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card padding="md">
            <span className="text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
              Unit Armada
            </span>
            <p className="mt-2 font-display text-title font-bold text-on-surface">
              {selectedVehicle.brand} {selectedVehicle.model} {selectedVehicle.variant}
            </p>
            <span className="font-mono text-body-sm text-secondary font-semibold">
              {selectedVehicle.plate}
            </span>
          </Card>
          <Card padding="md">
            <span className="text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
              Odometer Terakhir
            </span>
            <p className="mt-2 tabular-nums font-display text-headline-md font-bold text-on-surface">
              {selectedVehicle.mileage.toLocaleString('id-ID')} km
            </p>
            <span className="text-caption text-on-surface-variant">
              Status: <Badge tone={selectedVehicle.status === 'AVAILABLE' ? 'success' : 'neutral'}>{selectedVehicle.status}</Badge>
            </span>
          </Card>
          <Card padding="md">
            <span className="text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
              Total Biaya Servis
            </span>
            <p className="mt-2 tabular-nums font-display text-headline-md font-bold text-secondary">
              {formatRupiah(totalCost)}
            </p>
            <span className="text-caption text-on-surface-variant">
              {maintenances.length} catatan servis
            </span>
          </Card>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-error bg-error-container p-4 text-body-md text-on-error-container">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-xl border border-secondary bg-surface-low p-4 text-body-md text-secondary">
          {notice}
        </div>
      ) : null}

      {/* Form Tambah Catatan Servis */}
      {superadmin && selectedVehicle ? (
        <Card padding="md">
          <h2 className="font-display text-title text-on-surface">Tambah Catatan Servis Baru</h2>
          <p className="mt-1 text-caption text-on-surface-variant">
            Pencatatan ganti oli, servis berkala, tune-up, penggantian spare part, dll.
          </p>

          <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-label-md font-semibold text-on-surface mb-1">
                Tanggal &amp; Waktu Servis
              </label>
              <input
                type="datetime-local"
                className="w-full rounded-button border border-surface-highest bg-surface-low px-3 py-2 text-body-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                required
              />
            </div>

            <Input
              label="Odometer Saat Servis (km)"
              type="number"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              placeholder={`Contoh: ${selectedVehicle.mileage}`}
              required
            />

            <Input
              label="Biaya Servis (Rp)"
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="Contoh: 450000"
              required
            />

            <Input
              label="Odometer Servis Berikutnya (Opsional)"
              type="number"
              value={nextOdometer}
              onChange={(e) => setNextOdometer(e.target.value)}
              placeholder="Contoh: 10000 km lagi"
            />

            <div>
              <label className="block text-label-md font-semibold text-on-surface mb-1">
                Jadwal Servis Berikutnya (Opsional)
              </label>
              <input
                type="datetime-local"
                className="w-full rounded-button border border-surface-highest bg-surface-low px-3 py-2 text-body-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                value={nextServiceDate}
                onChange={(e) => setNextServiceDate(e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <Input
                label="Keterangan & Rincian Perawatan"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contoh: Ganti oli mesin Shell Helix 10W-40, filter oli, kuras air radiator"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <Button type="submit" variant="secondary" loading={saving}>
                Simpan Catatan Servis
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {/* Daftar Riwayat Servis */}
      <Card padding="none">
        <div className="border-b border-surface-highest p-4 sm:p-6">
          <h2 className="font-display text-title text-on-surface">Riwayat Perawatan Kendaraan</h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            Daftar seluruh riwayat servis berkala dan perbaikan untuk armada terpilih.
          </p>
        </div>

        <div className="overflow-x-auto">
          {maintenances.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant">
              <EmptyState
                title="Belum ada riwayat servis"
                description="Armada ini belum memiliki catatan perawatan berkala."
                icon="build"
              />
            </div>
          ) : (
            <table className="w-full text-left text-body-md">
              <thead className="border-b border-surface-highest bg-surface-low text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
                <tr>
                  <th className="px-4 py-3">Tanggal Servis</th>
                  <th className="px-4 py-3">Odometer</th>
                  <th className="px-4 py-3">Keterangan Perawatan</th>
                  <th className="px-4 py-3">Servis Berikutnya</th>
                  <th className="px-4 py-3 text-right">Biaya</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-highest">
                {maintenances.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-low">
                    <td className="whitespace-nowrap px-4 py-3 text-on-surface-variant">
                      {formatDateTimeWib(m.serviceDate)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums font-mono text-on-surface">
                      {m.odometer.toLocaleString('id-ID')} km
                    </td>
                    <td className="px-4 py-3 font-medium text-on-surface">{m.description}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-caption text-on-surface-variant">
                      {m.nextServiceDate ? (
                        <span>{formatDateTimeWib(m.nextServiceDate)}</span>
                      ) : null}
                      {m.nextOdometer ? (
                        <span className="block font-mono">
                          pada {m.nextOdometer.toLocaleString('id-ID')} km
                        </span>
                      ) : null}
                      {!m.nextServiceDate && !m.nextOdometer ? '-' : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-semibold text-secondary">
                      {formatRupiah(m.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
