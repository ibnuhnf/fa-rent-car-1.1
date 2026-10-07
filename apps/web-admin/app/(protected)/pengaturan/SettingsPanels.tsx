'use client';

import { useState } from 'react';

import {
  createStaffRequestSchema,
  formatDateTimeWib,
  updateBusinessSettingsSchema,
  type BusinessSettings,
  type CreateStaffRequest,
  type StaffUser,
  type UpdateBusinessSettings,
} from '@fa/shared';
import { Badge, Button, Card, Input } from '@fa/ui';

import { createStaff, disableStaff, updateBusinessSettings } from '../../../lib/browser-settings';

interface UsahaTabProps {
  initial: BusinessSettings;
  superadmin: boolean;
}

function nullableNumber(value: string): number | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : Number(trimmed);
}

export function BusinessSettingsForm({ initial, superadmin }: UsahaTabProps) {
  const [values, setValues] = useState<Record<string, string>>({
    name: initial.name,
    address: initial.address,
    whatsapp: initial.whatsapp,
    phone: initial.phone,
    email: initial.email,
    holdMinutes: String(initial.holdMinutes),
    bufferMinutes: String(initial.bufferMinutes),
    bankName: initial.bankAccount.bankName,
    accountNumber: initial.bankAccount.accountNumber,
    accountHolder: initial.bankAccount.accountHolder,
    waTemplate: initial.waTemplate,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  function set(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit() {
    if (saving) return;
    setError(undefined);
    setNotice(undefined);

    const input: UpdateBusinessSettings = {
      name: values.name,
      address: values.address,
      whatsapp: values.whatsapp,
      phone: values.phone || undefined,
      email: values.email || undefined,
      holdMinutes: nullableNumber(values.holdMinutes ?? ''),
      bufferMinutes: nullableNumber(values.bufferMinutes ?? ''),
      bankAccount: {
        bankName: values.bankName ?? '',
        accountNumber: values.accountNumber ?? '',
        accountHolder: values.accountHolder ?? '',
      },
      waTemplate: values.waTemplate || undefined,
    };

    const parsed = updateBusinessSettingsSchema.safeParse(input);
    if (!parsed.success) {
      setError('Lengkapi data usaha dengan benar (email valid, durasi hold minimal 15 menit).');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateBusinessSettings(parsed.data);
      setValues({
        name: updated.name,
        address: updated.address,
        whatsapp: updated.whatsapp,
        phone: updated.phone,
        email: updated.email,
        holdMinutes: String(updated.holdMinutes),
        bufferMinutes: String(updated.bufferMinutes),
        bankName: updated.bankAccount.bankName,
        accountNumber: updated.bankAccount.accountNumber,
        accountHolder: updated.bankAccount.accountHolder,
        waTemplate: updated.waTemplate,
      });
      setNotice('Pengaturan usaha tersimpan.');
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Pengaturan belum dapat disimpan.',
      );
    } finally {
      setSaving(false);
    }
  }

  const fields: ReadonlyArray<{ key: string; label: string; textarea?: boolean; type?: string }> = [
    { key: 'name', label: 'Nama usaha' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'phone', label: 'Telepon' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'holdMinutes', label: 'Durasi hold (menit)', type: 'number' },
    { key: 'bufferMinutes', label: 'Buffer antar sewa (menit)', type: 'number' },
    { key: 'bankName', label: 'Nama bank' },
    { key: 'accountNumber', label: 'Nomor rekening' },
    { key: 'accountHolder', label: 'Atas nama rekening' },
    { key: 'address', label: 'Alamat', textarea: true },
    { key: 'waTemplate', label: 'Template pesan WhatsApp', textarea: true },
  ];

  return (
    <Card padding="md">
      <h2 className="text-title text-on-surface">Pengaturan usaha</h2>
      {error ? (
        <p
          aria-live="assertive"
          className="mt-3 rounded-lg bg-error-container px-3 py-2.5 text-body-md text-on-error-container"
        >
          {error}
        </p>
      ) : null}
      {notice ? (
        <p
          aria-live="polite"
          className="mt-3 rounded-lg bg-success-container px-3 py-2.5 text-body-md text-on-success-container"
        >
          {notice}
        </p>
      ) : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {fields.map((field) =>
          field.textarea ? (
            <label className="sm:col-span-3" key={field.key}>
              <span className="mb-1 block text-label-md text-on-surface-variant">{field.label}</span>
              <textarea
                className="min-h-20 w-full rounded-button border border-surface-highest bg-surface-lowest px-3 py-2 text-body-md text-on-surface"
                disabled={!superadmin}
                onChange={(event) => set(field.key, event.target.value)}
                value={values[field.key] ?? ''}
              />
            </label>
          ) : (
            <Input
              disabled={!superadmin}
              key={field.key}
              label={field.label}
              onChange={(event) => set(field.key, event.target.value)}
              type={field.type ?? 'text'}
              value={values[field.key] ?? ''}
            />
          ),
        )}
      </div>
      {superadmin ? (
        <Button className="mt-5" loading={saving} onClick={handleSubmit} variant="secondary">
          Simpan pengaturan
        </Button>
      ) : (
        <p className="mt-5 text-caption text-on-surface-variant">
          Perubahan pengaturan hanya untuk superadmin.
        </p>
      )}
    </Card>
  );
}

interface StaffTabProps {
  initialStaff: StaffUser[];
  superadmin: boolean;
}

export function StaffPanel({ initialStaff, superadmin }: StaffTabProps) {
  const [staff, setStaff] = useState(initialStaff);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'STAFF' | 'SUPERADMIN'>('STAFF');
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    if (busy) return;
    setError(undefined);
    setNotice(undefined);

    const input: CreateStaffRequest = { name, email, password, role };
    const parsed = createStaffRequestSchema.safeParse(input);
    if (!parsed.success) {
      setError('Nama, email valid, dan password minimal 8 karakter wajib diisi.');
      return;
    }

    setBusy(true);
    try {
      const user = await createStaff(parsed.data);
      setStaff((current) => [...current, user]);
      setName('');
      setEmail('');
      setPassword('');
      setNotice(`Staff "${user.name}" ditambahkan.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Staff belum dapat ditambahkan.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable(user: StaffUser) {
    if (!window.confirm(`Nonaktifkan akses staff ${user.name}?`)) return;
    try {
      await disableStaff(user.id);
      setStaff((current) =>
        current.map((row) => (row.id === user.id ? { ...row, isActive: false } : row)),
      );
      setNotice(`${user.name} dinonaktifkan.`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Staff belum dapat dinonaktifkan.');
    }
  }

  return (
    <Card padding="md">
      <h2 className="text-title text-on-surface">Manajemen staff</h2>
      {error ? (
        <p className="mt-3 rounded-lg bg-error-container px-3 py-2.5 text-body-md text-on-error-container">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-3 rounded-lg bg-success-container px-3 py-2.5 text-body-md text-on-success-container">
          {notice}
        </p>
      ) : null}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-body-sm">
          <thead className="border-b border-surface-highest text-label-md text-on-surface-variant">
            <tr>
              <th className="px-3 py-2">Nama</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Peran</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-highest">
            {staff.map((user) => (
              <tr key={user.id}>
                <td className="px-3 py-2 font-medium">{user.name}</td>
                <td className="px-3 py-2 text-on-surface-variant">{user.email}</td>
                <td className="px-3 py-2">
                  <Badge tone={user.role === 'SUPERADMIN' ? 'info' : 'neutral'}>
                    {user.role === 'SUPERADMIN' ? 'Superadmin' : 'Staff'}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <Badge tone={user.isActive ? 'success' : 'danger'}>
                    {user.isActive ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  {superadmin && user.isActive ? (
                    <Button onClick={() => handleDisable(user)} size="sm" variant="outline">
                      Nonaktifkan
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {superadmin ? (
        <div className="mt-5 border-t border-surface-highest pt-5">
          <h3 className="text-body-lg font-semibold">Tambah staff</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Input label="Nama" onChange={(e) => setName(e.target.value)} value={name} />
            <Input
              label="Email"
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              value={email}
            />
            <Input
              label="Password (min. 8 karakter)"
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              value={password}
            />
            <label>
              <span className="mb-1 block text-label-md text-on-surface-variant">Peran</span>
              <select
                className="w-full rounded-button border border-surface-highest bg-surface-lowest px-3 py-2 text-body-md"
                onChange={(e) => setRole(e.target.value as 'STAFF' | 'SUPERADMIN')}
                value={role}
              >
                <option value="STAFF">Staff</option>
                <option value="SUPERADMIN">Superadmin</option>
              </select>
            </label>
          </div>
          <Button className="mt-4" loading={busy} onClick={handleCreate} variant="secondary">
            Tambah staff
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

interface AuditLogProps {
  logs: Array<{
    id: string;
    actorName: string | null;
    action: string;
    objectType: string;
    createdAt: string;
  }>;
}

export function AuditLogPanel({ logs }: AuditLogProps) {
  return (
    <Card padding="md">
      <h2 className="text-title text-on-surface">Audit log</h2>
      {logs.length === 0 ? (
        <p className="mt-3 text-body-md text-on-surface-variant">Belum ada aktivitas tercatat.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-body-sm">
            <thead className="border-b border-surface-highest text-label-md text-on-surface-variant">
              <tr>
                <th className="px-3 py-2">Waktu</th>
                <th className="px-3 py-2">Aktor</th>
                <th className="px-3 py-2">Aksi</th>
                <th className="px-3 py-2">Objek</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-highest">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-on-surface-variant">
                    {formatDateTimeWib(log.createdAt)}
                  </td>
                  <td className="px-3 py-2">{log.actorName ?? 'Sistem'}</td>
                  <td className="px-3 py-2 font-mono text-caption">{log.action}</td>
                  <td className="px-3 py-2 font-mono text-caption text-on-surface-variant">
                    {log.objectType}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
