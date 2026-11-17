import { getAccountsData } from '@/actions/finance';
import PageHeader from '@/components/PageHeader';
import MonthPicker from '@/components/MonthPicker';
import LoadState from '@/components/LoadState';
import AccountsView from '@/components/AccountsView';

export default async function AccountsPage({ searchParams }) {
  const result = await getAccountsData(searchParams.month);
  return (
    <>
      <PageHeader titleKey="navAccounts">
        {result.ok && <MonthPicker month={result.month} />}
      </PageHeader>
      {result.ok ? <AccountsView cards={result.cards} others={result.others} categories={result.categories} incomes={result.incomes} /> : <LoadState result={result} />}
    </>
  );
}
