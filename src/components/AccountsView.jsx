'use client';

import { useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Loader2, CreditCard, Landmark, Wallet, ChevronDown, Check, Undo2, Receipt } from 'lucide-react';
import { createAccount, updateAccount, deleteAccount, setCardBillAmount, setCardBillPaid, errorMessage } from '@/lib/financeClient';
import { formatCurrency } from '@/utils/currency';
import { categoryColor, COLOR_KEYS } from '@/lib/palette';
import { useLocale } from './LocaleProvider';
import Modal from './Modal';
import CategoryDot from './CategoryDot';
import StatusPill from './StatusPill';
import { monthLabel, TRACKING_START_DATE } from '@/utils/month';
import { card, cardTitle, input, label, primaryBtn, ghostBtn } from './ui';

const TYPE_ICON = { credit_card: CreditCard, bank: Landmark, cash: Wallet };

function AccountForm({ account, defaultType, incomes = [], onClose }) {
  const { t, dark } = useLocale();
  const [form, setForm] = useState({
    name: account?.name || '',
    type: account?.type || defaultType || 'bank',
    color: account?.color || 'violet',
    closing_day: account?.closing_day || '',
    due_day: account?.due_day || '',
    credit_limit: account?.credit_limit ? String(account.credit_limit).replace('.', ',') : '',
    pay_with_id: account?.pay_with_id || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const isCard = form.type === 'credit_card';

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, pay_with_id: form.pay_with_id || null };
      if (account) await updateAccount(account.id, payload);
      else await createAccount(payload);
      onClose();
    } catch (e) {
      alert(errorMessage(t, e));
      setSaving(false);
    }
  };

  return (
    <Modal title={t(account ? 'editAccount' : isCard ? 'addCard' : 'addAccount')} onClose={onClose} onSubmit={submit}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className={label}>{t('accountName')}</label>
          <input className={input} required autoFocus maxLength={60} value={form.name} onChange={set('name')} placeholder={isCard ? 'Nubank, Itaú Visa…' : 'Nubank, Inter, Carteira…'} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={label}>{t('accountType')}</label>
          <select className={input} value={form.type} onChange={set('type')}>
            {['credit_card', 'bank', 'cash'].map((k) => <option key={k} value={k}>{t(`type_${k}`)}</option>)}
          </select>
        </div>
        {isCard && (
          <>
            <div>
              <label className={label}>{t('closingDay')}</label>
              <input className={input} type="number" min={1} max={31} value={form.closing_day} onChange={set('closing_day')} />
            </div>
            <div>
              <label className={label}>{t('dueDay')}</label>
              <input className={input} type="number" min={1} max={31} value={form.due_day} onChange={set('due_day')} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className={label}>{t('creditLimit')}</label>
              <input className={input} inputMode="decimal" placeholder="0,00" pattern="[0-9]+([.,][0-9]{1,2})?" value={form.credit_limit} onChange={set('credit_limit')} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className={label}>{t('payWith')}</label>
              <select className={input} value={form.pay_with_id} onChange={set('pay_with_id')}>
                <option value="">{t('payWithNone')}</option>
                {incomes.map((i) => <option key={i.id} value={i.id}>{i.name} (dia {i.due_day})</option>)}
              </select>
            </div>
          </>
        )}
        <div className="col-span-2 flex flex-wrap gap-1.5">
          {COLOR_KEYS.map((k) => (
            <button key={k} type="button" aria-label={k} onClick={() => setForm((f) => ({ ...f, color: k }))}
              className={`w-7 h-7 rounded-full ring-offset-2 ring-offset-white dark:ring-offset-[#1a1424] ${form.color === k ? 'ring-2 ring-slate-500 dark:ring-slate-300' : ''}`}
              style={{ background: categoryColor(k, dark) }} />
          ))}
        </div>
      </div>
      <button type="submit" disabled={saving} className={`${primaryBtn} w-full`}>
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}{saving ? t('saving') : t('save')}
      </button>
    </Modal>
  );
}

