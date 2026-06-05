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
  const svgHeight = 180;
  const barPadding = 6;
  const bottomMargin = 28;
  const topMargin = 24;
  const chartHeight = svgHeight - bottomMargin - topMargin;
  const barWidth = Math.min(40, (svgWidth - barPadding * barCount) / barCount);
  const totalBarsWidth = barCount * (barWidth + barPadding);
  const offsetX = (svgWidth - totalBarsWidth) / 2;

  const paidGrad = dark ? ['#34d399', '#10b981'] : ['#6ee7b7', '#10b981'];
  const pendingGrad = dark ? ['#c084fc', '#8b5cf6'] : ['#c4b5fd', '#8b5cf6'];
  const textColor = dark ? '#94a3b8' : '#64748b';
  const labelColor = dark ? '#64748b' : '#94a3b8';
  const lineColor = dark ? '#334155' : '#e2e8f0';

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
        {sorted.map((month, i) => {
          const barH = Math.max(2, (month.total_amount / maxVal) * chartHeight);
          const x = offsetX + i * (barWidth + barPadding);
          const y = topMargin + chartHeight - barH;
          const isPaid = month.status === 'paid';
          const label = translateMonth(month.month).split('/')[0];
          return (
            <g key={month.month || i}>
              <rect
                x={x} y={y} width={barWidth} height={barH} rx={6}
                fill={isPaid ? 'url(#paidGrad)' : 'url(#pendingGrad)'}
              />
              <text
                x={x + barWidth / 2} y={y - 6}
                textAnchor="middle" fontSize="8" fill={textColor} fontWeight="600"
              >
                {formatCurrency(month.total_amount)}
              </text>
              <text
                x={x + barWidth / 2} y={svgHeight - 6}
                textAnchor="middle" fontSize="9" fill={labelColor} fontWeight="500"
              >
                {label}
              </text>
            </g>
          );
        })}
        <line x1={offsetX - 4} y1={topMargin + chartHeight} x2={offsetX + totalBarsWidth} y2={topMargin + chartHeight} stroke={lineColor} strokeWidth="1" />
      </svg>
    </div>
  );
}
