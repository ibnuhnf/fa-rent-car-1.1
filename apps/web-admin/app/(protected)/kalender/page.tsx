import { Card } from '@fa/ui';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { requireAdminSession } from '../../../lib/server-api';
import { getBookingCalendar, type CalendarParams } from '../../../lib/server-booking';

export const metadata = { title: 'Kalender Ketersediaan' };

interface KalenderPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING_VERIFICATION: 'bg-yellow-200 text-yellow-900',
  ACTIVE: 'bg-blue-200 text-blue-900',
  COMPLETED: 'bg-green-200 text-green-900',
};

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function formatMonth(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

function toISODate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00+07:00`;
}

function toDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

export default async function KalenderPage({ searchParams }: KalenderPageProps) {
  await requireAdminSession();
  const raw = await searchParams;
  const now = new Date();
  const year = raw.year ? Number(raw.year) : now.getFullYear();
  const month = raw.month ? Number(raw.month) : now.getMonth();
  const vehicleId = typeof raw.vehicleId === 'string' ? raw.vehicleId : undefined;

  if (isNaN(year) || isNaN(month) || month < 0 || month > 11) notFound();

  const totalDays = daysInMonth(year, month);
  const from = toISODate(year, month, 1);
  const to = toISODate(year, month, totalDays);

  const params: CalendarParams = { from, to };
  if (vehicleId) params.vehicleId = vehicleId;

  const data = await getBookingCalendar(params);
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  const navUrl = (y: number, m: number, v?: string) => {
    const p = new URLSearchParams({ year: String(y), month: String(m) });
    if (v) p.set('vehicleId', v);
    return `/kalender?${p}`;
  };

  const slotMap = new Map<string, Array<{ bookingCode: string; status: string }>>();
  for (const slot of data.slots) {
    const startDay = Math.max(1, new Date(slot.startDate).getDate());
    const endDay = Math.min(totalDays, new Date(slot.endDate).getDate());
    const startDateStr = toDateOnly(slot.startDate);
    const endDateStr = toDateOnly(slot.endDate);
    const firstDay = startDateStr >= toDateOnly(from) ? startDay : 1;
    const lastDay = endDateStr <= toDateOnly(to) ? endDay : totalDays;
    for (let d = firstDay; d <= lastDay; d++) {
      const key = `${slot.vehicleId}-${d}`;
      const arr = slotMap.get(key) ?? [];
      arr.push({ bookingCode: slot.bookingCode, status: slot.status });
      slotMap.set(key, arr);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-headline-lg-mobile tracking-[-0.02em] text-on-surface sm:text-headline-lg">
            Kalender Ketersediaan
          </h1>
          <p className="mt-2 text-body-md text-on-surface-variant">
            {formatMonth(year, month)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            className="rounded-lg border border-surface-highest px-3 py-1.5 text-body-sm font-medium text-on-surface-variant hover:bg-surface-low"
            href={navUrl(prevYear, prevMonth, vehicleId)}
          >
            &larr; Prev
          </a>
          <a
            className="rounded-lg border border-surface-highest px-3 py-1.5 text-body-sm font-medium text-on-surface-variant hover:bg-surface-low"
            href={navUrl(nextYear, nextMonth, vehicleId)}
          >
            Next &rarr;
          </a>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <a
          className={`rounded-lg px-3 py-1.5 text-body-sm font-medium ${!vehicleId ? 'bg-secondary text-surface-lowest' : 'border border-surface-highest text-on-surface-variant hover:bg-surface-low'}`}
          href={navUrl(year, month)}
        >
          Semua mobil
        </a>
        {data.vehicles.map((v) => (
          <a
            className={`rounded-lg px-3 py-1.5 text-body-sm font-medium ${vehicleId === v.id ? 'bg-secondary text-surface-lowest' : 'border border-surface-highest text-on-surface-variant hover:bg-surface-low'}`}
            href={navUrl(year, month, v.id)}
            key={v.id}
          >
            {v.name} ({v.plate})
          </a>
        ))}
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-body-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 border-b border-r border-surface-highest bg-surface-low px-3 py-2 text-left font-semibold text-on-surface">
                  Mobil
                </th>
                {days.map((d) => (
                  <th
                    className="border-b border-surface-highest px-1 py-2 text-center font-normal text-on-surface-variant"
                    key={d}
                  >
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.vehicles.map((v) => (
                <tr key={v.id}>
                  <td className="sticky left-0 z-10 border-r border-surface-highest bg-surface-lowest px-3 py-1.5 whitespace-nowrap">
                    <Link
                      className="font-medium text-secondary hover:underline"
                      href={`/armada/${v.id}`}
                    >
                      {v.name}
                    </Link>
                    <span className="ml-1 text-caption text-on-surface-variant">{v.plate}</span>
                  </td>
                  {days.map((d) => {
                    const slots = slotMap.get(`${v.id}-${d}`);
                    if (!slots || slots.length === 0) {
                      return <td className="border-b border-surface-highest px-1 py-1" key={d} />;
                    }
                    return (
                      <td className="border-b border-surface-highest px-1 py-1" key={d}>
                        <div className="flex flex-col gap-0.5">
                          {slots.map((s, i) => (
                            <span
                              className={`block rounded px-1 py-0.5 text-[10px] font-medium leading-tight truncate ${STATUS_COLORS[s.status] ?? 'bg-gray-200 text-gray-800'}`}
                              key={i}
                              title={`${s.bookingCode} — ${s.status}`}
                            >
                              {s.bookingCode}
                            </span>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