function Actions({ account, onEdit }) {
  const { t } = useLocale();
  const remove = async () => {
    if (!confirm(t('confirmDeleteAccount', { name: account.name }))) return;
    try { await deleteAccount(account.id); } catch (e) { alert(errorMessage(t, e)); }
  };
  const cls = 'p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10';
  return (
    <div className="flex items-center">
      <button className={cls} onClick={() => onEdit(account)} title={t('edit')} aria-label={t('edit')}><Pencil className="w-4 h-4" /></button>
      <button className={`${cls} hover:text-red-600`} onClick={remove} title={t('delete')} aria-label={t('delete')}><Trash2 className="w-4 h-4" /></button>
    </div>
  );
}

function CardBill({ bill, categories, incomes, onEdit }) {
  const { t, lang, dark } = useLocale();
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const { card: c, total, items, dueDate, closeDate, startDate, status, manualAmount, other, purchasesTotal, month } = bill;
  const catById = Object.fromEntries(categories.map((x) => [x.id, x]));
  const payWith = incomes.find((i) => i.id === c.pay_with_id);
  const pct = c.credit_limit ? Math.round((total / c.credit_limit) * 100) : null;
  const fmtDay = (d) => new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'pt-BR', { day: '2-digit', month: 'short' }).format(new Date(`${d}T12:00:00`));
  const shown = showAll ? items : items.slice(0, 5);

  const run = async (fn) => {
    setBusy(true);
    try { await fn(); } catch (e) { alert(errorMessage(t, e)); }
    setBusy(false);
  };
  const markPaid = () => {
    const now = new Date();
    const def = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const v = prompt(t('payDatePrompt'), def);
    if (v === null) return;
    const m = v.trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
    if (!m) return alert(t('invalidDate'));
    const iso = `${m[3] || now.getFullYear()}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    if (iso < TRACKING_START_DATE) return alert(t('beforeStart'));
    run(() => setCardBillPaid(c.id, month, true, iso));
  };
  const editAmount = () => {
    const v = prompt(t('billAmountPrompt'), manualAmount != null ? String(manualAmount).replace('.', ',') : '');
    if (v === null) return;
    run(() => setCardBillAmount(c.id, month, v.trim()));
  };

  return (
    <div className={`${card} p-5`}>
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: categoryColor(c.color, dark) }}>
          <CreditCard className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 dark:text-white truncate">{c.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {closeDate ? `${t('billOf', { month: monthLabel(closeDate.slice(0, 7), lang, { month: 'long' }).toLocaleLowerCase(lang === 'en' ? 'en-US' : 'pt-BR') })} · ` : ''}
            {dueDate ? t('dueOn', { date: fmtDay(dueDate) }) : t('cardBill')}
            {closeDate ? ` · ${t('closesOn', { date: fmtDay(closeDate) })}` : ''}
          </p>
        </div>
        <Actions account={c} onEdit={onEdit} />
      </div>

      <div className="flex items-center justify-between gap-2 mt-3">
        <p className="text-2xl font-bold text-slate-800 dark:text-white tabular-nums">{formatCurrency(total)}</p>
        <StatusPill status={status} />
      </div>
      {bill.paidAt && <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">{t('paidOnDate', { date: fmtDay(bill.paidAt) })}</p>}
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {manualAmount != null ? t('billTyped') : t('billFromPurchases')}
        {closeDate && startDate ? ` · ${t('billWindow', { start: fmtDay(startDate), end: fmtDay(closeDate) })}` : ''}
      </p>
      {payWith && <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">{t('paidWithLabel', { name: payWith.name })}</p>}

      {pct !== null && (
        <>
          <div className="h-2 mt-3 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: pct > 90 ? '#d03b3b' : pct >= 70 ? '#fab219' : categoryColor(c.color, dark) }} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('limitUsed', { pct })} · {formatCurrency(c.credit_limit)}</p>
        </>
      )}

      <div className="flex flex-wrap gap-2 mt-4">
        <button className={`${ghostBtn} py-1.5`} onClick={editAmount} disabled={busy}><Receipt className="w-4 h-4" />{t('setBillAmount')}</button>
        {status === 'paid' ? (
          <button className={`${ghostBtn} py-1.5`} onClick={() => run(() => setCardBillPaid(c.id, month, false))} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}{t('undoPaid')}
          </button>
        ) : (
          <button className={`${primaryBtn} py-1.5 px-3 text-sm`} onClick={markPaid} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}{t('markBillPaid')}
          </button>
        )}
      </div>

      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mt-4 mb-1">{t('mainSpendings')}</h4>
      {items.length === 0 && other === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 py-2">{t('noCardSpending')}</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-white/5">
          {shown.map((tx) => (
            <li key={tx.id} className="flex items-center gap-2 py-2 text-sm">
              <CategoryDot color={catById[tx.category_id]?.color || 'gray'} />
              <span className="flex-1 min-w-0 truncate text-slate-700 dark:text-slate-200">{tx.description}</span>
              <span className="text-xs text-slate-400">{fmtDay(tx.date)}</span>
              <span className="tabular-nums font-medium text-slate-800 dark:text-slate-100 w-24 text-right">{formatCurrency(tx.amount)}</span>
            </li>
          ))}
          {other > 0 && (
            <li className="flex items-center gap-2 py-2 text-sm">
              <CategoryDot color="gray" />
              <span className="flex-1 min-w-0 truncate text-slate-500 dark:text-slate-400 italic">{t('otherCardSpending')}</span>
              <span className="tabular-nums font-medium text-slate-600 dark:text-slate-300 w-24 text-right">{formatCurrency(other)}</span>
            </li>
          )}
        </ul>
      )}
      {items.length > 5 && (
        <button onClick={() => setShowAll((v) => !v)} className="mt-2 text-sm font-medium text-violet-600 dark:text-violet-400 inline-flex items-center gap-1">
          {showAll ? '−' : `+${items.length - 5}`} <ChevronDown className={`w-4 h-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  );
}

