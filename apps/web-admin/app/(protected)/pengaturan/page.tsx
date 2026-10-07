import { requireAdminSession } from '../../../lib/server-api';
import { getBusinessSettings, listAuditLogs, listStaff } from '../../../lib/server-settings';
import { AuditLogPanel, BusinessSettingsForm, StaffPanel } from './SettingsPanels';

export const metadata = { title: 'Pengaturan & Audit' };

interface PengaturanPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PengaturanPage({ searchParams }: PengaturanPageProps) {
  const session = await requireAdminSession();
  const isSuperadmin = session.user.role === 'SUPERADMIN';
  const raw = await searchParams;
  const tab = typeof raw.tab === 'string' ? raw.tab : 'usaha';

  const [business, staffRes, auditRes] = await Promise.all([
    getBusinessSettings(),
    listStaff(),
    listAuditLogs(raw),
  ]);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-display text-headline-lg-mobile tracking-[-0.02em] text-on-surface sm:text-headline-lg">
          Pengaturan & Audit
        </h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Kelola profil operasional usaha, akses staf, dan riwayat aktivitas sistem.
        </p>
      </section>

      <div className="flex gap-2 border-b border-surface-highest pb-3">
        <a
          className={`rounded-lg px-4 py-2 text-body-md font-semibold ${tab === 'usaha' ? 'bg-secondary text-surface-lowest' : 'text-on-surface-variant hover:bg-surface-low'}`}
          href="/pengaturan?tab=usaha"
        >
          Usaha
        </a>
        <a
          className={`rounded-lg px-4 py-2 text-body-md font-semibold ${tab === 'staff' ? 'bg-secondary text-surface-lowest' : 'text-on-surface-variant hover:bg-surface-low'}`}
          href="/pengaturan?tab=staff"
        >
          Staff ({staffRes.staff.length})
        </a>
        <a
          className={`rounded-lg px-4 py-2 text-body-md font-semibold ${tab === 'audit' ? 'bg-secondary text-surface-lowest' : 'text-on-surface-variant hover:bg-surface-low'}`}
          href="/pengaturan?tab=audit"
        >
          Audit Log
        </a>
      </div>

      {tab === 'usaha' ? (
        <BusinessSettingsForm initial={business} superadmin={isSuperadmin} />
      ) : null}
      {tab === 'staff' ? (
        <StaffPanel initialStaff={staffRes.staff} superadmin={isSuperadmin} />
      ) : null}
      {tab === 'audit' ? <AuditLogPanel logs={auditRes.logs} /> : null}
    </div>
  );
}
