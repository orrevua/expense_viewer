-- Spending tracker tables (Overview / Transactions / Budgets tabs).
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- The existing Expense Viewer tables (dashboards, installment_expenses,
-- one_time_expenses, monthly_history, pix_payments) are NOT touched.

CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'blue',
  kind TEXT NOT NULL DEFAULT 'expense' CHECK (kind IN ('expense', 'income')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS categories_user_idx ON categories(user_id);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'expense' CHECK (kind IN ('expense', 'income')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  description TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'pix',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS transactions_user_date_idx ON transactions(user_id, date DESC);

CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, category_id)
);
