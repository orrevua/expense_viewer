'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { hashPassword, verifyPassword } from '@/lib/password';
import crypto from 'crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.SHAREABLE_UUID_KEY || 'fallback-dev-secret';

function sign(payload) {
  const data = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
  return `${Buffer.from(data).toString('base64')}.${hmac}`;
}

function verify(token) {
  if (!token || typeof token !== 'string') return null;
  const dotIndex = token.lastIndexOf('.');
  if (dotIndex < 0) return null;
  const dataPart = token.substring(0, dotIndex);
  const sigPart = token.substring(dotIndex + 1);
  try {
    const data = Buffer.from(dataPart, 'base64').toString('utf8');
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(sigPart, 'hex'), Buffer.from(expected, 'hex'))) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function setSessionCookie(userId, userName) {
  const token = sign({ id: userId, name: userName });
  cookies().set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
    sameSite: 'lax',
  });
}

function sanitizeName(value) {
  if (!value || typeof value !== 'string') return '';
  return value.trim().slice(0, 100);
}

function sanitizeEmail(value) {
  if (!value || typeof value !== 'string') return '';
  return value.toLowerCase().trim().slice(0, 254);
}

export async function register(name, email, password) {
  if (!supabase) return { success: false, error: 'Database not configured.' };
  if (!name || !email || !password) return { success: false, error: 'All fields are required.' };
  if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
    return { success: false, error: 'Password must be between 6 and 128 characters.' };
  }

  const safeName = sanitizeName(name);
  const safeEmail = sanitizeEmail(email);
  if (!safeName) return { success: false, error: 'Invalid name.' };
  if (!safeEmail || !safeEmail.includes('@')) return { success: false, error: 'Invalid email.' };

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', safeEmail)
    .single();

  if (existing) return { success: false, error: 'Email already registered.' };

  const password_hash = hashPassword(password);

  const { data: user, error } = await supabase
    .from('users')
    .insert([{ name: safeName, email: safeEmail, password_hash }])
    .select('id, name')
    .single();

  if (error) return { success: false, error: 'Registration failed. Please try again.' };

  setSessionCookie(user.id, user.name);
  return { success: true };
}

export async function login(email, password) {
  if (!supabase) return { success: false, error: 'Database not configured.' };
  if (!email || !password) return { success: false, error: 'Email and password are required.' };
  if (typeof password !== 'string' || password.length > 128) {
    return { success: false, error: 'Invalid credentials.' };
  }

  const safeEmail = sanitizeEmail(email);

  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, password_hash')
    .eq('email', safeEmail)
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
  const parsed = verify(session.value);
  return !!parsed?.id;
}

export async function getSessionUser() {
  const session = cookies().get('session');
  if (!session?.value) return null;
  return verify(session.value);
}
