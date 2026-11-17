import { getRecurringData } from '@/actions/finance';
import PageHeader from '@/components/PageHeader';
import MonthPicker from '@/components/MonthPicker';
import LoadState from '@/components/LoadState';
import RecurringView from '@/components/RecurringView';

export default async function RecurringPage({ searchParams }) {
  const result = await getRecurringData(searchParams.month);
  return (
    <>
      <PageHeader titleKey="navRecurring">
        {result.ok && <MonthPicker month={result.month} />}
      </PageHeader>
      {result.ok ? <RecurringView {...result} /> : <LoadState result={result} />}
    </>
  );
}
