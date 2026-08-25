import { useEffect, useMemo, useState } from 'react';
import { HiCheck, HiX, HiOutlineTrash } from 'react-icons/hi';
import { deleteReview, fetchReviews, setReviewStatus } from '../api/reviews.js';
import StarRating from '../components/StarRating.jsx';

const FILTERS = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];

export default function ReviewAuthorizer() {
  const [reviews, setReviews] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    const items = await fetchReviews();
    setReviews(items);
  };

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const visible = useMemo(
    () => (filter === 'all' ? reviews : reviews.filter((item) => item.status === filter)),
    [reviews, filter]
  );

  const counts = useMemo(
    () => ({
      all: reviews.length,
      pending: reviews.filter((item) => item.status === 'pending').length,
      approved: reviews.filter((item) => item.status === 'approved').length,
      rejected: reviews.filter((item) => item.status === 'rejected').length,
    }),
    [reviews]
  );

  const act = async (id, action) => {
    setBusyId(id);
    setError('');
    setNotice('');
    try {
      if (action === 'delete') {
        await deleteReview(id);
        setNotice('Review deleted.');
      } else {
        await setReviewStatus(id, action);
        setNotice(action === 'approved' ? 'Review approved.' : 'Review rejected.');
      }
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl3 p-5 md:p-6 shadow-card border border-myland-mist/80">
        <p className="text-sm text-myland-slate max-w-2xl">
          Reviews submitted on project pages stay hidden on the public site until you approve them.
          Rejected items stay in this list for the record; delete only if they should be removed
          entirely.
        </p>
        <div className="flex flex-wrap gap-2 mt-5">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-full px-4 py-2 text-xs font-display font-semibold transition-colors ${
                filter === item.id
                  ? 'bg-myland-red text-white'
                  : 'bg-myland-cream text-myland-slate hover:text-myland-ink'
              }`}
            >
              {item.label} ({counts[item.id]})
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-myland-red text-sm">{error}</p>}
      {notice && <p className="text-emerald-700 text-sm">{notice}</p>}

      <ul className="space-y-4">
        {visible.map((review) => (
          <li
            key={review.id}
            className="bg-white rounded-xl3 p-5 md:p-6 shadow-card border border-myland-mist/80"
          >
            <div className="flex flex-col lg:flex-row lg:items-start gap-5">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <StatusBadge status={review.status} />
                  <p className="text-xs text-myland-slate">{formatDate(review.createdAt)}</p>
                </div>
                <h2 className="font-display font-semibold text-myland-ink">{review.name}</h2>
                <p className="text-sm text-myland-red mt-1">{review.projectTitle}</p>
                <div className="mt-2">
                  <StarRating value={review.rating} size="text-lg" />
                </div>
                <p className="text-sm text-myland-slate leading-relaxed mt-3">{review.message}</p>
              </div>
              <div className="flex flex-wrap lg:flex-col gap-2 shrink-0">
                {review.status !== 'approved' && (
                  <button
                    type="button"
                    disabled={busyId === review.id}
                    onClick={() => act(review.id, 'approved')}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 text-white font-display font-semibold text-xs px-4 py-2.5 hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <HiCheck className="text-base" /> Approve
                  </button>
                )}
                {review.status !== 'rejected' && (
                  <button
                    type="button"
                    disabled={busyId === review.id}
                    onClick={() => act(review.id, 'rejected')}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-500 text-white font-display font-semibold text-xs px-4 py-2.5 hover:bg-amber-600 disabled:opacity-50"
                  >
                    <HiX className="text-base" /> Reject
                  </button>
                )}
                <button
                  type="button"
                  disabled={busyId === review.id}
                  onClick={() => act(review.id, 'delete')}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-myland-mist bg-white text-myland-red font-display font-semibold text-xs px-4 py-2.5 hover:border-myland-red disabled:opacity-50"
                >
                  <HiOutlineTrash className="text-base" /> Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {visible.length === 0 && (
        <div className="bg-white rounded-xl3 p-10 text-center shadow-card border border-myland-mist/80">
          <p className="font-display font-semibold text-myland-ink">No reviews in this view</p>
          <p className="text-sm text-myland-slate mt-2">
            New submissions from project pages will appear under Pending.
          </p>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-amber-50 text-amber-700',
    approved: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-myland-red/10 text-myland-red',
  };
  return (
    <span className={`text-[10px] font-display font-semibold uppercase tracking-wide rounded-full px-2.5 py-1 ${styles[status]}`}>
      {status}
    </span>
  );
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleString('en-LK', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return value;
  }
}
