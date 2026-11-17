-- Fix: "new row violates row-level security policy for table categories".
--
-- Supabase turns on Row Level Security (RLS) for new tables. This app does not
-- use Supabase Auth (it has its own login), so RLS policies based on auth.uid()
-- cannot work, and with RLS on and no policy every insert is rejected.
-- The app already checks on the server that each row belongs to the logged-in
-- user, the same way it does for the existing installments tables.
--
-- This puts the NEW tables in the same state as the existing ones.
-- It does not touch any existing table or row. Safe to re-run.

ALTER TABLE categories         DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounts           DISABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions       DISABLE ROW LEVEL SECURITY;
ALTER TABLE budgets            DISABLE ROW LEVEL SECURITY;
ALTER TABLE finance_settings   DISABLE ROW LEVEL SECURITY;
