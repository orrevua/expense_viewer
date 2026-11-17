'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { useLocale } from './LocaleProvider';
import CategoryDot from './CategoryDot';

export default function TransactionRow({ tx, category, onEdit, onDelete, compact = false }) {
  const { t, lang } = useLocale();
  const isIncome = tx.kind === 'income';
  const dateLabel = new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'pt-BR', { day: '2-digit', month: 'short' })
    .format(new Date(`${tx.date}T12:00:00`));

  return (
    <li className="group flex items-center gap-3 py-3 px-1">
      <CategoryDot color={category?.color || 'gray'} size={12} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{tx.description}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
          {category?.name || t('uncategorized')} · {t(`pm_${tx.payment_method}`)}{compact ? ` · ${dateLabel}` : ''}
          {tx.notes && !compact ? ` · ${tx.notes}` : ''}
        </p>
      </div>
      <span className={`text-sm font-semibold tabular-nums whitespace-nowrap ${isIncome ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}>
        {isIncome ? '+' : '−'} {formatCurrency(tx.amount)}
      </span>
      {(onEdit || onDelete) && (
        <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
          {onEdit && (
            <button onClick={() => onEdit(tx)} className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-white/10" title={t('edit')} aria-label={t('edit')}>
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(tx)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10" title={t('delete')} aria-label={t('delete')}>
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </li>
  );
}
