'use client';

import { useState, useEffect } from 'react';
import { Share2, LogOut, Check, Moon, Sun, Loader2 } from 'lucide-react';
import { logout } from '@/actions/auth';
import { getSharePath } from '@/actions/dashboard';
import { useLocale } from './LocaleProvider';

export default function TopBar({ activeDashboardId }) {
  const { t, lang, toggle, dark, toggleDark } = useLocale();
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const handleShare = async () => {
    if (!activeDashboardId) return alert(t('selectDashboard'));
    const sharePath = await getSharePath();
    if (!sharePath) return alert('Share link not configured.');
    const shareLink = `${baseUrl}${sharePath}?dashboardId=${activeDashboardId}`;
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
  };

  return (
    <div className="flex justify-between items-center mb-8">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{t('appTitle')}</h1>
      <div className="flex items-center gap-2">
        <button
          onClick={handleShare}
          className="flex items-center gap-2 bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 backdrop-blur-sm border border-slate-200/60 dark:border-white/10 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl text-sm font-medium transition-all shadow-sm"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
          {copied ? t('linkCopied') : t('shareDashboard')}
        </button>

        <button
          onClick={toggle}
          className="px-2.5 py-2 border border-slate-200/60 dark:border-white/10 rounded-xl text-sm font-semibold bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 backdrop-blur-sm text-slate-600 dark:text-slate-300 transition-all"
          title={lang === 'en' ? 'Switch to Portuguese' : 'Mudar para English'}
        >
          {lang === 'en' ? 'EN' : 'PT'}
        </button>

        <button
          onClick={toggleDark}
          className="p-2 border border-slate-200/60 dark:border-white/10 rounded-xl bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 backdrop-blur-sm text-slate-500 dark:text-amber-400 transition-all"
          title={dark ? 'Light mode' : 'Dark mode'}
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-50"
          title="Sign Out"
        >
          {loggingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
