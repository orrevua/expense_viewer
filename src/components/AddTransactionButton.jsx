'use client';

import { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { useLocale } from './LocaleProvider';
import TransactionForm from './TransactionForm';
import { primaryBtn } from './ui';
import { currentMonthKey, todayISO } from '@/utils/month';

export default function AddTransactionButton({ categories, month }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button className={primaryBtn} onClick={() => setOpen(true)}><Plus className="w-4 h-4" />{t('addTransaction')}</button>
      {open && <TransactionForm categories={categories} defaultDate={month === currentMonthKey() ? todayISO() : `${month}-01`} onClose={close} />}
    </>
  );
}
