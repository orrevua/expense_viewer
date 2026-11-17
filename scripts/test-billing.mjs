// Run: node scripts/test-billing.mjs
// Scenarios for "which money pays each card bill", using the real setup:
// salary day 5, advance day 20; Bradesco closes 29 / due 15 (paid with advance);
// Nubank closes 4 / due 11 (paid with salary).
import { billFunding } from '../src/lib/billing.js';
import { billWindow } from '../src/utils/month.js';

const salary = { id: 'salary', kind: 'income', due_day: 5, start_month: '2026-01', end_month: null };
const advance = { id: 'advance', kind: 'income', due_day: 20, start_month: '2026-01', end_month: null };
const recurring = [salary, advance];
const bradesco = { id: 'bradesco', closing_day: 29, due_day: 15, pay_with_id: 'advance' };
const nubank = { id: 'nubank', closing_day: 4, due_day: 11, pay_with_id: 'salary' };
const bradescoNoPayWith = { ...bradesco, pay_with_id: null };
const nubankNoPayWith = { ...nubank, pay_with_id: null };

function bill(card, dueMonth, paidAt = null) {
  const w = billWindow(dueMonth, card.closing_day, card.due_day);
  return { card, month: dueMonth, paidAt, dueDate: w.dueDate, closeDate: w.closeDate };
}

const cases = [
  // [description, bill, today, expected fundMonth, expected source income]
  ['Bradesco (fecha 29/out, vence 15/nov) pago 30/out -> dinheiro de outubro (adiantamento 20/out)', bill(bradesco, '2026-11', '2026-10-30'), '2026-11-17', '2026-10', 'advance'],
  ['Bradesco vence 15/nov pago 03/nov (antes do salário de 05/nov) -> outubro (adiantamento)', bill(bradesco, '2026-11', '2026-11-03'), '2026-11-17', '2026-10', 'advance'],
  ['Bradesco vence 15/nov pago 05/nov (no dia do salário) -> novembro (salário)', bill(bradesco, '2026-11', '2026-11-05'), '2026-11-17', '2026-11', 'salary'],
  ['Bradesco vence 15/nov pago 14/nov -> novembro (salário)', bill(bradesco, '2026-11', '2026-11-14'), '2026-11-17', '2026-11', 'salary'],
  ['Bradesco vence 15/nov pago atrasado 21/nov (depois do adiantamento) -> novembro (adiantamento)', bill(bradesco, '2026-11', '2026-11-21'), '2026-11-25', '2026-11', 'advance'],
  ['Bradesco vence 15/dez, ainda não pago, hoje 17/nov -> previsto 30/nov com o adiantamento de 20/nov', bill(bradesco, '2026-12'), '2026-11-17', '2026-11', 'advance'],
  ['Bradesco vence 15/dez, não pago, hoje 01/nov -> previsto com adiantamento de 20/nov', bill(bradesco, '2026-12'), '2026-11-01', '2026-11', 'advance'],
  ['Bradesco vence 15/nov, não pago e atrasado, hoje 17/nov -> sai do dinheiro de agora (salário 05/nov)', bill(bradesco, '2026-11'), '2026-11-17', '2026-11', 'salary'],
  ['Bradesco vence 15/nov, não pago e atrasado, hoje 22/nov -> adiantamento 20/nov', bill(bradesco, '2026-11'), '2026-11-22', '2026-11', 'advance'],
  ['Nubank (fecha 04/nov, vence 11/nov) não pago, hoje 01/nov -> previsto 05/nov com o salário', bill(nubank, '2026-11'), '2026-11-01', '2026-11', 'salary'],
  ['Nubank vence 11/nov pago 08/nov -> novembro (salário 05/nov)', bill(nubank, '2026-11', '2026-11-08'), '2026-11-17', '2026-11', 'salary'],
  ['Nubank vence 11/nov pago 03/nov (antes do salário, ainda aberta) -> outubro (adiantamento 20/out)', bill(nubank, '2026-11', '2026-11-03'), '2026-11-17', '2026-10', 'advance'],
  ['Nubank vence 11/nov pago 25/out (adiantado, depois do adiantamento) -> outubro', bill(nubank, '2026-11', '2026-10-25'), '2026-11-17', '2026-10', 'advance'],
  ['Nubank vence 11/dez não pago, hoje 17/nov -> previsto 05/dez com salário de dezembro', bill(nubank, '2026-12'), '2026-11-17', '2026-12', 'salary'],
  ['Bradesco sem "Pago com", vence 15/dez não pago -> previsto no vencimento: salário 05/dez', bill(bradescoNoPayWith, '2026-12'), '2026-11-17', '2026-12', 'salary'],
  ['Nubank sem "Pago com", vence 11/dez não pago -> salário 05/dez', bill(nubankNoPayWith, '2026-12'), '2026-11-17', '2026-12', 'salary'],
  ['Fevereiro: Bradesco fecha 28/fev (dia 29 não existe), vence 15/mar, pago 01/mar -> fevereiro (adiantamento 20/fev)', bill(bradesco, '2027-03', '2027-03-01'), '2027-03-10', '2027-02', 'advance'],
  ['Virada de ano: Bradesco vence 15/jan, pago 30/dez -> dezembro (adiantamento 20/dez)', bill(bradesco, '2027-01', '2026-12-30'), '2027-01-10', '2026-12', 'advance'],
  // incomes registered in the app only in November still count for October payments
  ['Rendas cadastradas só em nov: Bradesco pago 03/nov -> outubro (adiantamento 20/out)', bill(bradesco, '2026-11', '2026-11-03'), '2026-11-17', '2026-10', 'advance', [{ ...salary, start_month: '2026-11' }, { ...advance, start_month: '2026-11' }]],
  // an income that was stopped no longer pays anything
  ['Adiantamento encerrado em out: Bradesco vence 15/dez não pago -> salário (único que sobrou)', bill(bradesco, '2026-12'), '2026-11-17', '2026-12', 'salary', [salary, { ...advance, end_month: '2026-10' }]],
];

let fail = 0;
for (const [desc, b, today, expMonth, expSource, rec] of cases) {
  const r = billFunding(b, rec || recurring, today);
  const ok = r.fundMonth === expMonth && r.sourceIncomeId === expSource;
  if (!ok) fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${desc}\n      pagamento ${r.predicted ? 'previsto' : 'real'} ${r.payDate} -> mês ${r.fundMonth}, renda ${r.sourceIncomeId}${ok ? '' : `  (esperado ${expMonth}/${expSource})`}`);
}
console.log(fail ? `\n${fail} falha(s)` : '\nTodos os cenários passaram');
process.exit(fail ? 1 : 0);
