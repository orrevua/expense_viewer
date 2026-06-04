'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { hashPassword, verifyPassword } from '@/lib/password';

function setSessionCookie(userId, userName) {
  const value = JSON.stringify({ id: userId, name: userName });
  cookies().set('session', value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
    sameSite: 'lax',
  });
}

export async function register(name, email, password) {
  if (!supabase) return { success: false, error: 'Database not configured.' };
  if (!name || !email || !password) return { success: false, error: 'All fields are required.' };
  if (password.length < 6) return { success: false, error: 'Password must be at least 6 characters.' };

  const normalizedEmail = email.toLowerCase().trim();

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', normalizedEmail)
    .single();

  if (existing) return { success: false, error: 'Email already registered.' };

  const password_hash = hashPassword(password);

  const { data: user, error } = await supabase
    .from('users')
    .insert([{ name: name.trim(), email: normalizedEmail, password_hash }])
    .select('id, name')
    .single();

  if (error) return { success: false, error: 'Registration failed. Please try again.' };

  setSessionCookie(user.id, user.name);
  return { success: true };
}

export async function login(email, password) {
  if (!supabase) return { success: false, error: 'Database not configured.' };
  if (!email || !password) return { success: false, error: 'Email and password are required.' };

  const normalizedEmail = email.toLowerCase().trim();

  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, password_hash')
    .eq('email', normalizedEmail)
    .single();

  if (error || !user) return { success: false, error: 'Invalid email or password.' };

  const valid = verifyPassword(password, user.password_hash);
  if (!valid) return { success: false, error: 'Invalid email or password.' };

  setSessionCookie(user.id, user.name);
  return { success: true };
}

export async function logout() {
  cookies().delete('session');
  redirect('/login');
}

export async function verifyAuth() {
  const session = cookies().get('session');
  if (!session?.value) return false;
  try {
    const parsed = JSON.parse(session.value);
    return !!parsed.id;
  } catch {
    return false;
  }
}

export async function getSessionUser() {
  const session = cookies().get('session');
  if (!session?.value) return null;
  try {
    return JSON.parse(session.value);
  } catch {
    return null;
  }
}
