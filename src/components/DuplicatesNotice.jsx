'use client';

import { useState } from 'react';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { deleteTransaction, errorMessage } from '@/lib/financeClient';
import { formatCurrency } from '@/utils/currency';
import { useLocale } from './LocaleProvider';
import { card } from './ui';

// Probable duplicates (e.g. salary typed in by hand AND marked as received). They are not
// counted in the totals; this lets you delete the extra one.
export default function DuplicatesNotice({ duplicates }) {
  const { t, lang } = useLocale();
  const [busy, setBusy] = useState(null);
  if (!duplicates.length) return null;
  const fmt = (d) => new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'pt-BR', { day: '2-digit', month: 'short' }).format(new Date(`${d}T12:00:00`));
  const remove = async (d) => {
    setBusy(d.id);
    try { await deleteTransaction(d.id); } catch (e) { alert(errorMessage(t, e)); }
    setBusy(null);
  };
  return (
    <div className={`${card} p-4 border-l-4 border-l-amber-400`}>
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
        <AlertTriangle className="w-4 h-4 text-amber-500" />{t('duplicatesTitle')}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('duplicatesHint')}</p>
      <ul className="mt-2 divide-y divide-slate-100 dark:divide-white/5">
        {duplicates.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
            <span className="flex-1 min-w-0 text-slate-700 dark:text-slate-200">
              {t('duplicateLine', { name: d.description, amount: formatCurrency(d.amount), date: fmt(d.date), of: d.of, originalDate: fmt(d.originalDate) })}
            </span>
            <button onClick={() => remove(d)} disabled={busy === d.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 dark:text-red-300 dark:bg-red-500/10 dark:hover:bg-red-500/20 disabled:opacity-50">
              {busy === d.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}{t('deleteDuplicate')}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
