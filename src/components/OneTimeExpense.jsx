'use client';
import React, { useTransition } from 'react';
import { formatCurrency } from '@/utils/currency';
import { toggleOneTimeExpenseStatus, deleteOneTimeExpense } from '@/actions/dashboard';
import { Trash, CheckCircle, Circle } from 'lucide-react';
import { useLocale } from './LocaleProvider';

export default function OneTimeExpense({ expense, isReadOnly }) {
  const [isPending, startTransition] = useTransition();
  const { t } = useLocale();

  const handleToggle = () => {
    if (!expense.id || isReadOnly) return;
    startTransition(() => {
      toggleOneTimeExpenseStatus(expense.id, expense.status);
    });
  };

  const isPaid = expense.status === 'paid';

  const handleDelete = () => {
    if (!expense.id || isReadOnly) return;
    if (!confirm(t('deleteConfirm', { name: expense.name }))) return;
    startTransition(() => {
      deleteOneTimeExpense(expense.id);
    });
  };

  return (
    <div className={`flex justify-between items-center bg-white/70 dark:bg-white/5 backdrop-blur-sm p-4 rounded-2xl shadow-sm border border-slate-200/60 dark:border-white/10 mb-2 transition-all ${isPaid ? 'opacity-70' : ''}`}>
      <div className="flex items-center gap-3">
        {!isReadOnly && (
          <button
            onClick={handleToggle}
            disabled={isPending}
            className="text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors disabled:opacity-50"
            title={isPaid ? t('markAsPending') : t('markAsPaid')}
          >
            {isPaid ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5" />}
          </button>
        )}
        <span className={`font-medium ${isPaid && !isReadOnly ? 'text-slate-500 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{expense.name}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(expense.amount)}</span>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${isPaid ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'}`}>
          {t(expense.status) || t('pending')}
        </span>
        {!isReadOnly && (
          <button onClick={handleDelete} className="p-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg ml-1 transition-all" title={t('deleteExpense')}>
            <Trash className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
