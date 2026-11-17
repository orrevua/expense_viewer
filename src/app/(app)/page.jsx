import { redirect } from 'next/navigation';
import { getOverviewData } from '@/actions/finance';
import PageHeader from '@/components/PageHeader';
import MonthPicker from '@/components/MonthPicker';
import LoadState from '@/components/LoadState';
import OverviewView from '@/components/OverviewView';
import AddTransactionButton from '@/components/AddTransactionButton';

export default async function OverviewPage({ searchParams }) {
  // Old links to the expense viewer used "/?dashboardId=..." — send them to the Installments tab.
  if (searchParams.dashboardId) {
    redirect(`/installments?dashboardId=${encodeURIComponent(searchParams.dashboardId)}`);
  }

  const result = await getOverviewData(searchParams.month);
  return (
    <>
      <PageHeader titleKey="navOverview">
        {result.ok && <MonthPicker month={result.month} />}
        {result.ok && <AddTransactionButton categories={result.categories} month={result.month} />}
      </PageHeader>
      {result.ok ? <OverviewView data={result} /> : <LoadState result={result} />}
    </>
  );
}
