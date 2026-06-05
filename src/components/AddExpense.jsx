'use client';

import React, { useState } from 'react';
import { addOneTimeExpense, addInstallmentExpense } from '@/actions/dashboard';
import { PlusCircle, X } from 'lucide-react';
import { useLocale } from './LocaleProvider';

export default function AddExpense({ dashboardId }) {
  const { t, translateMonth } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [expenseType, setExpenseType] = useState('one-time');
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [installments, setInstallments] = useState('');
  const [status, setStatus] = useState('pending');
  const [startMonth, setStartMonth] = useState('May/2026');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dashboardId) return alert(t('selectDashboard'));
    setLoading(true);

    try {
      const numAmount = parseFloat(amount.replace(',', '.'));

      if (expenseType === 'one-time') {
        await addOneTimeExpense(dashboardId, {
          name,
          amount: Math.max(0, numAmount),
          status
        });
      } else {
        const numInstallments = parseInt(installments) || 1;
        const totalAmount = Math.max(0, numAmount);
        const installmentAmount = totalAmount / numInstallments;

        await addInstallmentExpense(dashboardId, {
          name,
          total_amount: totalAmount,
          installments: numInstallments,
          paid_installments: 0,
          installment_amount: installmentAmount,
          start_month: startMonth
        });
      }

      setName('');
      setAmount('');
      setInstallments('');
      setStatus('pending');
      setStartMonth('May/2026');
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to add expense:', error);
      alert('Failed to add expense. Check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 bg-slate-50/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 dark:focus:border-violet-400 transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500";
  const selectClass = "w-full px-4 py-2.5 bg-slate-50/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 dark:focus:border-violet-400 transition-all text-slate-800 dark:text-slate-100 appearance-none";
  const labelClass = "block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5";

  return (
    <div className="mb-6">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-md shadow-violet-500/20 hover:shadow-lg hover:shadow-violet-500/30"
        >
          <PlusCircle className="w-5 h-5" />
          {t('addNewExpense')}
        </button>
      ) : (
        <div className="bg-white/70 dark:bg-white/5 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-slate-200/60 dark:border-white/10 relative">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-5">{t('addNewExpense')}</h2>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setExpenseType('one-time')}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${expenseType === 'one-time' ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 shadow-sm' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'}`}
            >
              {t('oneTime')}
            </button>
            <button
              onClick={() => setExpenseType('installment')}
              className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${expenseType === 'installment' ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 shadow-sm' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'}`}
            >
              {t('installment')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>{t('expenseName')}</label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Grocery Shopping"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                {expenseType === 'installment' ? t('totalAmount') : t('amount')}
              </label>
              <input
                required
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>

            {expenseType === 'installment' && (
              <div>
                <label className={labelClass}>{t('installments')}</label>
                <input
                  required
                  type="number"
                  min="2"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  placeholder="e.g., 10"
                  className={inputClass}
                />
              </div>
            )}

            {expenseType === 'installment' && (
              <div>
                <label className={labelClass}>{t('startMonthLabel')}</label>
                <select
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                  className={selectClass}
                >
                  <option value="Dec/2025">{translateMonth("Dec/2025")}</option>
                  <option value="Jan/2026">{translateMonth("Jan/2026")}</option>
                  <option value="Feb/2026">{translateMonth("Feb/2026")}</option>
                  <option value="Mar/2026">{translateMonth("Mar/2026")}</option>
                  <option value="Apr/2026">{translateMonth("Apr/2026")}</option>
                  <option value="May/2026">{translateMonth("May/2026")}</option>
                  <option value="Jun/2026">{translateMonth("Jun/2026")}</option>
                  <option value="Jul/2026">{translateMonth("Jul/2026")}</option>
                  <option value="Aug/2026">{translateMonth("Aug/2026")}</option>
                  <option value="Sep/2026">{translateMonth("Sep/2026")}</option>
                  <option value="Oct/2026">{translateMonth("Oct/2026")}</option>
                  <option value="Nov/2026">{translateMonth("Nov/2026")}</option>
                </select>
              </div>
            )}

            {expenseType === 'one-time' && (
              <div>
                <label className={labelClass}>{t('status')}</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={selectClass}
                >
                  <option value="pending">{t('pending')}</option>
                  <option value="paid">{t('paid')}</option>
                </select>
              </div>
            )}

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-medium py-3 rounded-xl transition-all mt-2 disabled:opacity-50 shadow-md shadow-violet-500/20 hover:shadow-lg"
            >
              {loading ? '...' : t('saveExpense')}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
