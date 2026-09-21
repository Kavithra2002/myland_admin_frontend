import { apiFetch, readError } from './http.js';

export async function fetchSiteSettings() {
  const res = await apiFetch('/api/site-settings');
  const data = await readError(res, 'Could not load site settings');
  return {
    blogPageEnabled: data.blogPageEnabled !== false,
  };
}

export async function updateSiteSettings(payload) {
  const res = await apiFetch('/api/site-settings', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  const data = await readError(res, 'Could not update site settings');
  return {
    blogPageEnabled: data.blogPageEnabled !== false,
  };
}
