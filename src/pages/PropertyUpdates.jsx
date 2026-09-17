import { useEffect, useMemo, useState } from 'react';
import {
  HiChevronLeft,
  HiChevronRight,
  HiOutlineLocationMarker,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlinePhotograph,
  HiOutlineTrash,
  HiX,
} from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import { deleteLandUpdate, fetchLandUpdates, setLandUpdateStatus } from '../api/landUpdates.js';
import { useAuth } from '../context/AuthContext.jsx';
import { mediaSrc } from '../utils/projectMedia.js';

const BASE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'closed', label: 'Closed' },
];

const STATUS_STYLES = {
  new: 'bg-myland-red/10 text-myland-red',
  contacted: 'bg-emerald-50 text-emerald-700',
  closed: 'bg-myland-mist text-myland-slate',
  deleted: 'bg-myland-mist text-myland-slate',
};

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function whatsappHref(phone, text) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  let intl = digits;
  if (digits.startsWith('00')) intl = digits.slice(2);
  else if (digits.startsWith('0')) intl = `94${digits.slice(1)}`;
  else if (digits.length === 9 && digits.startsWith('7')) intl = `94${digits}`;
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${intl}${query}`;
}

function whatsappMessage(item) {
  const place = item.location ? ` at ${item.location}` : '';
  return `Hello ${item.name || ''}, this is MyLand regarding the land you submitted${place}.`;
}

function Field({ label, children }) {
  return (
    <div className="rounded-xl bg-myland-cream/80 px-4 py-3">
      <dt className="text-[11px] uppercase tracking-wide text-myland-slate font-display font-semibold">
        {label}
      </dt>
      <dd className="mt-1 text-myland-ink font-medium">{children}</dd>
    </div>
  );
}

export default function PropertyUpdates() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [lightbox, setLightbox] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const filters = isAdmin
    ? [...BASE_FILTERS, { id: 'deleted', label: 'Deleted' }]
    : BASE_FILTERS;

  const load = async () => {
    const updates = await fetchLandUpdates(undefined, { includeDeleted: isAdmin });
    setItems(updates);
  };

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const stepLightbox = (delta) => {
    setLightbox((current) => {
      if (!current?.photos?.length) return current;
      const next = (current.index + delta + current.photos.length) % current.photos.length;
      return { ...current, index: next };
    });
  };

  useEffect(() => {
    if (!lightbox) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setLightbox(null);
      if (event.key === 'ArrowRight') stepLightbox(1);
      if (event.key === 'ArrowLeft') stepLightbox(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  const activeItems = useMemo(
    () => items.filter((item) => item.status !== 'deleted'),
    [items]
  );

  const counts = useMemo(
    () => ({
      all: activeItems.length,
      new: items.filter((item) => item.status === 'new').length,
      contacted: items.filter((item) => item.status === 'contacted').length,
      closed: items.filter((item) => item.status === 'closed').length,
      deleted: items.filter((item) => item.status === 'deleted').length,
    }),
    [items, activeItems]
  );

  const visible = useMemo(() => {
    if (filter === 'all') return activeItems;
    return items.filter((item) => item.status === filter);
  }, [items, filter, activeItems]);

  const changeStatus = async (id, status) => {
    setBusy(id);
    setError('');
    try {
      const updated = await setLandUpdateStatus(id, status);
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const removeUpdate = async (item) => {
    setBusy(item.id);
    setError('');
    try {
      const updated = await deleteLandUpdate(item.id);
      setItems((prev) => prev.map((row) => (row.id === item.id ? updated : row)));
      setConfirm(null);
    } catch (err) {
      setError(err.message);
      setConfirm(null);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl3 p-5 md:p-6 shadow-card border border-myland-mist/80">
        <p className="text-sm text-myland-slate leading-relaxed max-w-3xl">
          Landowners send these from the public Sell your land page. Admin and staff see the same
          form details, photo list, and a WhatsApp button to message the number they entered.
          {isAdmin
            ? ' Admins can remove a submission; it stays in the database under Deleted.'
            : ''}
        </p>
        <div className="flex flex-wrap gap-2 mt-5">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-display font-semibold ${
                filter === item.id
                  ? 'bg-myland-red text-white'
                  : 'bg-myland-mist text-myland-slate hover:text-myland-ink'
              }`}
            >
              {item.label} ({counts[item.id] || 0})
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="text-sm text-myland-red">{error}</p> : null}
      {loading ? <p className="text-sm text-myland-slate">Loading property updates…</p> : null}

      {!loading && visible.length === 0 ? (
        <div className="bg-white rounded-xl3 p-10 shadow-card border border-myland-mist/80 text-center">
          <HiOutlineLocationMarker className="text-3xl text-myland-gold mx-auto mb-3" />
          <p className="font-display font-semibold text-myland-ink">
            {filter === 'deleted' ? 'No deleted submissions' : 'No land submissions yet'}
          </p>
          <p className="text-sm text-myland-slate mt-2">
            {filter === 'deleted'
              ? 'Removed property updates appear here and stay in the database.'
              : 'New requests from the website Sell your land form will appear here.'}
          </p>
        </div>
      ) : null}

      <div className="space-y-4">
        {visible.map((item) => {
          const wa = whatsappHref(item.phone, whatsappMessage(item));
          return (
            <article
              key={item.id}
              className="bg-white rounded-xl3 p-5 md:p-6 shadow-card border border-myland-mist/80"
            >
              <div className="flex flex-col xl:flex-row gap-5">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span
                      className={`text-[10px] font-display font-semibold uppercase tracking-wide rounded-full px-2.5 py-1 ${STATUS_STYLES[item.status]}`}
                    >
                      {item.status}
                    </span>
                    <span className="text-xs text-myland-slate">{formatDate(item.createdAt)}</span>
                  </div>
                  <h2 className="font-display font-semibold text-lg text-myland-ink">{item.name}</h2>
                  <p className="text-sm text-myland-red mt-1 flex items-center gap-1.5">
                    <HiOutlineLocationMarker className="shrink-0" />
                    {item.location}
                  </p>

                  <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <Field label="WhatsApp number">
                      <span className="flex items-center gap-2">
                        <HiOutlinePhone className="text-myland-red shrink-0" />
                        <a href={`tel:${item.phone}`} className="hover:text-myland-red">
                          {item.phone}
                        </a>
                      </span>
                    </Field>
                    <Field label="Email">
                      <span className="flex items-center gap-2">
                        <HiOutlineMail className="text-myland-red shrink-0" />
                        {item.email ? (
                          <a href={`mailto:${item.email}`} className="hover:text-myland-red break-all">
                            {item.email}
                          </a>
                        ) : (
                          <span className="text-myland-slate font-normal">Not provided</span>
                        )}
                      </span>
                    </Field>
                    <Field label="Land location">{item.location}</Field>
                    <Field label="Land size">
                      {item.size || <span className="text-myland-slate font-normal">Not provided</span>}
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="Notes">
                        <span className="font-normal leading-relaxed">
                          {item.notes || <span className="text-myland-slate">No notes added.</span>}
                        </span>
                      </Field>
                    </div>
                  </dl>

                  <div className="mt-5">
                    <p className="text-[11px] uppercase tracking-wide text-myland-slate font-display font-semibold mb-3">
                      Uploaded photos ({item.photos.length})
                    </p>
                    {item.photos.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-myland-mist px-4 py-6 text-sm text-myland-slate flex items-center gap-2">
                        <HiOutlinePhotograph className="text-lg" />
                        No photos were uploaded with this request.
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                        {item.photos.map((src, index) => (
                          <button
                            key={`${item.id}-${src}-${index}`}
                            type="button"
                            onClick={() => setLightbox({ photos: item.photos, index, name: item.name })}
                            className="aspect-square rounded-xl overflow-hidden bg-myland-mist border border-myland-mist hover:border-myland-red/40"
                          >
                            <img
                              src={mediaSrc(src)}
                              alt={`${item.name} land photo ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="xl:w-56 shrink-0 flex flex-col gap-2">
                  {wa ? (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        if (item.status === 'new') changeStatus(item.id, 'contacted');
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] text-white font-display font-semibold text-xs px-4 py-2.5 hover:bg-[#1ebe5d]"
                    >
                      <FaWhatsapp className="text-base" />
                      Connect on WhatsApp
                    </a>
                  ) : (
                    <p className="text-xs text-myland-slate text-center">No WhatsApp number</p>
                  )}
                  <a
                    href={`tel:${item.phone}`}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-myland-mist bg-white text-myland-ink font-display font-semibold text-xs px-4 py-2.5"
                  >
                    <HiOutlinePhone />
                    Call number
                  </a>
                  {item.status !== 'contacted' && item.status !== 'deleted' ? (
                    <button
                      type="button"
                      disabled={busy === item.id}
                      onClick={() => changeStatus(item.id, 'contacted')}
                      className="inline-flex items-center justify-center rounded-full bg-myland-ink text-white font-display font-semibold text-xs px-4 py-2.5 disabled:opacity-50"
                    >
                      Mark contacted
                    </button>
                  ) : null}
                  {item.status !== 'deleted' && item.status !== 'closed' ? (
                    <button
                      type="button"
                      disabled={busy === item.id}
                      onClick={() => changeStatus(item.id, 'closed')}
                      className="inline-flex items-center justify-center rounded-full border border-myland-mist bg-white text-myland-ink font-display font-semibold text-xs px-4 py-2.5 disabled:opacity-50"
                    >
                      Close
                    </button>
                  ) : null}
                  {item.status === 'closed' ? (
                    <button
                      type="button"
                      disabled={busy === item.id}
                      onClick={() => changeStatus(item.id, 'new')}
                      className="inline-flex items-center justify-center rounded-full border border-myland-mist bg-white text-myland-ink font-display font-semibold text-xs px-4 py-2.5 disabled:opacity-50"
                    >
                      Reopen
                    </button>
                  ) : null}
                  {isAdmin && item.status === 'deleted' ? (
                    <button
                      type="button"
                      disabled={busy === item.id}
                      onClick={() => changeStatus(item.id, 'new')}
                      className="inline-flex items-center justify-center rounded-full bg-emerald-600 text-white font-display font-semibold text-xs px-4 py-2.5 disabled:opacity-50"
                    >
                      Restore
                    </button>
                  ) : null}
                  {isAdmin && item.status !== 'deleted' ? (
                    <button
                      type="button"
                      disabled={busy === item.id}
                      onClick={() => setConfirm(item)}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-myland-mist bg-white text-myland-red font-display font-semibold text-xs px-4 py-2.5 hover:border-myland-red disabled:opacity-50"
                    >
                      <HiOutlineTrash className="text-base" />
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {confirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-myland-ink/40"
            aria-label="Cancel"
            onClick={() => !busy && setConfirm(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-update-title"
            className="relative w-full max-w-md bg-white rounded-xl3 p-6 shadow-card"
          >
            <h3 id="delete-update-title" className="font-display font-semibold text-lg text-myland-ink">
              Delete this property update?
            </h3>
            <p className="text-sm text-myland-slate mt-2">
              The submission stays in the database as deleted. Staff will not see it. You can still
              find it under Deleted and restore it later.
            </p>
            <div className="mt-4 rounded-2xl bg-myland-cream px-4 py-3">
              <p className="font-display font-semibold text-sm text-myland-ink">{confirm.name}</p>
              <p className="text-xs text-myland-red mt-0.5">{confirm.location}</p>
              <p className="text-xs text-myland-slate mt-1">{confirm.phone}</p>
            </div>
            <div className="flex flex-wrap gap-2 mt-5">
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => removeUpdate(confirm)}
                className="inline-flex items-center justify-center rounded-full bg-myland-red text-white font-display font-semibold text-xs px-5 py-2.5 hover:bg-myland-redDark disabled:opacity-50"
              >
                {busy ? 'Working…' : 'Yes, delete'}
              </button>
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => setConfirm(null)}
                className="btn-ghost !py-2.5 !px-5 !text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {lightbox ? (
        <div
          className="fixed inset-0 z-50 bg-myland-ink/85 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white text-myland-ink flex items-center justify-center"
            aria-label="Close photo"
            onClick={() => setLightbox(null)}
          >
            <HiX />
          </button>
          {lightbox.photos.length > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-4 w-10 h-10 rounded-full bg-white text-myland-ink flex items-center justify-center"
                aria-label="Previous photo"
                onClick={(event) => {
                  event.stopPropagation();
                  stepLightbox(-1);
                }}
              >
                <HiChevronLeft className="text-xl" />
              </button>
              <button
                type="button"
                className="absolute right-4 w-10 h-10 rounded-full bg-white text-myland-ink flex items-center justify-center"
                aria-label="Next photo"
                onClick={(event) => {
                  event.stopPropagation();
                  stepLightbox(1);
                }}
              >
                <HiChevronRight className="text-xl" />
              </button>
            </>
          ) : null}
          <img
            src={mediaSrc(lightbox.photos[lightbox.index])}
            alt={`${lightbox.name} land photo ${lightbox.index + 1}`}
            className="max-h-[88vh] max-w-full rounded-2xl object-contain"
            onClick={(event) => event.stopPropagation()}
          />
          {lightbox.photos.length > 1 ? (
            <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white text-sm">
              {lightbox.index + 1} / {lightbox.photos.length}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
