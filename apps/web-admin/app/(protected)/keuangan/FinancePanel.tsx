'use client';

import {
  formatDateTimeWib,
  formatRupiah,
  type ExpenseCategory,
  type ExpenseDto,
  type ExpenseListResponse,
} from '@fa/shared';
import { Badge, Button, Card, Input } from '@fa/ui';
import { useState } from 'react';
import { createExpense } from '../../../lib/browser-operations';

interface FinancePanelProps {
  initialData: ExpenseListResponse;
  superadmin: boolean;
}

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  FUEL: 'BBM',
  MAINTENANCE: 'Servis / Perawatan',
  CLEANING: 'Cuci & Salon Mobil',
  SALARY: 'Gaji / Uang Jalan',
  OFFICE: 'Operasional Kantor',
  PARKING_TOLL: 'Parkir & Tol',
  OTHER: 'Lain-lain',
};

export function FinancePanel({ initialData, superadmin: _ }: FinancePanelProps) {
  const [data, setData] = useState<ExpenseListResponse>(initialData);

  // Form expense
  const [category, setCategory] = useState<ExpenseCategory>('FUEL');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 16));
  const [description, setDescription] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Masukkan nominal pengeluaran yang valid.');
      return;
    }
    if (!description.trim()) {
      setError('Deskripsi pengeluaran wajib diisi.');
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const created = await createExpense({
        category,
        amount: parsedAmount,
        expenseDate: new Date(expenseDate).toISOString(),
        description: description.trim(),
      });

      setData((prev) => ({
        ...prev,
        expenses: [created, ...prev.expenses],
        totalAmount: prev.totalAmount + created.amount,
      }));
      setAmount('');
      setDescription('');
      setNotice('Pengeluaran berhasil dicatat.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mencatat pengeluaran.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stat Card Total Pengeluaran */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card padding="md">
          <span className="text-caption font-semibold uppercase tracking-wider text-on-surface-variant">
            Total Pengeluaran Tercatat
          </span>
          <p className="mt-2 tabular-nums text-headline-lg font-bold text-secondary">
            {formatRupiah(data.totalAmount)}
          </p>
          <span className="text-caption text-on-surface-variant">
            Dari {data.pagination.total} transaksi pengeluaran
          </span>
        </Card>
      </div>

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

      {/* Form Tambah Pengeluaran */}
      <Card padding="md">
        <h2 className="text-title font-bold text-on-surface">Catat Pengeluaran Operasional</h2>
        <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-label-md font-semibold text-on-surface mb-1">
              Kategori
            </label>
            <select
              className="w-full rounded-button border border-surface-highest bg-surface-low px-3 py-2 text-body-md"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            >
              <option value="FUEL">BBM</option>
              <option value="MAINTENANCE">Servis / Perawatan</option>
              <option value="CLEANING">Cuci & Salon Mobil</option>
              <option value="SALARY">Gaji / Uang Jalan</option>
              <option value="OFFICE">Operasional Kantor</option>
              <option value="PARKING_TOLL">Parkir & Tol</option>
              <option value="OTHER">Lain-lain</option>
            </select>
          </div>

          <Input
            label="Nominal (Rp)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Contoh: 150000"
            required
          />

          <div>
            <label className="block text-label-md font-semibold text-on-surface mb-1">
              Tanggal &amp; Waktu
            </label>
            <input
              type="datetime-local"
              className="w-full rounded-button border border-surface-highest bg-surface-low px-3 py-2 text-body-md"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              required
            />
          </div>

          <div className="sm:col-span-3">
            <Input
              label="Keterangan Pengeluaran"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Isi bensin Avanza E 1234 AB rute Cirebon-Bandung"
              required
            />
          </div>

          <div className="sm:col-span-3">
            <Button type="submit" variant="secondary" loading={saving}>
              Simpan Pengeluaran
            </Button>
          </div>
        </form>
      </Card>

      {/* Tabel Pengeluaran */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-body-sm">
            <thead className="border-b border-surface-highest bg-surface-low text-label-md text-on-surface-variant">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Keterangan</th>
                <th className="px-4 py-3 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-highest">
              {data.expenses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-on-surface-variant">
                    Belum ada catatan pengeluaran.
                  </td>
                </tr>
              ) : (
                data.expenses.map((exp: ExpenseDto) => (
                  <tr key={exp.id} className="hover:bg-surface-low">
                    <td className="px-4 py-3 whitespace-nowrap text-on-surface-variant">
                      {formatDateTimeWib(exp.expenseDate)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="info">{CATEGORY_LABELS[exp.category] ?? exp.category}</Badge>
                    </td>
                    <td className="px-4 py-3 text-on-surface">{exp.description}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-secondary">
                      {formatRupiah(exp.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
