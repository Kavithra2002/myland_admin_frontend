import { apiFetch, readError } from './http.js';

export async function fetchReviews() {
  const res = await apiFetch('/api/reviews');
  const data = await readError(res, 'Could not load reviews');
  return data.reviews || [];
}

export async function setReviewStatus(id, status) {
  const res = await apiFetch(`/api/reviews/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  const data = await readError(res, 'Could not update review');
  return data.review;
}

export async function deleteReview(id) {
  return setReviewStatus(id, 'deleted');
}
