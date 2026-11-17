'use client';

import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { STATUS } from '@/lib/palette';
import { useLocale } from './LocaleProvider';
import CategoryDot from './CategoryDot';

export function budgetStatus(spent, limit) {
  const ratio = limit ? spent / limit : 0;
  if (ratio > 1) return { key: 'budgetExceeded', color: STATUS.critical, Icon: XCircle, ratio };
  if (ratio >= 0.8) return { key: 'budgetNear', color: STATUS.warning, Icon: AlertTriangle, ratio };
  return { key: 'budgetOk', color: STATUS.good, Icon: CheckCircle2, ratio };
}

export default function BudgetProgress({ category, spent, limit }) {
  const { t } = useLocale();
  const s = budgetStatus(spent, limit);
  const diff = limit - spent;
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm mb-1.5">
        <span className="flex items-center gap-2 min-w-0">
          <CategoryDot color={category.color} />
          <span className="text-slate-700 dark:text-slate-200 truncate">{category.name}</span>
        </span>
        <span className="tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
          {t('budgetOf', { spent: formatCurrency(spent), limit: formatCurrency(limit) })}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, s.ratio * 100)}%`, background: s.color }} />
      </div>
      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
        <s.Icon className="w-3.5 h-3.5" style={{ color: s.color }} />
        {t(s.key)} · {diff >= 0 ? t('budgetLeft', { amount: formatCurrency(diff) }) : t('budgetOver', { amount: formatCurrency(-diff) })}
      </p>
    </div>
  );
}
