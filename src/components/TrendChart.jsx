'use client';

import { useState, useRef, useEffect } from 'react';
import { formatCurrency } from '@/utils/currency';
import { monthLabel } from '@/utils/month';
import { CATEGORY_COLORS } from '@/lib/palette';
import { useLocale } from './LocaleProvider';
import { card, cardTitle } from './ui';

// Per month: one stacked "money out" bar (transactions + installments) and one income bar.
const SERIES = [
  { key: 'expense', label: 'expensesSeries', color: CATEGORY_COLORS.blue },
  { key: 'installments', label: 'installmentsSeries', color: CATEGORY_COLORS.orange },
  { key: 'income', label: 'incomeSeries', color: CATEGORY_COLORS.aqua },
];

function niceMax(v) {
  if (v <= 0) return 100;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

const compact = (v, lang) => new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(v);

export default function TrendChart({ trend, activeMonth }) {
  const { t, lang, dark } = useLocale();
  const [hover, setHover] = useState(null);
  const col = (s) => (dark ? s.color.dark : s.color.light);

  const boxRef = useRef(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = 240, L = 44, R = 8, T = 12, B = 28;
  const plotH = H - T - B;
  const max = niceMax(Math.max(...trend.map((m) => Math.max(m.expense + m.installments, m.income)), 0));
  const y = (v) => T + plotH - (v / max) * plotH;
  const slot = (W - L - R) / trend.length;
  const barW = Math.min(26, slot / 3.2);
  const ticks = [0, max / 2, max];
  const grid = dark ? 'rgba(255,255,255,0.08)' : '#e7e5e4';
  const muted = dark ? '#a8a29e' : '#78716c';

  const hasData = trend.some((m) => m.expense || m.income || m.installments);

  return (
    <div className={`${card} p-5`} ref={boxRef}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className={cardTitle}>{t('incomeVsExpenses')}</h3>
        <div className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-300">
          {SERIES.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: col(s) }} />{t(s.label)}
            </span>
          ))}
        </div>
      </div>
      {!hasData ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 py-10 text-center">{t('noTrendData')}</p>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={t('incomeVsExpenses')} onMouseLeave={() => setHover(null)}>
            {ticks.map((v) => (
              <g key={v}>
                <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={grid} strokeWidth="1" />
                <text x={L - 6} y={y(v) + 3.5} textAnchor="end" fontSize="10" fill={muted}>{compact(v, lang)}</text>
              </g>
            ))}
            {trend.map((m, i) => {
              const cx = L + slot * i + slot / 2;
              const x1 = cx - barW - 1.5;
              const x2 = cx + 1.5;
              const eTop = y(m.expense);
              const iTop = y(m.expense + m.installments);
              const isActive = m.month === activeMonth;
              return (
                <g key={m.month} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} style={{ outline: 'none' }}>
                  <rect x={L + slot * i} y={T} width={slot} height={plotH} fill={hover === i ? (dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)') : 'transparent'} />
                  {m.expense > 0 && <path d={barPath(x1, eTop, barW, y(0) - eTop, m.installments > 0 ? 0 : 4)} fill={col(SERIES[0])} />}
                  {m.installments > 0 && (
                    <path d={barPath(x1, iTop, barW, Math.max(0, eTop - iTop - (m.expense > 0 ? 2 : 0)), 4)} fill={col(SERIES[1])} />
                  )}
                  {m.income > 0 && <path d={barPath(x2, y(m.income), barW, y(0) - y(m.income), 4)} fill={col(SERIES[2])} />}
                  <text x={cx} y={H - 9} textAnchor="middle" fontSize="11" fill={isActive ? (dark ? '#f5f5f4' : '#1c1917') : muted} fontWeight={isActive ? 700 : 500}>
                    {monthLabel(m.month, lang, { month: 'short' }).replace('.', '')}
                  </text>
                </g>
              );
            })}
            <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} stroke={dark ? 'rgba(255,255,255,0.25)' : '#a8a29e'} strokeWidth="1" />
          </svg>
          {hover !== null && (
            <div
              className="pointer-events-none absolute top-2 z-10 min-w-[11rem] rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#221b2c] shadow-lg p-3 text-xs"
              style={{ left: `${Math.min(Math.max(((L + slot * hover + slot / 2) / W) * 100, 15), 80)}%`, transform: 'translateX(-50%)' }}
            >
              <p className="font-semibold text-slate-800 dark:text-white mb-1.5">{monthLabel(trend[hover].month, lang)}</p>
              {SERIES.map((s) => (
                <p key={s.key} className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: col(s) }} />{t(s.label)}</span>
                  <span className="tabular-nums font-medium text-slate-800 dark:text-slate-100">{formatCurrency(trend[hover][s.key])}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Bar with rounded top corners only (data end), flat at the baseline.
function barPath(x, y, w, h, r) {
  if (h <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}
