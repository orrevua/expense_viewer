'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale } from './LocaleProvider';
import { monthLabel, shiftMonth, currentMonthKey, TRACKING_START } from '@/utils/month';

export default function MonthPicker({ month }) {
  const { t, lang } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const go = (key) => {
    const next = new URLSearchParams(params.toString());
    if (key === currentMonthKey()) next.delete('month');
    else next.set('month', key);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const btn = 'p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-white/10 transition-all';
  return (
    <div className="inline-flex items-center gap-1 bg-white/80 dark:bg-white/10 border border-slate-200/60 dark:border-white/10 rounded-xl p-1">
      <button className={`${btn} disabled:opacity-30 disabled:pointer-events-none`} disabled={month <= TRACKING_START} onClick={() => go(shiftMonth(month, -1))} aria-label={t('previousMonth')} title={t('previousMonth')}>
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="min-w-[9.5rem] text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
        {monthLabel(month, lang)}
      </span>
      <button className={btn} onClick={() => go(shiftMonth(month, 1))} aria-label={t('nextMonth')} title={t('nextMonth')}>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
