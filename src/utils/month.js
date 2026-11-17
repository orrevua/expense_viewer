const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function isMonthKey(v) {
  return typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

export function normalizeMonth(v) {
  return isMonthKey(v) ? v : currentMonthKey();
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
