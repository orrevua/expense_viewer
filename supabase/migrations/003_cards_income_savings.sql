-- Card bills (amount + paid status per card per due month), fixed income
-- (salary, advance), "card is paid with which income" and the savings plan.
-- ADDITIVE ONLY: no existing table or row from the installments tab is touched.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS card_bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  month TEXT NOT NULL,                 -- 'YYYY-MM' = month the bill is DUE
  amount NUMERIC(12, 2),               -- bill total you typed in (NULL = sum of purchases)
  paid_at DATE,                        -- NULL = not paid yet
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (account_id, month)
);
CREATE INDEX IF NOT EXISTS card_bills_user_idx ON card_bills(user_id, month);

-- Fixed items can now be income (salary, advance) as well as expenses
ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'expense';

-- Which fixed income pays this card's bill (e.g. Nubank <- salary, Bradesco <- advance)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS pay_with_id UUID REFERENCES recurring_expenses(id) ON DELETE SET NULL;

-- Savings plan: goals (emergency fund, trip, ...) and money put in / taken out
CREATE TABLE IF NOT EXISTS savings_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC(12, 2) NOT NULL CHECK (target_amount > 0),
  monthly_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (monthly_amount >= 0),
  target_month TEXT,                   -- 'YYYY-MM' or NULL
  color TEXT NOT NULL DEFAULT 'aqua',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS savings_goals_user_idx ON savings_goals(user_id);

CREATE TABLE IF NOT EXISTS savings_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,      -- positive = saved, negative = withdrawn
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS savings_entries_user_idx ON savings_entries(user_id, date);

-- Same access model as the other tables (the app has its own login and checks ownership on the server)
ALTER TABLE card_bills      DISABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals   DISABLE ROW LEVEL SECURITY;
ALTER TABLE savings_entries DISABLE ROW LEVEL SECURITY;
