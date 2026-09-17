import { apiFetch, readError } from './http.js';

export async function fetchInquiries(status, { includeDeleted } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (includeDeleted) params.set('deleted', 'true');
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await apiFetch(`/api/inquiries${query}`);
  const data = await readError(res, 'Could not load inquiries');
  return data.inquiries || [];
}

export async function setInquiryStatus(id, status) {
  const res = await apiFetch(`/api/inquiries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  const data = await readError(res, 'Could not update inquiry');
  return data.inquiry;
}

export async function deleteInquiry(id) {
  const res = await apiFetch(`/api/inquiries/${id}`, { method: 'DELETE' });
  const data = await readError(res, 'Could not delete inquiry');
  return data.inquiry;
}
