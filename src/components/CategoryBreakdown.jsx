'use client';

import { formatCurrency } from '@/utils/currency';
import { categoryColor } from '@/lib/palette';
import { useLocale } from './LocaleProvider';
import { card, cardTitle } from './ui';

export default function CategoryBreakdown({ byCategory, categories }) {
  const { t, dark } = useLocale();
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const rows = Object.entries(byCategory)
    .map(([id, amount]) => ({ id, amount, cat: catById[id] }))
    .sort((a, b) => b.amount - a.amount);
  const total = rows.reduce((a, r) => a + r.amount, 0);
  const max = rows[0]?.amount || 1;

  return (
    <div className={`${card} p-5`}>
      <h3 className={`${cardTitle} mb-4`}>{t('byCategory')}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 py-6 text-center">{t('noSpending')}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const pct = total ? (r.amount / total) * 100 : 0;
            const name = r.cat?.name || t('uncategorized');
            return (
              <li key={r.id} title={`${name}: ${formatCurrency(r.amount)} (${pct.toFixed(1)}%)`}>
                <div className="flex items-baseline justify-between gap-3 text-sm mb-1">
                  <span className="text-slate-700 dark:text-slate-200 truncate">{name}</span>
                  <span className="tabular-nums text-slate-800 dark:text-slate-100 font-medium whitespace-nowrap">
                    {formatCurrency(r.amount)} <span className="text-slate-400 dark:text-slate-500 font-normal">· {pct.toFixed(0)}%</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(2, (r.amount / max) * 100)}%`, background: categoryColor(r.cat?.color || 'gray', dark) }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
