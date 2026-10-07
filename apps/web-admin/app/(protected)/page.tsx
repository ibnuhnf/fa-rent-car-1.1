import { Dashboard } from '../../components/Dashboard';
import { getFoundation } from '../../lib/server-api';
import { getDashboardOverview } from '../../lib/server-operations';

export default async function DashboardPage() {
  const [foundation, overview] = await Promise.all([
    getFoundation({ page: 1, limit: 1 }),
    getDashboardOverview(),
  ]);

  return <Dashboard foundation={foundation} overview={overview} />;
}