export default function AccountsView({ cards, others, categories, incomes = [] }) {
  const { t, dark } = useLocale();
  const [editing, setEditing] = useState(null); // {type} for new, account for edit
  const close = useCallback(() => setEditing(null), []);

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">{t('cardsTitle')}</h2>
          <button className={ghostBtn} onClick={() => setEditing({ type: 'credit_card' })}><Plus className="w-4 h-4" />{t('addCard')}</button>
        </div>
        {cards.length === 0 ? (
          <div className={`${card} p-8 text-center text-sm text-slate-500 dark:text-slate-400`}>{t('noCards')}</div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cards.map((b) => <CardBill key={b.card.id} bill={b} categories={categories} incomes={incomes} onEdit={setEditing} />)}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">{t('accountsTitle')}</h2>
          <button className={ghostBtn} onClick={() => setEditing({ type: 'bank' })}><Plus className="w-4 h-4" />{t('addAccount')}</button>
        </div>
        {others.length === 0 ? (
          <div className={`${card} p-8 text-center text-sm text-slate-500 dark:text-slate-400`}>{t('noAccounts')}</div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {others.map(({ account: a, out, in: inn, count }) => {
              const Icon = TYPE_ICON[a.type] || Landmark;
              return (
                <div key={a.id} className={`${card} p-5`}>
                  <div className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: categoryColor(a.color, dark) }}><Icon className="w-5 h-5" /></span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-white truncate">{a.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t(`type_${a.type}`)} · {t('transactionsCount', { count })}</p>
                    </div>
                    <Actions account={a} onEdit={setEditing} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t('moneyOut')}</p>
                      <p className="font-semibold tabular-nums text-slate-800 dark:text-slate-100">{formatCurrency(out)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t('moneyIn')}</p>
                      <p className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{formatCurrency(inn)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {editing && <AccountForm account={editing.id ? editing : null} defaultType={editing.type} incomes={incomes} onClose={close} />}
    </div>
  );
}
