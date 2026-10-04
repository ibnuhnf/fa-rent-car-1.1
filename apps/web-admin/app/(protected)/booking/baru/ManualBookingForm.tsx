'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  formatRupiah,
  type CreateBookingItemRequest,
  type CreateBookingRequest,
  type VehicleSummary,
} from '@fa/shared';
import { Badge, Button, Card, EmptyState, Input } from '@fa/ui';
import { createBooking, describeBookingError } from '../../../../lib/browser-booking';

interface ManualBookingFormProps {
  vehicles: ReadonlyArray<VehicleSummary>;
}

interface ItemState {
  vehicleId: string;
  startDate: string;
  endDate: string;
  withDriver: boolean;
}

const defaultItemState = (vehicleId: string): ItemState => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextDay = new Date(tomorrow);
  nextDay.setDate(nextDay.getDate() + 1);

  const format = (d: Date) => `${d.toISOString().slice(0, 10)}T08:00:00.000Z`;

  return {
    vehicleId,
    startDate: format(tomorrow),
    endDate: format(nextDay),
    withDriver: false,
  };
};

export function ManualBookingForm({ vehicles }: ManualBookingFormProps) {
  const router = useRouter();

  const [customer, setCustomer] = useState({
    nik: '',
    name: '',
    whatsapp: '',
    email: '',
    address: '',
    notes: '',
  });

  const availableVehicles = vehicles.filter((v) => v.status === 'AVAILABLE');
  const [items, setItems] = useState<ItemState[]>(() => {
    const first = availableVehicles[0];
    return first ? [defaultItemState(first.id)] : [];
  });

  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addItem = () => {
    const nextVehicle = availableVehicles.find(
      (v) => !items.some((item) => item.vehicleId === v.id),
    );
    if (!nextVehicle) return;
    setItems((prev) => [...prev, defaultItemState(nextVehicle.id)]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, patch: Partial<ItemState>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (items.length === 0) {
      setError('Pilih minimal satu mobil untuk booking.');
      return;
    }

    setLoading(true);

    try {
      const payload: CreateBookingRequest = {
        customer: {
          nik: customer.nik.trim(),
          name: customer.name.trim(),
          whatsapp: customer.whatsapp.trim(),
          email: customer.email.trim() || undefined,
          address: customer.address.trim(),
          notes: customer.notes.trim() || undefined,
        },
        items: items.map((item): CreateBookingItemRequest => ({
          vehicleId: item.vehicleId,
          startDate: new Date(item.startDate).toISOString(),
          endDate: new Date(item.endDate).toISOString(),
          withDriver: item.withDriver,
        })),
        notes: notes.trim() || undefined,
      };

      const result = await createBooking(payload);
      router.push(`/booking/${result.booking.id}`);
      router.refresh();
    } catch (err) {
      setError(describeBookingError(err));
    } finally {
      setLoading(false);
    }
  };

  if (availableVehicles.length === 0) {
    return (
      <EmptyState
        description="Semua mobil sedang disewa, ditahan, atau dalam perawatan. Silakan ubah status mobil terlebih dahulu."
        icon="directions_car"
        title="Tidak ada armada siap sewa"
      />
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {error ? (
        <div className="rounded-xl border border-error bg-error-container p-4 text-body-md text-on-error-container">
          <p className="font-semibold">Booking gagal</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : null}

      <Card padding="md">
        <h2 className="font-display text-title tracking-tight text-on-surface">Data Customer / Penyewa</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Penyewa tidak memerlukan akun. Data NIK &amp; WhatsApp dipakai untuk histori transaksi.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Input
            id="cust-nik"
            label="NIK (16 digit)"
            maxLength={16}
            minLength={16}
            onChange={(e) => setCustomer((c) => ({ ...c, nik: e.target.value }))}
            placeholder="3209123456780001"
            required
            value={customer.nik}
          />

          <Input
            id="cust-name"
            label="Nama Lengkap"
            onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
            placeholder="Ahmad Hidayat"
            required
            value={customer.name}
          />

          <Input
            id="cust-wa"
            label="Nomor WhatsApp"
            onChange={(e) => setCustomer((c) => ({ ...c, whatsapp: e.target.value }))}
            placeholder="6281234567890"
            required
            value={customer.whatsapp}
          />

          <Input
            id="cust-email"
            label="Email (Opsional)"
            onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))}
            placeholder="ahmad@example.com"
            type="email"
            value={customer.email}
          />

          <div className="sm:col-span-2">
            <Input
              id="cust-address"
              label="Alamat Tempat Tinggal"
              onChange={(e) => setCustomer((c) => ({ ...c, address: e.target.value }))}
              placeholder="Jl. Pemuda No. 12, Cirebon"
              required
              value={customer.address}
            />
          </div>

          <div className="sm:col-span-2">
            <Input
              id="cust-notes"
              label="Catatan Khusus Customer (Opsional)"
              onChange={(e) => setCustomer((c) => ({ ...c, notes: e.target.value }))}
              placeholder="Langganan / permintaan khusus"
              value={customer.notes}
            />
          </div>
        </div>
      </Card>

      <Card padding="md">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-title tracking-tight text-on-surface">Item Mobil &amp; Durasi</h2>
            <p className="mt-1 text-body-md text-on-surface-variant">
              Dapat memilih beberapa mobil sekaligus dalam satu transaksi invoice.
            </p>
          </div>

          {items.length < availableVehicles.length ? (
            <Button icon="add" onClick={addItem} type="button" variant="outline">
              Tambah Mobil
            </Button>
          ) : null}
        </div>

        <div className="mt-6 space-y-4">
          {items.map((item, index) => {
            const selectedVehicle = availableVehicles.find((v) => v.id === item.vehicleId);

            return (
              <div
                key={index}
                className="relative rounded-xl border border-surface-highest bg-surface-low p-4 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tone="info">Mobil #{index + 1}</Badge>
                  {items.length > 1 ? (
                    <Button
                      icon="delete"
                      onClick={() => removeItem(index)}
                      size="sm"
                      type="button"
                      variant="destructive"
                    >
                      Hapus
                    </Button>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="block text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
                      Pilih Mobil *
                    </label>
                    <select
                      className="mt-1.5 min-h-11 w-full rounded-lg border border-surface-highest bg-surface-lowest px-3 text-body-md text-on-surface outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                      onChange={(e) => updateItem(index, { vehicleId: e.target.value })}
                      value={item.vehicleId}
                    >
                      {availableVehicles.map((v) => (
                        <option
                          key={v.id}
                          disabled={items.some((i, idx) => idx !== index && i.vehicleId === v.id)}
                          value={v.id}
                        >
                          {v.brand} {v.model} ({v.plate}) — {v.dailyRate ? formatRupiah(v.dailyRate) : 'Tanpa tarif'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
                      Mulai Sewa (WIB) *
                    </label>
                    <input
                      className="mt-1.5 min-h-11 w-full rounded-lg border border-surface-highest bg-surface-lowest px-3 text-body-md text-on-surface outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                      onChange={(e) => updateItem(index, { startDate: e.target.value })}
                      required
                      type="datetime-local"
                      value={item.startDate.slice(0, 16)}
                    />
                  </div>

                  <div>
                    <label className="block text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
                      Selesai Sewa (WIB) *
                    </label>
                    <input
                      className="mt-1.5 min-h-11 w-full rounded-lg border border-surface-highest bg-surface-lowest px-3 text-body-md text-on-surface outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                      onChange={(e) => updateItem(index, { endDate: e.target.value })}
                      required
                      type="datetime-local"
                      value={item.endDate.slice(0, 16)}
                    />
                  </div>

                  <div className="flex items-center pt-6">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        checked={item.withDriver}
                        className="size-5 rounded border-surface-highest text-secondary focus:ring-secondary"
                        onChange={(e) => updateItem(index, { withDriver: e.target.checked })}
                        type="checkbox"
                      />
                      <span className="text-body-md font-medium text-on-surface">
                        Dengan Sopir (+{selectedVehicle?.dailyRate ? 'Tarif Sopir' : 'Layanan'})
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card padding="md">
        <Input
          id="booking-notes"
          label="Catatan Booking Internal"
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Lokasi penyerahan khusus / instruksi staf"
          value={notes}
        />

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <Button onClick={() => router.back()} type="button" variant="outline">
            Batal
          </Button>
          <Button icon="check" loading={loading} type="submit" variant="primary">
            Buat Booking &amp; Snapshot Invoice
          </Button>
        </div>
      </Card>
    </form>
  );
}