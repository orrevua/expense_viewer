'use client';

import { useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Loader2, PiggyBank, ArrowUpRight, ArrowDownRight, ShieldCheck, X } from 'lucide-react';
import { createGoal, updateGoal, deleteGoal, addSavingsEntry, deleteSavingsEntry, errorMessage } from '@/lib/financeClient';
import { formatCurrency } from '@/utils/currency';
import { categoryColor, COLOR_KEYS } from '@/lib/palette';
import { monthLabel } from '@/utils/month';
import { useLocale } from './LocaleProvider';
import Modal from './Modal';
import { card, cardTitle, input, label, primaryBtn, ghostBtn } from './ui';

function GoalForm({ goal, preset, onClose }) {
  const { t, dark } = useLocale();
  const init = goal || preset || {};
  const [form, setForm] = useState({
    name: init.name || '',
    target_amount: init.target_amount ? String(init.target_amount).replace('.', ',') : '',
    monthly_amount: init.monthly_amount ? String(init.monthly_amount).replace('.', ',') : '',
    target_month: init.target_month || '',
    color: init.color || 'aqua',
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (goal) await updateGoal(goal.id, form);
      else await createGoal(form);
      onClose();
    } catch (e) {
      alert(errorMessage(t, e));
      setSaving(false);
    }
  };
  return (
    <Modal title={t(goal ? 'editGoal' : 'addGoal')} onClose={onClose} onSubmit={submit}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={label}>{t('goalName')}</label>
          <input className={input} required autoFocus maxLength={80} value={form.name} onChange={set('name')} placeholder="Reserva de emergência, Viagem…" />
        </div>
        <div>
          <label className={label}>{t('goalTarget')}</label>
          <input className={input} required inputMode="decimal" placeholder="0,00" pattern="[0-9]+([.,][0-9]{1,2})?" value={form.target_amount} onChange={set('target_amount')} />
        </div>
        <div>
          <label className={label}>{t('goalMonthly')}</label>
          <input className={input} inputMode="decimal" placeholder="0,00" pattern="[0-9]+([.,][0-9]{1,2})?" value={form.monthly_amount} onChange={set('monthly_amount')} />
        </div>
        <div className="col-span-2">
          <label className={label}>{t('goalDeadline')}</label>
          <input className={input} type="month" value={form.target_month} onChange={set('target_month')} />
        </div>
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

function GoalCard({ goal: g, onEdit }) {
  const { t, lang, dark } = useLocale();
  const [busy, setBusy] = useState(false);
  const pct = Math.min(100, (g.saved / g.target_amount) * 100);
  const color = categoryColor(g.color, dark);
  const fmtDay = (d) => new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'pt-BR', { day: '2-digit', month: 'short' }).format(new Date(`${d}T12:00:00`));
  const run = async (fn) => {
    setBusy(true);
    try { await fn(); } catch (e) { alert(errorMessage(t, e)); }
    setBusy(false);
  };
  const move = (withdraw) => {
    const v = prompt(t(withdraw ? 'withdrawAmountPrompt' : 'saveAmountPrompt'), !withdraw && g.monthly_amount ? String(g.monthly_amount).replace('.', ',') : '');
    if (!v) return;
    run(() => addSavingsEntry(g.id, v.trim(), withdraw));
  };
  const iconBtn = 'p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10';

  return (
    <div className={`${card} p-5`}>
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: color }}><PiggyBank className="w-5 h-5" /></span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 dark:text-white truncate">{g.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('goalSaved', { saved: formatCurrency(g.saved), target: formatCurrency(g.target_amount) })}</p>
        </div>
        <button className={iconBtn} onClick={() => onEdit(g)} title={t('edit')} aria-label={t('edit')}><Pencil className="w-4 h-4" /></button>
        <button className={`${iconBtn} hover:text-red-600`} onClick={() => confirm(t('confirmDeleteGoal', { name: g.name })) && run(() => deleteGoal(g.id))} title={t('delete')} aria-label={t('delete')}><Trash2 className="w-4 h-4" /></button>
      </div>
      <div className="flex items-baseline justify-between mt-4">
        <p className="text-2xl font-bold tabular-nums text-slate-800 dark:text-white">{Math.round(pct)}%</p>
        {g.monthly_amount > 0 && <p className="text-sm text-slate-500 dark:text-slate-400">{formatCurrency(g.monthly_amount)}/mês</p>}
      </div>
      <div className="h-2.5 mt-2 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="mt-2 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
        {g.remaining === 0 ? (
          <p className="font-semibold text-emerald-700 dark:text-emerald-400">{t('goalDone')}</p>
        ) : (
          <>
            {g.target_month && <p>{t('goalNeeded', { date: monthLabel(g.target_month, lang, { month: 'short', year: 'numeric' }), amount: formatCurrency(g.neededPerMonth) })}</p>}
            {g.monthsToGoal && <p>{t('goalEta', { count: g.monthsToGoal })}</p>}
          </>
        )}
        <p>{t('savedThisMonth')}: <span className="font-medium text-slate-700 dark:text-slate-200">{formatCurrency(g.savedThisMonth)}</span></p>
      </div>
      <div className="flex gap-2 mt-4">
        <button className={`${primaryBtn} py-1.5 px-3 text-sm flex-1`} disabled={busy} onClick={() => move(false)}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}{t('saveMoney')}
        </button>
        <button className={`${ghostBtn} py-1.5`} disabled={busy} onClick={() => move(true)}><ArrowDownRight className="w-4 h-4" />{t('withdrawMoney')}</button>
      </div>
      {g.entries.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100 dark:divide-white/5">
          {g.entries.slice(0, 5).map((e) => (
            <li key={e.id} className="group flex items-center gap-2 py-1.5 text-xs">
              <span className="text-slate-400 w-16 whitespace-nowrap">{fmtDay(e.date)}</span>
              <span className={`flex-1 tabular-nums font-medium ${e.amount < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                {e.amount < 0 ? '−' : '+'} {formatCurrency(Math.abs(e.amount))}
              </span>
              <button className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600" onClick={() => run(() => deleteSavingsEntry(e.id))} aria-label={t('delete')}><X className="w-3.5 h-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Num({ label: l, value, tone }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{l}</p>
      <p className={`text-lg font-bold tabular-nums ${tone || 'text-slate-800 dark:text-white'}`}>{value}</p>
    </div>
  );
}

export default function SavingsView({ goals, plan }) {
  const { t } = useLocale();
  const [editing, setEditing] = useState(null);
  const close = useCallback(() => setEditing(null), []);

  const emergencyPreset = {
    name: t('emergencyName'),
    target_amount: plan.emergencyTarget || '',
    monthly_amount: plan.suggested || '',
    color: 'aqua',
  };
  const steps = [t('planStep1'), t('planStep2', { amount: formatCurrency(plan.emergencyTarget || 0) }), t('planStep3'), t('planStep4')];

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className={`${card} p-5 lg:col-span-2`}>
          <h3 className={`${cardTitle} mb-4`}>{t('savingsPlanTitle')}</h3>
          {!plan.hasIncome && (
            <p className="text-sm mb-4 p-3 rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">{t('planNoIncome')}</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Num label={t('planIncome')} value={formatCurrency(plan.expectedIncome)} tone="text-emerald-700 dark:text-emerald-400" />
            <Num label={t('planOut')} value={formatCurrency(plan.out)} />
            <Num label={t('planFree')} value={`${plan.free < 0 ? '−' : ''}${formatCurrency(Math.abs(plan.free))}`} tone={plan.free < 0 ? 'text-red-600 dark:text-red-400' : undefined} />
            <Num label={t('planSuggest')} value={formatCurrency(plan.suggested)} tone="text-violet-700 dark:text-violet-300" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{t('planSuggestHint', { amount: formatCurrency(plan.twentyPct) })}</p>
          {plan.free < 0 && (
            <p className="text-sm mt-3 p-3 rounded-xl bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300">{t('planOverspent')}</p>
          )}
          <ol className="mt-5 space-y-2.5">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-700 dark:text-slate-200">
                <span className="w-6 h-6 shrink-0 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
          {goals.length === 0 && (
            <button className={`${primaryBtn} mt-5`} onClick={() => setEditing({ preset: emergencyPreset })}>
              <ShieldCheck className="w-4 h-4" />{t('createEmergency')}
            </button>
          )}
        </div>

        <div className={`${card} p-5 space-y-4 self-start`}>
          <Num label={t('totalSaved')} value={formatCurrency(plan.totalSaved)} tone="text-teal-700 dark:text-teal-300" />
          <Num label={t('savedThisMonth')} value={formatCurrency(plan.savedThisMonth)} />
          <Num label={t('plannedMonthly')} value={formatCurrency(plan.plannedMonthly)} />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('planVsSuggest', { planned: formatCurrency(plan.plannedMonthly), suggested: formatCurrency(plan.suggested) })}
          </p>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">{t('goalsTitle')}</h2>
          <button className={ghostBtn} onClick={() => setEditing({})}><Plus className="w-4 h-4" />{t('addGoal')}</button>
        </div>
        {goals.length === 0 ? (
          <div className={`${card} p-8 text-center text-sm text-slate-500 dark:text-slate-400`}>{t('noGoals')}</div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {goals.map((g) => <GoalCard key={g.id} goal={g} onEdit={setEditing} />)}
          </div>
        )}
      </section>

      {editing && <GoalForm goal={editing.id ? editing : null} preset={editing.preset} onClose={close} />}
    </div>
  );
}
