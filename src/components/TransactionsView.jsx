'use client';

import { useMemo, useState, useCallback } from 'react';
import { Plus, Download, Search } from 'lucide-react';
import { deleteTransaction } from '@/actions/finance';
import { formatCurrency } from '@/utils/currency';
import { currentMonthKey, todayISO } from '@/utils/month';
import { useLocale } from './LocaleProvider';
import TransactionForm from './TransactionForm';
import TransactionRow from './TransactionRow';
import { card, input, primaryBtn, ghostBtn } from './ui';

function csvCell(v) {
  const s = String(v ?? '');
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function TransactionsView({ month, categories, accounts = [], transactions, threshold }) {
  const { t, lang } = useLocale();
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [kind, setKind] = useState('');
  const [accountId, setAccountId] = useState('');
  const [size, setSize] = useState('');
  const [editing, setEditing] = useState(null); // null | {} (new) | tx

  const catById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const accById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return transactions.filter((tx) =>
      (!kind || tx.kind === kind) &&
      (!accountId || (accountId === 'none' ? !tx.account_id : tx.account_id === accountId)) &&
      (!size || (tx.kind === 'expense' && (size === 'major' ? tx.amount >= threshold : tx.amount < threshold))) &&
      (!categoryId || (categoryId === 'none' ? !tx.category_id : tx.category_id === categoryId)) &&
      (!needle || tx.description.toLowerCase().includes(needle) || (tx.notes || '').toLowerCase().includes(needle))
    );
  }, [transactions, q, categoryId, kind, accountId, size, threshold]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const tx of filtered) {
      if (!map.has(tx.date)) map.set(tx.date, []);
      map.get(tx.date).push(tx);
    }
    return [...map.entries()];
  }, [filtered]);

  const totals = useMemo(() => filtered.reduce((acc, tx) => {
    acc[tx.kind] += tx.amount;
    return acc;
  }, { expense: 0, income: 0 }), [filtered]);

  const onDelete = async (tx) => {
    if (!confirm(t('confirmDeleteTransaction'))) return;
    try { await deleteTransaction(tx.id); } catch { alert(t('errorSaving')); }
  };

  const close = useCallback(() => setEditing(null), []);

  const exportCsv = () => {
    const header = ['date', 'type', 'description', 'category', 'account', 'payment_method', 'amount', 'size', 'notes'];
    const rows = filtered.map((tx) => [tx.date, tx.kind, tx.description, catById[tx.category_id]?.name || '', accById[tx.account_id]?.name || '', tx.payment_method, tx.amount.toFixed(2), tx.kind === 'expense' ? (tx.amount >= threshold ? 'major' : 'minor') : '', tx.notes || '']);
    const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const dayFmt = new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const defaultDate = month === currentMonthKey() ? todayISO() : `${month}-01`;

  return (
    <div className="space-y-4">
      <div className={`${card} p-4 space-y-3`}>
       <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input className={`${input} pl-9`} placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button className={ghostBtn} onClick={exportCsv} title={t('exportCsv')} aria-label={t('exportCsv')} disabled={filtered.length === 0}><Download className="w-4 h-4" /><span className="hidden sm:inline">{t('exportCsv')}</span></button>
          <button className={`${primaryBtn} flex-1 sm:flex-none`} onClick={() => setEditing({})}><Plus className="w-4 h-4" />{t('addTransaction')}</button>
        </div>
       </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {accounts.length > 0 && (
            <select className={`${input}`} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">{t('allAccounts')}</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              <option value="none">{t('noAccount')}</option>
            </select>
          )}
          <select className={`${input}`} value={size} onChange={(e) => setSize(e.target.value)}>
            <option value="">{t('allSizes')}</option>
            <option value="major">{t('major')} (≥ {formatCurrency(threshold)})</option>
            <option value="minor">{t('minor')}</option>
          </select>
          <select className={`${input}`} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">{t('allCategories')}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="none">{t('uncategorized')}</option>
          </select>
          <select className={`${input}`} value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">{t('allTypes')}</option>
            <option value="expense">{t('expense')}</option>
            <option value="income">{t('income')}</option>
          </select>
        </div>
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400 px-1">
        {t('transactionsCount', { count: filtered.length })} · {t('filteredTotal', { expense: formatCurrency(totals.expense), income: formatCurrency(totals.income) })}
      </p>

      {groups.length === 0 ? (
        <div className={`${card} p-10 text-center text-slate-500 dark:text-slate-400`}>{t('noTransactions')}</div>
      ) : (
        <div className="space-y-4">
          {groups.map(([date, list]) => {
            const dayNet = list.reduce((acc, tx) => acc + (tx.kind === 'income' ? tx.amount : -tx.amount), 0);
            return (
              <section key={date} className={`${card} px-4 py-2`}>
                <div className="flex justify-between items-center pt-2 pb-1 border-b border-slate-100 dark:border-white/5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{dayFmt.format(new Date(`${date}T12:00:00`))}</h3>
                  <span className="text-xs font-medium tabular-nums text-slate-500 dark:text-slate-400">{dayNet >= 0 ? '+' : '−'} {formatCurrency(Math.abs(dayNet))}</span>
                </div>
                <ul className="divide-y divide-slate-100 dark:divide-white/5">
                  {list.map((tx) => (
                    <TransactionRow key={tx.id} tx={tx} category={catById[tx.category_id]} account={accById[tx.account_id]} threshold={threshold} onEdit={setEditing} onDelete={onDelete} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {editing && <TransactionForm categories={categories} accounts={accounts} transaction={editing.id ? editing : null} defaultDate={defaultDate} onClose={close} />}
    </div>
  );
}
