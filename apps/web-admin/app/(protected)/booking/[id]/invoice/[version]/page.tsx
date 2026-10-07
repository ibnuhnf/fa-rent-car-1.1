import { formatDateTimeWib, formatRupiah } from '@fa/shared';
import { notFound } from 'next/navigation';

import { requireAdminSession } from '../../../../../../lib/server-api';
import { getBookingDetail } from '../../../../../../lib/server-booking';
import { getBusinessSettings } from '../../../../../../lib/server-settings';
import { PrintButton } from './PrintButton';

export const metadata = { title: 'Cetak Invoice' };

interface InvoicePrintPageProps {
  params: Promise<{ id: string; version: string }>;
}

export default async function InvoicePrintPage({ params }: InvoicePrintPageProps) {
  await requireAdminSession();
  const { id, version } = await params;
  const versionNumber = Number(version);

  if (isNaN(versionNumber) || versionNumber < 1) notFound();

  const [detail, business] = await Promise.all([getBookingDetail(id), getBusinessSettings()]);
  const invoice = detail.invoices.find((candidate) => candidate.version === versionNumber);

  if (!invoice) notFound();

  return (
    <div className="mx-auto max-w-3xl bg-white p-6 sm:p-10 text-slate-900 shadow-card print:shadow-none print:p-0">
      <div className="mb-6 flex items-center justify-between border-b pb-4 print:hidden">
        <a className="text-sm font-semibold text-secondary hover:underline" href={`/booking/${id}`}>
          &larr; Kembali ke Detail Booking
        </a>
        <PrintButton />
      </div>

      {/* Header / Kop Usaha */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-900 pb-6">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-slate-900">
            {business.name || 'FA RENT CAR'}
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-sm whitespace-pre-line">
            {business.address || 'Kedawung, Cirebon'}
          </p>
          <p className="text-sm text-slate-600">
            WhatsApp: {business.whatsapp} {business.phone ? `· Telp: ${business.phone}` : ''}
          </p>
        </div>
        <div className="text-right">
          <span className="inline-block rounded bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-slate-700">
            INVOICE SEWA
          </span>
          <p className="mt-2 font-mono text-lg font-bold text-slate-900">{invoice.invoiceNumber}</p>
          <p className="text-xs text-slate-500">Versi {invoice.version}</p>
          <p className="mt-1 text-xs text-slate-500">
            Tanggal: {formatDateTimeWib(invoice.issuedAt)}
          </p>
        </div>
      </div>

      {/* Informasi Penyewa */}
      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Penyewa
          </span>
          <p className="font-semibold text-slate-900">{detail.customer.name}</p>
          <p className="font-mono text-slate-600">NIK: {detail.customer.nik}</p>
          <p className="font-mono text-slate-600">WA: {detail.customer.whatsapp}</p>
          <p className="text-slate-600">{detail.customer.address}</p>
        </div>
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Info Sewa
          </span>
          <p className="text-slate-700">
            Kode Booking: <span className="font-mono font-semibold">{detail.booking.bookingCode}</span>
          </p>
          <p className="text-slate-700">Status Invoice: <span className="font-semibold">{invoice.status}</span></p>
          <p className="text-slate-700">Ambil &amp; Kembali: {detail.booking.pickupOffice}</p>
        </div>
      </div>

      {/* Tabel Rincian */}
      <table className="mt-8 w-full text-left text-sm">
        <thead className="border-b border-slate-300 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
          <tr>
            <th className="py-2.5 px-3">Rincian Sewa</th>
            <th className="py-2.5 px-3 text-center">Durasi</th>
            <th className="py-2.5 px-3 text-right">Tarif / Hari</th>
            <th className="py-2.5 px-3 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {invoice.items.map((item) => (
            <tr key={item.id}>
              <td className="py-3 px-3 font-medium text-slate-900">{item.description}</td>
              <td className="py-3 px-3 text-center text-slate-600">{item.quantity} hari</td>
              <td className="py-3 px-3 text-right tabular-nums text-slate-600">
                {formatRupiah(item.unitPrice)}
              </td>
              <td className="py-3 px-3 text-right font-semibold tabular-nums text-slate-900">
                {formatRupiah(item.amount)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-slate-900 font-semibold">
          <tr>
            <td className="py-3 px-3 text-right" colSpan={3}>
              Total Tagihan
            </td>
            <td className="py-3 px-3 text-right text-base tabular-nums text-slate-900">
              {formatRupiah(invoice.totalAmount)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Rekening Pembayaran & Syarat */}
      <div className="mt-8 grid grid-cols-1 gap-6 rounded-lg bg-slate-50 p-4 sm:grid-cols-2 text-xs text-slate-700">
        <div>
          <span className="font-semibold uppercase tracking-wider text-slate-900">
            Rekening Pembayaran Resmi
          </span>
          <p className="mt-1 font-semibold text-slate-900">
            Bank: {business.bankAccount.bankName || 'BCA'}
          </p>
          <p className="font-mono text-sm font-bold text-slate-900">
            No. Rek: {business.bankAccount.accountNumber || '-'}
          </p>
          <p className="text-slate-600">a.n. {business.bankAccount.accountHolder || '-'}</p>
        </div>
        <div>
          <span className="font-semibold uppercase tracking-wider text-slate-900">
            Ketentuan Penting
          </span>
          <ul className="mt-1 list-disc pl-4 space-y-1 text-slate-600">
            <li>Pembayaran 100% di muka sebelum serah terima armada.</li>
            <li>Tanpa uang jaminan/deposit.</li>
            <li>Pengambilan dan pengembalian unit wajib di kantor resmi.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
