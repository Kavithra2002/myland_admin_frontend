import { apiFetch, readError } from './http.js';

export async function fetchProjects({ all = true } = {}) {
  const suffix = all ? '?all=true' : '';
  const res = await apiFetch(`/api/projects${suffix}`);
  const data = await readError(res, 'Could not load projects');
  return data.projects || [];
}

export async function fetchProject(id) {
  const res = await apiFetch(`/api/projects/${encodeURIComponent(id)}`);
  const data = await readError(res, 'Could not load project');
  return data.project;
}

export async function submitProjectChange(payload) {
  const res = await apiFetch('/api/projects/submit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await readError(res, 'Could not send for approval');
  return data.project;
}

export async function reviewProject(id, payload) {
  const res = await apiFetch(`/api/projects/${encodeURIComponent(id)}/review`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await readError(res, 'Could not review listing');
  return data.project;
}

export async function uploadProjectMedia(files) {
  const list = Array.from(files || []).filter(Boolean);
  if (!list.length) return [];
  const body = new FormData();
  list.forEach((file) => body.append('files', file));
  const res = await apiFetch('/api/projects/uploads', {
    method: 'POST',
    body,
  });
  const data = await readError(res, 'Could not upload files');
  return data.urls || [];
}
