import { apiFetch, readError } from './http.js';

export async function fetchBlogs() {
  const res = await apiFetch('/api/blogs');
  const data = await readError(res, 'Could not load blogs');
  return data.blogs || [];
}

export async function createBlog(payload) {
  const res = await apiFetch('/api/blogs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await readError(res, 'Could not create blog');
  return data.blog;
}

export async function updateBlog(id, payload) {
  const res = await apiFetch(`/api/blogs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  const data = await readError(res, 'Could not update blog');
  return data.blog;
}

export async function deleteBlog(id) {
  const res = await apiFetch(`/api/blogs/${id}`, { method: 'DELETE' });
  await readError(res, 'Could not delete blog');
}

export async function placeBlog(id, placement) {
  const res = await apiFetch(`/api/blogs/${id}/place`, {
    method: 'POST',
    body: JSON.stringify({ placement }),
  });
  const data = await readError(res, 'Could not move blog');
  return data.blogs || [];
}

export async function reorderBlog(id, direction) {
  const res = await apiFetch(`/api/blogs/${id}/reorder`, {
    method: 'POST',
    body: JSON.stringify({ direction }),
  });
  const data = await readError(res, 'Could not reorder blog');
  return data.blogs || [];
}
