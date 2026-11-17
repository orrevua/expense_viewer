'use client';

import Link from 'next/link';
import { TrendingDown, TrendingUp, Users, Scale, ArrowRight, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { currentMonthKey } from '@/utils/month';
import { categoryColor } from '@/lib/palette';
import { useLocale } from './LocaleProvider';
import TrendChart from './TrendChart';
import CategoryBreakdown from './CategoryBreakdown';
import BudgetProgress from './BudgetProgress';
import MajorMinorCard from './MajorMinorCard';
import StatusPill from './StatusPill';
import { RecurringSummary } from './RecurringView';
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

function CardHeader({ title, href }) {
  const { t } = useLocale();
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className={cardTitle}>{title}</h3>
      <Link href={href} className="text-sm font-medium text-violet-600 dark:text-violet-400 inline-flex items-center gap-1">{t('seeAll')}<ArrowRight className="w-3.5 h-3.5" /></Link>
    </div>
  );
}

export default function OverviewView({ data }) {
  const { t, lang, dark } = useLocale();
  const { totals, month, categories, budgets, byCategory, trend, recurring, cards, size } = data;
  const balance = totals.income - totals.expense - totals.installments;
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const qs = month === currentMonthKey() ? '' : `?month=${month}`;
  const fmtDay = new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'pt-BR', { day: '2-digit', month: 'short' });
  const openRecurring = recurring.items.filter((i) => i.status !== 'paid').sort((a, b) => a.due_day - b.due_day).slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat icon={TrendingDown} label={t('spentThisMonth')} value={formatCurrency(totals.expense)} hint={t('transactionsCount', { count: totals.count })} href={`/transactions${qs}`} accent="border-l-blue-500" />
        <Stat icon={TrendingUp} label={t('incomeThisMonth')} value={formatCurrency(totals.income)} accent="border-l-emerald-500" href={`/transactions${qs}`} />
        <Stat icon={Users} label={t('installmentsBill')} value={formatCurrency(totals.installments)} hint={t('fromInstallmentsTab')} href="/installments" accent="border-l-orange-500" />
        <Stat icon={Scale} label={t('balance')} value={`${balance < 0 ? '−' : ''}${formatCurrency(Math.abs(balance))}`} hint={t('balanceHint')} accent={balance < 0 ? 'border-l-red-500' : 'border-l-violet-500'} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className={`${card} p-5`}>
          <CardHeader title={t('recurringTotal')} href={`/recurring${qs}`} />
          {recurring.summary.count === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 py-4">{t('noRecurring')}</p>
          ) : (
            <>
              <RecurringSummary summary={recurring.summary} />
              {openRecurring.length > 0 && (
                <ul className="mt-4 divide-y divide-slate-100 dark:divide-white/5">
                  {openRecurring.map((i) => (
                    <li key={i.id} className="flex items-center gap-2 py-2 text-sm">
                      <span className="flex-1 min-w-0 truncate text-slate-700 dark:text-slate-200">{i.name}</span>
                      <span className="text-xs text-slate-400">{fmtDay.format(new Date(`${i.dueDate}T12:00:00`))}</span>
                      <span className="tabular-nums font-medium text-slate-800 dark:text-slate-100">{formatCurrency(i.amount)}</span>
                      <StatusPill status={i.status} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div className={`${card} p-5`}>
          <CardHeader title={t('cardsOverview')} href={`/accounts${qs}`} />
          {cards.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 py-4">{t('noCards')}</p>
          ) : (
            <ul className="space-y-4">
              {cards.map(({ card: c, total, items, dueDate }) => {
                const pct = c.credit_limit ? Math.min(100, (total / c.credit_limit) * 100) : null;
                return (
                  <li key={c.id}>
                    <div className="flex items-center gap-2 text-sm">
                      <CreditCard className="w-4 h-4 shrink-0" style={{ color: categoryColor(c.color, dark) }} />
                      <span className="flex-1 min-w-0 truncate font-medium text-slate-700 dark:text-slate-200">{c.name}</span>
                      <span className="tabular-nums font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(total)}</span>
                    </div>
                    {pct !== null && (
                      <div className="h-1.5 mt-1.5 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: categoryColor(c.color, dark) }} />
                      </div>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                      {dueDate ? t('billDue', { date: fmtDay.format(new Date(`${dueDate}T12:00:00`)) }) : t('cardBill')}
                      {items[0] ? ` · ${items[0].description} ${formatCurrency(items[0].amount)}` : ''}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <MajorMinorCard size={size} categories={categories} />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3"><TrendChart trend={trend} activeMonth={month} /></div>
        <div className="lg:col-span-2"><CategoryBreakdown byCategory={byCategory} categories={categories} /></div>
      </div>

      {budgets.length > 0 && (
        <div className={`${card} p-5`}>
          <CardHeader title={t('budgetsOverview')} href={`/budgets${qs}`} />
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
            {budgets
              .filter((b) => catById[b.category_id])
              .map((b) => ({ b, spent: byCategory[b.category_id] || 0 }))
              .sort((x, y) => y.spent / y.b.amount - x.spent / x.b.amount)
              .slice(0, 6)
              .map(({ b, spent }) => <BudgetProgress key={b.id} category={catById[b.category_id]} spent={spent} limit={b.amount} />)}
          </div>
        </div>
      )}
    </div>
  );
}
