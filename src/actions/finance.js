'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/actions/auth';
import { COLOR_KEYS } from '@/lib/palette';
import { monthRange, normalizeMonth, shiftMonth, toViewerMonth } from '@/utils/month';

const KINDS = ['expense', 'income'];
const PAYMENT_METHODS = ['pix', 'credit', 'debit', 'cash', 'transfer', 'other'];

const DEFAULT_CATEGORIES = [
  { name: 'Alimentação', color: 'orange', kind: 'expense' },
  { name: 'Mercado', color: 'aqua', kind: 'expense' },
  { name: 'Transporte', color: 'blue', kind: 'expense' },
  { name: 'Moradia', color: 'violet', kind: 'expense' },
  { name: 'Contas', color: 'yellow', kind: 'expense' },
  { name: 'Saúde', color: 'red', kind: 'expense' },
  { name: 'Lazer', color: 'magenta', kind: 'expense' },
  { name: 'Compras', color: 'green', kind: 'expense' },
  { name: 'Outros', color: 'gray', kind: 'expense' },
  { name: 'Salário', color: 'aqua', kind: 'income' },
  { name: 'Freelance', color: 'blue', kind: 'income' },
  { name: 'Outras receitas', color: 'gray', kind: 'income' },
];

class SetupRequiredError extends Error {}

function isMissingTable(error) {
  if (!error) return false;
  return error.code === '42P01' || error.code === 'PGRST205' || /does not exist|Could not find the table/i.test(error.message || '');
}

function check(error) {
  if (!error) return;
  if (isMissingTable(error)) throw new SetupRequiredError('setup');
  throw new Error(error.message);
}

async function requireUser() {
  if (!supabase) throw new Error('Database not configured.');
  const user = await getSessionUser();
  if (!user?.id) throw new Error('Not authenticated');
  return user;
}

function str(value, max = 200) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function money(value) {
  const n = Number(typeof value === 'string' ? value.replace(',', '.') : value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(Math.min(n, 999999999) * 100) / 100;
}

function isoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime()) ? value : null;
}

function revalidate() {
  revalidatePath('/', 'layout');
}

async function assertCategory(userId, categoryId) {
  if (!categoryId) return null;
  const { data } = await supabase.from('categories').select('id').eq('id', categoryId).eq('user_id', userId).maybeSingle();
  return data ? categoryId : null;
}

// Wraps a loader so pages can show a "run the migration" notice instead of crashing.
async function guarded(fn) {
  try {
    return { ok: true, ...(await fn()) };
  } catch (e) {
    if (e instanceof SetupRequiredError) return { ok: false, setupRequired: true };
    console.error(e);
    return { ok: false, error: e.message };
  }
}

// ---------- Categories ----------

async function loadCategories(userId) {
  const { data, error } = await supabase.from('categories').select('*').eq('user_id', userId).order('created_at', { ascending: true });
  check(error);
  if (data.length > 0) return data;
  const { data: seeded, error: seedError } = await supabase
    .from('categories')
    .insert(DEFAULT_CATEGORIES.map((c) => ({ ...c, user_id: userId })))
    .select('*');
  check(seedError);
  return seeded;
}

export async function createCategory({ name, color, kind }) {
  const user = await requireUser();
  const safeName = str(name, 60);
  if (!safeName) throw new Error('Name is required.');
  const { error } = await supabase.from('categories').insert([{
    user_id: user.id,
    name: safeName,
    color: COLOR_KEYS.includes(color) ? color : 'gray',
    kind: KINDS.includes(kind) ? kind : 'expense',
  }]);
  check(error);
  revalidate();
}

export async function updateCategory(id, { name, color }) {
  const user = await requireUser();
  const updates = {};
  if (name !== undefined) {
    const safeName = str(name, 60);
    if (!safeName) throw new Error('Name is required.');
    updates.name = safeName;
  }
  if (color !== undefined && COLOR_KEYS.includes(color)) updates.color = color;
  const { error } = await supabase.from('categories').update(updates).eq('id', id).eq('user_id', user.id);
  check(error);
  revalidate();
}

export async function deleteCategory(id) {
  const user = await requireUser();
  const { error } = await supabase.from('categories').delete().eq('id', id).eq('user_id', user.id);
  check(error);
  revalidate();
}

// ---------- Transactions ----------

function cleanTransaction(input) {
  const amount = money(input.amount);
  const description = str(input.description, 200);
  const date = isoDate(input.date);
  if (amount === null || amount === 0) throw new Error('Invalid amount.');
  if (!description) throw new Error('Description is required.');
  if (!date) throw new Error('Invalid date.');
  return {
    kind: KINDS.includes(input.kind) ? input.kind : 'expense',
    amount,
    description,
    date,
    payment_method: PAYMENT_METHODS.includes(input.payment_method) ? input.payment_method : 'other',
    notes: str(input.notes, 1000) || null,
  };
}

export async function addTransaction(input) {
  const user = await requireUser();
  const row = cleanTransaction(input);
  row.category_id = await assertCategory(user.id, input.category_id);
  row.user_id = user.id;
  const { error } = await supabase.from('transactions').insert([row]);
  check(error);
  revalidate();
}

