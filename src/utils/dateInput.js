// dd/mm/aaaa <-> ISO helpers for quick date prompts.
export function toBR(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// "19/11/2026", "19/11" (current year) or "2026-11-19" -> "2026-11-19"; null if invalid
export function parseBR(text, fallbackYear = new Date().getFullYear()) {
  const v = String(text || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  if (!m) return null;
  const iso = `${m[3] || fallbackYear}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) || d.getDate() !== Number(m[1]) ? null : iso;
}
