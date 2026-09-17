import { apiFetch, readError } from './http.js';

export async function fetchLandUpdates(status, { includeDeleted } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (includeDeleted) params.set('deleted', 'true');
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await apiFetch(`/api/land-updates${query}`);
  const data = await readError(res, 'Could not load property updates');
  return data.updates || [];
}

export async function setLandUpdateStatus(id, status) {
  const res = await apiFetch(`/api/land-updates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  const data = await readError(res, 'Could not update status');
  return data.update;
}

export async function deleteLandUpdate(id) {
  const res = await apiFetch(`/api/land-updates/${id}`, { method: 'DELETE' });
  const data = await readError(res, 'Could not delete property update');
  return data.update;
}
