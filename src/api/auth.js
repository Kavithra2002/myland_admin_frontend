import { apiFetch, readError, setToken } from './http.js';

export async function login(email, password) {
  const res = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return readError(res, 'Could not sign in');
}

export async function fetchMailStatus() {
  const res = await apiFetch('/api/mail/status');
  const data = await readError(res, 'Could not check mail status');
  return data;
}

export async function sendTestMailRequest() {
  const res = await apiFetch('/api/mail/test', { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.reason || data.message || 'Could not send test mail');
  return data;
}

export async function fetchMe() {
  const res = await apiFetch('/api/auth/me');
  const data = await readError(res, 'Could not load session');
  return data.user;
}

export function clearSession() {
  setToken('');
}
