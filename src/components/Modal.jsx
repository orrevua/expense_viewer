'use client';

import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ title, onClose, onSubmit, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    createPortal(<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={onSubmit} className="w-full sm:max-w-lg bg-white dark:bg-[#1a1424] rounded-t-2xl sm:rounded-2xl shadow-xl border border-slate-200/60 dark:border-white/10 p-6 space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </form>
    </div>,
    document.body,
    )
  );
}
