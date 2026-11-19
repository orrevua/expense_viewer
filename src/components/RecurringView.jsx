'use client';

import { useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Loader2, Check, Undo2, CalendarOff, Repeat } from 'lucide-react';
import { createRecurring, updateRecurring, deleteRecurring, endRecurring, markRecurringPaid, unmarkRecurringPaid, errorMessage } from '@/lib/financeClient';
import { formatCurrency } from '@/utils/currency';
import { useLocale } from './LocaleProvider';
import Modal from './Modal';
import StatusPill from './StatusPill';
import CategoryDot from './CategoryDot';
import { PAYMENT_METHODS } from './TransactionForm';
import { card, cardTitle, input, label, primaryBtn, ghostBtn } from './ui';

function RecurringForm({ item, kind: defaultKind, month, categories, accounts, onClose }) {
  const { t } = useLocale();
  const [form, setForm] = useState({
    kind: item?.kind || defaultKind || 'expense',
    name: item?.name || '',
    amount: item ? String(item.amount).replace('.', ',') : '',
    due_day: item?.due_day || 10,
    category_id: item?.category_id || '',
    account_id: item?.account_id || '',
    payment_method: item?.payment_method || 'pix',
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isIncome = form.kind === 'income';

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, category_id: form.category_id || null, account_id: form.account_id || null, start_month: month };
      if (item) await updateRecurring(item.id, payload);
      else await createRecurring(payload);
      onClose();
    } catch (e) {
      alert(errorMessage(t, e));
      setSaving(false);
    }
  };

  return (
    <Modal title={t(item ? 'editRecurring' : isIncome ? 'addFixedIncome' : 'addRecurring')} onClose={onClose} onSubmit={submit}>
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-xl">
        {['expense', 'income'].map((k) => (
          <button key={k} type="button" onClick={() => setForm((f) => ({ ...f, kind: k, category_id: '' }))}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold ${form.kind === k ? 'bg-white dark:bg-white/15 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
            {t(k)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={label}>{t('description')}</label>
          <input className={input} required autoFocus maxLength={120} value={form.name} onChange={set('name')} placeholder={isIncome ? 'Salário, Adiantamento…' : 'Aluguel, Internet, Netflix…'} />
        </div>
        <div>
          <label className={label}>{t('amountLabel')}</label>
          <input className={input} required inputMode="decimal" placeholder="0,00" pattern="[0-9]+([.,][0-9]{1,2})?" value={form.amount} onChange={set('amount')} />
        </div>
        <div>
          <label className={label}>{t(isIncome ? 'receiveDay' : 'dueDay')}</label>
          <input className={input} type="number" min={1} max={31} required value={form.due_day} onChange={set('due_day')} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={label}>{t('category')}</label>
          <select className={input} value={form.category_id} onChange={set('category_id')}>
            <option value="">{t('uncategorized')}</option>
            {categories.filter((c) => c.kind === form.kind).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {!isIncome && (
          <div className="col-span-2 sm:col-span-1">
            <label className={label}>{t('paymentMethod')}</label>
            <select className={input} value={form.payment_method} onChange={set('payment_method')}>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{t(`pm_${m}`)}</option>)}
            </select>
          </div>
        )}
        {accounts.length > 0 && (
          <div className="col-span-2">
            <label className={label}>{t('account')}</label>
            <select className={input} value={form.account_id} onChange={set('account_id')}>
              <option value="">{t('noAccount')}</option>
              {accounts.filter((a) => !isIncome || a.type !== 'credit_card').map((a) => <option key={a.id} value={a.id}>{a.name} · {t(`type_${a.type}`)}</option>)}
            </select>
          </div>
        )}
      </div>
      <button type="submit" disabled={saving} className={`${primaryBtn} w-full`}>
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}{saving ? t('saving') : t('save')}
      </button>
    </Modal>
  );
}

function RecurringRow({ item, month, category, account, onEdit }) {
  const { t, lang } = useLocale();
  const [busy, setBusy] = useState(false);
  const fmtDay = new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'pt-BR', { day: '2-digit', month: 'short' });
  const run = async (fn) => {
    setBusy(true);
    try { await fn(); } catch (e) { alert(errorMessage(t, e)); }
    setBusy(false);
  };

  const isIncome = item.kind === 'income';
  const pay = () => {
    const value = prompt(t(isIncome ? 'amountReceivedPrompt' : 'amountPaidPrompt'), String(item.amount).replace('.', ','));
    if (value === null) return;
    run(() => markRecurringPaid(item.id, month, value.trim() || item.amount));
  };

  const iconBtn = 'p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-40';
  return (
    <li className="py-3 flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-2">
      <CategoryDot color={category?.color || 'gray'} size={12} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{item.name}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
          {isIncome ? fmtDay.format(new Date(`${item.dueDate}T12:00:00`)) : t('dueOn', { date: fmtDay.format(new Date(`${item.dueDate}T12:00:00`)) })} · {category?.name || t('uncategorized')}{isIncome ? (account ? ` · ${account.name}` : '') : ` · ${account ? account.name : t(`pm_${item.payment_method}`)}`}
        </p>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold tabular-nums ${isIncome ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}>{isIncome ? '+ ' : ''}{formatCurrency(item.status === 'paid' ? item.paidAmount : item.amount)}</p>
        {item.status === 'paid' && item.paidAmount !== item.amount && (
          <p className="text-[11px] text-slate-400 tabular-nums line-through">{formatCurrency(item.amount)}</p>
        )}
      </div>
      <div className="w-24 flex justify-end"><StatusPill status={item.status} income={isIncome} /></div>
      <div className="flex items-center gap-1 ml-auto sm:ml-0">
        {item.status === 'paid' ? (
          <button className={`${ghostBtn} py-1.5`} disabled={busy} onClick={() => {
            if (!confirm(t('confirmUndoPaid', { name: item.name, amount: formatCurrency(item.paidAmount), date: fmtDay.format(new Date(`${item.paidDate}T12:00:00`)) }))) return;
            run(() => unmarkRecurringPaid(item.id, month, item.paymentId));
          }}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}{t('undoPaid')}
          </button>
        ) : (
          <button className={`${primaryBtn} py-1.5 px-3 text-sm`} disabled={busy} onClick={pay}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}{t(isIncome ? 'markReceived' : 'markPaid')}
          </button>
        )}
        <button className={iconBtn} onClick={() => onEdit(item)} title={t('edit')} aria-label={t('edit')}><Pencil className="w-4 h-4" /></button>
        <button className={iconBtn} disabled={busy} onClick={() => confirm(t('confirmEndRecurring', { name: item.name })) && run(() => endRecurring(item.id, month))} title={t('endRecurring')} aria-label={t('endRecurring')}><CalendarOff className="w-4 h-4" /></button>
        <button className={`${iconBtn} hover:text-red-600`} disabled={busy} onClick={() => confirm(t('confirmDeleteRecurring', { name: item.name })) && run(() => deleteRecurring(item.id))} title={t('delete')} aria-label={t('delete')}><Trash2 className="w-4 h-4" /></button>
      </div>
    </li>
  );
}

