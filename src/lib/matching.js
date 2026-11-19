// Links transactions to fixed (recurring) items so nothing is counted twice.
// Pure functions (no database), unit-tested in scripts/test-matching.mjs.
//
// A fixed item (e.g. "Salário", income, day 5) is RECEIVED/PAID in a month when:
//   1. a transaction in that month is linked to it (recurring_id), or
//   2. otherwise, a transaction in that month that is not linked to anything has the same
//      kind and either the same name ("Salário" = "salario" = "Salário novembro"), or the
//      same category and an amount within 10% of the expected one.
// Each transaction pays at most one fixed item.
// Any OTHER unlinked transaction that also matches an item already paid that month is a
// probable DUPLICATE (e.g. salary typed in by hand and also marked as received).

export function normalizeName(s) {
  return String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function sameName(a, b) {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return short.length >= 4 && (long.startsWith(`${short} `) || long.endsWith(` ${short}`) || long.includes(` ${short} `));
}

function close(a, b, tolerance = 0.1) {
  if (!a || !b) return false;
  return Math.abs(a - b) <= Math.max(a, b) * tolerance;
}

const CARRY = 'carryover';

// Does transaction `t` look like the fixed item `r`? 2 = by name, 1 = by category+amount, 0 = no.
export function matchScore(r, t, expectedAmount = r.amount) {
  if ((r.kind || 'expense') !== t.kind || t.payment_method === CARRY) return 0;
  if (sameName(r.name, t.description)) return 2;
  if (r.category_id && r.category_id === t.category_id && close(Number(expectedAmount), Number(t.amount))) return 1;
  return 0;
}

// recurring: fixed items shown in `month`; transactions: any list (filtered to `month` here).
// Returns { payments: Map(recurringId -> { tx, auto }), usedIds: Set, duplicates: [{ tx, of }] }.
export function matchMonth(recurring, transactions, month) {
  const inMonth = transactions.filter((t) => t.date.startsWith(month) && t.payment_method !== CARRY);
  const payments = new Map();
  const usedIds = new Set();

  // 1. explicit links
  for (const r of recurring) {
    const tx = inMonth.find((t) => t.recurring_id === r.id);
    if (tx) {
      payments.set(r.id, { tx, auto: false });
      for (const t of inMonth) if (t.recurring_id === r.id) usedIds.add(t.id);
    }
  }
  // 2. automatic matches for items still unpaid: best score first, then closest amount
  const unlinked = () => inMonth.filter((t) => !t.recurring_id && !usedIds.has(t.id));
  const candidates = [];
  for (const r of recurring) {
    if (payments.has(r.id)) continue;
    for (const t of unlinked()) {
      const score = matchScore(r, t);
      if (score) candidates.push({ r, t, score, diff: Math.abs(Number(r.amount) - Number(t.amount)) });
    }
  }
  candidates.sort((a, b) => b.score - a.score || a.diff - b.diff || a.t.date.localeCompare(b.t.date));
  for (const c of candidates) {
    if (payments.has(c.r.id) || usedIds.has(c.t.id)) continue;
    payments.set(c.r.id, { tx: c.t, auto: true });
    usedIds.add(c.t.id);
  }
  // 3. duplicates: unlinked leftovers that look like an item already paid this month
  const duplicates = [];
  for (const t of unlinked()) {
    for (const r of recurring) {
      const paid = payments.get(r.id);
      if (!paid) continue;
      const score = matchScore(r, t, paid.tx.amount);
      if (score && close(Number(paid.tx.amount), Number(t.amount))) {
        duplicates.push({ tx: t, of: r, original: paid.tx });
        break;
      }
    }
  }
  return { payments, usedIds, duplicates };
}

// Write time: the unlinked transaction (if any) that should be linked to fixed item `r` in `month`.
export function findPaymentFor(r, transactions, month) {
  const { payments } = matchMonth([r], transactions, month);
  const p = payments.get(r.id);
  return p && p.auto ? p.tx : null;
}

// Write time: the fixed item (if any) a new transaction should be linked to.
export function findRecurringFor(t, recurring, transactions) {
  const month = t.date.slice(0, 7);
  const scored = recurring
    .filter((r) => !transactions.some((x) => x.recurring_id === r.id && x.date.startsWith(month)))
    .map((r) => ({ r, score: matchScore(r, t), diff: Math.abs(Number(r.amount) - Number(t.amount)) }))
    .filter((x) => x.score)
    .sort((a, b) => b.score - a.score || a.diff - b.diff);
  return scored[0]?.r || null;
}
