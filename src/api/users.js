import { apiFetch, readError } from './http.js';

export async function fetchUsers(status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await apiFetch(`/api/users${query}`);
  const data = await readError(res, 'Could not load users');
  return data.users || [];
}

export async function createUser(payload) {
  const res = await apiFetch('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await readError(res, 'Could not create user');
  return data.user;
}

export async function updateUser(id, payload) {
  const res = await apiFetch(`/api/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  const data = await readError(res, 'Could not update user');
  return data.user;
}

export async function deleteUser(id) {
  const res = await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
  const data = await readError(res, 'Could not delete user');
  return data.user;
}
