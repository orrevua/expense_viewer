'use client';
import React from 'react';
import { formatCurrency } from '@/utils/currency';
import { useLocale } from './LocaleProvider';

export default function SpendingTrendChart({ timeline }) {
  const { t, translateMonth } = useLocale();

  const sorted = [...(timeline || [])].sort((a, b) => {
    const da = a.sort_date || a.month;
    const db = b.sort_date || b.month;
    return da < db ? -1 : da > db ? 1 : 0;
  });

  if (sorted.length < 2) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">{t('spendingTrend')}</h3>
        <p className="text-slate-400 text-sm">{t('noTrendData')}</p>
      </div>
    );
  }

  const maxVal = Math.max(...sorted.map(m => m.total_amount || 0), 1);
  const barCount = sorted.length;
  const svgWidth = 600;
  const svgHeight = 180;
  const barPadding = 4;
  const bottomMargin = 28;
  const topMargin = 24;
  const chartHeight = svgHeight - bottomMargin - topMargin;
  const barWidth = Math.min(40, (svgWidth - barPadding * barCount) / barCount);
  const totalBarsWidth = barCount * (barWidth + barPadding);
  const offsetX = (svgWidth - totalBarsWidth) / 2;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">{t('spendingTrend')}</h3>
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {sorted.map((month, i) => {
          const barH = Math.max(2, (month.total_amount / maxVal) * chartHeight);
          const x = offsetX + i * (barWidth + barPadding);
          const y = topMargin + chartHeight - barH;
          const isPaid = month.status === 'paid';
          const label = translateMonth(month.month).split('/')[0];
          return (
            <g key={month.month || i}>
              <rect
                x={x} y={y} width={barWidth} height={barH} rx={3}
                fill={isPaid ? '#10b981' : '#f59e0b'}
                opacity={0.85}
              />
              <text
                x={x + barWidth / 2} y={y - 4}
                textAnchor="middle" fontSize="8" fill="#64748b" fontWeight="600"
              >
                {formatCurrency(month.total_amount)}
              </text>
              <text
                x={x + barWidth / 2} y={svgHeight - 6}
                textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="500"
              >
                {label}
              </text>
            </g>
          );
        })}
        <line x1={offsetX - 4} y1={topMargin + chartHeight} x2={offsetX + totalBarsWidth} y2={topMargin + chartHeight} stroke="#e2e8f0" strokeWidth="1" />
      </svg>
    </div>
  );
}
