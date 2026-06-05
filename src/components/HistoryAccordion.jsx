'use client';
import React, { useTransition } from 'react';
import { formatCurrency } from '@/utils/currency';
import { toggleMonthlyHistoryStatus } from '@/actions/dashboard';
import { ChevronDown, CheckCircle, Circle } from 'lucide-react';
import { useLocale } from './LocaleProvider';

export default function HistoryAccordion({ historyItem, isReadOnly }) {
  const [isPending, startTransition] = useTransition();
  const { t, translateMonth } = useLocale();

  const detailsArray = typeof historyItem.details === 'string'
    ? JSON.parse(historyItem.details) : historyItem.details;

  const isPaid = historyItem.status === 'paid';
  const statusLabel = t(historyItem.status) || t('pending');

  const getDetailLabel = (detail) => {
    if (detail.kind === 'installment' && detail.installmentNumber && detail.installmentTotal) {
      return `${t('installmentDetail')} ${detail.installmentNumber}/${detail.installmentTotal}`;
    }
    return detail.status === 'paid' ? t('paid') : null;
  };

  const handleToggleEvent = (e) => {
    e.preventDefault();
    if (!historyItem.id || isReadOnly) return;
    startTransition(() => {
      toggleMonthlyHistoryStatus(historyItem.id, historyItem.status);
    });
  };

  return (
    <details className={`group bg-white/70 dark:bg-white/5 backdrop-blur-sm rounded-2xl shadow-sm border-l-4 cursor-pointer mb-3 transition-all border border-slate-200/60 dark:border-white/10 ${isPaid ? 'border-l-emerald-500' : 'border-l-amber-400'}`}>
      <summary className="p-4 flex justify-between items-center list-none outline-none">
        <div className="flex items-center gap-3">
          <ChevronDown className="h-5 w-5 text-slate-400 dark:text-slate-500 group-open:rotate-180 transition-transform" />
          <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{translateMonth(historyItem.month)}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className={`font-bold ${isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}>{formatCurrency(historyItem.total_amount)}</span>
          {!isReadOnly && (
            <button
              onClick={handleToggleEvent}
              disabled={isPending}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/10 transition-all disabled:opacity-50"
            >
              {isPaid ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-amber-500" />}
              <span className={isPaid ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}>{statusLabel}</span>
            </button>
          )}
          {isReadOnly && (
             <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold">
               {isPaid ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-amber-500" />}
               <span className={isPaid ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}>{statusLabel}</span>
             </div>
          )}
        </div>
      </summary>
      <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] space-y-2 rounded-b-2xl">
        {detailsArray?.map((detail, idx) => (
          <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-slate-200/50 dark:border-white/5 last:border-0 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-slate-600 dark:text-slate-300 truncate ${detail.status === 'paid' ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
                {detail.name}
              </span>
              {getDetailLabel(detail) && (
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${detail.status === 'paid' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'}`}>
                  {getDetailLabel(detail)}
                </span>
              )}
            </div>
            <span className={`font-medium ${detail.status === 'paid' ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
              {formatCurrency(detail.amount)}
            </span>
          </div>
        ))}
      </div>
    </details>
  );
}
