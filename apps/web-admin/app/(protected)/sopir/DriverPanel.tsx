'use client';

import { formatRupiah, type DriverDto } from '@fa/shared';
import { Badge, Button, Card, Input } from '@fa/ui';
import { useState } from 'react';
import { createDriver, updateDriver } from '../../../lib/browser-operations';

interface DriverPanelProps {
  initialDrivers: DriverDto[];
  superadmin: boolean;
}

export function DriverPanel({ initialDrivers, superadmin }: DriverPanelProps) {
  const [drivers, setDrivers] = useState<DriverDto[]>(initialDrivers);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [simNumber, setSimNumber] = useState('');
  const [dailyRate, setDailyRate] = useState('150000');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !simNumber.trim()) {
      setError('Lengkapi nama, nomor telepon, dan nomor SIM.');
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const created = await createDriver({
        name: name.trim(),
        phone: phone.trim(),
        simNumber: simNumber.trim(),
        dailyRate: Number(dailyRate) || 150000,
        notes: notes.trim() || undefined,
      });

      setDrivers((prev) => [created, ...prev]);
      setName('');
      setPhone('');
      setSimNumber('');
      setNotes('');
      setNotice(`Sopir ${created.name} berhasil ditambahkan.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambahkan sopir.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (driver: DriverDto) => {
    try {
      const updated = await updateDriver(driver.id, { isActive: !driver.isActive });
      setDrivers((prev) => prev.map((d) => (d.id === driver.id ? updated : d)));
      setNotice(`Status ${driver.name} diperbarui.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui status.');
    }
  };

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-lg bg-error-container p-3 text-body-md text-on-error-container">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-lg bg-success-container p-3 text-body-md text-on-success-container">
          {notice}
        </div>
      ) : null}

      {/* Tabel Sopir */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-body-sm">
            <thead className="border-b border-surface-highest bg-surface-low text-label-md text-on-surface-variant">
              <tr>
                <th className="px-4 py-3">Nama Sopir</th>
                <th className="px-4 py-3">No. Telepon / WA</th>
                <th className="px-4 py-3">Nomor SIM A</th>
                <th className="px-4 py-3">Tarif / Hari</th>
                <th className="px-4 py-3">Status</th>
                {superadmin ? <th className="px-4 py-3">Aksi</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-highest">
              {drivers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-on-surface-variant">
                    Belum ada data sopir.
                  </td>
                </tr>
              ) : (
                drivers.map((d) => (
                  <tr key={d.id} className="hover:bg-surface-low">
                    <td className="px-4 py-3 font-semibold text-on-surface">
                      <a className="hover:text-secondary hover:underline" href={`/sopir/${d.id}`}>
                        {d.name}
                      </a>
                    </td>
                    <td className="px-4 py-3 font-mono text-on-surface-variant">{d.phone}</td>
                    <td className="px-4 py-3 font-mono text-on-surface-variant">{d.simNumber}</td>
                    <td className="px-4 py-3 tabular-nums font-semibold text-secondary">
                      {formatRupiah(d.dailyRate)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={d.isActive ? 'success' : 'neutral'}>
                        {d.isActive ? 'Tersedia' : 'Nonaktif'}
                      </Badge>
                    </td>
                    {superadmin ? (
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(d)}
                        >
                          {d.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Form Tambah Sopir (Superadmin) */}
      {superadmin ? (
        <Card padding="md">
          <h2 className="text-title font-bold text-on-surface">Tambah Sopir Baru</h2>
          <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Nama Lengkap"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Budi Santoso"
              required
            />
            <Input
              label="Nomor WhatsApp"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="081234567890"
              required
            />
            <Input
              label="Nomor SIM A"
              value={simNumber}
              onChange={(e) => setSimNumber(e.target.value)}
              placeholder="1234-5678-9012"
              required
            />
            <Input
              label="Tarif Harian (Rp)"
              type="number"
              value={dailyRate}
              onChange={(e) => setDailyRate(e.target.value)}
              required
            />
            <div className="sm:col-span-2">
              <Input
                label="Catatan / Pengalaman (Opsional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Pengalaman rute luar kota, bahasa, dll."
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" variant="secondary" loading={saving}>
                Simpan Data Sopir
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
