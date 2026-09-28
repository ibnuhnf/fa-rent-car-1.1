import { Badge, Card } from '@fa/ui';

import { LogoutButton } from '../../../components/LogoutButton';
import { requireAdminSession } from '../../../lib/server-api';

export const metadata = {
  title: 'Profil',
};

export default async function ProfilePage() {
  const session = await requireAdminSession();

  return (
    <div className="max-w-2xl space-y-6">
      <section>
        <p className="text-label-md uppercase tracking-[0.08em] text-secondary">Akun admin</p>
        <h1 className="mt-2 font-display text-headline-lg-mobile tracking-[-0.02em] text-on-surface sm:text-headline-lg">
          Profil
        </h1>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Informasi akun yang sedang digunakan pada Operations Hub.
        </p>
      </section>
      <Card padding="md">
        <dl className="space-y-5">
          <div>
            <dt className="text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
              Nama
            </dt>
            <dd className="mt-1 text-title text-on-surface">{session.user.name}</dd>
          </div>
          <div>
            <dt className="text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
              Email
            </dt>
            <dd className="mt-1 text-body-lg text-on-surface">{session.user.email}</dd>
          </div>
          <div>
            <dt className="text-label-md uppercase tracking-[0.06em] text-on-surface-variant">
              Peran
            </dt>
            <dd className="mt-2">
              <Badge tone={session.user.role === 'SUPERADMIN' ? 'success' : 'info'}>
                {session.user.role === 'SUPERADMIN' ? 'Superadmin' : 'Staff'}
              </Badge>
            </dd>
          </div>
        </dl>
        <div className="mt-8 max-w-40">
          <LogoutButton />
        </div>
      </Card>
    </div>
  );
}
