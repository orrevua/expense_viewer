'use client';

import { useState } from 'react';
import { login } from '@/actions/auth';
import { useRouter } from 'next/navigation';
import { Lock, TrendingUp, PieChart, BarChart3, ArrowRight } from 'lucide-react';

function FloatingShape({ className, children }) {
  return <div className={className}>{children}</div>;
}

function BrandGraphic() {
  return (
    <div className="relative w-full max-w-xs mx-auto">
      <FloatingShape className="animate-float absolute -top-4 -left-4 w-16 h-16 rounded-2xl bg-emerald-400/20 backdrop-blur-sm border border-emerald-300/30 flex items-center justify-center">
        <TrendingUp className="w-7 h-7 text-emerald-300" />
      </FloatingShape>
      <FloatingShape className="animate-float-slow absolute -top-2 right-4 w-12 h-12 rounded-xl bg-blue-400/20 backdrop-blur-sm border border-blue-300/30 flex items-center justify-center">
        <PieChart className="w-5 h-5 text-blue-300" />
      </FloatingShape>
      <FloatingShape className="animate-float absolute -bottom-3 left-8 w-14 h-14 rounded-2xl bg-amber-400/15 backdrop-blur-sm border border-amber-300/25 flex items-center justify-center" style={{ animationDelay: '1s' }}>
        <BarChart3 className="w-6 h-6 text-amber-300" />
      </FloatingShape>

      <svg viewBox="0 0 200 140" className="w-full drop-shadow-lg">
        <defs>
          <linearGradient id="barGrad1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="barGrad3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <rect x="20" y="60" width="22" height="60" rx="4" fill="url(#barGrad1)" opacity="0.9" />
        <rect x="50" y="35" width="22" height="85" rx="4" fill="url(#barGrad2)" opacity="0.9" />
        <rect x="80" y="50" width="22" height="70" rx="4" fill="url(#barGrad1)" opacity="0.9" />
        <rect x="110" y="20" width="22" height="100" rx="4" fill="url(#barGrad2)" opacity="0.9" />
        <rect x="140" y="45" width="22" height="75" rx="4" fill="url(#barGrad3)" opacity="0.9" />
        <rect x="170" y="70" width="22" height="50" rx="4" fill="url(#barGrad3)" opacity="0.7" />
        <line x1="15" y1="122" x2="197" y2="122" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
        <polyline
          points="31,58 61,33 91,48 121,18 151,43 181,68"
          fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        />
        <circle cx="31" cy="58" r="3" fill="white" opacity="0.8" />
        <circle cx="61" cy="33" r="3" fill="white" opacity="0.8" />
        <circle cx="91" cy="48" r="3" fill="white" opacity="0.8" />
        <circle cx="121" cy="18" r="3" fill="white" opacity="0.8" />
        <circle cx="151" cy="43" r="3" fill="white" opacity="0.8" />
        <circle cx="181" cy="68" r="3" fill="white" opacity="0.8" />
      </svg>
    </div>
  );
}

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await login(password);
      if (res.success) {
        router.push('/');
        router.refresh();
      } else {
        setError(res.error);
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 items-center justify-center p-12">
        <div className="absolute inset-0 animate-shimmer" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 text-center max-w-md animate-fade-in-up">
          <BrandGraphic />
          <h1 className="text-4xl font-extrabold text-white mt-10 tracking-tight">
            Expense Viewer
          </h1>
          <p className="text-slate-400 mt-3 text-lg leading-relaxed">
            Acompanhe suas despesas, parcelas e gastos mensais com clareza total.
          </p>
          <div className="flex items-center justify-center gap-6 mt-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">100%</div>
              <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Controle</div>
            </div>
            <div className="w-px h-10 bg-slate-700" />
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">Real-time</div>
              <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Dados</div>
            </div>
            <div className="w-px h-10 bg-slate-700" />
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-400">Simples</div>
              <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider">Interface</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-100 rounded-full blur-3xl opacity-60" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-emerald-100 rounded-full blur-3xl opacity-40" />

        <div className="relative z-10 w-full max-w-md animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg mb-4">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              Expense Viewer
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 border border-white/60 p-8 sm:p-10">
            <div className="flex justify-center mb-6">
              <div className={`relative p-4 rounded-2xl transition-all duration-500 ${focused ? 'bg-blue-600 shadow-lg shadow-blue-500/30 scale-105' : 'bg-slate-800'}`}>
                <Lock className="w-7 h-7 text-white" />
                <div className={`absolute inset-0 rounded-2xl animate-pulse-ring border-2 ${focused ? 'border-blue-400' : 'border-slate-600'}`} />
              </div>
            </div>

            <h1 className="text-2xl font-extrabold text-center text-slate-800 tracking-tight">
              Bem-vindo de volta
            </h1>
            <p className="text-center text-slate-500 mt-2 mb-8 text-sm">
              Insira sua senha para acessar o painel
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="relative">
                <input
                  type="password"
                  placeholder="Senha de acesso"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:border-blue-500 focus:bg-white focus:shadow-lg focus:shadow-blue-500/10 transition-all duration-300 text-slate-800 placeholder:text-slate-400 text-sm"
                  required
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 p-3 rounded-xl">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                disabled={loading}
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3.5 rounded-2xl transition-all duration-300 shadow-lg shadow-slate-800/20 hover:shadow-xl hover:shadow-slate-800/30 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none group"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            Expense Viewer &middot; Painel de finanças pessoais
          </p>
        </div>
      </div>
    </div>
  );
}
