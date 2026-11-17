'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useLocale } from './LocaleProvider';

// Shows "Install" when the app can be installed: the browser's prompt on Android/Chrome/Edge,
// or step-by-step instructions on iPhone/iPad (Safari has no install prompt).
export default function InstallButton({ className = '' }) {
  const { t } = useLocale();
  const [mode, setMode] = useState(null); // null | 'prompt' | 'ios'

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (standalone) return;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const update = () => setMode(window.__installPrompt ? 'prompt' : isIos ? 'ios' : null);
    update();
    window.addEventListener('installable', update);
    return () => window.removeEventListener('installable', update);
  }, []);

  if (!mode) return null;

  const onClick = async () => {
    if (mode === 'ios') {
      alert(t('installIos'));
      return;
    }
    const prompt = window.__installPrompt;
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice.catch(() => null);
    window.__installPrompt = null;
    setMode(null);
  };

  return (
    <button onClick={onClick} className={className} title={t('installApp')}>
      <Download className="w-4 h-4" />
      <span className="hidden sm:inline">{t('installApp')}</span>
    </button>
  );
}
