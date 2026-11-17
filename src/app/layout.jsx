import './globals.css';
import { LocaleProvider } from '@/components/LocaleProvider';
import PwaSetup from '@/components/PwaSetup';

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#6d28d9' },
    { media: '(prefers-color-scheme: dark)', color: '#120d1a' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata = {
  title: 'Money Tracker',
  applicationName: 'Controle de Gastos',
  appleWebApp: { capable: true, title: 'Gastos', statusBarStyle: 'black-translucent' },
  // icons: src/app/favicon.ico, icon.png and apple-icon.png (Next.js file conventions)
  description: 'Track all your spending, income, budgets and installments',
  openGraph: {
    type: 'website',
    title: 'Money Tracker',
    description: 'Track all your spending, income, budgets and installments',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Expense Viewer Dashboard' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Money Tracker',
    description: 'Track all your spending, income, budgets and installments',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="text-slate-800 dark:text-slate-100 transition-colors">
        <LocaleProvider>
          <PwaSetup />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
