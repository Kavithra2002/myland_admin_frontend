import { useEffect, useMemo, useState } from 'react';
import { HiCheck, HiX, HiOutlineTrash } from 'react-icons/hi';
import { deleteReview, fetchReviews, setReviewStatus } from '../api/reviews.js';
import StarRating from '../components/StarRating.jsx';

const FILTERS = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'deleted', label: 'Deleted' },
  { id: 'all', label: 'All' },
];

const ACTION_COPY = {
  delete: {
    title: 'Delete this review?',
    body: 'The row stays in the database with status deleted. It is hidden from the public site. You can still see it here under Deleted.',
    confirm: 'Yes, delete',
    confirmClass:
      'inline-flex items-center justify-center rounded-full bg-myland-red text-white font-display font-semibold text-xs px-5 py-2.5 hover:bg-myland-redDark disabled:opacity-50',
  },
  approved: {
    title: 'Approve this review?',
    body: 'It will appear on the public site (project page and homepage Client Stories).',
    confirm: 'Yes, approve',
    confirmClass:
      'inline-flex items-center justify-center rounded-full bg-emerald-600 text-white font-display font-semibold text-xs px-5 py-2.5 hover:bg-emerald-700 disabled:opacity-50',
  },
  rejected: {
    title: 'Reject this review?',
    body: 'It will stay hidden on the public site. You can still approve it later from this list.',
    confirm: 'Yes, reject',
    confirmClass:
      'inline-flex items-center justify-center rounded-full bg-amber-500 text-white font-display font-semibold text-xs px-5 py-2.5 hover:bg-amber-600 disabled:opacity-50',
  },
};

export default function ReviewAuthorizer() {
  const [reviews, setReviews] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState(null);

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
      deleted: reviews.filter((item) => item.status === 'deleted').length,
    }),
    [reviews]
  );

  const askConfirm = (review, action) => {
    if (busyId) return;
    setError('');
    setConfirm({ review, action });
  };

  const closeConfirm = () => {
    if (busyId) return;
    setConfirm(null);
  };

  const runConfirmed = async () => {
    if (!confirm || busyId) return;
    const { review, action } = confirm;
    setBusyId(review.id);
    setError('');
    setNotice('');
    try {
      if (action === 'delete') {
        await deleteReview(review.id);
        setNotice('Review deleted.');
      } else {
        await setReviewStatus(review.id, action);
        setNotice(action === 'approved' ? 'Review approved.' : action === 'rejected' ? 'Review rejected.' : 'Review deleted.');
      }
      setConfirm(null);
      await load();
    } catch (err) {
      setError(err.message);
      setConfirm(null);
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl3 p-5 md:p-6 shadow-card border border-myland-mist/80">
        <p className="text-sm text-myland-slate max-w-2xl">
          Reviews submitted on project pages stay hidden on the public site until you approve them.
          Rejected and deleted reviews stay in the database for the record; deleted items are hidden
          from the public site.
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
                {review.role && <p className="text-xs text-myland-slate mt-0.5">{review.role}</p>}
                <div className="mt-2">
                  <StarRating value={review.rating} size="text-lg" />
                </div>
                <p className="text-sm text-myland-slate leading-relaxed mt-3">{review.message}</p>
                <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-myland-slate">
                  <div>
                    <dt className="uppercase tracking-wide text-[10px] font-display font-semibold">Review ID</dt>
                    <dd className="mt-0.5 font-mono text-[11px] text-myland-ink/80">{review.id}</dd>
                  </div>
                  {(review.authorizerName || review.reviewedAt) && (
                    <div>
                      <dt className="uppercase tracking-wide text-[10px] font-display font-semibold">
                        Authorizer
                      </dt>
                      <dd className="mt-0.5">
                        {review.authorizerName || '—'}
                        {review.reviewedAt ? ` · ${formatDate(review.reviewedAt)}` : ''}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
              <div className="flex flex-wrap lg:flex-col gap-2 shrink-0">
                {review.status !== 'approved' && (
                  <button
                    type="button"
                    disabled={busyId === review.id}
                    onClick={() => askConfirm(review, 'approved')}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 text-white font-display font-semibold text-xs px-4 py-2.5 hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <HiCheck className="text-base" /> Approve
                  </button>
                )}
                {review.status !== 'rejected' && (
                  <button
                    type="button"
                    disabled={busyId === review.id}
                    onClick={() => askConfirm(review, 'rejected')}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-500 text-white font-display font-semibold text-xs px-4 py-2.5 hover:bg-amber-600 disabled:opacity-50"
                  >
                    <HiX className="text-base" /> Reject
                  </button>
                )}
                {review.status !== 'deleted' && (
                  <button
                    type="button"
                    disabled={busyId === review.id}
                    onClick={() => askConfirm(review, 'delete')}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-myland-mist bg-white text-myland-red font-display font-semibold text-xs px-4 py-2.5 hover:border-myland-red disabled:opacity-50"
                  >
                    <HiOutlineTrash className="text-base" /> Delete
                  </button>
                )}
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

      {confirm && (
        <ConfirmDialog
          review={confirm.review}
          copy={ACTION_COPY[confirm.action]}
          busy={Boolean(busyId)}
          onCancel={closeConfirm}
          onConfirm={runConfirmed}
        />
      )}
    </div>
  );
}

function ConfirmDialog({ review, copy, busy, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        className="absolute inset-0 bg-myland-ink/40"
        aria-label="Cancel"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-action-title"
        className="relative w-full max-w-md bg-white rounded-xl3 p-6 shadow-card"
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="absolute top-4 right-4 w-8 h-8 rounded-full border border-myland-mist flex items-center justify-center text-myland-slate disabled:opacity-50"
          aria-label="Cancel"
        >
          <HiX />
        </button>
        <h3 id="review-action-title" className="font-display font-semibold text-lg text-myland-ink pr-8">
          {copy.title}
        </h3>
        <p className="text-sm text-myland-slate mt-2">{copy.body}</p>
        <div className="mt-4 rounded-2xl bg-myland-cream px-4 py-3">
          <p className="font-display font-semibold text-sm text-myland-ink">{review.name}</p>
          <p className="text-xs text-myland-red mt-0.5">{review.projectTitle}</p>
          <div className="mt-1">
            <StarRating value={review.rating} size="text-base" />
          </div>
          <p className="text-sm text-myland-slate mt-2 line-clamp-3">{review.message}</p>
        </div>
        <div className="flex flex-wrap gap-2 mt-5">
          <button type="button" disabled={busy} onClick={onConfirm} className={copy.confirmClass}>
            {busy ? 'Working…' : copy.confirm}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="btn-ghost !py-2.5 !px-5 !text-xs"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-amber-50 text-amber-700',
    approved: 'bg-emerald-50 text-emerald-700',
    rejected: 'bg-myland-red/10 text-myland-red',
    deleted: 'bg-myland-mist text-myland-slate',
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
