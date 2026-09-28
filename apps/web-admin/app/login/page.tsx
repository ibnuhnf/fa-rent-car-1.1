import { Brand, Card } from '@fa/ui';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

import { SessionRecovery } from '../../components/SessionRecovery';
import { getOptionalAdminSession } from '../../lib/server-api';

export const metadata = {
  title: 'Masuk',
};

export default async function LoginPage() {
  const session = await getOptionalAdminSession();

  if (session !== null) {
    redirect('/');
  }
  const cookieStore = await cookies();
  const hasRefreshCookie = cookieStore.has(
    process.env.NODE_ENV === 'production' ? '__Host-fa_refresh' : 'fa_refresh',
  );

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 py-10">
      <Card className="w-full max-w-[25rem]" padding="lg">
        <Brand subtitle="Operations Hub" />
        <div className="mt-8">
          <p className="text-label-md uppercase tracking-[0.08em] text-secondary">Akses admin</p>
          <h1 className="mt-2 font-display text-headline-lg-mobile text-on-surface sm:text-headline-lg">
            Masuk ke Operations Hub
          </h1>
          <p className="mt-3 text-body-md text-on-surface-variant">
            Gunakan akun staff atau superadmin yang telah terdaftar.
          </p>
        </div>
        <div className="mt-7">
          <SessionRecovery hasRefreshCookie={hasRefreshCookie} />
        </div>
      </Card>
    </main>
  );
}
