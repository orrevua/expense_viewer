'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { setMajorThreshold } from '@/actions/finance';
import { formatCurrency } from '@/utils/currency';
import { CATEGORY_COLORS } from '@/lib/palette';
import { useLocale } from './LocaleProvider';
import CategoryDot from './CategoryDot';
import { card, cardTitle, input } from './ui';

export default function MajorMinorCard({ size, categories }) {
  const { t, dark } = useLocale();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(size.threshold).replace('.', ','));
  const [saving, setSaving] = useState(false);
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const total = size.major.total + size.minor.total;
  const majorPct = total ? (size.major.total / total) * 100 : 0;
  const cMajor = dark ? CATEGORY_COLORS.violet.dark : CATEGORY_COLORS.violet.light;
  const cMinor = dark ? CATEGORY_COLORS.aqua.dark : CATEGORY_COLORS.aqua.light;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await setMajorThreshold(value); setEditing(false); } catch { alert(t('errorSaving')); }
    setSaving(false);
  };

  return (
    <div className={`${card} p-5 h-full`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className={cardTitle}>{t('majorMinorTitle')}</h3>
      </div>

      {editing ? (
        <form onSubmit={save} className="flex items-end gap-2 mb-3">
          <label className="flex-1 text-xs text-slate-500 dark:text-slate-400">
            {t('thresholdLabel')}
            <input className={`${input} mt-1 py-2`} autoFocus inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,2})?" value={value} onChange={(e) => setValue(e.target.value)} />
          </label>
          <button className="px-3 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('save')}</button>
        </form>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          {t('majorFrom', { amount: formatCurrency(size.threshold) })} ·{' '}
          <button onClick={() => setEditing(true)} className="text-violet-600 dark:text-violet-400 font-medium">{t('changeThreshold')}</button>
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {[['major', cMajor], ['minor', cMinor]].map(([k, c]) => (
          <div key={k}>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />{t(k)}</p>
            <p className="text-lg font-bold tabular-nums text-slate-800 dark:text-white">{formatCurrency(size[k].total)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('countItems', { count: size[k].count })}</p>
          </div>
        ))}
      </div>
      {total > 0 && (
        <div className="flex h-2 mt-3 rounded-full overflow-hidden gap-[2px]">
          {majorPct > 0 && <div style={{ width: `${majorPct}%`, background: cMajor }} />}
          {majorPct < 100 && <div style={{ width: `${100 - majorPct}%`, background: cMinor }} />}
        </div>
      )}

      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mt-5 mb-1">{t('topExpenses')}</h4>
      {size.top.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 py-2">{t('noSpending')}</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-white/5">
          {size.top.map((tx) => (
            <li key={tx.id} className="flex items-center gap-2 py-2 text-sm">
              <CategoryDot color={catById[tx.category_id]?.color || 'gray'} />
              <span className="flex-1 min-w-0 truncate text-slate-700 dark:text-slate-200">{tx.description}</span>
              <span className="tabular-nums font-medium text-slate-800 dark:text-slate-100">{formatCurrency(tx.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
