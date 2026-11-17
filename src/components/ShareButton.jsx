'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { getSharePath } from '@/actions/dashboard';
import { useLocale } from './LocaleProvider';

export default function ShareButton({ activeDashboardId }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (!activeDashboardId) return alert(t('selectDashboard'));
    const sharePath = await getSharePath();
    if (!sharePath) return alert('Share link not configured.');
    const shareLink = `${window.location.origin}${sharePath}?dashboardId=${activeDashboardId}`;
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 backdrop-blur-sm border border-slate-200/60 dark:border-white/10 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl text-sm font-medium transition-all shadow-sm"
    >
      {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
      {copied ? t('linkCopied') : t('shareDashboard')}
    </button>
  );
}
