'use client';

import { useEffect } from 'react';

// Registers the service worker and keeps the browser's install prompt for the Install button.
export default function PwaSetup() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    const onPrompt = (e) => {
      e.preventDefault();
      window.__installPrompt = e;
      window.dispatchEvent(new Event('installable'));
    };
    const onInstalled = () => {
      window.__installPrompt = null;
      window.dispatchEvent(new Event('installable'));
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  return null;
}
