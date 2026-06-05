'use client';
import React from 'react';
import { formatCurrency } from '@/utils/currency';
import { useLocale } from './LocaleProvider';

export default function SpendingTrendChart({ timeline }) {
  const { t, translateMonth, dark } = useLocale();

  const sorted = [...(timeline || [])].sort((a, b) => {
    const da = a.sort_date || a.month;
    const db = b.sort_date || b.month;
    return da < db ? -1 : da > db ? 1 : 0;
  });

  if (sorted.length < 2) {
    return (
      <div className="bg-white/70 dark:bg-white/5 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/60 dark:border-white/10 p-6 mb-6">
        <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">{t('spendingTrend')}</h3>
        <p className="text-slate-400 dark:text-slate-500 text-sm">{t('noTrendData')}</p>
      </div>
    );
  }

  const maxVal = Math.max(...sorted.map(m => m.total_amount || 0), 1);
  const barCount = sorted.length;
  const svgWidth = 600;
  const topMargin = 52;
  const bottomMargin = 28;
  const svgHeight = 220;
  const chartHeight = svgHeight - bottomMargin - topMargin;
  const barPadding = 6;
  const barWidth = Math.min(40, (svgWidth - barPadding * barCount) / barCount);
  const totalBarsWidth = barCount * (barWidth + barPadding);
  const offsetX = (svgWidth - totalBarsWidth) / 2;

  const paidGrad = dark ? ['#34d399', '#10b981'] : ['#6ee7b7', '#10b981'];
  const pendingGrad = dark ? ['#c084fc', '#8b5cf6'] : ['#c4b5fd', '#8b5cf6'];
  const textColor = dark ? '#94a3b8' : '#64748b';
  const labelColor = dark ? '#64748b' : '#94a3b8';
  const lineColor = dark ? '#334155' : '#e2e8f0';

  const barPositions = sorted.map((month, i) => {
    const barH = Math.max(2, (month.total_amount / maxVal) * chartHeight);
    const x = offsetX + i * (barWidth + barPadding);
    const y = topMargin + chartHeight - barH;
    return { month, i, barH, x, y, cx: x + barWidth / 2 };
  });

  const labelYPositions = barPositions.map((bar, i) => {
    const baseY = bar.y - 6;
    if (barCount <= 8) return baseY;

    const prev = barPositions[i - 1];
    const next = barPositions[i + 1];
    const prevClose = prev && Math.abs(prev.y - bar.y) < 14;
    const nextClose = next && Math.abs(next.y - bar.y) < 14;

    if (prevClose || nextClose) {
      return i % 2 === 0 ? Math.min(baseY, bar.y - 6) : Math.min(baseY - 14, topMargin - 6);
    }
    return baseY;
  });

  const fontSize = barCount > 14 ? 6.5 : barCount > 8 ? 7 : 8;

  return (
    <div className="bg-white/70 dark:bg-white/5 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/60 dark:border-white/10 p-6 mb-6">
      <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">{t('spendingTrend')}</h3>
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="paidGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={paidGrad[0]} />
            <stop offset="100%" stopColor={paidGrad[1]} />
          </linearGradient>
          <linearGradient id="pendingGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={pendingGrad[0]} />
            <stop offset="100%" stopColor={pendingGrad[1]} />
          </linearGradient>
        </defs>
        {barPositions.map((bar, i) => {
          const isPaid = bar.month.status === 'paid';
          const monthLabel = translateMonth(bar.month.month).split('/')[0];
          const labelY = labelYPositions[i];
          const needsLine = labelY < bar.y - 10;
          return (
            <g key={bar.month.month || i}>
              <rect
                x={bar.x} y={bar.y} width={barWidth} height={bar.barH} rx={6}
                fill={isPaid ? 'url(#paidGrad)' : 'url(#pendingGrad)'}
              />
              {needsLine && (
                <line
                  x1={bar.cx} y1={bar.y - 2} x2={bar.cx} y2={labelY + 4}
                  stroke={lineColor} strokeWidth="0.5" strokeDasharray="2,2"
                />
              )}
              <text
                x={bar.cx} y={labelY}
                textAnchor="middle" fontSize={fontSize} fill={textColor} fontWeight="600"
              >
                {formatCurrency(bar.month.total_amount)}
              </text>
              <text
                x={bar.cx} y={svgHeight - 6}
                textAnchor="middle" fontSize="9" fill={labelColor} fontWeight="500"
              >
                {monthLabel}
              </text>
            </g>
          );
        })}
        <line x1={offsetX - 4} y1={topMargin + chartHeight} x2={offsetX + totalBarsWidth} y2={topMargin + chartHeight} stroke={lineColor} strokeWidth="1" />
      </svg>
    </div>
  );
}
