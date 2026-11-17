'use client';

import { useState } from 'react';
import { DownloadCloud, Loader2 } from 'lucide-react';
import { exportInstallmentsBackup } from '@/actions/finance';
import { useLocale } from './LocaleProvider';
import { ghostBtn } from './ui';

export default function BackupButton() {
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    try {
      const data = await exportInstallmentsBackup();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-parcelas-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert(t('errorSaving'));
    }
    setBusy(false);
  };
  return (
    <button onClick={download} disabled={busy} className={ghostBtn} title={t('backupHint')}>
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
      {t('downloadBackup')}
    </button>
  );
}
