import Header from '@/components/Header';
import InstallmentCard from '@/components/InstallmentCard';
import OneTimeExpense from '@/components/OneTimeExpense';
import HistoryAccordion from '@/components/HistoryAccordion';
import AddExpense from '@/components/AddExpense';
import TopBar from '@/components/TopBar';
import DashboardSelector from '@/components/DashboardSelector';
import LocalizedHeading from '@/components/LocalizedHeading';
import LocalizedParagraph from '@/components/LocalizedParagraph';
import SpendingTrendChart from '@/components/SpendingTrendChart';
import { getDashboardData, getDashboards } from '@/actions/dashboard';
import { verifyAuth } from '@/actions/auth';
import { redirect } from 'next/navigation';
import { initialData } from '@/data/initialData';

export default async function Home({ searchParams }) {
  const isAuthenticated = await verifyAuth();

  if (!isAuthenticated) {
    redirect('/login');
  }

  let dashboards = [];
  try {
    dashboards = await getDashboards();
  } catch(e) {
    console.error("Database connection failed or not seeded.");
  }

  // Find default dashboard
  const defaultDashboard = dashboards.find(d => d.is_default) || (dashboards.length > 0 ? dashboards[0] : null);
  
  let activeDashboardId = searchParams.dashboardId || (defaultDashboard ? defaultDashboard.id : null);

  let dashboardData;
  if (activeDashboardId) {
    try {
      dashboardData = await getDashboardData(activeDashboardId);
    } catch (error) {
      console.error("Database error fetching dashboard ID.", error);
    }
  }

  const data = dashboardData || (dashboards.length === 0 ? initialData : { installmentExpenses: [], oneTimeExpenses: [], timeline: [], summary: { totalCurrentMonth: 0 } });

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        <TopBar secretKey={process.env.SHAREABLE_UUID_KEY} activeDashboardId={activeDashboardId} />

        <DashboardSelector dashboards={dashboards} activeId={activeDashboardId || ''} />

        <Header total={data.summary?.totalCurrentMonth || 0} />

        <SpendingTrendChart timeline={data.timeline} />

        {activeDashboardId ? <AddExpense dashboardId={activeDashboardId} /> : null}

        <section>
          <LocalizedHeading k="installmentExpenses" className="text-xl font-bold text-slate-800 mb-4">Installment Expenses</LocalizedHeading>
          <div>
            {data.installmentExpenses?.map((expense, idx) => (
              <InstallmentCard key={expense.id || idx} expense={expense} />
            ))}
            {(!data.installmentExpenses || data.installmentExpenses.length === 0) && <LocalizedParagraph k="noInstallmentExpensesYet" className="text-slate-500">No installment expenses yet.</LocalizedParagraph>}
          </div>
        </section>

        <section>
          <LocalizedHeading k="oneTimeExpenses" className="text-xl font-bold text-slate-800 mb-4">One-Time Expenses</LocalizedHeading>
          <div>
            {data.oneTimeExpenses?.map((expense, idx) => (
              <OneTimeExpense key={expense.id || idx} expense={expense} />
            ))}
            {(!data.oneTimeExpenses || data.oneTimeExpenses.length === 0) && <LocalizedParagraph k="noOneTimeExpensesYet" className="text-slate-500">No one-time expenses yet.</LocalizedParagraph>}
          </div>
        </section>

        <section>
          <LocalizedHeading k="monthlyHistory" className="text-xl font-bold text-slate-800 mb-4">Monthly History</LocalizedHeading>
          <div>
            {data.timeline?.map((item, idx) => (
              <HistoryAccordion key={item.id || idx} historyItem={item} />
            ))}
            {(!data.timeline || data.timeline.length === 0) && <LocalizedParagraph k="noHistoryYet" className="text-slate-500">No history available yet.</LocalizedParagraph>}
          </div>
        </section>
      </div>
    </main>
  );
}