'use client';

import Link from 'next/link';
import { TrendingDown, TrendingUp, CreditCard, Scale, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { currentMonthKey } from '@/utils/month';
import { useLocale } from './LocaleProvider';
import TrendChart from './TrendChart';
import CategoryBreakdown from './CategoryBreakdown';
import BudgetProgress from './BudgetProgress';
import TransactionRow from './TransactionRow';
import { card, cardTitle } from './ui';

function Stat({ icon: Icon, label, value, hint, href, accent }) {
  const body = (
    <div className={`${card} p-5 h-full border-l-4 ${accent} ${href ? 'hover:shadow-md transition-shadow' : ''}`}>
      <div className="flex items-center justify-between">
        <h2 className={cardTitle}>{label}</h2>
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <p className="text-2xl font-bold text-slate-800 dark:text-white mt-2 tabular-nums">{value}</p>
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default function OverviewView({ data }) {
  const { t } = useLocale();
  const { totals, month, categories, budgets, byCategory, trend, recent } = data;
  const balance = totals.income - totals.expense - totals.installments;
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const monthQs = month === currentMonthKey() ? '' : `?month=${month}`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat icon={TrendingDown} label={t('spentThisMonth')} value={formatCurrency(totals.expense)} hint={t('transactionsCount', { count: totals.count })} href={`/transactions${monthQs}`} accent="border-l-blue-500" />
        <Stat icon={CreditCard} label={t('installmentsBill')} value={formatCurrency(totals.installments)} hint={t('fromInstallmentsTab')} href="/installments" accent="border-l-orange-500" />
        <Stat icon={TrendingUp} label={t('incomeThisMonth')} value={formatCurrency(totals.income)} accent="border-l-emerald-500" />
        <Stat icon={Scale} label={t('balance')} value={`${balance < 0 ? '−' : ''}${formatCurrency(Math.abs(balance))}`} hint={t('balanceHint')} accent={balance < 0 ? 'border-l-red-500' : 'border-l-violet-500'} />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3"><TrendChart trend={trend} activeMonth={month} /></div>
        <div className="lg:col-span-2"><CategoryBreakdown byCategory={byCategory} categories={categories} /></div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className={`${card} p-5 lg:col-span-3`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={cardTitle}>{t('recentTransactions')}</h3>
            <Link href={`/transactions${monthQs}`} className="text-sm font-medium text-violet-600 dark:text-violet-400 inline-flex items-center gap-1">{t('seeAll')}<ArrowRight className="w-3.5 h-3.5" /></Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 py-6 text-center">{t('noTransactions')}</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {recent.map((tx) => <TransactionRow key={tx.id} tx={tx} category={catById[tx.category_id]} compact />)}
            </ul>
          )}
        </div>

        <div className={`${card} p-5 lg:col-span-2`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={cardTitle}>{t('budgetsOverview')}</h3>
            <Link href={`/budgets${monthQs}`} className="text-sm font-medium text-violet-600 dark:text-violet-400 inline-flex items-center gap-1">{t('seeAll')}<ArrowRight className="w-3.5 h-3.5" /></Link>
          </div>
          {budgets.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 py-6 text-center">{t('noBudgetsYet')}</p>
          ) : (
            <div className="space-y-4">
              {budgets
                .filter((b) => catById[b.category_id])
                .map((b) => ({ b, spent: byCategory[b.category_id] || 0 }))
                .sort((x, y) => y.spent / y.b.amount - x.spent / x.b.amount)
                .slice(0, 5)
                .map(({ b, spent }) => <BudgetProgress key={b.id} category={catById[b.category_id]} spent={spent} limit={b.amount} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
