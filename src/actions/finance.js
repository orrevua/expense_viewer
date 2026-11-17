'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/actions/auth';
import { COLOR_KEYS } from '@/lib/palette';
import { monthRange, normalizeMonth, shiftMonth, toViewerMonth, isMonthKey, currentMonthKey, billDueMonth, billWindow, dueDate, todayISO } from '@/utils/month';

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

class SetupRequiredError extends Error {
  constructor(detail) {
    super('setup');
    this.detail = detail;
  }
}

function isMissingTable(error) {
  if (!error) return false;
  return error.code === '42P01' || error.code === '42703' || error.code === 'PGRST204' || error.code === 'PGRST205' || /does not exist|Could not find the table/i.test(error.message || '');
}

function isRlsBlocked(error) {
  return error.code === '42501' || /row-level security/i.test(error.message || '');
}

function check(error) {
  if (!error) return;
  if (isMissingTable(error) || isRlsBlocked(error)) throw new SetupRequiredError(error.message);
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

async function createCategoryImpl({ name, color, kind }) {
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

async function updateCategoryImpl(id, { name, color }) {
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

async function deleteCategoryImpl(id) {
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

async function addTransactionImpl(input) {
  const user = await requireUser();
  const row = cleanTransaction(input);
  row.category_id = await assertCategory(user.id, input.category_id);
  row.account_id = await assertAccount(user.id, input.account_id);
  row.user_id = user.id;
  const { error } = await supabase.from('transactions').insert([row]);
  check(error);
  revalidate();
}

async function updateTransactionImpl(id, input) {
  const user = await requireUser();
  const row = cleanTransaction(input);
  row.category_id = await assertCategory(user.id, input.category_id);
  row.account_id = await assertAccount(user.id, input.account_id);
  const { error } = await supabase.from('transactions').update(row).eq('id', id).eq('user_id', user.id);
  check(error);
  revalidate();
}

async function deleteTransactionImpl(id) {
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

async function setBudgetImpl(categoryId, amount) {
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
  // The Installments tab lists each amount under the month it refers to, and it is
  // PAID the following month (Oct -> paid in Nov, Nov -> paid in Dec). So the amount
  // that leaves your pocket in month M is the Installments tab's month M-1.
  const viewerFor = (k) => toViewerMonth(shiftMonth(k, -1));
  const viewerMonths = monthKeys.map(viewerFor);
  const byViewer = Object.fromEntries(monthKeys.map((k) => [viewerFor(k), k]));

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

async function assertIncome(userId, id) {
  if (!id) return null;
  const { data } = await supabase.from('recurring_expenses').select('id').eq('id', id).eq('user_id', userId).eq('kind', 'income').maybeSingle();
  return data ? id : null;
}

async function createAccountImpl(input) {
  const user = await requireUser();
  const row = cleanAccount(input);
  row.pay_with_id = row.type === 'credit_card' ? await assertIncome(user.id, input.pay_with_id) : null;
  const { error } = await supabase.from('accounts').insert([{ ...row, user_id: user.id }]);
  check(error);
  revalidate();
}

async function updateAccountImpl(id, input) {
  const user = await requireUser();
  const row = cleanAccount(input);
  row.pay_with_id = row.type === 'credit_card' ? await assertIncome(user.id, input.pay_with_id) : null;
  const { error } = await supabase.from('accounts').update(row).eq('id', id).eq('user_id', user.id);
  check(error);
  revalidate();
}

async function deleteAccountImpl(id) {
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

async function setMajorThresholdImpl(value) {
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
  return (data || []).map((r) => ({ ...r, kind: r.kind || 'expense', amount: Number(r.amount) }));
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
    kind: KINDS.includes(input.kind) ? input.kind : 'expense',
    due_day: day(input.due_day, 10),
    payment_method: PAYMENT_METHODS.includes(input.payment_method) ? input.payment_method : 'pix',
  };
}

async function createRecurringImpl(input) {
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

async function updateRecurringImpl(id, input) {
  const user = await requireUser();
  const row = cleanRecurring(input);
  row.category_id = await assertCategory(user.id, input.category_id);
  row.account_id = await assertAccount(user.id, input.account_id);
  const { error } = await supabase.from('recurring_expenses').update(row).eq('id', id).eq('user_id', user.id);
  check(error);
  revalidate();
}

// Stop repeating after `month` (history and past payments are kept).
async function endRecurringImpl(id, month) {
  const user = await requireUser();
  const { error } = await supabase.from('recurring_expenses')
    .update({ end_month: isMonthKey(month) ? month : currentMonthKey() })
    .eq('id', id).eq('user_id', user.id);
  check(error);
  revalidate();
}

async function deleteRecurringImpl(id) {
  const user = await requireUser();
  const { error } = await supabase.from('recurring_expenses').delete().eq('id', id).eq('user_id', user.id);
  check(error);
  revalidate();
}

// Marking as paid records a real transaction, so it shows up everywhere else.
async function markRecurringPaidImpl(id, month, amountInput) {
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
    kind: r.kind || 'expense',
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

async function unmarkRecurringPaidImpl(id, month) {
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

// ---------- Credit-card bills ----------
// A bill is identified by the month it is DUE. Its total is the amount you typed in
// (from the bank app) or, if you didn't, the sum of the purchases you logged on the card.

async function loadCardBills(userId, months) {
  const { data, error } = await supabase.from('card_bills').select('*').eq('user_id', userId).in('month', months);
  check(error);
  return (data || []).map((b) => ({ ...b, amount: b.amount == null ? null : Number(b.amount) }));
}

async function assertCard(userId, accountId) {
  const { data } = await supabase.from('accounts').select('id').eq('id', accountId).eq('user_id', userId).eq('type', 'credit_card').maybeSingle();
  if (!data) throw new Error('Card not found.');
}

async function upsertBill(userId, accountId, month, fields) {
  const { data: existing, error } = await supabase.from('card_bills').select('id').eq('account_id', accountId).eq('month', month).maybeSingle();
  check(error);
  if (existing) {
    const { error: e } = await supabase.from('card_bills').update(fields).eq('id', existing.id);
    check(e);
  } else {
    const { error: e } = await supabase.from('card_bills').insert([{ user_id: userId, account_id: accountId, month, ...fields }]);
    check(e);
  }
}

// amount empty/null -> go back to "sum of purchases"
async function setCardBillAmountImpl(accountId, month, amountInput) {
  const user = await requireUser();
  if (!isMonthKey(month)) throw new Error('Invalid month.');
  await assertCard(user.id, accountId);
  const amount = amountInput === null || amountInput === '' || amountInput === undefined ? null : money(amountInput);
  if (amountInput && amount === null) throw new Error('Invalid amount.');
  await upsertBill(user.id, accountId, month, { amount });
  revalidate();
}

async function setCardBillPaidImpl(accountId, month, paid) {
  const user = await requireUser();
  if (!isMonthKey(month)) throw new Error('Invalid month.');
  await assertCard(user.id, accountId);
  await upsertBill(user.id, accountId, month, { paid_at: paid ? todayISO() : null });
  revalidate();
}

function cardBills(accounts, transactions, month, billRows) {
  const today = todayISO();
  return accounts.filter((a) => a.type === 'credit_card').map((card) => {
    const items = transactions
      .filter((t) => t.account_id === card.id && t.kind === 'expense' && billDueMonth(t.date, card.closing_day, card.due_day) === month)
      .sort((a, b) => b.amount - a.amount);
    const purchasesTotal = sum(items);
    const row = billRows.find((b) => b.account_id === card.id && b.month === month);
    const manualAmount = row?.amount ?? null;
    const total = manualAmount ?? purchasesTotal;
    const other = manualAmount != null ? Math.max(0, Math.round((manualAmount - purchasesTotal) * 100) / 100) : 0;
    const win = billWindow(month, card.closing_day, card.due_day);
    let status;
    if (row?.paid_at) status = 'paid';
    else if (win.closeDate && today <= win.closeDate) status = 'open';
    else if (win.dueDate && today > win.dueDate) status = 'late';
    else status = 'closed';
    return {
      card, month, items, purchasesTotal, manualAmount, total, other, status,
      paidAt: row?.paid_at || null,
      dueDate: win.dueDate, closeDate: win.closeDate, startDate: win.startDate,
    };
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

// ---------- Savings plan ----------

async function loadGoals(userId) {
  const { data, error } = await supabase.from('savings_goals').select('*').eq('user_id', userId).order('created_at', { ascending: true });
  check(error);
  return (data || []).map((g) => ({ ...g, target_amount: Number(g.target_amount), monthly_amount: Number(g.monthly_amount) }));
}

async function loadSavingsEntries(userId) {
  const { data, error } = await supabase.from('savings_entries').select('*').eq('user_id', userId).order('date', { ascending: false });
  check(error);
  return (data || []).map((e) => ({ ...e, amount: Number(e.amount) }));
}

function cleanGoal(input) {
  const name = str(input.name, 80);
  const target_amount = money(input.target_amount);
  if (!name) throw new Error('Name is required.');
  if (!target_amount) throw new Error('Invalid amount.');
  return {
    name,
    target_amount,
    monthly_amount: money(input.monthly_amount) || 0,
    target_month: isMonthKey(input.target_month) ? input.target_month : null,
    color: COLOR_KEYS.includes(input.color) ? input.color : 'aqua',
  };
}

async function createGoalImpl(input) {
  const user = await requireUser();
  const { error } = await supabase.from('savings_goals').insert([{ ...cleanGoal(input), user_id: user.id }]);
  check(error);
  revalidate();
}

async function updateGoalImpl(id, input) {
  const user = await requireUser();
  const { error } = await supabase.from('savings_goals').update(cleanGoal(input)).eq('id', id).eq('user_id', user.id);
  check(error);
  revalidate();
}

async function deleteGoalImpl(id) {
  const user = await requireUser();
  const { error } = await supabase.from('savings_goals').delete().eq('id', id).eq('user_id', user.id);
  check(error);
  revalidate();
}

// amount > 0 saves, amount < 0 withdraws
async function addSavingsEntryImpl(goalId, amountInput, withdraw = false, note = '') {
  const user = await requireUser();
  const { data: goal } = await supabase.from('savings_goals').select('id').eq('id', goalId).eq('user_id', user.id).maybeSingle();
  if (!goal) throw new Error('Goal not found.');
  const amount = money(amountInput);
  if (!amount) throw new Error('Invalid amount.');
  const { error } = await supabase.from('savings_entries').insert([{
    user_id: user.id, goal_id: goalId, amount: withdraw ? -amount : amount, date: todayISO(), note: str(note, 200) || null,
  }]);
  check(error);
  revalidate();
}

async function deleteSavingsEntryImpl(id) {
  const user = await requireUser();
  const { error } = await supabase.from('savings_entries').delete().eq('id', id).eq('user_id', user.id);
  check(error);
  revalidate();
}

function goalsWithProgress(goals, entries, month) {
  const thisMonth = currentMonthKey();
  return goals.map((g) => {
    const list = entries.filter((e) => e.goal_id === g.id);
    const saved = Math.round(list.reduce((a, e) => a + e.amount, 0) * 100) / 100;
    const savedThisMonth = Math.round(list.filter((e) => e.date.startsWith(month)).reduce((a, e) => a + e.amount, 0) * 100) / 100;
    const remaining = Math.max(0, g.target_amount - saved);
    let monthsLeft = null;
    let neededPerMonth = null;
    if (g.target_month) {
      const [ty, tm] = g.target_month.split('-').map(Number);
      const [cy, cm] = thisMonth.split('-').map(Number);
      monthsLeft = Math.max(1, (ty - cy) * 12 + (tm - cm) + 1);
      neededPerMonth = Math.ceil((remaining / monthsLeft) * 100) / 100;
    }
    const monthsToGoal = g.monthly_amount > 0 ? Math.ceil(remaining / g.monthly_amount) : null;
    return { ...g, saved, savedThisMonth, remaining, monthsLeft, neededPerMonth, monthsToGoal, entries: list.slice(0, 10) };
  });
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

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Everything the month view needs, on a "when the money moves" basis:
// card purchases count in the month their bill is due.
async function loadMonthModel(userId, month, { trendMonths = 1 } = {}) {
  const months = Array.from({ length: trendMonths }, (_, i) => shiftMonth(month, i - trendMonths + 1));
  const billMonths = [...months, shiftMonth(month, 1)];
  const { start } = monthRange(shiftMonth(months[0], -2));
  const { end } = monthRange(shiftMonth(month, 1));

  const [categories, accounts, transactions, recurring, billRows, installmentBills, goals, entries] = await Promise.all([
    loadCategories(userId),
    loadAccounts(userId),
    loadTransactions(userId, start, end),
    loadRecurring(userId),
    loadCardBills(userId, billMonths),
    loadInstallmentBills(userId, months),
    loadGoals(userId),
    loadSavingsEntries(userId),
  ]);

  const cardIds = new Set(accounts.filter((a) => a.type === 'credit_card').map((a) => a.id));
  const billsByMonth = Object.fromEntries(billMonths.map((m) => [m, cardBills(accounts, transactions, m, billRows)]));

  const monthTotals = (m) => {
    const inM = transactions.filter((t) => t.date.startsWith(m));
    const nonCard = inM.filter((t) => t.kind === 'expense' && !cardIds.has(t.account_id));
    const bills = billsByMonth[m] || [];
    return {
      income: sum(inM.filter((t) => t.kind === 'income')),
      nonCard,
      bills,
      expense: round2(sum(nonCard) + bills.reduce((a, b) => a + b.total, 0)),
      installments: installmentBills[m] || 0,
    };
  };

  return { months, categories, accounts, transactions, recurring, billsByMonth, installmentBills, goals, entries, cardIds, monthTotals };
}

function buildCashFlow(model, month) {
  const { recurring, transactions, billsByMonth, installmentBills, goals, entries, cardIds, accounts } = model;
  const items = recurringStatus(recurring, transactions, month);
  const incomes = items.filter((i) => i.kind === 'income');
  const fixed = items.filter((i) => i.kind !== 'income');
  const bills = billsByMonth[month] || [];
  const inM = transactions.filter((t) => t.date.startsWith(month));
  const events = [];

  for (const i of incomes) {
    events.push({ id: `r-${i.id}`, type: 'income', day: i.due_day, date: i.dueDate, label: i.name, amount: i.status === 'paid' ? i.paidAmount : i.amount, status: i.status, kind: 'income' });
  }
  for (const t of inM.filter((x) => x.kind === 'income' && !x.recurring_id)) {
    events.push({ id: `t-${t.id}`, type: 'income', day: Number(t.date.slice(8, 10)), date: t.date, label: t.description, amount: t.amount, status: 'paid', kind: 'income' });
  }
  for (const f of fixed) {
    const onCard = f.account_id && cardIds.has(f.account_id);
    if (onCard) continue; // shows up inside the card bill
    events.push({ id: `r-${f.id}`, type: 'fixed', day: f.due_day, date: f.dueDate, label: f.name, amount: f.status === 'paid' ? f.paidAmount : f.amount, status: f.status, kind: 'expense' });
  }
  for (const b of bills) {
    if (!b.total && b.status !== 'paid') continue;
    const payWith = recurring.find((r) => r.id === b.card.pay_with_id);
    events.push({ id: `c-${b.card.id}`, type: 'card', day: b.dueDate ? Number(b.dueDate.slice(8, 10)) : 28, date: b.dueDate, label: b.card.name, amount: b.total, status: b.status, kind: 'expense', payWith: payWith?.name || null, color: b.card.color });
  }
  const planned = round2(goals.reduce((a, g) => a + g.monthly_amount, 0));
  const savedThisMonth = round2(entries.filter((e) => e.date.startsWith(month)).reduce((a, e) => a + e.amount, 0));
  if (planned > 0 || savedThisMonth !== 0) {
    const firstIncomeDay = incomes.length ? Math.min(...incomes.map((i) => i.due_day)) : 1;
    events.push({ id: 'savings', type: 'savings', day: firstIncomeDay, date: dueDate(month, firstIncomeDay), label: 'savings', amount: Math.max(planned, savedThisMonth), done: savedThisMonth, planned, status: savedThisMonth >= planned && planned > 0 ? 'paid' : 'pending', kind: 'expense' });
  }
  const daily = sum(inM.filter((t) => t.kind === 'expense' && !t.recurring_id && !cardIds.has(t.account_id)));
  if (daily > 0) events.push({ id: 'daily', type: 'daily', day: 32, label: 'daily', amount: daily, status: 'paid', kind: 'expense' });
  const inst = installmentBills[month] || 0;
  if (inst > 0) events.push({ id: 'installments', type: 'installments', day: 33, label: 'installments', amount: inst, status: 'pending', kind: 'expense', refMonth: shiftMonth(month, -1) });

  const order = { income: 0, savings: 1, card: 2, fixed: 3, daily: 4, installments: 5 };
  events.sort((a, b) => a.day - b.day || order[a.type] - order[b.type]);
  let running = 0;
  for (const e of events) {
    running = round2(running + (e.kind === 'income' ? e.amount : -e.amount));
    e.balance = running;
  }
  const totalIn = round2(events.filter((e) => e.kind === 'income').reduce((a, e) => a + e.amount, 0));
  const totalSavings = round2(events.filter((e) => e.type === 'savings').reduce((a, e) => a + e.amount, 0));
  const totalOut = round2(events.filter((e) => e.kind === 'expense' && e.type !== 'savings').reduce((a, e) => a + e.amount, 0));

  // Each fixed income covers the cards set to be paid with it: the first bill due on/after the income day.
  const coverage = incomes.map((inc) => {
    const linked = accounts.filter((a) => a.type === 'credit_card' && a.pay_with_id === inc.id).map((card) => {
      const billMonth = card.due_day && card.due_day < inc.due_day ? shiftMonth(month, 1) : month;
      const bill = (billsByMonth[billMonth] || []).find((b) => b.card.id === card.id);
      return bill ? { card, total: bill.total, status: bill.status, dueDate: bill.dueDate } : null;
    }).filter(Boolean);
    const amount = inc.status === 'paid' ? inc.paidAmount : inc.amount;
    const billsTotal = round2(linked.reduce((a, l) => a + l.total, 0));
    return { income: inc, amount, date: inc.dueDate, bills: linked, billsTotal, left: round2(amount - billsTotal) };
  });

  return { events, totals: { in: totalIn, out: totalOut, savings: totalSavings, left: round2(totalIn - totalOut - totalSavings) }, coverage, recurringItems: items };
}

export async function getOverviewData(monthParam) {
  return guarded(async () => {
    const user = await requireUser();
    const month = normalizeMonth(monthParam);
    const [model, budgets, threshold] = await Promise.all([
      loadMonthModel(user.id, month, { trendMonths: 6 }),
      loadBudgets(user.id),
      loadThreshold(user.id),
    ]);
    const { categories, accounts, months, monthTotals } = model;
    const cur = monthTotals(month);

    // What was spent this month (cash basis): non-card expenses + purchases on the bills due this month
    const spentItems = [...cur.nonCard, ...cur.bills.flatMap((b) => b.items)];
    const byCategory = {};
    for (const t of spentItems) {
      const key = t.category_id || 'none';
      byCategory[key] = (byCategory[key] || 0) + t.amount;
    }
    const cardOther = round2(cur.bills.reduce((a, b) => a + b.other, 0));
    if (cardOther > 0) byCategory.card_other = cardOther;

    const trend = months.map((m) => {
      const t = monthTotals(m);
      return { month: m, expense: t.expense, income: t.income, installments: t.installments };
    });

    const flow = buildCashFlow(model, month);
    const fixedItems = flow.recurringItems.filter((i) => i.kind !== 'income');

    return {
      month,
      categories,
      accounts,
      budgets,
      byCategory,
      trend,
      flow,
      totals: { expense: cur.expense, income: cur.income, installments: cur.installments },
      recurring: { items: fixedItems, summary: summarizeRecurring(fixedItems) },
      cards: cur.bills,
      goals: goalsWithProgress(model.goals, model.entries, month),
      size: sizeSplit(spentItems, threshold),
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
    const all = recurringStatus(recurring, transactions, month);
    const items = all.filter((i) => i.kind !== 'income');
    const incomes = all.filter((i) => i.kind === 'income');
    return { month, categories, accounts, items, incomes, summary: summarizeRecurring(items), incomeSummary: summarizeRecurring(incomes) };
  });
}

export async function getAccountsData(monthParam) {
  return guarded(async () => {
    const user = await requireUser();
    const month = normalizeMonth(monthParam);
    const model = await loadMonthModel(user.id, month);
    const incomes = model.recurring.filter((r) => r.kind === 'income');
    return {
      month,
      categories: model.categories,
      accounts: model.accounts,
      incomes,
      cards: model.billsByMonth[month],
      others: accountSummaries(model.accounts, model.transactions, month),
    };
  });
}

export async function getSavingsData(monthParam) {
  return guarded(async () => {
    const user = await requireUser();
    const month = normalizeMonth(monthParam);
    const model = await loadMonthModel(user.id, month, { trendMonths: 3 });
    const flow = buildCashFlow(model, month);
    const goals = goalsWithProgress(model.goals, model.entries, month);

    const incomes = flow.recurringItems.filter((i) => i.kind === 'income');
    const expectedIncome = round2(incomes.reduce((a, i) => a + i.amount, 0)) || flow.totals.in;
    // Average of the last 3 months (cash basis) as the "cost of living", falling back to this month.
    const history = model.months.map((m) => model.monthTotals(m)).map((t) => t.expense + t.installments).filter((v) => v > 0);
    const avgSpending = history.length ? round2(history.reduce((a, v) => a + v, 0) / history.length) : flow.totals.out;
    const fixedCost = round2(flow.recurringItems.filter((i) => i.kind !== 'income').reduce((a, i) => a + i.amount, 0));
    const free = round2(expectedIncome - flow.totals.out);
    const suggested = Math.max(0, Math.floor(Math.min(expectedIncome * 0.2, Math.max(0, free)) / 10) * 10);
    const plannedMonthly = round2(goals.reduce((a, g) => a + g.monthly_amount, 0));
    const savedThisMonth = round2(goals.reduce((a, g) => a + g.savedThisMonth, 0));
    const totalSaved = round2(goals.reduce((a, g) => a + g.saved, 0));

    return {
      month,
      goals,
      plan: {
        expectedIncome,
        out: flow.totals.out,
        free,
        suggested,
        twentyPct: round2(expectedIncome * 0.2),
        plannedMonthly,
        savedThisMonth,
        totalSaved,
        avgSpending,
        fixedCost,
        emergencyTarget: Math.ceil((avgSpending || fixedCost) * 6 / 100) * 100,
        hasIncome: incomes.length > 0,
      },
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

// ---------- Mutations exposed to the browser ----------
// Next.js hides thrown error messages in production, so mutations return
// { ok: false, error, setup } instead, and the page can say what went wrong.

async function run(fn) {
  try {
    await fn();
    return { ok: true };
  } catch (e) {
    console.error(e);
    if (e instanceof SetupRequiredError) return { ok: false, setup: true, error: e.detail || 'setup' };
    return { ok: false, error: e.message || 'error' };
  }
}

export async function createCategory(...args) { return run(() => createCategoryImpl(...args)); }
export async function updateCategory(...args) { return run(() => updateCategoryImpl(...args)); }
export async function deleteCategory(...args) { return run(() => deleteCategoryImpl(...args)); }
export async function addTransaction(...args) { return run(() => addTransactionImpl(...args)); }
export async function updateTransaction(...args) { return run(() => updateTransactionImpl(...args)); }
export async function deleteTransaction(...args) { return run(() => deleteTransactionImpl(...args)); }
export async function setBudget(...args) { return run(() => setBudgetImpl(...args)); }
export async function createAccount(...args) { return run(() => createAccountImpl(...args)); }
export async function updateAccount(...args) { return run(() => updateAccountImpl(...args)); }
export async function deleteAccount(...args) { return run(() => deleteAccountImpl(...args)); }
export async function setMajorThreshold(...args) { return run(() => setMajorThresholdImpl(...args)); }
export async function createRecurring(...args) { return run(() => createRecurringImpl(...args)); }
export async function updateRecurring(...args) { return run(() => updateRecurringImpl(...args)); }
export async function endRecurring(...args) { return run(() => endRecurringImpl(...args)); }
export async function deleteRecurring(...args) { return run(() => deleteRecurringImpl(...args)); }
export async function markRecurringPaid(...args) { return run(() => markRecurringPaidImpl(...args)); }
export async function unmarkRecurringPaid(...args) { return run(() => unmarkRecurringPaidImpl(...args)); }
export async function setCardBillAmount(...args) { return run(() => setCardBillAmountImpl(...args)); }
export async function setCardBillPaid(...args) { return run(() => setCardBillPaidImpl(...args)); }
export async function createGoal(...args) { return run(() => createGoalImpl(...args)); }
export async function updateGoal(...args) { return run(() => updateGoalImpl(...args)); }
export async function deleteGoal(...args) { return run(() => deleteGoalImpl(...args)); }
export async function addSavingsEntry(...args) { return run(() => addSavingsEntryImpl(...args)); }
export async function deleteSavingsEntry(...args) { return run(() => deleteSavingsEntryImpl(...args)); }
