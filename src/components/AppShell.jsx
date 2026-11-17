'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ArrowLeftRight, CreditCard, LogOut, Moon, Sun, Loader2, Wallet, Repeat, Users, PiggyBank as Piggy, Target } from 'lucide-react';
import { logout } from '@/actions/auth';
import { useLocale } from './LocaleProvider';

const TABS = [
  { href: '/', key: 'navOverview', short: 'navShortOverview', icon: LayoutDashboard },
  { href: '/transactions', key: 'navTransactions', short: 'navShortTransactions', icon: ArrowLeftRight },
  { href: '/recurring', key: 'navRecurring', short: 'navShortRecurring', icon: Repeat },
  { href: '/accounts', key: 'navAccounts', short: 'navShortAccounts', icon: CreditCard },
  { href: '/savings', key: 'navSavings', short: 'navShortSavings', icon: Piggy },
  { href: '/budgets', key: 'navBudgets', short: 'navShortBudgets', icon: Target },
  { href: '/installments', key: 'navInstallments', short: 'navShortInstallments', icon: Users },
];

const iconBtn = 'border border-slate-200/60 dark:border-white/10 rounded-xl bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 backdrop-blur-sm transition-all';

export default function AppShell({ userName, children }) {
  const { t, lang, toggle, dark, toggleDark } = useLocale();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  const isActive = (href) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <div className="min-h-screen font-sans pb-24 md:pb-8">
      <header className="sticky top-0 z-30 bg-white/70 dark:bg-[#120d1a]/80 backdrop-blur-md border-b border-slate-200/60 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/20">
              <Wallet className="w-5 h-5 text-white" />
            </span>
            <span className="text-lg font-bold text-slate-800 dark:text-white hidden sm:block md:hidden xl:block">{t('appName')}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5 ml-2 lg:ml-4">
            {TABS.map(({ href, key, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-2.5 lg:px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  isActive(href)
                    ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4 hidden xl:block" />
                {t(key)}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {userName && <span className="hidden 2xl:block text-sm text-slate-500 dark:text-slate-400 mr-1">{userName}</span>}
            <button onClick={toggle} className={`px-2.5 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 ${iconBtn}`} title={lang === 'en' ? 'Mudar para Português' : 'Switch to English'}>
              {lang === 'en' ? 'EN' : 'PT'}
            </button>
            <button onClick={toggleDark} className={`p-2 text-slate-500 dark:text-amber-400 ${iconBtn}`} title={dark ? 'Light mode' : 'Dark mode'}>
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={async () => { setLoggingOut(true); await logout(); }}
              disabled={loggingOut}
              className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-50"
              title={t('signOut')}
            >
              {loggingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/90 dark:bg-[#120d1a]/95 backdrop-blur-md border-t border-slate-200/60 dark:border-white/10 grid grid-cols-7 pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ href, short, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 py-2.5 text-[9.5px] leading-tight font-medium ${
              isActive(href) ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Icon className="w-5 h-5" />
            {t(short)}
          </Link>
        ))}
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-8">{children}</main>
    </div>
  );
}
