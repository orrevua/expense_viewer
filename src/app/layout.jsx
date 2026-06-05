import './globals.css';
import { LocaleProvider } from '@/components/LocaleProvider';

export const metadata = {
  title: 'Expense Viewer',
  description: 'Personal Finance Dashboard',
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
