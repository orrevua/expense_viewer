import './globals.css';
import { LocaleProvider } from '@/components/LocaleProvider';

export const metadata = {
  title: 'Money Tracker',
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
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
