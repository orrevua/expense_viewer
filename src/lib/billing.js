// Which money pays each credit-card bill. Pure functions (no database), unit-tested in
// scripts/test-billing.mjs.
//
// Rule: every bill has a PAYMENT DATE (the real one once paid, otherwise a predicted one)
// and it is paid with the money of the LAST fixed income received on or before that date.
//
// Predicted payment date of an unpaid bill:
//   - card "paid with" a fixed income: the day that income arrives before the due date
//     (but never before the bill closes: then the day after closing);
//   - otherwise: the due date;
//   - if that date has already passed (bill still unpaid): today.
import { shiftMonth, dueDate } from '../utils/month.js';

export function activeIn(r, month) {
  return r.start_month <= month && (!r.end_month || month <= r.end_month);
}

function addDays(iso, n) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Last fixed-income arrival on or before isoDate -> { date, income } (null if none).
export function moneySourceFor(isoDate, recurring) {
  const incomes = recurring.filter((r) => r.kind === 'income');
  const key = isoDate.slice(0, 7);
  let best = null;
  for (const m of [shiftMonth(key, -1), key]) {
    for (const r of incomes) {
      // Ignore when the income was registered in the app (start_month): your salary existed
      // before you typed it in. Only an income that was stopped (end_month) no longer counts.
      if (r.end_month && m > r.end_month) continue;
      const d = dueDate(m, r.due_day);
      if (d <= isoDate && (!best || d > best.date)) best = { date: d, income: r };
    }
  }
  return best;
}

export function predictedPaymentDate(bill, recurring, today) {
  if (bill.paidAt) return bill.paidAt;
  let date = bill.dueDate || `${bill.month}-28`;
  const income = recurring.find((r) => r.id === bill.card.pay_with_id && r.kind === 'income');
  if (income && bill.dueDate) {
    // the arrival of that income on or before the due date
    const dueMonth = bill.dueDate.slice(0, 7);
    let arrival = dueDate(dueMonth, income.due_day);
    if (arrival > bill.dueDate) arrival = dueDate(shiftMonth(dueMonth, -1), income.due_day);
    if (bill.closeDate && arrival <= bill.closeDate) arrival = addDays(bill.closeDate, 1);
    const stillActive = !income.end_month || arrival.slice(0, 7) <= income.end_month;
    if (stillActive && arrival <= bill.dueDate) date = arrival;
  }
  if (date < today) date = today;
  return date;
}

// -> { payDate, fundMonth, fundDay, sourceIncomeId, predicted, fundedEarly }
export function billFunding(bill, recurring, today) {
  const payDate = predictedPaymentDate(bill, recurring, today);
  const source = moneySourceFor(payDate, recurring);
  const fundMonth = source ? source.date.slice(0, 7) : payDate.slice(0, 7);
  return {
    payDate,
    fundMonth,
    // position in that month's timeline: the payment day, or the end if it is paid next month
    fundDay: payDate.slice(0, 7) === fundMonth ? Number(payDate.slice(8, 10)) : 31,
    sourceIncomeId: source?.income.id || null,
    predicted: !bill.paidAt,
    fundedEarly: fundMonth !== bill.month,
  };
}