export function RecurringSummary({ summary }) {
  const { t } = useLocale();
  const pct = summary.total ? Math.round((summary.paid / summary.total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-2xl font-bold text-slate-800 dark:text-white tabular-nums">{formatCurrency(summary.total)}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('recurringPaidOf', { paid: summary.paidCount, count: summary.count })}</p>
      </div>
      <div className="h-2 mt-3 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
        <div className="h-full rounded-full bg-[#0ca30c]" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        {summary.pending + summary.late === 0
          ? t('allPaid')
          : <>
              {t('recurringLeft', { amount: formatCurrency(summary.pending + summary.late) })}
              {summary.late > 0 && <span className="text-red-600 dark:text-red-400 font-medium"> · {t('recurringLate', { amount: formatCurrency(summary.late) })}</span>}
            </>}
      </p>
    </div>
  );
}

function Section({ title, hint, empty, items, month, catById, accById, onEdit }) {
  const order = { late: 0, pending: 1, paid: 2 };
  const sorted = [...items].sort((a, b) => a.due_day - b.due_day || order[a.status] - order[b.status]);
  return (
    <div className={`${card} p-5`}>
      <h3 className={cardTitle}>{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-2">{hint}</p>
      {sorted.length === 0 ? (
        <div className="py-8 text-center text-slate-500 dark:text-slate-400">
          <Repeat className="w-8 h-8 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-sm">{empty}</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-white/5">
          {sorted.map((item) => (
            <RecurringRow key={item.id} item={item} month={month} category={catById[item.category_id]} account={accById[item.account_id]} onEdit={onEdit} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function RecurringView({ month, items, incomes = [], summary, incomeSummary, categories, accounts }) {
  const { t } = useLocale();
  const [editing, setEditing] = useState(null);
  const close = useCallback(() => setEditing(null), []);
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const accById = Object.fromEntries(accounts.map((a) => [a.id, a]));

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="space-y-6 lg:order-2">
        <div className={`${card} p-5`}>
          <h3 className={`${cardTitle} mb-3`}>{t('incomeTotal')}</h3>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{formatCurrency(incomeSummary?.total || 0)}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('recurringPaidOf', { paid: incomeSummary?.paidCount || 0, count: incomeSummary?.count || 0 })}</p>
        </div>
        <div className={`${card} p-5`}>
          <h3 className={`${cardTitle} mb-3`}>{t('recurringTotal')}</h3>
          <RecurringSummary summary={summary} />
        </div>
        <div className="grid grid-cols-1 gap-3">
          <button className={`${primaryBtn} w-full`} onClick={() => setEditing({ kind: 'expense' })}><Plus className="w-4 h-4" />{t('addRecurring')}</button>
          <button className={`${ghostBtn} w-full py-2.5`} onClick={() => setEditing({ kind: 'income' })}><Plus className="w-4 h-4" />{t('addFixedIncome')}</button>
        </div>
      </div>

      <div className="space-y-6 lg:col-span-2 lg:order-1">
        <Section title={t('fixedIncomeTitle')} hint={t('fixedIncomeHint')} empty={t('noFixedIncome')} items={incomes} month={month} catById={catById} accById={accById} onEdit={setEditing} />
        <Section title={t('recurringTitle')} hint={t('recurringHint')} empty={t('noRecurring')} items={items} month={month} catById={catById} accById={accById} onEdit={setEditing} />
      </div>

      {editing && <RecurringForm item={editing.id ? editing : null} kind={editing.kind} month={month} categories={categories} accounts={accounts} onClose={close} />}
    </div>
  );
}
