'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/actions/auth';

const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });

function toValidDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function getMonthInfo(value) {
  const date = toValidDate(value);
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  return {
    month: monthFormatter.format(monthStart).replace(' ', '/'),
    sort_date: monthStart.toISOString().split('T')[0],
  };
}

function getTargetMonthForInstallment(startMonthStr, paidInstallments) {
  // Parse startMonthStr like "May/2026" to calculate target month
  // If start is May/2026 and paid=0, target is May/2026
  // If start is May/2026 and paid=1, target is Jun/2026 (next month)
  // If start is May/2026 and paid=2, target is Jul/2026 (month after next)
  
  if (!startMonthStr) return getMonthInfo(new Date());
  
  // Parse "May/2026" format
  const [shortMonth, year] = startMonthStr.split('/');
  const monthMap = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  
  const monthIndex = monthMap[shortMonth];
  if (monthIndex === undefined) return getMonthInfo(new Date());
  
  const startDate = new Date(parseInt(year), monthIndex, 1);
  const targetDate = new Date(startDate.getFullYear(), startDate.getMonth() + paidInstallments, 1);
  
  return getMonthInfo(targetDate);
}

function parseDetails(details) {
  if (!details) return [];
  if (Array.isArray(details)) return details;
  if (typeof details === 'string') {
    try {
      const parsed = JSON.parse(details);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }
  return [];
}

function isOneTimeHistoryDetail(detail) {
  return Boolean(detail && detail.kind === 'one-time');
}

function isInstallmentHistoryDetail(detail) {
  return Boolean(detail && detail.kind === 'installment');
}

function makeHistoryDetailKey(kind, expenseId) {
  return `${kind}:${expenseId}`;
}

function findHistoryDetailIndex(details, detail) {
  if (!Array.isArray(details) || !detail) return -1;

  if (detail.detailKey) {
    const keyIndex = details.findIndex((item) => item.detailKey === detail.detailKey);
    if (keyIndex >= 0) return keyIndex;
  }

  if (detail.expenseId && detail.kind) {
    const idIndex = details.findIndex((item) => item.expenseId && String(item.expenseId) === String(detail.expenseId) && item.kind === detail.kind);
    if (idIndex >= 0) return idIndex;
  }

  return -1;
}

function isOrphanInstallmentDetail(detail) {
  if (!detail) return false;
  if (detail.expenseId || detail.detailKey) return false;
  return detail.kind === 'installment' || /\d+\/\d+/.test(String(detail.name || ''));
}

function getInstallmentBaseName(detailName) {
  if (!detailName) return '';
  const match = String(detailName).match(/^(.*?)\s*\(\d+\/\d+\)$/);
  return match ? match[1] : detailName;
}

async function syncInstallmentHistoryDetail(dashboardId, expense, operatedInstallmentNumber, isPaid, monthInfo = null) {
  // Calculate target month based on billing cycle
  // The offset is the installment number - 1 (e.g., 1st installment is offset 0)
  const targetMonthOffset = Math.max(0, operatedInstallmentNumber - 1);
  
  const targetMonth = monthInfo ||
    (expense?.start_month
      ? getTargetMonthForInstallment(expense.start_month, targetMonthOffset)
      : getMonthInfo(new Date()));

  const { data: currentHistory } = await supabase
    .from('monthly_history')
    .select('*')
    .eq('month', targetMonth.month)
    .eq('dashboard_id', dashboardId)
    .single();

  const details = parseDetails(currentHistory?.details || []).filter((detail) => !isOrphanInstallmentDetail(detail));
  const detailKey = `installment:${targetMonth.month}:${expense.name}`;
  const existingIndex = details.findIndex((item) => item.detailKey === detailKey || (item.expenseId && String(item.expenseId) === String(expense.id) && item.kind === 'installment'));

  if (!isPaid) {
    // When decrementing, preserve the existing installment number from history
    // Only change status to pending, but keep includeInTotal true (it's still expected for this month)
    if (existingIndex >= 0) {
      const existingDetail = details[existingIndex];
      const pendingDetail = {
        ...existingDetail,
        status: 'pending',
        includeInTotal: true,
      };
      details[existingIndex] = pendingDetail;
    } else {
      // Don't add pending entries if history doesn't exist yet
      if (!currentHistory) return;

      const pendingDetail = {
        expenseId: expense.id,
        detailKey,
        name: `${expense.name} (${operatedInstallmentNumber}/${expense.installments})`,
        amount: expense.installment_amount,
        status: 'pending',
        includeInTotal: true,
        kind: 'installment',
        installmentNumber: operatedInstallmentNumber,
        installmentTotal: expense.installments,
      };
      details.push(pendingDetail);
    }
  } else {
    // Mark as paid
    const paidDetail = {
      expenseId: expense.id,
      detailKey,
      name: `${expense.name} (${operatedInstallmentNumber}/${expense.installments})`,
      amount: expense.installment_amount,
      status: 'paid',
      includeInTotal: true,
      kind: 'installment',
      installmentNumber: operatedInstallmentNumber,
      installmentTotal: expense.installments,
    };

    if (existingIndex >= 0) {
      details[existingIndex] = paidDetail;
    } else {
      details.push(paidDetail);
    }
  }

  const totalAmount = details.reduce((sum, item) => {
    if (item.includeInTotal === false) return sum;
    return sum + (Number(item.amount) || 0);
  }, 0);

  if (!currentHistory) {
    // Only create history if we have paid installments
    if (!isPaid) return;
    
    const { error } = await supabase
      .from('monthly_history')
      .insert([{
        dashboard_id: dashboardId,
        month: targetMonth.month,
        total_amount: totalAmount,
        details,
        status: 'pending',
        sort_date: targetMonth.sort_date,
      }]);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase
    .from('monthly_history')
    .update({
      total_amount: totalAmount,
      details,
    })
    .eq('id', currentHistory.id);
  if (error) throw new Error(error.message);
}

async function upsertMonthlyHistoryDetail(dashboardId, monthInfo, detail, options = {}) {
  const { data: currentHistory } = await supabase
    .from('monthly_history')
    .select('*')
    .eq('month', monthInfo.month)
    .eq('dashboard_id', dashboardId)
    .single();

  const details = parseDetails(currentHistory?.details);
  const existingIndex = findHistoryDetailIndex(details, detail);

  if (existingIndex >= 0) {
    details[existingIndex] = detail;
  } else {
    details.push(detail);
  }

  const totalAmount = details.reduce((sum, item) => {
    if (item.includeInTotal === false) return sum;
    return sum + (Number(item.amount) || 0);
  }, 0);
  const nextStatus = options.status === 'pending' ? 'pending' : (currentHistory?.status || options.status || 'paid');

  if (currentHistory) {
    const { error } = await supabase
      .from('monthly_history')
      .update({
        total_amount: totalAmount,
        details,
        status: nextStatus,
      })
      .eq('id', currentHistory.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase
    .from('monthly_history')
    .insert([{ dashboard_id: dashboardId, month: monthInfo.month, total_amount: totalAmount, details, status: nextStatus, sort_date: monthInfo.sort_date }]);
  if (error) throw new Error(error.message);
}

async function removeMonthlyHistoryDetail(dashboardId, monthInfo, detailName) {
  const { data: currentHistory } = await supabase
    .from('monthly_history')
    .select('*')
    .eq('month', monthInfo.month)
    .eq('dashboard_id', dashboardId)
    .single();

  if (!currentHistory) return;

  const details = parseDetails(currentHistory.details).filter((item) => item.name !== detailName);

  if (details.length === 0) {
    const { error } = await supabase.from('monthly_history').delete().eq('id', currentHistory.id);
    if (error) throw new Error(error.message);
    return;
  }

  const totalAmount = details.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const { error } = await supabase
    .from('monthly_history')
    .update({ total_amount: totalAmount, details })
    .eq('id', currentHistory.id);
  if (error) throw new Error(error.message);
}

// 0. Dashboards logic
export async function getDashboards() {
  if (!supabase) return [];
  const user = await getSessionUser();
  if (!user) return [];
  const { data } = await supabase.from('dashboards').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
  return data || [];
}

export async function createDashboard(name, isDefault = false) {
  const user = await getSessionUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase.from('dashboards').insert([{ name, is_default: isDefault, user_id: user.id }]).select().single();
  if (error) throw new Error(error.message);
  revalidatePath('/');
  return data;
}

export async function deleteDashboard(dashboardId) {
  if (!supabase) return false;
  const user = await getSessionUser();
  if (!user) return false;

  const { data: dashboard } = await supabase.from('dashboards').select('id').eq('id', dashboardId).eq('user_id', user.id).single();
  if (!dashboard) return false;

  await supabase.from('installment_expenses').delete().eq('dashboard_id', dashboardId);
  await supabase.from('one_time_expenses').delete().eq('dashboard_id', dashboardId);
  await supabase.from('monthly_history').delete().eq('dashboard_id', dashboardId);

  const { error } = await supabase.from('dashboards').delete().eq('id', dashboardId);
  if (error) throw new Error(error.message);

  revalidatePath('/');
  return true;
}

export async function setDefaultDashboard(dashboardId) {
  if (!supabase) return false;
  const user = await getSessionUser();
  if (!user) return false;

  await supabase.from('dashboards').update({ is_default: false }).eq('user_id', user.id);

  const { error } = await supabase.from('dashboards').update({ is_default: true }).eq('id', dashboardId).eq('user_id', user.id);
  if (error) throw new Error(error.message);

  revalidatePath('/');
  return true;
}

export async function getDashboardData(dashboardId) {
  if (!supabase || !dashboardId) return { summary: { totalCurrentMonth: 0 }, installmentExpenses: [], oneTimeExpenses: [], timeline: [] };

  const { data: installmentExpenses } = await supabase.from('installment_expenses').select('*').eq('dashboard_id', dashboardId);
  const { data: oneTimeExpenses } = await supabase.from('one_time_expenses').select('*').eq('dashboard_id', dashboardId);
  // Sort the timeline ascending initially (oldest to newest) to find the first pending month
  const { data: monthlyHistoryAsc } = await supabase.from('monthly_history').select('*').eq('dashboard_id', dashboardId).order('sort_date', { ascending: true });

  let totalCurrentMonth = 0;
  if (monthlyHistoryAsc && monthlyHistoryAsc.length > 0) {
    // Find the first month where status is 'pending'
    const pendingMonth = monthlyHistoryAsc.find(month => month.status === 'pending');
    if (pendingMonth) {
      totalCurrentMonth = pendingMonth.total_amount || 0;
    } else {
      // Fallback to the last month if all are paid
      totalCurrentMonth = monthlyHistoryAsc[monthlyHistoryAsc.length - 1].total_amount || 0;
    }
  }

  // Reverse timeline for UI descending display (newest to oldest or whichever order your UI expects, if it used to be `ascending: false` we sort it descending here)
  const monthlyHistory = (monthlyHistoryAsc || []).reverse();

  const summary = { totalCurrentMonth };

  return {
    summary,
    installmentExpenses: installmentExpenses || [],
    oneTimeExpenses: oneTimeExpenses || [],
    timeline: monthlyHistory || [],
  };
}

// 2. Add One-Time Expense
export async function addOneTimeExpense(dashboardId, expense) {
  const { data, error } = await supabase
    .from('one_time_expenses')
    .insert([{
      dashboard_id: dashboardId,
      name: expense.name,
      amount: expense.amount,
      status: expense.status || 'pending',
    }])
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  const monthInfo = getMonthInfo(data.status === 'paid' ? data.created_at : new Date());
  await upsertMonthlyHistoryDetail(
    dashboardId,
    monthInfo,
    { expenseId: data.id, detailKey: makeHistoryDetailKey('one-time', data.id), name: data.name, amount: data.amount, status: data.status, includeInTotal: data.status !== 'paid', kind: 'one-time' },
    { status: data.status, countInTotal: data.status !== 'paid' },
  );

  revalidatePath('/');
  return data;
}

// 4. Add Installment Expense
export async function addInstallmentExpense(dashboardId, expense) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('installment_expenses')
    .insert([{
      dashboard_id: dashboardId,
      name: expense.name,
      total_amount: expense.total_amount,
      installments: expense.installments,
      paid_installments: expense.paid_installments || 0,
      installment_amount: expense.installment_amount,
      start_month: expense.start_month || 'May/2026',
    }])
    .select();

  if (error) throw new Error(error.message);

  const firstInstallmentData = data[0];
  if (firstInstallmentData) {
    for (let i = 1; i <= firstInstallmentData.installments; i++) {
      const targetMonth = getTargetMonthForInstallment(firstInstallmentData.start_month, i - 1);
      const pendingDetail = {
        expenseId: firstInstallmentData.id,
        detailKey: `installment:${targetMonth.month}:${firstInstallmentData.name}:${i}`,
        name: `${firstInstallmentData.name} (${i}/${firstInstallmentData.installments})`,
        amount: firstInstallmentData.installment_amount,
        status: 'pending',
        includeInTotal: true,
        kind: 'installment',
        installmentNumber: i,
        installmentTotal: firstInstallmentData.installments,
      };

      await upsertMonthlyHistoryDetail(dashboardId, targetMonth, pendingDetail, { status: 'pending' });
    }
  }

  revalidatePath('/');
  return data;
}

// Edit Installment Expense (name, total_amount, installments, start_month)
export async function editInstallmentExpense(expenseId, updates) {
  if (!supabase) return null;

  const { data: expense, error: fetchError } = await supabase
    .from('installment_expenses')
    .select('*')
    .eq('id', expenseId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const newInstallments = updates.installments || expense.installments;
  const newTotalAmount = updates.total_amount ?? expense.total_amount;
  const newInstallmentAmount = newTotalAmount / newInstallments;
  const newPaidInstallments = Math.min(expense.paid_installments, newInstallments);
  const newName = updates.name || expense.name;
  const newStartMonth = updates.start_month || expense.start_month;

  // Remove old history details for this expense from all months
  const { data: histories } = await supabase
    .from('monthly_history')
    .select('*')
    .eq('dashboard_id', expense.dashboard_id);

  for (const history of histories || []) {
    const details = parseDetails(history.details);
    const filteredDetails = details.filter((detail) => {
      if (detail.expenseId && String(detail.expenseId) === String(expenseId)) return false;
      if (detail.kind === 'installment' && detail.detailKey && detail.detailKey.includes(expense.name)) return false;
      if (detail.kind === 'installment' && getInstallmentBaseName(detail.name) === expense.name) return false;
      return true;
    });

    if (filteredDetails.length !== details.length) {
      if (filteredDetails.length === 0) {
        await supabase.from('monthly_history').delete().eq('id', history.id);
      } else {
        const totalAmount = filteredDetails.reduce((sum, item) => {
          if (item.includeInTotal === false) return sum;
          return sum + (Number(item.amount) || 0);
        }, 0);
        await supabase.from('monthly_history').update({ details: filteredDetails, total_amount: totalAmount }).eq('id', history.id);
      }
    }
  }

  // Update the expense row
  const { error: updateError } = await supabase
    .from('installment_expenses')
    .update({
      name: newName,
      total_amount: newTotalAmount,
      installments: newInstallments,
      installment_amount: newInstallmentAmount,
      paid_installments: newPaidInstallments,
      start_month: newStartMonth,
    })
    .eq('id', expenseId);
  if (updateError) throw new Error(updateError.message);

  // Redistribute new history details
  for (let i = 1; i <= newInstallments; i++) {
    const targetMonth = getTargetMonthForInstallment(newStartMonth, i - 1);
    const detail = {
      expenseId: expense.id,
      detailKey: `installment:${targetMonth.month}:${newName}:${i}`,
      name: `${newName} (${i}/${newInstallments})`,
      amount: newInstallmentAmount,
      status: i <= newPaidInstallments ? 'paid' : 'pending',
      includeInTotal: true,
      kind: 'installment',
      installmentNumber: i,
      installmentTotal: newInstallments,
    };
    await upsertMonthlyHistoryDetail(expense.dashboard_id, targetMonth, detail, { status: 'pending' });
  }

  revalidatePath('/');
  return { ...expense, name: newName, total_amount: newTotalAmount, installments: newInstallments, installment_amount: newInstallmentAmount, paid_installments: newPaidInstallments, start_month: newStartMonth };
}

// 3. Update Installment and Monthly History
export async function updateInstallment(expenseId, newPaidAmount, currentMonth, newHistoryData, dashboardId) {
  const { error: errInstallment } = await supabase
    .from('installment_expenses')
    .update({ paid_installments: newPaidAmount })
    .eq('id', expenseId);

  if (errInstallment) throw new Error(errInstallment.message);

  const { data: currentHistory } = await supabase
    .from('monthly_history')
    .select('*')
    .eq('month', currentMonth)
    .eq('dashboard_id', dashboardId)
    .single();

  if (currentHistory) {
    const { error: errHist } = await supabase
      .from('monthly_history')
      .update({
         total_amount: newHistoryData.total_amount,
         details: newHistoryData.details
      })
      .eq('id', currentHistory.id);
    if (errHist) throw new Error(errHist.message);
  } else {
    const { error: errHist } = await supabase
      .from('monthly_history')
      .insert([{
         dashboard_id: dashboardId,
         month: currentMonth,
         total_amount: newHistoryData.total_amount,
         details: newHistoryData.details,
         sort_date: new Date().toISOString().split('T')[0]
      }]);
    if (errHist) throw new Error(errHist.message);
  }
  revalidatePath('/');
  return true;
}

// 5. Status Operations
export async function toggleOneTimeExpenseStatus(expenseId, currentStatus) {
  if (!supabase) return;
  const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
  const { data: expense, error: fetchError } = await supabase
    .from('one_time_expenses')
    .select('id, dashboard_id, name, amount, status, created_at')
    .eq('id', expenseId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase.from('one_time_expenses').update({ status: newStatus }).eq('id', expenseId);
  if (error) throw new Error(error.message);

  const createdMonth = getMonthInfo(expense.created_at);
  const currentMonth = getMonthInfo(new Date());
  const sourceMonth = currentStatus === 'paid' ? createdMonth : currentMonth;
  const targetMonth = newStatus === 'paid' ? createdMonth : currentMonth;

  await removeMonthlyHistoryDetail(expense.dashboard_id, sourceMonth, expense.name);
  await upsertMonthlyHistoryDetail(
    expense.dashboard_id,
    targetMonth,
    { expenseId: expense.id, detailKey: makeHistoryDetailKey('one-time', expense.id), name: expense.name, amount: expense.amount, status: newStatus, includeInTotal: newStatus !== 'paid', kind: 'one-time' },
    { status: newStatus, countInTotal: newStatus !== 'paid' },
  );

  revalidatePath('/');
}

export async function incrementInstallment(expenseId, currentPaid, totalInstallments) {
  if (!supabase) return;
  const newPaid = currentPaid + 1;
  if (newPaid > totalInstallments) return;

  const { data: expense, error: fetchError } = await supabase
    .from('installment_expenses')
    .select('id, dashboard_id, name, installment_amount, installments, paid_installments, created_at, start_month')
    .eq('id', expenseId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase.from('installment_expenses').update({ paid_installments: newPaid }).eq('id', expenseId);
  if (error) throw new Error(error.message);

  // Mark the `newPaid`-th installment as 'paid'
  await syncInstallmentHistoryDetail(expense.dashboard_id, expense, newPaid, true);

  revalidatePath('/');
}

export async function decrementInstallment(expenseId, currentPaid, totalInstallments) {
  if (!supabase) return;
  const newPaid = currentPaid - 1;
  if (newPaid < 0) return;

  const { data: expense, error: fetchError } = await supabase
    .from('installment_expenses')
    .select('id, dashboard_id, name, installment_amount, installments, paid_installments, created_at, start_month')
    .eq('id', expenseId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase.from('installment_expenses').update({ paid_installments: newPaid }).eq('id', expenseId);
  if (error) throw new Error(error.message);

  // Mark the `currentPaid`-th installment as 'pending'
  await syncInstallmentHistoryDetail(expense.dashboard_id, expense, currentPaid, false);

  revalidatePath('/');
}

export async function toggleMonthlyHistoryStatus(historyId, currentStatus) {
  if (!supabase) return;
  const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
  const { data: historyRecord, error: fetchError } = await supabase
    .from('monthly_history')
    .select('*')
    .eq('id', historyId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const details = parseDetails(historyRecord.details);
  const installmentDetails = details.filter(isInstallmentHistoryDetail);

  const updatedDetails = details.map((detail) => {
    if (isOneTimeHistoryDetail(detail)) return detail;
    if (isInstallmentHistoryDetail(detail)) {
      return { ...detail, status: newStatus, includeInTotal: true };
    }
    return detail;
  });

  const { data: installmentExpenses } = await supabase
    .from('installment_expenses')
    .select('*')
    .eq('dashboard_id', historyRecord.dashboard_id);

  for (const expense of installmentExpenses || []) {
    const relatedCount = installmentDetails.filter((detail) => {
      if (detail.expenseId && String(detail.expenseId) === String(expense.id)) return true;
      return getInstallmentBaseName(detail.name) === expense.name;
    }).length;

    if (relatedCount === 0) continue;

    const delta = newStatus === 'paid' ? relatedCount : -relatedCount;
    const nextPaid = Math.min(expense.installments, Math.max(0, (expense.paid_installments || 0) + delta));
    if (nextPaid === expense.paid_installments) continue;

    const { error } = await supabase
      .from('installment_expenses')
      .update({ paid_installments: nextPaid })
      .eq('id', expense.id);
    if (error) throw new Error(error.message);
  }

  const totalAmount = updatedDetails.reduce((sum, item) => {
    if (item.includeInTotal === false) return sum;
    return sum + (Number(item.amount) || 0);
  }, 0);

  const { error } = await supabase
    .from('monthly_history')
    .update({
      details: updatedDetails,
      total_amount: totalAmount,
      status: newStatus,
    })
    .eq('id', historyRecord.id);
  if (error) throw new Error(error.message);

  revalidatePath('/');
}

// 6. Deletion Operations
export async function deleteOneTimeExpense(expenseId) {
  if (!supabase) return;

  // Get the expense to find dashboard_id and name
  const { data: expense, error: fetchError } = await supabase
    .from('one_time_expenses')
    .select('id, dashboard_id, name')
    .eq('id', expenseId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  // Delete from one_time_expenses
  const { error: deleteError } = await supabase.from('one_time_expenses').delete().eq('id', expenseId);
  if (deleteError) throw new Error(deleteError.message);

  // Remove from monthly_history details by both expenseId and name
  if (expense?.dashboard_id) {
    const { data: histories } = await supabase
      .from('monthly_history')
      .select('*')
      .eq('dashboard_id', expense.dashboard_id);

    for (const history of histories || []) {
      const details = parseDetails(history.details);
      // Filter out details matching this expense by ID or name (for one-time expenses)
      const filteredDetails = details.filter((detail) => {
        // Remove if matches by expenseId
        if (detail.expenseId && String(detail.expenseId) === String(expenseId)) return false;
        // Remove if matches by name for one-time expenses
        if (detail.kind === 'one-time' && detail.name === expense.name) return false;
        return true;
      });

      if (filteredDetails.length !== details.length) {
        const totalAmount = filteredDetails.reduce((sum, item) => {
          if (item.includeInTotal === false) return sum;
          return sum + (Number(item.amount) || 0);
        }, 0);

        const { error: updateError } = await supabase
          .from('monthly_history')
          .update({ details: filteredDetails, total_amount: totalAmount })
          .eq('id', history.id);
        if (updateError) throw new Error(updateError.message);
      }
    }
  }

  revalidatePath('/');
  return true;
}

export async function deleteInstallmentExpense(expenseId) {
  if (!supabase) return;

  // Get the expense to find dashboard_id and name
  const { data: expense, error: fetchError } = await supabase
    .from('installment_expenses')
    .select('id, dashboard_id, name')
    .eq('id', expenseId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  // Delete from installment_expenses
  const { error: deleteError } = await supabase.from('installment_expenses').delete().eq('id', expenseId);
  if (deleteError) throw new Error(deleteError.message);

  // Remove from monthly_history details by expenseId, base name, or detailKey
  if (expense?.dashboard_id) {
    const { data: histories } = await supabase
      .from('monthly_history')
      .select('*')
      .eq('dashboard_id', expense.dashboard_id);

    for (const history of histories || []) {
      const details = parseDetails(history.details);
      // Filter out details matching this installment by ID, name, or detailKey
      const filteredDetails = details.filter((detail) => {
        // Remove if matches by expenseId
        if (detail.expenseId && String(detail.expenseId) === String(expenseId)) return false;
        // Remove if matches by detailKey (for installments, key includes month:name)
        if (detail.detailKey && detail.kind === 'installment' && 
            detail.detailKey.includes(expense.name)) return false;
        // Remove if matches by base name for installments
        if (detail.kind === 'installment' && 
            getInstallmentBaseName(detail.name) === expense.name) return false;
        return true;
      });

      if (filteredDetails.length !== details.length) {
        const totalAmount = filteredDetails.reduce((sum, item) => {
          if (item.includeInTotal === false) return sum;
          return sum + (Number(item.amount) || 0);
        }, 0);

        const { error: updateError } = await supabase
          .from('monthly_history')
          .update({ details: filteredDetails, total_amount: totalAmount })
          .eq('id', history.id);
        if (updateError) throw new Error(updateError.message);
      }
    }
  }

  revalidatePath('/');
  return true;
}
