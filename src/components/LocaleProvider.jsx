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
    pixPayment: 'PIX',
    pixCopyCode: 'Copy PIX Code',
    pixCopied: 'Copied!',
    pixScanToPay: 'Scan to pay',
    pixError: 'Could not generate PIX code',
    pixNotConfigured: 'PIX payment not available',
    pixAmount: 'Amount',
    pixRemaining: 'Remaining: {remaining} of {total}',
    pixRecordPayment: 'Record Payment',
    pixPaymentHistory: 'Payment History',
    pixDeletePayment: 'Delete',
    pixDeleteConfirm: 'Delete this payment record?',
    pixFullyPaid: 'Fully paid via PIX',
    pixNoPayments: 'No payments recorded yet',
    navOverview: 'Overview',
    navTransactions: 'Transactions',
    navBudgets: 'Budgets',
    navInstallments: 'Installments',
    appName: 'Money Tracker',
    spentThisMonth: 'Spent',
    incomeThisMonth: 'Income',
    installmentsBill: 'Installments bill',
    balance: 'Balance',
    balanceHint: 'Income − spent − installments',
    fromInstallmentsTab: 'From the Installments tab',
    transactionsCount: '{count} transactions',
    byCategory: 'Spending by category',
    incomeVsExpenses: 'Last 6 months',
    expensesSeries: 'Expenses',
    incomeSeries: 'Income',
    installmentsSeries: 'Installments',
    recentTransactions: 'Recent transactions',
    seeAll: 'See all',
    noTransactions: 'No transactions this month yet.',
    noSpending: 'No spending recorded this month.',
    uncategorized: 'Uncategorized',
    addTransaction: 'Add transaction',
    editTransaction: 'Edit transaction',
    expense: 'Expense',
    income: 'Income',
    description: 'Description',
    amountLabel: 'Amount (R$)',
    date: 'Date',
    category: 'Category',
    paymentMethod: 'Payment method',
    notes: 'Notes (optional)',
    save: 'Save',
    saving: 'Saving…',
    delete: 'Delete',
    edit: 'Edit',
    confirmDeleteTransaction: 'Delete this transaction?',
    pm_pix: 'PIX',
    pm_credit: 'Credit card',
    pm_debit: 'Debit card',
    pm_cash: 'Cash',
    pm_transfer: 'Transfer',
    pm_other: 'Other',
    search: 'Search…',
    allCategories: 'All categories',
    allTypes: 'All types',
    exportCsv: 'Export CSV',
    filteredTotal: 'Expenses {expense} · Income {income}',
    previousMonth: 'Previous month',
    nextMonth: 'Next month',
    budgetsTitle: 'Monthly budgets',
    budgetsHint: 'Set a monthly limit per category. Leave empty to remove it.',
    budgetLimit: 'Limit',
    budgetOf: '{spent} of {limit}',
    budgetLeft: '{amount} left',
    budgetOver: '{amount} over',
    noBudget: 'No limit',
    budgetOk: 'On track',
    budgetNear: 'Near limit',
    budgetExceeded: 'Over budget',
    totalBudget: 'Total budgeted',
    budgetsOverview: 'Budgets',
    noBudgetsYet: 'No budgets yet. Set limits on the Budgets tab.',
    categoriesTitle: 'Categories',
    newCategory: 'New category',
    categoryName: 'Category name',
    add: 'Add',
    confirmDeleteCategory: 'Delete category "{name}"? Its transactions become uncategorized.',
    expenseCategories: 'Expense categories',
    incomeCategories: 'Income categories',
    setupTitle: 'One more step: create the new tables',
    setupBody: 'Run the SQL in supabase/migrations/001_spending_tracker.sql in your Supabase SQL Editor, then reload this page. Your existing installment data is not affected and is still available in the Installments tab.',
    loadError: 'Could not load data: {error}',
    errorSaving: 'Could not save. Please try again.',
    signOut: 'Sign out',
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
    pixPayment: 'PIX',
    pixCopyCode: 'Copiar Codigo PIX',
    pixCopied: 'Copiado!',
    pixScanToPay: 'Escaneie para pagar',
    pixError: 'Nao foi possivel gerar o codigo PIX',
    pixNotConfigured: 'Pagamento PIX indisponivel',
    pixAmount: 'Valor',
    pixRemaining: 'Restante: {remaining} de {total}',
    pixRecordPayment: 'Registrar Pagamento',
    pixPaymentHistory: 'Historico de Pagamentos',
    pixDeletePayment: 'Excluir',
    pixDeleteConfirm: 'Excluir este registro de pagamento?',
    pixFullyPaid: 'Totalmente pago via PIX',
    pixNoPayments: 'Nenhum pagamento registrado',
    navOverview: 'Visão Geral',
    navTransactions: 'Transações',
    navBudgets: 'Orçamentos',
    navInstallments: 'Parcelas',
    appName: 'Controle de Gastos',
    spentThisMonth: 'Gasto',
    incomeThisMonth: 'Receitas',
    installmentsBill: 'Fatura de parcelas',
    balance: 'Saldo',
    balanceHint: 'Receitas − gastos − parcelas',
    fromInstallmentsTab: 'Da aba Parcelas',
    transactionsCount: '{count} transações',
    byCategory: 'Gastos por categoria',
    incomeVsExpenses: 'Últimos 6 meses',
    expensesSeries: 'Gastos',
    incomeSeries: 'Receitas',
    installmentsSeries: 'Parcelas',
    recentTransactions: 'Transações recentes',
    seeAll: 'Ver todas',
    noTransactions: 'Nenhuma transação neste mês ainda.',
    noSpending: 'Nenhum gasto registrado neste mês.',
    uncategorized: 'Sem categoria',
    addTransaction: 'Adicionar transação',
    editTransaction: 'Editar transação',
    expense: 'Gasto',
    income: 'Receita',
    description: 'Descrição',
    amountLabel: 'Valor (R$)',
    date: 'Data',
    category: 'Categoria',
    paymentMethod: 'Forma de pagamento',
    notes: 'Observações (opcional)',
    save: 'Salvar',
    saving: 'Salvando…',
    delete: 'Excluir',
    edit: 'Editar',
    confirmDeleteTransaction: 'Excluir esta transação?',
    pm_pix: 'PIX',
    pm_credit: 'Cartão de crédito',
    pm_debit: 'Cartão de débito',
    pm_cash: 'Dinheiro',
    pm_transfer: 'Transferência',
    pm_other: 'Outro',
    search: 'Buscar…',
    allCategories: 'Todas as categorias',
    allTypes: 'Todos os tipos',
    exportCsv: 'Exportar CSV',
    filteredTotal: 'Gastos {expense} · Receitas {income}',
    previousMonth: 'Mês anterior',
    nextMonth: 'Próximo mês',
    budgetsTitle: 'Orçamentos mensais',
    budgetsHint: 'Defina um limite mensal por categoria. Deixe vazio para remover.',
    budgetLimit: 'Limite',
    budgetOf: '{spent} de {limit}',
    budgetLeft: 'Restam {amount}',
    budgetOver: '{amount} acima',
    noBudget: 'Sem limite',
    budgetOk: 'Dentro do limite',
    budgetNear: 'Perto do limite',
    budgetExceeded: 'Acima do limite',
    totalBudget: 'Total orçado',
    budgetsOverview: 'Orçamentos',
    noBudgetsYet: 'Nenhum orçamento ainda. Defina limites na aba Orçamentos.',
    categoriesTitle: 'Categorias',
    newCategory: 'Nova categoria',
    categoryName: 'Nome da categoria',
    add: 'Adicionar',
    confirmDeleteCategory: 'Excluir a categoria "{name}"? As transações dela ficarão sem categoria.',
    expenseCategories: 'Categorias de gastos',
    incomeCategories: 'Categorias de receitas',
    setupTitle: 'Falta um passo: criar as novas tabelas',
    setupBody: 'Execute o SQL de supabase/migrations/001_spending_tracker.sql no SQL Editor do Supabase e recarregue a página. Seus dados de parcelas não são afetados e continuam disponíveis na aba Parcelas.',
    loadError: 'Não foi possível carregar os dados: {error}',
    errorSaving: 'Não foi possível salvar. Tente novamente.',
    signOut: 'Sair',
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
