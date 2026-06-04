'use client';
import React, { useState, useTransition } from 'react';
import { formatCurrency } from '@/utils/currency';
import { incrementInstallment, decrementInstallment, deleteInstallmentExpense, editInstallmentExpense } from '@/actions/dashboard';
import { Plus, Minus, Trash, Pencil, X, Check } from 'lucide-react';
import { useLocale } from './LocaleProvider';
import InstallmentTimeline from './InstallmentTimeline';

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_MAP = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

function computeEndMonth(startMonth, installments) {
  if (!startMonth) return '';
  const [shortMonth, year] = startMonth.split('/');
  const monthIdx = MONTH_MAP[shortMonth];
  if (monthIdx === undefined) return '';
  const d = new Date(parseInt(year), monthIdx + installments - 1, 1);
  return `${MONTH_ABBR[d.getMonth()]}/${d.getFullYear()}`;
}

const MONTH_OPTIONS = [
  'Dec/2025', 'Jan/2026', 'Feb/2026', 'Mar/2026', 'Apr/2026', 'May/2026',
  'Jun/2026', 'Jul/2026', 'Aug/2026', 'Sep/2026', 'Oct/2026', 'Nov/2026',
  'Dec/2026', 'Jan/2027', 'Feb/2027', 'Mar/2027', 'Apr/2027', 'May/2027',
  'Jun/2027', 'Jul/2027', 'Aug/2027', 'Sep/2027', 'Oct/2027', 'Nov/2027',
];

export default function InstallmentCard({ expense, isReadOnly, timeline }) {
  const [isPending, startTransition] = useTransition();
  const { t, translateMonth } = useLocale();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(expense.name);
  const [editTotal, setEditTotal] = useState(expense.total_amount);
  const [editInstallments, setEditInstallments] = useState(expense.installments);
  const [editStartMonth, setEditStartMonth] = useState(expense.start_month);

  const progress = (expense.paid_installments / expense.installments) * 100;
  const isFullyPaid = expense.paid_installments >= expense.installments;
  const endMonth = computeEndMonth(expense.start_month, expense.installments);

  const handleIncrement = () => {
    if (!expense.id || isFullyPaid || isReadOnly) return;
    startTransition(() => incrementInstallment(expense.id, expense.paid_installments, expense.installments));
  };

  const handleDecrement = () => {
    if (!expense.id || expense.paid_installments <= 0 || isReadOnly) return;
    startTransition(() => decrementInstallment(expense.id, expense.paid_installments, expense.installments));
  };

  const handleDelete = () => {
    if (!expense.id || isReadOnly) return;
    if (!confirm(t('deleteConfirm', { name: expense.name }))) return;
    startTransition(() => deleteInstallmentExpense(expense.id));
  };

  const handleEdit = () => {
    setEditName(expense.name);
    setEditTotal(expense.total_amount);
    setEditInstallments(expense.installments);
    setEditStartMonth(expense.start_month);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!expense.id) return;
    const numTotal = parseFloat(String(editTotal).replace(',', '.'));
    const numInstallments = parseInt(editInstallments) || 2;
    startTransition(async () => {
      await editInstallmentExpense(expense.id, {
        name: editName,
        total_amount: Math.max(0, numTotal),
        installments: Math.max(1, numInstallments),
        start_month: editStartMonth,
      });
      setIsEditing(false);
    });
  };

  if (isEditing) {
    return (
      <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-200 mb-3">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-blue-700 text-sm">{t('editInstallment')}</h3>
          <button onClick={() => setIsEditing(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t('editName')}</label>
            <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t('editTotalAmount')}</label>
              <input type="number" step="0.01" value={editTotal} onChange={e => setEditTotal(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t('editInstallmentsCount')}</label>
              <input type="number" min="1" value={editInstallments} onChange={e => setEditInstallments(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t('editStartMonth')}</label>
            <select value={editStartMonth} onChange={e => setEditStartMonth(e.target.value)} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-800 bg-white outline-none focus:ring-2 focus:ring-blue-400">
              {MONTH_OPTIONS.map(m => <option key={m} value={m}>{translateMonth(m)}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button disabled={isPending} onClick={handleSave} className="flex-1 flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg disabled:opacity-50 transition-colors">
              <Check className="w-4 h-4" /> {t('editSave')}
            </button>
            <button onClick={() => setIsEditing(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium py-2 rounded-lg transition-colors">
              {t('editCancel')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-3 transition-opacity ${isFullyPaid ? 'opacity-70' : ''}`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className={`font-semibold ${isFullyPaid && !isReadOnly ? 'text-slate-500 line-through' : 'text-slate-700'}`}>{expense.name}</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-500">
            {t('installmentsProgress', { paid: expense.paid_installments, total: expense.installments })}
          </span>
          {!isReadOnly && (
            <button onClick={handleEdit} className="p-1 border border-slate-200 rounded-md text-slate-500 hover:bg-slate-50" title={t('editInstallment')}>
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {!isReadOnly && (
            <button onClick={handleDecrement} disabled={isPending || expense.paid_installments <= 0} className="p-1 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent" title={t('markPreviousInstallment')}>
              <Minus className="w-4 h-4" />
            </button>
          )}
          {!isReadOnly && (
            <button onClick={handleIncrement} disabled={isPending || isFullyPaid} className="p-1 border border-slate-200 rounded-md text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:hover:bg-transparent" title={t('markNextInstallment')}>
              <Plus className="w-4 h-4" />
            </button>
          )}
          {!isReadOnly && (
            <button onClick={handleDelete} className="p-1 text-red-500 hover:bg-red-50 rounded-md" title={t('deleteInstallment')}>
              <Trash className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2">
        <div className={`h-2.5 rounded-full ${isFullyPaid ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
      </div>
      <InstallmentTimeline expense={expense} timeline={timeline} />
      <div className="flex justify-between text-sm">
        <div className="flex gap-3">
          <span className="text-slate-500">{t('amountPerPart')} <strong className="text-slate-700">{formatCurrency(expense.installment_amount)}</strong></span>
        </div>
        <span className="text-slate-500">{t('totalLabel')} {formatCurrency(expense.total_amount)}</span>
      </div>
      <div className="flex gap-4 mt-1.5 text-xs text-slate-400">
        <span>{t('startMonth')} <strong>{translateMonth(expense.start_month)}</strong></span>
        <span>{t('endMonth')} <strong>{translateMonth(endMonth)}</strong></span>
      </div>
    </div>
  );
}
