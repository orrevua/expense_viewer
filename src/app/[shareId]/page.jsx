import Header from '@/components/Header';
import InstallmentCard from '@/components/InstallmentCard';
import OneTimeExpense from '@/components/OneTimeExpense';
import HistoryAccordion from '@/components/HistoryAccordion';
import ReadOnlyBadge from '@/components/ReadOnlyBadge';
import LocalizedHeading from '@/components/LocalizedHeading';
import { getDashboardData } from '@/actions/dashboard';
import { initialData } from '@/data/initialData';
import { notFound } from 'next/navigation';

export default async function ViewDashboard({ params, searchParams }) {
  // Se o valor digitado na URL nao bater com a key do seu .env, da pagina 404 Nao Encontrada
  const secretKey = process.env.SHAREABLE_UUID_KEY;
  if (params.shareId !== secretKey) {
    notFound(); 
  }

  const { dashboardId } = searchParams;

  let dashboardData;
  
  if (dashboardId) {
    try {
      dashboardData = await getDashboardData(dashboardId);
    } catch (error) {
      console.error("Database not connected yet, falling back to static data.");
    }
  }

  const data = dashboardData || initialData;

  return (
    <main className="min-h-screen p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center mb-8">
          <LocalizedHeading k="appTitle" as="h1" className="text-2xl font-bold text-slate-800 dark:text-white">Expense Viewer</LocalizedHeading>
          <ReadOnlyBadge />
        </div>

        <Header total={data.summary.totalCurrentMonth} titleKey="sharedMonthForecast" />

        <div className="lg:grid lg:grid-cols-2 lg:gap-8 space-y-6 lg:space-y-0">
          <div className="space-y-6">
            <section>
              <LocalizedHeading k="installmentExpenses" className="text-xl font-bold text-slate-800 dark:text-white mb-4">Installment Expenses</LocalizedHeading>
              <div>
                {data.installmentExpenses?.map((expense, idx) => (
                  <InstallmentCard key={expense.id || idx} expense={expense} isReadOnly={true} timeline={data.timeline} />
                ))}
              </div>
            </section>

            <section>
              <LocalizedHeading k="oneTimeExpenses" className="text-xl font-bold text-slate-800 dark:text-white mb-4">One-Time Expenses</LocalizedHeading>
              <div>
                {data.oneTimeExpenses?.map((expense, idx) => (
                  <OneTimeExpense key={expense.id || idx} expense={expense} isReadOnly={true} />
                ))}
              </div>
            </section>
          </div>

          <section>
            <LocalizedHeading k="monthlyHistory" className="text-xl font-bold text-slate-800 dark:text-white mb-4">Monthly History</LocalizedHeading>
            <div>
              {data.timeline?.map((item, idx) => (
                <HistoryAccordion key={item.id || idx} historyItem={item} isReadOnly={true} />
              ))}
            </div>
          </section>
        </div>

        <div className="text-center pt-8 pb-4">
          <p className="text-slate-400 dark:text-slate-500 text-sm">Powered by Felipe's Dashboard</p>
        </div>
      </div>
    </main>
  );
}
