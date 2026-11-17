import { getBudgetsData } from '@/actions/finance';
import PageHeader from '@/components/PageHeader';
import MonthPicker from '@/components/MonthPicker';
import LoadState from '@/components/LoadState';
import BudgetsView from '@/components/BudgetsView';

export default async function BudgetsPage({ searchParams }) {
  const result = await getBudgetsData(searchParams.month);
  return (
    <>
      <PageHeader titleKey="navBudgets">
        {result.ok && <MonthPicker month={result.month} />}
      </PageHeader>
      {result.ok ? <BudgetsView categories={result.categories} budgets={result.budgets} spent={result.spent} /> : <LoadState result={result} />}
    </>
  );
}
