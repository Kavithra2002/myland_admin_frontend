import { apiFetch, readError } from './http.js';

export async function fetchHeartSummary() {
  const res = await apiFetch('/api/favorites/summary');
  const data = await readError(res, 'Could not load hearts');
  return {
    total: data.total || 0,
    projects: data.projects || [],
  };
}
