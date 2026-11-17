-- Spending tracker tables (Overview / Transactions / Fixed / Cards & Accounts / Budgets tabs).
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- ADDITIVE ONLY: the existing Expense Viewer tables (users, dashboards,
-- installment_expenses, one_time_expenses, monthly_history, pix_payments)
-- are NOT altered, and no existing row is touched.

CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'blue',
  kind TEXT NOT NULL DEFAULT 'expense' CHECK (kind IN ('expense', 'income')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS categories_user_idx ON categories(user_id);

-- Bank accounts, cash/wallets and credit cards
CREATE TABLE IF NOT EXISTS accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'bank' CHECK (type IN ('bank', 'cash', 'credit_card')),
  color TEXT NOT NULL DEFAULT 'violet',
  closing_day INTEGER CHECK (closing_day BETWEEN 1 AND 31),
  due_day INTEGER CHECK (due_day BETWEEN 1 AND 31),
  credit_limit NUMERIC(12, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS accounts_user_idx ON accounts(user_id);

-- Expenses that repeat every month (rent, internet, subscriptions, bills...)
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  due_day INTEGER NOT NULL DEFAULT 10 CHECK (due_day BETWEEN 1 AND 31),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  payment_method TEXT NOT NULL DEFAULT 'pix',
  start_month TEXT NOT NULL,          -- 'YYYY-MM'
  end_month TEXT,                     -- 'YYYY-MM', NULL = still active
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS recurring_user_idx ON recurring_expenses(user_id);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'expense' CHECK (kind IN ('expense', 'income')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  description TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  recurring_id UUID REFERENCES recurring_expenses(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'pix',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS transactions_user_date_idx ON transactions(user_id, date DESC);
-- In case an earlier version of this file was already run:
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurring_id UUID REFERENCES recurring_expenses(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, category_id)
);

CREATE TABLE IF NOT EXISTS finance_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  major_threshold NUMERIC(12, 2) NOT NULL DEFAULT 300
);

-- Same access model as the existing tables: the app has its own login and checks
-- ownership on the server, so Supabase RLS (auto-enabled on new tables) must be off.
-- See 002_fix_rls_new_tables.sql for details.
ALTER TABLE categories         DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounts           DISABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions       DISABLE ROW LEVEL SECURITY;
ALTER TABLE budgets            DISABLE ROW LEVEL SECURITY;
ALTER TABLE finance_settings   DISABLE ROW LEVEL SECURITY;
