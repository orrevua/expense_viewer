'use server';

import { supabase } from '@/lib/supabase';
import { getSessionUser } from '@/actions/auth';
import { generatePixCode } from '@/utils/pixGenerator';
import { revalidatePath } from 'next/cache';

async function requireUser() {
  const user = await getSessionUser();
  if (!user?.id) throw new Error('Not authenticated');
  return user;
}

async function verifyOwnership(dashboardId) {
  const user = await requireUser();
  const { data } = await supabase
    .from('dashboards')
    .select('id')
    .eq('id', dashboardId)
    .eq('user_id', user.id)
    .single();
  if (!data) throw new Error('Dashboard not found');
  return user;
}

export async function isPixConfigured() {
  const { PIX_KEY, PIX_NAME, PIX_CITY } = process.env;
  return !!(PIX_KEY && PIX_NAME && PIX_CITY);
}

export async function generatePixForMonth(dashboardId, month) {
  await verifyOwnership(dashboardId);

  const { PIX_KEY, PIX_NAME, PIX_CITY } = process.env;
  if (!PIX_KEY || !PIX_NAME || !PIX_CITY) {
    return { error: 'PIX not configured' };
  }

  const { data: history } = await supabase
    .from('monthly_history')
    .select('total_amount')
    .eq('dashboard_id', dashboardId)
    .eq('month', month)
    .single();

  if (!history || history.total_amount <= 0) {
    return { error: 'No amount for this month' };
  }

  const { data: payments } = await supabase
    .from('pix_payments')
    .select('*')
    .eq('dashboard_id', dashboardId)
    .eq('month', month)
    .order('created_at', { ascending: false });

  const paidAmount = Math.round((payments || []).reduce((sum, p) => sum + Number(p.amount), 0) * 100) / 100;
  const remainingBalance = Math.round(Math.max(0, history.total_amount - paidAmount) * 100) / 100;

  if (remainingBalance <= 0) {
    return {
      fullyPaid: true,
      totalAmount: history.total_amount,
      paidAmount,
      remainingBalance: 0,
      payments: payments || [],
    };
  }

  const pixCode = generatePixCode({
    pixKey: PIX_KEY,
    name: PIX_NAME,
    city: PIX_CITY,
    amount: remainingBalance,
  });

  return {
    pixCode,
    amount: remainingBalance,
    totalAmount: history.total_amount,
    paidAmount,
    remainingBalance,
    pixConfig: { key: PIX_KEY, name: PIX_NAME, city: PIX_CITY },
    payments: payments || [],
  };
}

export async function recordPixPayment(dashboardId, month, amount, note = '') {
  await verifyOwnership(dashboardId);

  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { error: 'Invalid amount' };
  }

  const { data, error } = await supabase
    .from('pix_payments')
    .insert([{
      dashboard_id: dashboardId,
      month,
      amount: Math.round(parsed * 100) / 100,
      note: typeof note === 'string' ? note.slice(0, 200) : '',
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/');
  return { success: true, payment: data };
}

export async function deletePixPayment(paymentId) {
  const user = await requireUser();

  const { data: payment } = await supabase
    .from('pix_payments')
    .select('id, dashboard_id')
    .eq('id', paymentId)
    .single();

  if (!payment) return { error: 'Payment not found' };

  const { data: dashboard } = await supabase
    .from('dashboards')
    .select('id')
    .eq('id', payment.dashboard_id)
    .eq('user_id', user.id)
    .single();
  if (!dashboard) throw new Error('Dashboard not found');

  const { error } = await supabase
    .from('pix_payments')
    .delete()
    .eq('id', paymentId);

  if (error) throw new Error(error.message);

  revalidatePath('/');
  return { success: true };
}
