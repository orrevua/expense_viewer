import { getTransactionsData } from '@/actions/finance';
import PageHeader from '@/components/PageHeader';
import MonthPicker from '@/components/MonthPicker';
import LoadState from '@/components/LoadState';
import TransactionsView from '@/components/TransactionsView';

export default async function TransactionsPage({ searchParams }) {
  const result = await getTransactionsData(searchParams.month);
  return (
    <>
      <PageHeader titleKey="navTransactions">
        {result.ok && <MonthPicker month={result.month} />}
      </PageHeader>
      {result.ok ? <TransactionsView month={result.month} categories={result.categories} accounts={result.accounts} transactions={result.transactions} threshold={result.threshold} /> : <LoadState result={result} />}
    </>
  );
}
