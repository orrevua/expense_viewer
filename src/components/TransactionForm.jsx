'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { addTransaction, updateTransaction, errorMessage } from '@/lib/financeClient';
import { useLocale } from './LocaleProvider';
import { input, label, primaryBtn } from './ui';
import { todayISO } from '@/utils/month';

export const PAYMENT_METHODS = ['pix', 'credit', 'debit', 'cash', 'transfer', 'boleto', 'other'];

// Modal form to add or edit a transaction.
export default function TransactionForm({ categories, accounts = [], transaction, defaultDate, onClose }) {
  const { t } = useLocale();
  const editing = !!transaction?.id;
  const [form, setForm] = useState(() => ({
    kind: transaction?.kind || 'expense',
    amount: transaction ? String(transaction.amount).replace('.', ',') : '',
    description: transaction?.description || '',
    category_id: transaction?.category_id || '',
    account_id: transaction?.account_id || '',
    date: transaction?.date || defaultDate || todayISO(),
    payment_method: transaction?.payment_method || 'pix',
    notes: transaction?.notes || '',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setAccount = (e) => {
    const id = e.target.value;
    const acc = accounts.find((a) => a.id === id);
    setForm((f) => ({
      ...f,
      account_id: id,
      payment_method: acc?.type === 'credit_card' ? 'credit' : acc?.type === 'cash' ? 'cash' : f.payment_method === 'credit' ? 'pix' : f.payment_method,
    }));
  };
  const kindCategories = categories.filter((c) => c.kind === form.kind);

  const setKind = (kind) => setForm((f) => ({
    ...f,
    kind,
    category_id: categories.find((c) => c.id === f.category_id)?.kind === kind ? f.category_id : '',
  }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, category_id: form.category_id || null, account_id: form.account_id || null };
      if (editing) await updateTransaction(transaction.id, payload);
      else await addTransaction(payload);
      onClose();
    } catch (err) {
      console.error(err);
      setError(errorMessage(t, err));
      setSaving(false);
    }
  };

  const kindBtn = (k) => `flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
    form.kind === k
      ? k === 'expense' ? 'bg-white dark:bg-white/15 text-slate-800 dark:text-white shadow-sm' : 'bg-white dark:bg-white/15 text-emerald-700 dark:text-emerald-300 shadow-sm'
      : 'text-slate-500 dark:text-slate-400'
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} className="w-full sm:max-w-lg bg-white dark:bg-[#1a1424] rounded-t-2xl sm:rounded-2xl shadow-xl border border-slate-200/60 dark:border-white/10 p-6 space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">{t(editing ? 'editTransaction' : 'addTransaction')}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-xl">
          <button type="button" className={kindBtn('expense')} onClick={() => setKind('expense')}>{t('expense')}</button>
          <button type="button" className={kindBtn('income')} onClick={() => setKind('income')}>{t('income')}</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className={label}>{t('amountLabel')}</label>
            <input className={input} inputMode="decimal" required autoFocus placeholder="0,00" value={form.amount} onChange={set('amount')} pattern="[0-9]+([.,][0-9]{1,2})?" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className={label}>{t('date')}</label>
            <input className={input} type="date" required value={form.date} onChange={set('date')} />
          </div>
          <div className="col-span-2">
            <label className={label}>{t('description')}</label>
            <input className={input} required maxLength={200} value={form.description} onChange={set('description')} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className={label}>{t('category')}</label>
            <select className={input} value={form.category_id} onChange={set('category_id')}>
              <option value="">{t('uncategorized')}</option>
              {kindCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className={label}>{t('paymentMethod')}</label>
            <select className={input} value={form.payment_method} onChange={set('payment_method')}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{t(`pm_${m}`)}</option>)}
            </select>
          </div>
          {accounts.length > 0 && (
            <div className="col-span-2">
              <label className={label}>{t('account')}</label>
              <select className={input} value={form.account_id} onChange={setAccount}>
                <option value="">{t('noAccount')}</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {t(`type_${a.type}`)}</option>)}
              </select>
            </div>
          )}
          <div className="col-span-2">
            <label className={label}>{t('notes')}</label>
            <textarea className={input} rows={2} maxLength={1000} value={form.notes} onChange={set('notes')} />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <button type="submit" disabled={saving} className={`${primaryBtn} w-full`}>
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {saving ? t('saving') : t('save')}
        </button>
      </form>
    </div>
  );
}
