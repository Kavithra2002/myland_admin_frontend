import { apiFetch, readError, setToken } from './http.js';

export async function login(email, password) {
  const res = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return readError(res, 'Could not sign in');
}

export async function fetchMe() {
  const res = await apiFetch('/api/auth/me');
  const data = await readError(res, 'Could not load session');
  return data.user;
}

export function clearSession() {
  setToken('');
}
