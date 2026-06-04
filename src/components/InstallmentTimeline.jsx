'use client';
import React from 'react';
import { useLocale } from './LocaleProvider';

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_MAP = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

function getMonthsFromStart(startMonth, count) {
  if (!startMonth) return [];
  const [shortMonth, year] = startMonth.split('/');
  const monthIdx = MONTH_MAP[shortMonth];
  if (monthIdx === undefined) return [];
  const months = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(parseInt(year), monthIdx + i, 1);
    months.push(`${MONTH_ABBR[d.getMonth()]}/${d.getFullYear()}`);
  }
  return months;
}

function parseDetails(details) {
  if (!details) return [];
  if (Array.isArray(details)) return details;
  if (typeof details === 'string') {
    try { return JSON.parse(details); } catch { return []; }
  }
  return [];
}

function getDetailStatus(timeline, month, expense) {
  if (!timeline || !expense.id) return null;
  const monthEntry = timeline.find(m => m.month === month);
  if (!monthEntry) return null;
  const details = parseDetails(monthEntry.details);
  const detail = details.find(d =>
    (d.expenseId && String(d.expenseId) === String(expense.id) && d.kind === 'installment')
  );
  return detail ? detail.status : null;
}

export default function InstallmentTimeline({ expense, timeline }) {
  const { translateMonth } = useLocale();
  const months = getMonthsFromStart(expense.start_month, expense.installments);
  const now = new Date();
  const currentMonthStr = `${MONTH_ABBR[now.getMonth()]}/${now.getFullYear()}`;

  const shouldTruncate = months.length > 10;
  const visible = shouldTruncate ? [...months.slice(0, 6), null, ...months.slice(-3)] : months;

  return (
    <div className="flex items-end gap-1 overflow-x-auto py-1 mb-2">
      {visible.map((month, idx) => {
        if (month === null) {
          return <div key="ellipsis" className="flex flex-col items-center px-1"><span className="text-[10px] text-slate-400 font-medium">...</span></div>;
        }
        const detailStatus = getDetailStatus(timeline, month, expense);
        const isPaid = detailStatus === 'paid';
        const isCurrent = month === currentMonthStr;
        const shortLabel = translateMonth(month).split('/')[0];

        return (
          <div key={month} className="flex flex-col items-center gap-0.5 min-w-[28px]">
            <div className={`w-3 h-3 rounded-full border-2 transition-colors ${
              isPaid ? 'bg-emerald-500 border-emerald-500' :
              isCurrent ? 'bg-blue-100 border-blue-500' :
              'bg-slate-100 border-slate-300'
            }`} />
            <span className={`text-[9px] leading-tight font-medium ${
              isCurrent ? 'text-blue-600' : isPaid ? 'text-emerald-600' : 'text-slate-400'
            }`}>{shortLabel}</span>
          </div>
        );
      })}
    </div>
  );
}
