import { redirect } from 'next/navigation';
import { getSessionUser } from '@/actions/auth';
import AppShell from '@/components/AppShell';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }) {
  const user = await getSessionUser();
  if (!user?.id) redirect('/login');
  return <AppShell userName={user.name}>{children}</AppShell>;
}
