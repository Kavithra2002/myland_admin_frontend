import { apiFetch, readError } from './http.js';

export async function fetchSubscribers() {
  const res = await apiFetch('/api/newsletter');
  const data = await readError(res, 'Could not load subscribers');
  return data.subscribers || [];
}

export async function sendSubscriberMail(id, { subject, message, signal } = {}) {
  const res = await apiFetch(`/api/newsletter/${id}/send`, {
    method: 'POST',
    body: JSON.stringify({ subject, message }),
    signal,
  });
  return readError(res, 'Could not send email');
}
