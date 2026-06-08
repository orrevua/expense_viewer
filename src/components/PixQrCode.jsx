'use client';

import React, { useState } from 'react';
import QRCode from 'qrcode';
import { generatePixForMonth, recordPixPayment, deletePixPayment } from '@/actions/pix';
import { generatePixCode } from '@/utils/pixGenerator';
import { Copy, Check, X, QrCode, Loader2, Trash2 } from 'lucide-react';
import { useLocale } from './LocaleProvider';
import { formatCurrency } from '@/utils/currency';

export default function PixQrCode({ dashboardId, month, totalAmount }) {
  const { t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [pixCode, setPixCode] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [pixConfig, setPixConfig] = useState(null);
  const [customAmount, setCustomAmount] = useState(0);
  const [remainingBalance, setRemainingBalance] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [payments, setPayments] = useState([]);
  const [fullyPaid, setFullyPaid] = useState(false);
  const [recording, setRecording] = useState(false);

  const refreshData = async () => {
    const result = await generatePixForMonth(dashboardId, month);
    if (result.error) { setError(result.error); return; }

    setPayments(result.payments || []);
    setPaidAmount(result.paidAmount || 0);

    if (result.fullyPaid) {
      setFullyPaid(true);
      setRemainingBalance(0);
      setPixCode(null);
      setQrDataUrl(null);
      return;
    }

    setFullyPaid(false);
    setRemainingBalance(result.remainingBalance);
    setCustomAmount(result.remainingBalance);
    setPixConfig(result.pixConfig);
    setPixCode(result.pixCode);
    const dataUrl = await QRCode.toDataURL(result.pixCode, { width: 256, margin: 2 });
    setQrDataUrl(dataUrl);
  };

  const handleOpen = async () => {
    if (isOpen) { setIsOpen(false); return; }
    setLoading(true);
    setError(null);
    try {
      await refreshData();
      setIsOpen(true);
    } catch {
      setError(t('pixError'));
    }
    setLoading(false);
  };

  const handleAmountChange = async (e) => {
    const val = parseFloat(e.target.value);
    if (!Number.isFinite(val) || val <= 0 || !pixConfig) return;
    const clamped = Math.min(val, remainingBalance);
    setCustomAmount(clamped);
    const code = generatePixCode({ pixKey: pixConfig.key, name: pixConfig.name, city: pixConfig.city, amount: clamped });
    setPixCode(code);
    const dataUrl = await QRCode.toDataURL(code, { width: 256, margin: 2 });
    setQrDataUrl(dataUrl);
  };

  const handleCopy = async () => {
    if (!pixCode) return;
    await navigator.clipboard.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRecord = async () => {
    if (recording || customAmount <= 0) return;
    setRecording(true);
    try {
      const result = await recordPixPayment(dashboardId, month, customAmount);
      if (result.error) { setError(result.error); setRecording(false); return; }
      await refreshData();
    } catch {
      setError(t('pixError'));
    }
    setRecording(false);
  };

  const handleDelete = async (paymentId) => {
    if (!window.confirm(t('pixDeleteConfirm'))) return;
    try {
      await deletePixPayment(paymentId);
      await refreshData();
    } catch {
      setError(t('pixError'));
    }
  };

  return (
    <div className="mt-3">
      <button
        onClick={handleOpen}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-500/20 transition-all disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
        {t('pixPayment')}
      </button>

      {error && (
        <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>
      )}

      {isOpen && (
        <div className="mt-3 p-4 bg-white/70 dark:bg-white/5 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/60 dark:border-white/10 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('pixScanToPay')}</p>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>

          {fullyPaid ? (
            <p className="text-center text-sm font-semibold text-emerald-600 dark:text-emerald-400 py-4">
              {t('pixFullyPaid')}
            </p>
          ) : (
            <>
              <div className="flex justify-center">
                <img src={qrDataUrl} alt="PIX QR Code" className="rounded-lg" width={200} height={200} />
              </div>

              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400">{t('pixAmount')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={remainingBalance}
                  value={customAmount}
                  onChange={handleAmountChange}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-700/50 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-teal-500/30"
                />
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {t('pixRemaining', { remaining: formatCurrency(remainingBalance), total: formatCurrency(totalAmount) })}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <code className="flex-1 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-2 py-1.5 rounded truncate">
                  {pixCode}
                </code>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-500/20 transition-all shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? t('pixCopied') : t('pixCopyCode')}
                </button>
              </div>

              <button
                onClick={handleRecord}
                disabled={recording || customAmount <= 0}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all disabled:opacity-50"
              >
                {recording ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {t('pixRecordPayment')} {formatCurrency(customAmount)}
              </button>
            </>
          )}

          {payments.length > 0 && (
            <div className="border-t border-slate-100 dark:border-white/5 pt-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">{t('pixPaymentHistory')}</p>
              <div className="space-y-1.5">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-50/50 dark:bg-white/[0.02] min-w-0">
                    <div className="flex items-center gap-2 min-w-0 truncate">
                      <span className="font-medium text-emerald-600 dark:text-emerald-400 shrink-0">{formatCurrency(p.amount)}</span>
                      <span className="text-slate-400 dark:text-slate-500 truncate">{new Date(p.created_at).toLocaleDateString()}</span>
                    </div>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {payments.length === 0 && isOpen && (
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center">{t('pixNoPayments')}</p>
          )}
        </div>
      )}
    </div>
  );
}
