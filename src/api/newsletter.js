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

export async function deleteSubscriber(id) {
  const res = await apiFetch(`/api/newsletter/${id}`, { method: 'DELETE' });
  const data = await readError(res, 'Could not clear email');
  return data.subscriber;
}

export async function clearSubscribers() {
  const res = await apiFetch('/api/newsletter', { method: 'DELETE' });
  return readError(res, 'Could not clear emails');
}
