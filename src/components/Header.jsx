'use client';
import React from 'react';
import { formatCurrency } from '@/utils/currency';
import { useLocale } from './LocaleProvider';

export default function Header({ total, title, titleKey }) {
  const { t } = useLocale();
  const finalTitle = (titleKey && t(titleKey)) || title || t('appTitle') || 'Current Month Forecast';
  return (
    <header className="mb-6">
      <div className="bg-white/70 dark:bg-white/5 backdrop-blur-sm rounded-2xl shadow-sm p-6 border border-slate-200/60 dark:border-white/10 border-l-4 border-l-violet-500 dark:border-l-violet-400">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{finalTitle}</h2>
        <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{formatCurrency(total)}</p>
      </div>
    </header>
  );
}
