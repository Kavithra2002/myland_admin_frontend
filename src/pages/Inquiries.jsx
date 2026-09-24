import { useEffect, useMemo, useState } from 'react';
import {
  HiOutlineChatAlt2,
  HiOutlinePhone,
  HiOutlineTrash,
} from 'react-icons/hi';
import { FaWhatsapp } from 'react-icons/fa';
import { deleteInquiry, fetchInquiries, setInquiryStatus } from '../api/inquiries.js';
import { useAuth } from '../context/AuthContext.jsx';

const FILTERS = [
  { id: 'new', label: 'New' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'closed', label: 'Closed' },
];

const STATUS_STYLES = {
  new: 'bg-myland-red/10 text-myland-red',
  in_progress: 'bg-amber-50 text-amber-700',
  closed: 'bg-myland-mist text-myland-slate',
  deleted: 'bg-myland-mist text-myland-slate',
};

const STATUS_LABELS = {
  new: 'New',
  in_progress: 'In progress',
  closed: 'Closed',
  deleted: 'Deleted',
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

function whatsappHref(phone, text) {
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
  const project = item.projectTitle ? ` about ${item.projectTitle}` : '';
  return `Hello, this is Myland following up${project}.`;
}

function isBlankNumber(value) {
  const raw = String(value || '').trim();
  if (!raw || raw === '-') return true;
  return raw.replace(/\D/g, '').length < 9;
}

function contactNumber(item) {
  if (item.source === 'whatsapp' || isBlankNumber(item.phone)) return '';
  return String(item.phone).trim();
}

function whatsappNumber(item) {
  if (!isBlankNumber(item.whatsapp)) return String(item.whatsapp).trim();
  if (item.source === 'whatsapp' && !isBlankNumber(item.phone)) {
    return String(item.phone).trim();
  }
  return '';
}

function actionNumber(item) {
  return contactNumber(item) || whatsappNumber(item);
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

export default function Inquiries() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('new');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    const inquiries = await fetchInquiries();
    setItems(inquiries);
  };

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const counts = useMemo(
    () => ({
      new: items.filter((item) => item.status === 'new').length,
      in_progress: items.filter((item) => item.status === 'in_progress').length,
      closed: items.filter((item) => item.status === 'closed').length,
    }),
    [items]
  );

  const visible = useMemo(
    () => items.filter((item) => item.status === filter),
    [items, filter]
  );

  const changeStatus = async (id, status) => {
    setBusy(id);
    setError('');
    try {
      const updated = await setInquiryStatus(id, status);
      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const removeInquiry = async (item) => {
    setBusy(item.id);
    setError('');
    try {
      const updated = await deleteInquiry(item.id);
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
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => (
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
      {loading ? <p className="text-sm text-myland-slate">Loading inquiries…</p> : null}

      {!loading && visible.length === 0 ? (
        <div className="bg-white rounded-xl3 p-10 shadow-card border border-myland-mist/80 text-center">
          <HiOutlineChatAlt2 className="text-3xl text-myland-gold mx-auto mb-3" />
          <p className="font-display font-semibold text-myland-ink">
            No inquiries in this view
          </p>
          <p className="text-sm text-myland-slate mt-2">
            When someone uses Contact us on a project page, their details will show here.
          </p>
        </div>
      ) : null}

      <div className="space-y-4">
        {visible.map((item) => {
          const phone = contactNumber(item);
          const waNumber = whatsappNumber(item);
          const reach = actionNumber(item);
          const wa = whatsappHref(reach, whatsappMessage(item));
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
                      {STATUS_LABELS[item.status] || item.status}
                    </span>
                    <span className="text-xs text-myland-slate">{formatDate(item.createdAt)}</span>
                  </div>
                  <h2 className="font-display font-semibold text-lg text-myland-ink">
                    {item.projectTitle || 'General website inquiry'}
                  </h2>

                  <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <Field label="Name">{item.name && item.name !== '-' ? item.name : '-'}</Field>
                    {phone ? (
                      <Field label="Contact number">
                        <a href={`tel:${phone}`} className="inline-flex items-center gap-2 hover:text-myland-red">
                          <HiOutlinePhone className="text-myland-red shrink-0" />
                          {phone}
                        </a>
                      </Field>
                    ) : null}
                    {waNumber ? (
                      <Field label="WhatsApp number">
                        <span className="inline-flex items-center gap-2">
                          <FaWhatsapp className="text-[#25D366] shrink-0" />
                          {waNumber}
                        </span>
                      </Field>
                    ) : null}
                  </dl>
                  {item.message ? (
                    <p className="mt-4 text-sm text-myland-slate leading-relaxed whitespace-pre-wrap">
                      {item.message}
                    </p>
                  ) : null}
                </div>

                <div className="xl:w-56 shrink-0 flex flex-col gap-2">
                  {wa ? (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        if (item.status === 'new') changeStatus(item.id, 'in_progress');
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] text-white font-display font-semibold text-xs px-4 py-2.5 hover:bg-[#1ebe5d]"
                    >
                      <FaWhatsapp className="text-base" />
                      WhatsApp
                    </a>
                  ) : (
                    <p className="text-xs text-myland-slate text-center">No WhatsApp number</p>
                  )}
                  {reach ? (
                    <a
                      href={`tel:${reach}`}
                      onClick={() => {
                        if (item.status === 'new') changeStatus(item.id, 'in_progress');
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-myland-mist bg-white text-myland-ink font-display font-semibold text-xs px-4 py-2.5"
                    >
                      <HiOutlinePhone />
                      Call number
                    </a>
                  ) : null}
                  {item.status !== 'in_progress' && item.status !== 'deleted' ? (
                    <button
                      type="button"
                      disabled={busy === item.id}
                      onClick={() => changeStatus(item.id, 'in_progress')}
                      className="inline-flex items-center justify-center rounded-full bg-myland-ink text-white font-display font-semibold text-xs px-4 py-2.5 disabled:opacity-50"
                    >
                      Mark in progress
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
            aria-labelledby="delete-inquiry-title"
            className="relative w-full max-w-md bg-white rounded-xl3 p-6 shadow-card"
          >
            <h3 id="delete-inquiry-title" className="font-display font-semibold text-lg text-myland-ink">
              Delete this inquiry?
            </h3>
            <p className="text-sm text-myland-slate mt-2">
              The inquiry stays in the database as deleted and leaves this list. Staff will not see it.
            </p>
            <div className="mt-4 rounded-2xl bg-myland-cream px-4 py-3">
              <p className="font-display font-semibold text-sm text-myland-ink">
                {confirm.projectTitle || 'General website inquiry'}
              </p>
              <p className="text-xs text-myland-slate mt-1">{actionNumber(confirm) || '-'}</p>
            </div>
            <div className="flex flex-wrap gap-2 mt-5">
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => removeInquiry(confirm)}
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
    </div>
  );
}
