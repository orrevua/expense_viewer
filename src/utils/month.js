const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function isMonthKey(v) {
  return typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

// The tracker starts in October 2026: earlier months are treated as if they did not
// exist (cannot be opened, and nothing before them is counted or carried over).
// The Installments tab is not affected and keeps all of its history.
export const TRACKING_START = '2026-10';
export const TRACKING_START_DATE = `${TRACKING_START}-01`;

export function normalizeMonth(v) {
  const key = isMonthKey(v) ? v : currentMonthKey();
  return key < TRACKING_START ? TRACKING_START : key;
}

export function shiftMonth(key, delta) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthRange(key) {
  const start = `${key}-01`;
  const next = shiftMonth(key, 1);
  return { start, end: `${next}-01` }; // end is exclusive
}

// "2026-11" -> "Nov/2026" (format used by the Expense Viewer monthly_history table)
export function toViewerMonth(key) {
  const [y, m] = key.split('-').map(Number);
  return `${SHORT[m - 1]}/${y}`;
}

export function monthLabel(key, lang, opts = { month: 'long', year: 'numeric' }) {
  const [y, m] = key.split('-').map(Number);
  const text = new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'pt-BR', opts).format(new Date(y, m - 1, 1));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysIn(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

// ISO date for a given day in a month, clamped to the month length (e.g. day 31 in Feb).
export function dueDate(key, dayOfMonth) {
  const d = Math.min(Math.max(1, dayOfMonth || 1), daysIn(key));
  return `${key}-${String(d).padStart(2, '0')}`;
}

// Month whose credit-card bill a purchase belongs to.
export function billMonthFor(isoDate, closingDay) {
  const key = isoDate.slice(0, 7);
  if (!closingDay) return key;
  return Number(isoDate.slice(8, 10)) > closingDay ? shiftMonth(key, 1) : key;
}

// Month whose bill a purchase belongs to, identified by the month the bill is DUE.
// e.g. closes 29 / due 15: purchase 10/Nov -> closes Nov -> due Dec.
//      closes 4 / due 11:  purchase 3/Nov -> due Nov; purchase 5/Nov -> due Dec.
export function billDueMonth(isoDate, closingDay, dueDay) {
  const closeMonth = billMonthFor(isoDate, closingDay);
  return closingDay && dueDay && dueDay <= closingDay ? shiftMonth(closeMonth, 1) : closeMonth;
}

// Purchase window and key dates of the bill due in `dueMonthKey`.
export function billWindow(dueMonthKey, closingDay, dueDay) {
  const closeMonth = closingDay && dueDay && dueDay <= closingDay ? shiftMonth(dueMonthKey, -1) : dueMonthKey;
  if (!closingDay) {
    return { closeDate: null, startDate: `${closeMonth}-01`, dueDate: dueDay ? dueDate(dueMonthKey, dueDay) : null };
  }
  const closeDate = dueDate(closeMonth, closingDay);
  const prevClose = dueDate(shiftMonth(closeMonth, -1), closingDay);
  const start = new Date(`${prevClose}T12:00:00`);
  start.setDate(start.getDate() + 1);
  const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
  return { closeDate, startDate, dueDate: dueDay ? dueDate(dueMonthKey, dueDay) : null };
}
