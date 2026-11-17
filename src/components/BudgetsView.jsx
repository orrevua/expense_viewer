'use client';

import { useState } from 'react';
import { Trash2, Plus, Loader2 } from 'lucide-react';
import { setBudget, createCategory, updateCategory, deleteCategory, errorMessage } from '@/lib/financeClient';
import { formatCurrency } from '@/utils/currency';
import { COLOR_KEYS, categoryColor } from '@/lib/palette';
import { useLocale } from './LocaleProvider';
import BudgetProgress from './BudgetProgress';
import CategoryDot from './CategoryDot';
import { card, cardTitle, input, primaryBtn } from './ui';

function BudgetInput({ categoryId, initial }) {
  const { t } = useLocale();
  const [value, setValue] = useState(initial ? String(initial).replace('.', ',') : '');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    const normalized = value.trim();
    if (normalized === (initial ? String(initial).replace('.', ',') : '')) return;
    setSaving(true);
    try { await setBudget(categoryId, normalized || 0); } catch (e) { alert(errorMessage(t, e)); }
    setSaving(false);
  };
  return (
    <div className="relative w-32">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
      <input
        className={`${input} pl-9 py-2 text-sm text-right`}
        inputMode="decimal"
        placeholder={t('noBudget')}
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/[^0-9.,]/g, ''))}
        onBlur={save}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        aria-label={t('budgetLimit')}
      />
      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin absolute -right-5 top-1/2 -translate-y-1/2 text-slate-400" />}
    </div>
  );
}

function ColorPicker({ value, onChange }) {
  const { dark } = useLocale();
  return (
    <div className="flex flex-wrap gap-1.5">
      {COLOR_KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          aria-label={k}
          className={`w-6 h-6 rounded-full ring-offset-2 ring-offset-white dark:ring-offset-[#1a1424] transition-all ${value === k ? 'ring-2 ring-slate-500 dark:ring-slate-300' : ''}`}
          style={{ background: categoryColor(k, dark) }}
        />
      ))}
    </div>
  );
}

function CategoryList({ kind, categories }) {
  const { t } = useLocale();
  const [name, setName] = useState('');
  const [color, setColor] = useState('blue');
  const [busy, setBusy] = useState(false);
  const [editingColor, setEditingColor] = useState(null);

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try { await createCategory({ name, color, kind }); setName(''); } catch (e) { alert(errorMessage(t, e)); }
    setBusy(false);
  };

  const rename = async (c, value) => {
    if (!value.trim() || value.trim() === c.name) return;
    try { await updateCategory(c.id, { name: value }); } catch (e) { alert(errorMessage(t, e)); }
  };

  const remove = async (c) => {
    if (!confirm(t('confirmDeleteCategory', { name: c.name }))) return;
    try { await deleteCategory(c.id); } catch (e) { alert(errorMessage(t, e)); }
  };

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">{t(kind === 'expense' ? 'expenseCategories' : 'incomeCategories')}</h4>
      <ul className="divide-y divide-slate-100 dark:divide-white/5 mb-3">
        {categories.map((c) => (
          <li key={c.id} className="py-2">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setEditingColor(editingColor === c.id ? null : c.id)} className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/10" aria-label="color">
                <CategoryDot color={c.color} size={14} />
              </button>
              <input
                defaultValue={c.name}
                maxLength={60}
                onBlur={(e) => rename(c, e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                className="flex-1 min-w-0 bg-transparent text-sm text-slate-700 dark:text-slate-200 px-2 py-1 rounded-lg outline-none focus:bg-slate-50 dark:focus:bg-white/5 focus:ring-1 focus:ring-violet-400"
              />
              <button onClick={() => remove(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10" title={t('delete')} aria-label={t('delete')}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {editingColor === c.id && (
              <div className="pl-9 pt-2">
                <ColorPicker value={c.color} onChange={async (k) => { setEditingColor(null); try { await updateCategory(c.id, { color: k }); } catch (e) { alert(errorMessage(t, e)); } }} />
              </div>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="space-y-2">
        <div className="flex gap-2">
          <input className={`${input} py-2 text-sm`} placeholder={t('categoryName')} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
          <button className={`${primaryBtn} py-2 px-3 text-sm`} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}{t('add')}</button>
        </div>
        <ColorPicker value={color} onChange={setColor} />
      </form>
    </div>
  );
}

export default function BudgetsView({ categories, budgets, spent }) {
  const { t } = useLocale();
  const budgetByCat = Object.fromEntries(budgets.map((b) => [b.category_id, b.amount]));
  const expenseCats = categories.filter((c) => c.kind === 'expense');
  const incomeCats = categories.filter((c) => c.kind === 'income');
  const totalBudget = budgets.reduce((a, b) => a + b.amount, 0);
  const totalSpentBudgeted = budgets.reduce((a, b) => a + (spent[b.category_id] || 0), 0);

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className={`${card} p-5 lg:col-span-2`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
          <h3 className={cardTitle}>{t('budgetsTitle')}</h3>
          {totalBudget > 0 && (
            <span className="text-sm text-slate-600 dark:text-slate-300 tabular-nums">
              {t('totalBudget')}: {t('budgetOf', { spent: formatCurrency(totalSpentBudgeted), limit: formatCurrency(totalBudget) })}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t('budgetsHint')}</p>
        <ul className="divide-y divide-slate-100 dark:divide-white/5">
          {expenseCats.map((c) => {
            const limit = budgetByCat[c.id];
            const s = spent[c.id] || 0;
            return (
              <li key={c.id} className="py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  {limit ? (
                    <BudgetProgress category={c} spent={s} limit={limit} />
                  ) : (
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2"><CategoryDot color={c.color} /><span className="text-slate-700 dark:text-slate-200">{c.name}</span></span>
                      <span className="tabular-nums text-slate-500 dark:text-slate-400">{formatCurrency(s)}</span>
                    </div>
                  )}
                </div>
                <div className="sm:pl-4 sm:pr-5"><BudgetInput key={`${c.id}-${limit || 0}`} categoryId={c.id} initial={limit} /></div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className={`${card} p-5 space-y-6 self-start`}>
        <h3 className={cardTitle}>{t('categoriesTitle')}</h3>
        <CategoryList kind="expense" categories={expenseCats} />
        <CategoryList kind="income" categories={incomeCats} />
      </div>
    </div>
  );
}
