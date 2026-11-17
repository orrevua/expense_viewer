-- Fix: "Não foi possível salvar" when entering a card bill amount, a goal, etc.
--
-- Supabase can turn Row Level Security (RLS) on automatically for new tables.
-- With RLS on and no policy, reads silently return nothing and every save is
-- rejected. This app has its own login and checks on the server that each row
-- belongs to you, exactly like the existing installments tables, so RLS must be
-- off on the tables it created.
--
-- Touches ONLY the spending-tracker tables. The installments tables (dashboards,
-- installment_expenses, one_time_expenses, monthly_history, pix_payments) and
-- their data are not touched. Safe to re-run.

ALTER TABLE IF EXISTS categories         DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS accounts           DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recurring_expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transactions       DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS budgets            DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS finance_settings   DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS card_bills         DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS savings_goals      DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS savings_entries    DISABLE ROW LEVEL SECURITY;

-- Check: every row below should say rls_on = false
SELECT c.relname AS table_name, c.relrowsecurity AS rls_on
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('categories', 'accounts', 'recurring_expenses', 'transactions', 'budgets',
                    'finance_settings', 'card_bills', 'savings_goals', 'savings_entries')
ORDER BY 1;
