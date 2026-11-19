// Run: node scripts/test-matching.mjs
import { matchMonth, findPaymentFor, findRecurringFor, normalizeName } from '../src/lib/matching.js';

const M = '2026-11';
const salary = { id: 'sal', kind: 'income', name: 'Salário', amount: 5000, category_id: 'c-sal', due_day: 5 };
const advance = { id: 'adv', kind: 'income', name: 'Adiantamento', amount: 2500, category_id: 'c-sal', due_day: 20 };
const rent = { id: 'rent', kind: 'expense', name: 'Aluguel', amount: 1500, category_id: 'c-home', due_day: 10 };
const internet = { id: 'net', kind: 'expense', name: 'Internet', amount: 120, category_id: 'c-bills', due_day: 15 };
const rec = [salary, advance, rent, internet];
const tx = (id, kind, description, amount, date, extra = {}) => ({ id, kind, description, amount, date, category_id: null, recurring_id: null, payment_method: 'pix', ...extra });

const cases = [];
const check = (name, cond, detail = '') => cases.push([name, !!cond, detail]);

// 1. Salary typed by hand + fixed income -> counts once, as received
{
  const r = matchMonth(rec, [tx('t1', 'income', 'Salário', 5000, '2026-11-19')], M);
  check('Salário digitado à mão = receita fixa recebida', r.payments.get('sal')?.tx.id === 't1' && r.payments.get('sal').auto);
  check('...e não vira duplicado', r.duplicates.length === 0);
}
// 2. Typed by hand AND marked received (two transactions) -> one is a duplicate
{
  const r = matchMonth(rec, [
    tx('t1', 'income', 'Salário', 5000, '2026-11-19'),
    tx('t2', 'income', 'Salário', 5000, '2026-11-05', { recurring_id: 'sal' }),
  ], M);
  check('Marcado recebido + digitado: o vinculado é o pagamento', r.payments.get('sal')?.tx.id === 't2');
  check('...o digitado é apontado como duplicado', r.duplicates.length === 1 && r.duplicates[0].tx.id === 't1');
}
// 3. Accents / case / extra words
check('Nomes: "salario" = "Salário"', normalizeName('Salário') === normalizeName('salario'));
{
  const r = matchMonth(rec, [tx('t1', 'income', 'salario novembro', 5100, '2026-11-06')], M);
  check('"salario novembro" casa com Salário', r.payments.get('sal')?.tx.id === 't1');
}
// 4. Same category: salary vs advance distinguished by amount
{
  const r = matchMonth(rec, [tx('t1', 'income', 'Pagamento empresa', 2500, '2026-11-20', { category_id: 'c-sal' })], M);
  check('Mesma categoria, R$ 2.500 = Adiantamento (não Salário)', r.payments.get('adv')?.tx.id === 't1' && !r.payments.has('sal'));
}
// 5. Different amount and name -> no match (a bonus is extra income)
{
  const r = matchMonth(rec, [tx('t1', 'income', 'Bônus', 1200, '2026-11-25', { category_id: 'c-sal' })], M);
  check('Bônus de R$ 1.200 não é salário nem adiantamento', r.payments.size === 0 && r.duplicates.length === 0);
}
// 6. Expense: rent typed by hand
{
  const r = matchMonth(rec, [tx('t1', 'expense', 'Aluguel', 1500, '2026-11-09')], M);
  check('Aluguel digitado = despesa fixa paga', r.payments.get('rent')?.tx.id === 't1');
}
// 7. Kind must match: income named "Aluguel" (e.g. received rent) is not the rent expense
{
  const r = matchMonth(rec, [tx('t1', 'income', 'Aluguel', 1500, '2026-11-09')], M);
  check('Receita "Aluguel" não paga a despesa Aluguel', !r.payments.has('rent'));
}
// 8. Other month is ignored
{
  const r = matchMonth(rec, [tx('t1', 'income', 'Salário', 5000, '2026-10-05')], M);
  check('Salário de outubro não conta em novembro', !r.payments.has('sal'));
}
// 9. Two salaries typed by hand, no link -> first pays, second is duplicate
{
  const r = matchMonth(rec, [tx('t1', 'income', 'Salário', 5000, '2026-11-05'), tx('t2', 'income', 'Salário', 5000, '2026-11-19')], M);
  check('Dois salários digitados: um paga, outro é duplicado', r.payments.get('sal')?.tx.id && r.duplicates.length === 1);
}
// 10. Carry-over transactions are never matched
{
  const r = matchMonth(rec, [tx('t1', 'income', 'Sobra do mês anterior', 5000, '2026-11-01', { payment_method: 'carryover', category_id: 'c-sal' })], M);
  check('Sobra do mês anterior não vira salário', r.payments.size === 0);
}
// 11. Write time: adding the fixed income links the existing transaction
{
  const t = findPaymentFor(salary, [tx('t1', 'income', 'Salário', 5000, '2026-11-19')], M);
  check('Cadastrar receita fixa liga a transação existente', t?.id === 't1');
}
// 12. Write time: a new transaction links to the unpaid fixed item; not if already paid
{
  const t = tx('new', 'income', 'Salário', 5000, '2026-11-19');
  check('Nova transação "Salário" liga à receita fixa', findRecurringFor(t, rec, [])?.id === 'sal');
  check('...mas não se o salário do mês já foi marcado', findRecurringFor(t, rec, [tx('t2', 'income', 'Salário', 5000, '2026-11-05', { recurring_id: 'sal' })]) === null);
}
// 13. Short names don't match by substring ("Luz" vs "Luzia")
{
  const luz = { id: 'luz', kind: 'expense', name: 'Luz', amount: 200, category_id: null, due_day: 20 };
  const r = matchMonth([luz], [tx('t1', 'expense', 'Presente Luzia', 80, '2026-11-02')], M);
  check('"Luz" não casa com "Presente Luzia"', !r.payments.has('luz'));
}

let fail = 0;
for (const [name, ok] of cases) { if (!ok) fail++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`); }
console.log(fail ? `\n${fail} falha(s)` : '\nTodos os cenários passaram');
process.exit(fail ? 1 : 0);
