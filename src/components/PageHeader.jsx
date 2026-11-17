'use client';

import { useLocale } from './LocaleProvider';

export default function PageHeader({ titleKey, children }) {
  const { t } = useLocale();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{t(titleKey)}</h1>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
