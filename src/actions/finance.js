'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/actions/auth';
import { COLOR_KEYS } from '@/lib/palette';
import { monthRange, normalizeMonth, shiftMonth, toViewerMonth, isMonthKey, currentMonthKey, billMonthFor, dueDate } from '@/utils/month';

const KINDS = ['expense', 'income'];
const PAYMENT_METHODS = ['pix', 'credit', 'debit', 'cash', 'transfer', 'boleto', 'other'];
const ACCOUNT_TYPES = ['bank', 'cash', 'credit_card'];
const DEFAULT_THRESHOLD = 300;

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
  return error.code === '42P01' || error.code === '42703' || error.code === 'PGRST204' || error.code === 'PGRST205' || /does not exist|Could not find the table/i.test(error.message || '');
}

function isRlsBlocked(error) {
  return error.code === '42501' || /row-level security/i.test(error.message || '');
}

function check(error) {
  if (!error) return;
  if (isMissingTable(error) || isRlsBlocked(error)) throw new SetupRequiredError('setup');
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

async function assertAccount(userId, accountId) {
  if (!accountId) return null;
  const { data } = await supabase.from('accounts').select('id').eq('id', accountId).eq('user_id', userId).maybeSingle();
  return data ? accountId : null;
}

function day(value, fallback = null) {
  const n = parseInt(value, 10);
  return Number.isInteger(n) && n >= 1 && n <= 31 ? n : fallback;
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
  row.account_id = await assertAccount(user.id, input.account_id);
  row.user_id = user.id;
  const { error } = await supabase.from('transactions').insert([row]);
  check(error);
  revalidate();
}

export async function updateTransaction(id, input) {
  const user = await requireUser();
  const row = cleanTransaction(input);
  row.category_id = await assertCategory(user.id, input.category_id);
  row.account_id = await assertAccount(user.id, input.account_id);
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


// ---------- Accounts & credit cards ----------

async function loadAccounts(userId) {
  const { data, error } = await supabase.from('accounts').select('*').eq('user_id', userId).order('created_at', { ascending: true });
  check(error);
  return (data || []).map((a) => ({ ...a, credit_limit: a.credit_limit == null ? null : Number(a.credit_limit) }));
}

function cleanAccount(input) {
  const name = str(input.name, 60);
  if (!name) throw new Error('Name is required.');
  const type = ACCOUNT_TYPES.includes(input.type) ? input.type : 'bank';
  const isCard = type === 'credit_card';
  return {
    name,
    type,
    color: COLOR_KEYS.includes(input.color) ? input.color : 'violet',
    closing_day: isCard ? day(input.closing_day) : null,
    due_day: isCard ? day(input.due_day) : null,
    credit_limit: isCard ? money(input.credit_limit) || null : null,
  };
}

export async function createAccount(input) {
  const user = await requireUser();
  const { error } = await supabase.from('accounts').insert([{ ...cleanAccount(input), user_id: user.id }]);
  check(error);
  revalidate();
}

export async function updateAccount(id, input) {
  const user = await requireUser();
  const { error } = await supabase.from('accounts').update(cleanAccount(input)).eq('id', id).eq('user_id', user.id);
  check(error);
  revalidate();
}

export async function deleteAccount(id) {
  const user = await requireUser();
  const { error } = await supabase.from('accounts').delete().eq('id', id).eq('user_id', user.id);
  check(error);
  revalidate();
}

// ---------- Settings (major / minor threshold) ----------

async function loadThreshold(userId) {
  const { data, error } = await supabase.from('finance_settings').select('major_threshold').eq('user_id', userId).maybeSingle();
  check(error);
  return data ? Number(data.major_threshold) : DEFAULT_THRESHOLD;
}

export async function setMajorThreshold(value) {
  const user = await requireUser();
  const amount = money(value);
  if (!amount) throw new Error('Invalid amount.');
  const { error } = await supabase.from('finance_settings').upsert([{ user_id: user.id, major_threshold: amount }], { onConflict: 'user_id' });
  check(error);
  revalidate();
}

// ---------- Recurring (fixed monthly) expenses ----------

async function loadRecurring(userId) {
  const { data, error } = await supabase.from('recurring_expenses').select('*').eq('user_id', userId).order('due_day', { ascending: true });
  check(error);
  return (data || []).map((r) => ({ ...r, amount: Number(r.amount) }));
}

function activeIn(r, month) {
  return r.start_month <= month && (!r.end_month || month <= r.end_month);
}

function cleanRecurring(input) {
  const name = str(input.name, 120);
  const amount = money(input.amount);
  if (!name) throw new Error('Name is required.');
  if (amount === null) throw new Error('Invalid amount.');
  return {
    name,
    amount,
    due_day: day(input.due_day, 10),
    payment_method: PAYMENT_METHODS.includes(input.payment_method) ? input.payment_method : 'pix',
  };
}

export async function createRecurring(input) {
  const user = await requireUser();
  const row = cleanRecurring(input);
  row.category_id = await assertCategory(user.id, input.category_id);
  row.account_id = await assertAccount(user.id, input.account_id);
  row.start_month = isMonthKey(input.start_month) ? input.start_month : currentMonthKey();
  row.user_id = user.id;
  const { error } = await supabase.from('recurring_expenses').insert([row]);
  check(error);
  revalidate();
}

export async function updateRecurring(id, input) {
  const user = await requireUser();
  const row = cleanRecurring(input);
  row.category_id = await assertCategory(user.id, input.category_id);
  row.account_id = await assertAccount(user.id, input.account_id);
  const { error } = await supabase.from('recurring_expenses').update(row).eq('id', id).eq('user_id', user.id);
  check(error);
  revalidate();
}

// Stop repeating after `month` (history and past payments are kept).
export async function endRecurring(id, month) {
  const user = await requireUser();
  const { error } = await supabase.from('recurring_expenses')
    .update({ end_month: isMonthKey(month) ? month : currentMonthKey() })
    .eq('id', id).eq('user_id', user.id);
  check(error);
  revalidate();
}

export async function deleteRecurring(id) {
  const user = await requireUser();
  const { error } = await supabase.from('recurring_expenses').delete().eq('id', id).eq('user_id', user.id);
  check(error);
  revalidate();
}

// Marking as paid records a real transaction, so it shows up everywhere else.
export async function markRecurringPaid(id, month, amountInput) {
  const user = await requireUser();
  if (!isMonthKey(month)) throw new Error('Invalid month.');
  const { data: r, error } = await supabase.from('recurring_expenses').select('*').eq('id', id).eq('user_id', user.id).maybeSingle();
  check(error);
  if (!r) throw new Error('Not found.');
  const { start, end } = monthRange(month);
  const { data: existing } = await supabase.from('transactions').select('id').eq('user_id', user.id).eq('recurring_id', id).gte('date', start).lt('date', end);
  if (existing && existing.length) return;
  const amount = amountInput === undefined || amountInput === null || amountInput === '' ? Number(r.amount) : money(amountInput);
  if (!amount) throw new Error('Invalid amount.');
  const { error: insertError } = await supabase.from('transactions').insert([{
    user_id: user.id,
    kind: 'expense',
    amount,
    description: r.name,
    category_id: r.category_id,
    account_id: r.account_id,
    recurring_id: r.id,
    payment_method: r.payment_method,
    date: dueDate(month, r.due_day),
  }]);
  check(insertError);
  revalidate();
}

export async function unmarkRecurringPaid(id, month) {
  const user = await requireUser();
  if (!isMonthKey(month)) throw new Error('Invalid month.');
  const { start, end } = monthRange(month);
  const { error } = await supabase.from('transactions').delete().eq('user_id', user.id).eq('recurring_id', id).gte('date', start).lt('date', end);
  check(error);
  revalidate();
}

function recurringStatus(recurring, transactions, month) {
  const today = new Date();
  const thisMonth = currentMonthKey();
  return recurring.filter((r) => activeIn(r, month)).map((r) => {
    const payment = transactions.find((t) => t.recurring_id === r.id && t.date.startsWith(month));
    let status = 'pending';
    if (payment) status = 'paid';
    else if (month < thisMonth || (month === thisMonth && today.getDate() > r.due_day)) status = 'late';
    return { ...r, status, paidAmount: payment?.amount ?? null, paymentId: payment?.id ?? null, dueDate: dueDate(month, r.due_day) };
  });
}

function summarizeRecurring(items) {
  const out = { total: 0, paid: 0, pending: 0, late: 0, count: items.length, paidCount: 0 };
  for (const i of items) {
    if (i.status === 'paid') { out.paid += i.paidAmount; out.paidCount += 1; out.total += i.paidAmount; }
    else { out.total += i.amount; out[i.status] += i.amount; }
  }
  return out;
}

// Credit-card bills: purchases after the closing day go to the next month's bill.
function cardBills(accounts, transactions, month) {
  return accounts.filter((a) => a.type === 'credit_card').map((card) => {
    const items = transactions
      .filter((t) => t.account_id === card.id && t.kind === 'expense' && billMonthFor(t.date, card.closing_day) === month)
      .sort((a, b) => b.amount - a.amount);
    const total = sum(items);
    // The bill closes in `month`; if the due day is not after the closing day, it is due the next month.
    const dueMonth = card.closing_day && card.due_day && card.due_day <= card.closing_day ? shiftMonth(month, 1) : month;
    return { card, total, items, dueDate: card.due_day ? dueDate(dueMonth, card.due_day) : null };
  });
}

function accountSummaries(accounts, transactions, month) {
  return accounts.filter((a) => a.type !== 'credit_card').map((account) => {
    const list = transactions.filter((t) => t.account_id === account.id && t.date.startsWith(month));
    return {
      account,
      out: sum(list.filter((t) => t.kind === 'expense')),
      in: sum(list.filter((t) => t.kind === 'income')),
      count: list.length,
    };
  });
}

function sizeSplit(expenses, threshold) {
  const major = expenses.filter((t) => t.amount >= threshold);
  const minor = expenses.filter((t) => t.amount < threshold);
  return {
    threshold,
    major: { total: sum(major), count: major.length },
    minor: { total: sum(minor), count: minor.length },
    top: [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 5),
  };
}

// ---------- Installments backup ----------

// Full copy of the Installments tab data (what you owe / are owed), as JSON.
export async function exportInstallmentsBackup() {
  const user = await requireUser();
  const { data: dashboards, error } = await supabase.from('dashboards').select('*').eq('user_id', user.id);
  if (error) throw new Error(error.message);
  const ids = (dashboards || []).map((d) => d.id);
  const pick = async (table) => {
    if (!ids.length) return [];
    const { data, error: e } = await supabase.from(table).select('*').in('dashboard_id', ids);
    return e ? [] : data || [];
  };
  const [installment_expenses, one_time_expenses, monthly_history, pix_payments] = await Promise.all([
    pick('installment_expenses'), pick('one_time_expenses'), pick('monthly_history'), pick('pix_payments'),
  ]);
  return { exported_at: new Date().toISOString(), dashboards, installment_expenses, one_time_expenses, monthly_history, pix_payments };
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
    const { end } = monthRange(shiftMonth(month, 1)); // next month too: card purchases after closing day

    const [categories, accounts, transactions, budgets, bills, recurring, threshold] = await Promise.all([
      loadCategories(user.id),
      loadAccounts(user.id),
      loadTransactions(user.id, start, end),
      loadBudgets(user.id),
      loadInstallmentBills(user.id, months),
      loadRecurring(user.id),
      loadThreshold(user.id),
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

    const recurringItems = recurringStatus(recurring, transactions, month);

    return {
      month,
      categories,
      accounts,
      budgets,
      byCategory,
      trend,
      totals: {
        expense: sum(expenses),
        income: sum(income),
        installments: bills[month] || 0,
        count: inMonth.length,
      },
      recurring: { items: recurringItems, summary: summarizeRecurring(recurringItems) },
      cards: cardBills(accounts, transactions, month),
      size: sizeSplit(expenses, threshold),
    };
  });
}

export async function getTransactionsData(monthParam) {
  return guarded(async () => {
    const user = await requireUser();
    const month = normalizeMonth(monthParam);
    const { start, end } = monthRange(month);
    const [categories, accounts, transactions, threshold] = await Promise.all([
      loadCategories(user.id),
      loadAccounts(user.id),
      loadTransactions(user.id, start, end),
      loadThreshold(user.id),
    ]);
    return { month, categories, accounts, transactions, threshold };
  });
}

export async function getRecurringData(monthParam) {
  return guarded(async () => {
    const user = await requireUser();
    const month = normalizeMonth(monthParam);
    const { start, end } = monthRange(month);
    const [categories, accounts, recurring, transactions] = await Promise.all([
      loadCategories(user.id),
      loadAccounts(user.id),
      loadRecurring(user.id),
      loadTransactions(user.id, start, end),
    ]);
    const items = recurringStatus(recurring, transactions, month);
    return { month, categories, accounts, items, summary: summarizeRecurring(items) };
  });
}

export async function getAccountsData(monthParam) {
  return guarded(async () => {
    const user = await requireUser();
    const month = normalizeMonth(monthParam);
    const { start } = monthRange(shiftMonth(month, -1));
    const { end } = monthRange(month);
    const [categories, accounts, transactions] = await Promise.all([
      loadCategories(user.id),
      loadAccounts(user.id),
      loadTransactions(user.id, start, end),
    ]);
    return {
      month,
      categories,
      accounts,
      cards: cardBills(accounts, transactions, month),
      others: accountSummaries(accounts, transactions, month),
    };
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
