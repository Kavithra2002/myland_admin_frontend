export async function fetchReviews() {
  const res = await fetch('/api/reviews');
  if (!res.ok) throw new Error('Could not load reviews');
  const data = await res.json();
  return data.reviews || [];
}

export async function setReviewStatus(id, status) {
  const res = await fetch(`/api/reviews/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Could not update review');
  return data.review;
}

export async function deleteReview(id) {
  const res = await fetch(`/api/reviews/${id}`, { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Could not delete review');
}
