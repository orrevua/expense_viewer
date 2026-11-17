'use client';

import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useLocale } from './LocaleProvider';

const STYLES = {
  paid: { Icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', key: 'statusPaid' },
  pending: { Icon: Clock, cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', key: 'statusPending' },
  late: { Icon: AlertCircle, cls: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300', key: 'statusLate' },
};

export default function StatusPill({ status }) {
  const { t } = useLocale();
  const s = STYLES[status] || STYLES.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>
      <s.Icon className="w-3.5 h-3.5" />{t(s.key)}
    </span>
  );
}
