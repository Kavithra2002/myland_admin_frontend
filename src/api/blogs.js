import { apiUrl } from './http.js';

async function readError(res, fallback) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || fallback);
  return data;
}

export async function fetchBlogs() {
  const res = await fetch(apiUrl('/api/blogs'));
  const data = await readError(res, 'Could not load blogs');
  return data.blogs || [];
}

export async function createBlog(payload) {
  const res = await fetch(apiUrl('/api/blogs'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await readError(res, 'Could not create blog');
  return data.blog;
}

export async function updateBlog(id, payload) {
  const res = await fetch(apiUrl(`/api/blogs/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await readError(res, 'Could not update blog');
  return data.blog;
}

export async function deleteBlog(id) {
  const res = await fetch(apiUrl(`/api/blogs/${id}`), { method: 'DELETE' });
  await readError(res, 'Could not delete blog');
}

export async function placeBlog(id, placement) {
  const res = await fetch(apiUrl(`/api/blogs/${id}/place`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ placement }),
  });
  const data = await readError(res, 'Could not move blog');
  return data.blogs || [];
}

export async function reorderBlog(id, direction) {
  const res = await fetch(apiUrl(`/api/blogs/${id}/reorder`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ direction }),
  });
  const data = await readError(res, 'Could not reorder blog');
  return data.blogs || [];
}
