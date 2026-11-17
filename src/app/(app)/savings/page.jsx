import { getSavingsData } from '@/actions/finance';
import PageHeader from '@/components/PageHeader';
import MonthPicker from '@/components/MonthPicker';
import LoadState from '@/components/LoadState';
import SavingsView from '@/components/SavingsView';

export default async function SavingsPage({ searchParams }) {
  const result = await getSavingsData(searchParams.month);
  return (
    <>
      <PageHeader titleKey="navSavings">
        {result.ok && <MonthPicker month={result.month} />}
      </PageHeader>
      {result.ok ? <SavingsView goals={result.goals} plan={result.plan} /> : <LoadState result={result} />}
    </>
  );
}
