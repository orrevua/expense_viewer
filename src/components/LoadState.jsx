'use client';

import { Database, AlertTriangle } from 'lucide-react';
import { useLocale } from './LocaleProvider';
import { card } from './ui';

export default function LoadState({ result }) {
  const { t } = useLocale();
  if (result.setupRequired) {
    return (
      <div className={`${card} p-6 border-l-4 border-l-amber-400 flex gap-4`}>
        <Database className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <h2 className="font-semibold text-slate-800 dark:text-white">{t('setupTitle')}</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{t('setupBody')}</p>
        </div>
      </div>
    );
  }
  return (
    <div className={`${card} p-6 border-l-4 border-l-red-500 flex gap-4`}>
      <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
      <p className="text-sm text-slate-700 dark:text-slate-200">{t('loadError', { error: result.error || '' })}</p>
    </div>
  );
}
