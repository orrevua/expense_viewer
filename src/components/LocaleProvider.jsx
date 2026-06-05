"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

const LocaleContext = createContext(null);

const translations = {
  en: {
    appTitle: 'Expense Viewer',
    startMonthLabel: 'Start Month (Billing Cycle)',
    shareDashboard: 'Share Dashboard',
    linkCopied: 'Link Copied!',
    addNewExpense: 'Add New Expense',
    oneTime: 'One-Time',
    installment: 'Installment',
    expenseName: 'Expense Name',
    amount: 'Amount (R$)',
    totalAmount: 'Total Amount (R$)',
    installments: 'Number of Installments',
    status: 'Status',
    pending: 'pending',
    paid: 'paid',
    saveExpense: 'Save Expense',
    selectDashboard: 'Select Dashboard:',
    create: 'Create',
    cancel: 'Cancel',
    createNew: '+ Create New',
    readOnly: 'Read Only',
    deleteConfirm: 'Delete "{name}"? This action cannot be undone.',
    markNextInstallment: 'Mark next installment as paid',
    markPreviousInstallment: 'Decrease installment',
    sharedMonthForecast: 'Shared Month Forecast',
    installmentExpenses: 'Installment Expenses',
    oneTimeExpenses: 'One-Time Expenses',
    monthlyHistory: 'Monthly History',
    amountPerPart: 'Amount per part:',
    totalLabel: 'Total:',
    installmentsProgress: '{paid}/{total} installments',
    deleteInstallment: 'Delete installment',
    deleteExpense: 'Delete expense',
    markAsPending: 'Mark as pending',
    markAsPaid: 'Mark as paid',
    installmentDetail: 'Installment',
    noInstallmentExpensesYet: 'No installment expenses yet.',
    noOneTimeExpensesYet: 'No one-time expenses yet.',
    noHistoryYet: 'No history available yet.',
    cannotDeleteDefault: 'Cannot delete the default dashboard.',
    setDefault: 'Set as Default',
    editInstallment: 'Edit',
    editSave: 'Save',
    editCancel: 'Cancel',
    editName: 'Name',
    editTotalAmount: 'Total Amount',
    editInstallmentsCount: 'Installments',
    editStartMonth: 'Start Month',
    startMonth: 'Start:',
    endMonth: 'End:',
    spendingTrend: 'Spending Trend',
    noTrendData: 'Not enough data for trend chart.',
    currentMonth: 'Current',
  },
  pt: {
    appTitle: 'Visualizador de Gastos',
    startMonthLabel: 'Mês de Início (Fatura)',
    shareDashboard: 'Compartilhar Painel',
    linkCopied: 'Link copiado!',
    addNewExpense: 'Adicionar Despesa',
    oneTime: 'À vista',
    installment: 'Parcelado',
    expenseName: 'Nome da Despesa',
    amount: 'Valor (R$)',
    totalAmount: 'Valor Total (R$)',
    installments: 'Número de Parcelas',
    status: 'Status',
    pending: 'pendente',
    paid: 'pago',
    saveExpense: 'Salvar Despesa',
    selectDashboard: 'Selecionar Painel:',
    create: 'Criar',
    cancel: 'Cancelar',
    createNew: '+ Criar Novo',
    readOnly: 'Somente Leitura',
    deleteConfirm: 'Deletar "{name}"? Esta ação não pode ser desfeita.',
    markNextInstallment: 'Marcar próxima parcela como paga',
    markPreviousInstallment: 'Diminuir parcela',
    sharedMonthForecast: 'Previsão do Mês (Compartilhado)',
    installmentExpenses: 'Despesas Parceladas',
    oneTimeExpenses: 'Despesas Únicas',
    monthlyHistory: 'Histórico Mensal',
    amountPerPart: 'Valor por parcela:',
    totalLabel: 'Total:',
    installmentsProgress: '{paid}/{total} parcelas',
    deleteInstallment: 'Deletar parcela',
    deleteExpense: 'Deletar despesa',
    markAsPending: 'Marcar como pendente',
    markAsPaid: 'Marcar como paga',
    installmentDetail: 'Parcela',
    noInstallmentExpensesYet: 'Ainda não há despesas parceladas.',
    noOneTimeExpensesYet: 'Ainda não há despesas únicas.',
    noHistoryYet: 'Ainda não há histórico disponível.',
    cannotDeleteDefault: 'Não é possível excluir o painel padrão.',
    setDefault: 'Definir como Padrão',
    editInstallment: 'Editar',
    editSave: 'Salvar',
    editCancel: 'Cancelar',
    editName: 'Nome',
    editTotalAmount: 'Valor Total',
    editInstallmentsCount: 'Parcelas',
    editStartMonth: 'Mês de Início',
    startMonth: 'Início:',
    endMonth: 'Fim:',
    spendingTrend: 'Tendência de Gastos',
    noTrendData: 'Dados insuficientes para o gráfico.',
    currentMonth: 'Atual',
  }
};

const monthMap = {
  en: {
    'Jan/': 'Jan/', 'Feb/': 'Feb/', 'Mar/': 'Mar/', 'Apr/': 'Apr/',
    'May/': 'May/', 'Jun/': 'Jun/', 'Jul/': 'Jul/', 'Aug/': 'Aug/',
    'Sep/': 'Sep/', 'Oct/': 'Oct/', 'Nov/': 'Nov/', 'Dec/': 'Dec/',
  },
  pt: {
    'Jan/': 'Jan/', 'Feb/': 'Fev/', 'Mar/': 'Mar/', 'Apr/': 'Abr/',
    'May/': 'Mai/', 'Jun/': 'Jun/', 'Jul/': 'Jul/', 'Aug/': 'Ago/',
    'Sep/': 'Set/', 'Oct/': 'Out/', 'Nov/': 'Nov/', 'Dec/': 'Dez/',
  }
};

export function LocaleProvider({ children }) {
  const [lang, setLang] = useState('pt');
  const [dark, setDark] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('lv_lang');
      if (stored) setLang(stored);
      const storedTheme = localStorage.getItem('lv_theme');
      if (storedTheme === 'dark') {
        setDark(true);
        document.documentElement.classList.add('dark');
      } else if (!storedTheme) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          setDark(true);
          document.documentElement.classList.add('dark');
        }
      }
    } catch (e) {}
  }, []);

  const toggle = () => {
    const next = lang === 'en' ? 'pt' : 'en';
    setLang(next);
    try { localStorage.setItem('lv_lang', next); } catch (e) {}
  };

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try { localStorage.setItem('lv_theme', next ? 'dark' : 'light'); } catch (e) {}
  };

  const t = (key, vars = {}) => {
    const str = (translations[lang] && translations[lang][key]) || translations['en'][key] || key;
    return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  };

  const translateMonth = (monthString) => {
    for (const [enMonth, ptMonth] of Object.entries(monthMap[lang] || monthMap.pt)) {
      if (monthString.startsWith(enMonth)) {
        return monthString.replace(enMonth, ptMonth);
      }
    }
    return monthString;
  };

  return (
    <LocaleContext.Provider value={{ lang, toggle, dark, toggleDark, t, translateMonth }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) return { lang: 'pt', toggle: () => {}, dark: false, toggleDark: () => {}, t: (k) => k, translateMonth: (m) => m };
  return ctx;
}
