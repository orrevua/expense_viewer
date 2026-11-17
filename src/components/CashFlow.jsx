'use client';

import { CreditCard, Repeat, PiggyBank, ShoppingBag, Users, ArrowDownLeft } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { monthLabel } from '@/utils/month';
import { categoryColor } from '@/lib/palette';
import { useLocale } from './LocaleProvider';
import StatusPill from './StatusPill';
import { card, cardTitle } from './ui';

const ICONS = { income: ArrowDownLeft, fixed: Repeat, card: CreditCard, savings: PiggyBank, daily: ShoppingBag, installments: Users };

export default function CashFlow({ flow }) {
  const { t, lang, dark } = useLocale();
  const { events, totals } = flow;

  const label = (e) => {
    if (e.type === 'savings') return t('flowSavings');
    if (e.type === 'daily') return t('flowDaily');
    if (e.type === 'installments') return t('flowInstallments');
    if (e.type === 'card') return t('flowCard', { name: e.label });
    return e.label;
  };

  return (
    <div className={`${card} p-5 h-full`}>
      <h3 className={cardTitle}>{t('cashFlowTitle')}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-3">{t('cashFlowHint')}</p>
      {events.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 py-8 text-center">{t('flowNothing')}</p>
      ) : (
        <ol className="divide-y divide-slate-100 dark:divide-white/5">
          {events.map((e) => {
            const Icon = ICONS[e.type] || Repeat;
            const isIn = e.kind === 'income';
            return (
              <li key={e.id} className="flex items-center gap-2 sm:gap-3 py-2.5">
                <span className="w-6 sm:w-9 shrink-0 text-center text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                  {e.day <= 31 ? String(e.day).padStart(2, '0') : '—'}
                </span>
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isIn ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300'}`}
                  style={e.type === 'card' && e.color ? { background: categoryColor(e.color, dark), color: '#fff' } : undefined}>
                  <Icon className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{label(e)}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {e.type === 'card' && e.payWith ? t('paidWithLabel', { name: e.payWith }) : ''}
                    {e.type === 'savings' ? `${formatCurrency(e.done)} / ${formatCurrency(e.planned)}` : ''}
                    {e.type === 'installments' && e.refMonth ? t('installmentsRef', { month: monthLabel(e.refMonth, lang, { month: 'long' }).toLocaleLowerCase(lang === 'en' ? 'en-US' : 'pt-BR') }) : ''}
                  </p>
                </div>
                {['income', 'fixed', 'card', 'savings'].includes(e.type) && <span className="hidden sm:block"><StatusPill status={e.status} income={isIn} /></span>}
                <div className="text-right shrink-0">
                  <p className={`text-sm font-semibold tabular-nums ${isIn ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}>
                    {isIn ? '+' : '−'} {formatCurrency(e.amount)}
                  </p>
                  <p className={`text-[11px] tabular-nums ${e.balance < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}>
                    = {e.balance < 0 ? '−' : ''}{formatCurrency(Math.abs(e.balance))}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {events.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 flex justify-between text-sm">
          <span className="font-semibold text-slate-700 dark:text-slate-200">{t('statLeft')}</span>
          <span className={`font-bold tabular-nums ${totals.left < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-white'}`}>
            {totals.left < 0 ? '−' : ''}{formatCurrency(Math.abs(totals.left))}
          </span>
        </div>
      )}
    </div>
  );
}

export function IncomeCoverage({ coverage }) {
  const { t, lang, dark } = useLocale();
  const fmtDay = (d) => new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'pt-BR', { day: '2-digit', month: 'short' }).format(new Date(`${d}T12:00:00`));
  if (!coverage.length) return null;
  return (
    <div className={`${card} p-5`}>
      <h3 className={`${cardTitle} mb-3`}>{t('coverageTitle')}</h3>
      <div className="space-y-4">
        {coverage.map((c) => (
          <div key={c.income.id}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-800 dark:text-slate-100">{c.income.name} <span className="text-xs text-slate-400">· {fmtDay(c.date)}</span></span>
              <span className="tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">+ {formatCurrency(c.amount)}</span>
            </div>
            {c.bills.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('coverageNoCards')}</p>
            ) : (
              <>
                {c.bills.map((b) => (
                  <div key={b.card.id} className="flex items-center justify-between text-sm mt-1 pl-3 border-l-2" style={{ borderColor: categoryColor(b.card.color, dark) }}>
                    <span className="text-slate-600 dark:text-slate-300 truncate">{t('flowCard', { name: b.card.name })} <span className="text-xs text-slate-400">· {b.dueDate ? fmtDay(b.dueDate) : ''}</span></span>
                    <span className="tabular-nums text-slate-700 dark:text-slate-200">− {formatCurrency(b.total)}</span>
                  </div>
                ))}
                <div className="h-2 mt-2 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, c.amount ? (c.billsTotal / c.amount) * 100 : 100)}%`, background: c.left < 0 ? '#d03b3b' : c.left < c.amount * 0.2 ? '#fab219' : '#0ca30c' }} />
                </div>
                <p className={`text-xs mt-1 font-medium ${c.left < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}`}>
                  {c.left < 0 ? t('coverageShort', { amount: formatCurrency(-c.left) }) : t('coverageLeft', { amount: formatCurrency(c.left) })}
                </p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