export async function updateTransaction(id, input) {
  const user = await requireUser();
  const row = cleanTransaction(input);
  row.category_id = await assertCategory(user.id, input.category_id);
  const { error } = await supabase.from('transactions').update(row).eq('id', id).eq('user_id', user.id);
  check(error);
  revalidate();
}

export async function deleteTransaction(id) {
  const user = await requireUser();
  const { error } = await supabase.from('transactions').delete().eq('id', id).eq('user_id', user.id);
  check(error);
  revalidate();
}

async function loadTransactions(userId, start, end) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', start)
    .lt('date', end)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });
  check(error);
  return (data || []).map((t) => ({ ...t, amount: Number(t.amount) }));
}

// ---------- Budgets ----------

async function loadBudgets(userId) {
  const { data, error } = await supabase.from('budgets').select('*').eq('user_id', userId);
  check(error);
  return (data || []).map((b) => ({ ...b, amount: Number(b.amount) }));
}

export async function setBudget(categoryId, amount) {
  const user = await requireUser();
  const safeCategory = await assertCategory(user.id, categoryId);
  if (!safeCategory) throw new Error('Category not found.');
  const value = money(amount);
  if (!value) {
    const { error } = await supabase.from('budgets').delete().eq('user_id', user.id).eq('category_id', safeCategory);
    check(error);
  } else {
    const { error } = await supabase
      .from('budgets')
      .upsert([{ user_id: user.id, category_id: safeCategory, amount: value }], { onConflict: 'user_id,category_id' });
    check(error);
  }
  revalidate();
}

// ---------- Expense Viewer (installments) integration ----------

// Sum of each installment dashboard's bill for the given months (after PIX payments).
async function loadInstallmentBills(userId, monthKeys) {
  const { data: dashboards } = await supabase.from('dashboards').select('id').eq('user_id', userId);
  const ids = (dashboards || []).map((d) => d.id);
  const result = Object.fromEntries(monthKeys.map((k) => [k, 0]));
  if (ids.length === 0) return result;
  const viewerMonths = monthKeys.map(toViewerMonth);
  const byViewer = Object.fromEntries(monthKeys.map((k) => [toViewerMonth(k), k]));

  const { data: history } = await supabase
    .from('monthly_history')
    .select('month, total_amount')
    .in('dashboard_id', ids)
    .in('month', viewerMonths);
  for (const h of history || []) result[byViewer[h.month]] += Number(h.total_amount) || 0;

  const { data: pix, error: pixError } = await supabase
    .from('pix_payments')
    .select('month, amount')
    .in('dashboard_id', ids)
    .in('month', viewerMonths);
  if (!pixError) for (const p of pix || []) result[byViewer[p.month]] -= Number(p.amount) || 0;

  for (const k of monthKeys) result[k] = Math.max(0, Math.round(result[k] * 100) / 100);
  return result;
}

// ---------- Page loaders ----------

function sum(list) {
  return Math.round(list.reduce((acc, t) => acc + t.amount, 0) * 100) / 100;
}

export async function getOverviewData(monthParam) {
  return guarded(async () => {
    const user = await requireUser();
    const month = normalizeMonth(monthParam);
    const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5));
    const { start } = monthRange(months[0]);
    const { end } = monthRange(month);

    const [categories, transactions, budgets, bills] = await Promise.all([
      loadCategories(user.id),
      loadTransactions(user.id, start, end),
      loadBudgets(user.id),
      loadInstallmentBills(user.id, months),
    ]);

    const inMonth = transactions.filter((t) => t.date.startsWith(month));
    const expenses = inMonth.filter((t) => t.kind === 'expense');
    const income = inMonth.filter((t) => t.kind === 'income');

    const byCategory = {};
    for (const t of expenses) {
      const key = t.category_id || 'none';
      byCategory[key] = (byCategory[key] || 0) + t.amount;
    }

    const trend = months.map((m) => {
      const list = transactions.filter((t) => t.date.startsWith(m));
      return {
        month: m,
        expense: sum(list.filter((t) => t.kind === 'expense')),
        income: sum(list.filter((t) => t.kind === 'income')),
        installments: bills[m] || 0,
      };
    });

    return {
      month,
      categories,
      budgets,
      byCategory,
      trend,
      totals: {
        expense: sum(expenses),
        income: sum(income),
        installments: bills[month] || 0,
        count: inMonth.length,
      },
      recent: inMonth.slice(0, 8),
    };
  });
}

export async function getTransactionsData(monthParam) {
  return guarded(async () => {
    const user = await requireUser();
    const month = normalizeMonth(monthParam);
    const { start, end } = monthRange(month);
    const [categories, transactions] = await Promise.all([
      loadCategories(user.id),
      loadTransactions(user.id, start, end),
    ]);
    return { month, categories, transactions };
  });
}

export async function getBudgetsData(monthParam) {
  return guarded(async () => {
    const user = await requireUser();
    const month = normalizeMonth(monthParam);
    const { start, end } = monthRange(month);
    const [categories, transactions, budgets] = await Promise.all([
      loadCategories(user.id),
      loadTransactions(user.id, start, end),
      loadBudgets(user.id),
    ]);
    const spent = {};
    for (const t of transactions) {
      if (t.kind !== 'expense' || !t.category_id) continue;
      spent[t.category_id] = (spent[t.category_id] || 0) + t.amount;
    }
    return { month, categories, budgets, spent };
  });
}
