'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createDashboard, deleteDashboard, setDefaultDashboard } from '@/actions/dashboard';
import { PlusCircle, Star, Trash2 } from 'lucide-react';
import { useLocale } from './LocaleProvider';

export default function DashboardSelector({ dashboards, activeId }) {
  const { t } = useLocale();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSelect = (e) => {
    if (e.target.value === 'new') {
      setIsCreating(true);
    } else {
      router.push(`/?dashboardId=${e.target.value}`);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const isFirst = dashboards.length === 0;
      const newSb = await createDashboard(newName, isFirst);
      setIsCreating(false);
      setNewName('');
      router.push(`/?dashboardId=${newSb.id}`);
    } catch (error) {
      alert("Error creating dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!activeId) return;
    const currentActive = dashboards.find(d => d.id === activeId);
    if (!currentActive) return;

    if (currentActive.is_default) {
      alert(t('cannotDeleteDefault'));
      return;
    }

    if (window.confirm(t('deleteConfirm', { name: currentActive.name }))) {
      setLoading(true);
      try {
        await deleteDashboard(activeId);
        const defaultDashboard = dashboards.find(d => d.is_default) || dashboards[0];
        if (defaultDashboard) {
          router.push(`/?dashboardId=${defaultDashboard.id}`);
        } else {
          router.push(`/`);
        }
      } catch (error) {
        alert("Error deleting dashboard.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSetDefault = async () => {
    if (!activeId) return;
    setLoading(true);
    try {
      await setDefaultDashboard(activeId);
    } catch (e) {
      alert("Error setting default dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const currentDashboard = dashboards.find(d => d.id === activeId);
  const isDefault = currentDashboard?.is_default;

  const inputClass = "flex-1 px-4 py-2.5 bg-slate-50/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500";

  if (isCreating || dashboards.length === 0) {
    return (
      <form onSubmit={handleCreate} className="flex gap-2 mb-6">
        <input
          autoFocus
          className={inputClass}
          placeholder={t('createNew')}
          value={newName}
          onChange={e => setNewName(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium whitespace-nowrap disabled:opacity-50 shadow-md shadow-violet-500/20 transition-all"
        >
          {loading ? '...' : t('create')}
        </button>
        {dashboards.length > 0 && (
          <button
            type="button"
            onClick={() => setIsCreating(false)}
            className="bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all"
          >
            {t('cancel')}
          </button>
        )}
      </form>
    );
  }

  return (
    <div className="mb-6 flex items-center gap-3">
      <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{t('selectDashboard')}</label>
      <div className="relative inline-block w-48">
        <select
          value={activeId}
          onChange={handleSelect}
          className="block w-full appearance-none bg-white/80 dark:bg-white/5 backdrop-blur-sm border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 py-2.5 px-4 pr-8 rounded-xl outline-none shadow-sm focus:ring-2 focus:ring-violet-500/40 font-medium transition-all"
        >
          {dashboards.map(db => (
            <option key={db.id} value={db.id}>{db.name} {db.is_default ? '★' : ''}</option>
          ))}
          <option value="new" className="font-bold">
            {t('createNew')}
          </option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500 dark:text-slate-400">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
        </div>
      </div>

      {activeId && (
        <div className="flex items-center gap-2">
          <button
            disabled={loading}
            onClick={handleSetDefault}
            title={t('setDefault')}
            className={`p-2 rounded-xl transition-all border ${isDefault ? 'bg-amber-100 dark:bg-amber-500/20 border-amber-300 dark:border-amber-500/30 text-amber-600 dark:text-amber-400' : 'bg-white/80 dark:bg-white/5 border-slate-200/60 dark:border-white/10 text-slate-400 dark:text-slate-500 hover:text-amber-500 dark:hover:text-amber-400'}`}
          >
            <Star className={`w-4 h-4 ${isDefault ? 'fill-current' : ''}`} />
          </button>

          <button
            disabled={loading || isDefault}
            onClick={handleDelete}
            title={isDefault ? t('cannotDeleteDefault') : t('deleteExpense')}
            className={`p-2 rounded-xl transition-all border bg-white/80 dark:bg-white/5 border-slate-200/60 dark:border-white/10 ${isDefault ? 'opacity-50 cursor-not-allowed text-slate-300 dark:text-slate-600' : 'text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-500/30'}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
