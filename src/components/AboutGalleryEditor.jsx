import { useEffect, useState } from 'react';
import { HiOutlinePhotograph, HiOutlinePlus, HiX } from 'react-icons/hi';
import {
  fetchGallery,
  galleryItemsFromUpload,
  reviewGallery,
  submitGalleryChange,
  uploadGalleryMedia,
} from '../api/gallery.js';
import { fetchAdmins } from '../api/users.js';
import { useAuth } from '../context/AuthContext.jsx';
import { mediaSrc } from '../utils/projectMedia.js';
import WarmImage from './WarmImage.jsx';

const inputClass =
  'w-full bg-myland-cream border border-transparent rounded-xl px-4 py-3 text-sm text-myland-ink outline-none focus:bg-white focus:border-myland-gold/50';

function approvalBadge(status) {
  if (status === 'pending') return { label: 'Pending', className: 'bg-amber-50 text-amber-700' };
  if (status === 'declined') return { label: 'Declined', className: 'bg-myland-red/10 text-myland-red' };
  return { label: 'Approved', className: 'bg-emerald-50 text-emerald-700' };
}

export default function AboutGalleryEditor() {
  const { user, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [gallery, setGallery] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [approverId, setApproverId] = useState('');
  const [draft, setDraft] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  const defaultApproverId = String(admins[0]?.userId || '');
  const approval = approvalBadge(gallery?.approvalStatus);
  const pending = gallery?.approvalStatus === 'pending';

  const applyGallery = (next) => {
    setGallery(next);
    return next;
  };

  const load = async () => {
    const next = await fetchGallery();
    applyGallery(next);
    return next;
  };

  useEffect(() => {
    Promise.all([load(), isAdmin ? Promise.resolve([]) : fetchAdmins()])
      .then(([, nextAdmins]) => {
        if (Array.isArray(nextAdmins)) {
          setAdmins(nextAdmins);
          setApproverId((current) => current || String(nextAdmins[0]?.userId || ''));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const adminName = (id) => {
    const match = admins.find((item) => String(item.userId) === String(id));
    return match?.name || gallery?.approverName || 'the selected admin';
  };

  const openEditor = async () => {
    setError('');
    setNotice('');
    setMessage('');
    setConfirm(false);
    setOpen(true);
    setBusy('load');
    try {
      const next = await load();
      const source = next.approvalStatus === 'pending' && next.pendingImages.length ? next.pendingImages : next.images;
      setDraft(source);
      setApproverId(String(next.approverId || defaultApproverId));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const closeEditor = () => {
    if (busy) return;
    setOpen(false);
    setConfirm(false);
    setError('');
  };

  const uploadFiles = async (files) => {
    const list = Array.from(files || []).filter(Boolean);
    if (!list.length) return;
    setBusy('upload');
    setError('');
    try {
      const urls = await uploadGalleryMedia(list);
      const added = galleryItemsFromUpload(list, urls);
      setDraft((current) => [...current, ...added]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const removeAt = (index) => {
    setDraft((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const sendForApproval = async () => {
    if (!draft.length) {
      setError('Add at least one gallery photo before sending.');
      return;
    }
    if (!approverId) {
      setError('Please select an admin.');
      return;
    }
    setBusy('save');
    setError('');
    setNotice('');
    try {
      const next = await submitGalleryChange({ images: draft, approverId });
      applyGallery(next);
      setNotice(`Gallery request sent to ${adminName(approverId)}. The public page does not change until it is approved.`);
      setOpen(false);
      setConfirm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const review = async (status) => {
    if (status === 'declined' && String(message || '').trim().length < 3) {
      setError('Please add a decline message.');
      return;
    }
    setBusy(status);
    setError('');
    setNotice('');
    try {
      const next = await reviewGallery({ status, message });
      applyGallery(next);
      setNotice(status === 'approved' ? 'Gallery request approved. The About page now uses these photos.' : 'Gallery request declined.');
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const liveCount = gallery?.images?.length ?? 0;

  return (
    <>
      <div className="bg-white rounded-xl3 shadow-card border border-myland-mist/80 overflow-hidden">
        <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display font-semibold text-lg text-myland-ink">About gallery</h2>
              {gallery ? (
                <span className={`rounded-full text-[10px] font-display font-semibold uppercase tracking-wide px-2.5 py-1 ${approval.className}`}>
                  {approval.label}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-myland-slate mt-1 max-w-2xl">
              {isAdmin
                ? 'Admins cannot edit the gallery. Review the current photos here and approve or decline staff requests. The public site does not change until a request is approved.'
                : 'Add or remove About page photos, then send them to an admin for approval. The public site does not change until it is approved.'}
            </p>
            <p className="text-xs text-myland-slate mt-2">
              {loading
                ? 'Loading gallery…'
                : `${liveCount} photo${liveCount === 1 ? '' : 's'} live on the About page`}
            </p>
            {gallery?.approvalStatus !== 'approved' && (gallery?.requestedByName || gallery?.approverName || gallery?.approvalMessage) ? (
              <div className="mt-2 text-[11px] text-myland-slate space-y-0.5">
                {gallery.requestedByName ? (
                  <p>
                    Requested by <span className="font-semibold text-myland-ink">{gallery.requestedByName}</span>
                  </p>
                ) : null}
                {gallery.approverName ? (
                  <p>
                    Sent to <span className="font-semibold text-myland-ink">{gallery.approverName}</span>
                    {String(gallery.approverId) === String(user?.userId) ? ' (you)' : ''}
                  </p>
                ) : null}
                {gallery.approvalMessage ? (
                  <p>
                    Admin message: <span className="text-myland-ink">{gallery.approvalMessage}</span>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          <button type="button" onClick={openEditor} className="btn-primary !py-2 !px-4 !text-xs shrink-0">
            <HiOutlinePhotograph className="text-base" />
            {isAdmin ? (pending ? 'Review gallery' : 'View gallery') : 'Update gallery'}
          </button>
        </div>
        {notice ? <p className="px-6 pb-5 text-sm text-emerald-700">{notice}</p> : null}
        {error && !open ? <p className="px-6 pb-5 text-sm text-myland-red">{error}</p> : null}
      </div>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={closeEditor}>
          <div
            className="bg-white rounded-xl3 p-6 w-full max-w-3xl shadow-soft relative max-h-[90vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeEditor}
              className="absolute top-4 right-4 w-8 h-8 rounded-full border border-myland-mist flex items-center justify-center text-myland-slate"
              aria-label="Close gallery editor"
            >
              <HiX />
            </button>
            <h3 className="font-display font-semibold text-lg text-myland-ink pr-10">
              {isAdmin ? (pending ? 'Review About gallery' : 'About gallery') : 'Update About gallery'}
            </h3>
            <p className="text-sm text-myland-slate mt-2">
              {isAdmin
                ? pending
                  ? 'These photos will appear on the About page if you approve. The live gallery stays as it is until then.'
                  : 'These photos are live on the About page. Staff send changes here for you to approve.'
                : 'These photos will be sent to an admin. The live About page does not change until they approve.'}
            </p>

            {error ? <p className="mt-3 text-sm text-myland-red">{error}</p> : null}
            {busy === 'load' ? <p className="mt-3 text-sm text-myland-slate">Loading photos…</p> : null}

            <div className="mt-5 flex flex-wrap gap-3">
              {draft.map((item, index) => (
                <div key={`${item.src}-${index}`} className="relative w-24 h-24 rounded-xl overflow-hidden bg-myland-mist">
                  <WarmImage
                    src={mediaSrc(item.src)}
                    alt={item.alt || ''}
                    className="w-full h-full object-cover"
                    wrapperClassName="absolute inset-0"
                  />
                  {!isAdmin ? (
                    <button
                      type="button"
                      onClick={() => removeAt(index)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white text-myland-ink flex items-center justify-center"
                      aria-label={`Remove photo ${index + 1}`}
                    >
                      <HiX className="text-xs" />
                    </button>
                  ) : null}
                </div>
              ))}
              {!isAdmin ? (
                <label className="w-24 h-24 rounded-xl border border-dashed border-myland-mist bg-myland-cream flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-myland-gold text-myland-slate">
                  <HiOutlinePlus />
                  <span className="text-[10px] font-display font-semibold uppercase tracking-wide">
                    {busy === 'upload' ? 'Uploading…' : 'Add'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={Boolean(busy)}
                    onChange={(event) => {
                      uploadFiles(event.target.files);
                      event.target.value = '';
                    }}
                  />
                </label>
              ) : null}
            </div>

            {!draft.length && busy !== 'load' ? (
              <p className="mt-4 text-sm text-myland-slate">
                {isAdmin ? 'No photos in this request.' : 'No photos yet. Add images, then send for approval.'}
              </p>
            ) : null}

            {!isAdmin && (
              <label className="block mt-5">
                <span className="block text-xs font-display font-semibold text-myland-ink mb-2">Send to admin</span>
                <select className={inputClass} value={approverId} onChange={(event) => setApproverId(event.target.value)}>
                  <option value="">Select an admin</option>
                  {admins.map((admin) => (
                    <option key={admin.userId} value={admin.userId}>
                      {admin.name} · {admin.email}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {isAdmin && pending ? (
              <label className="block mt-5">
                <span className="block text-xs font-display font-semibold text-myland-ink mb-2">
                  Decline message or note for the author (optional when approving)
                </span>
                <textarea
                  className={`${inputClass} min-h-[88px] resize-y`}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="If you decline, tell the author what to change before they resend."
                />
              </label>
            ) : null}

            <div className="flex flex-wrap gap-2 mt-6">
              {isAdmin && pending ? (
                <>
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => review('approved')}
                    className="inline-flex items-center justify-center rounded-full bg-emerald-600 text-white font-display font-semibold text-xs px-5 py-2.5 disabled:opacity-50"
                  >
                    {busy === 'approved' ? 'Working…' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(busy) || String(message || '').trim().length < 3}
                    onClick={() => review('declined')}
                    className="inline-flex items-center justify-center rounded-full bg-myland-red text-white font-display font-semibold text-xs px-5 py-2.5 disabled:opacity-50"
                  >
                    {busy === 'declined' ? 'Working…' : 'Decline'}
                  </button>
                </>
              ) : null}
              {!isAdmin ? (
                <button
                  type="button"
                  disabled={Boolean(busy) || !draft.length || !approverId}
                  onClick={() => setConfirm(true)}
                  className="inline-flex items-center justify-center rounded-full bg-myland-red text-white font-display font-semibold text-xs px-5 py-2.5 disabled:opacity-50"
                >
                  Send for approval
                </button>
              ) : null}
              <button type="button" disabled={Boolean(busy)} onClick={closeEditor} className="btn-ghost !py-2 !px-4 !text-xs">
                {isAdmin ? 'Close' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => !busy && setConfirm(false)}>
          <div
            className="bg-white rounded-xl3 p-6 w-full max-w-md shadow-soft relative"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => !busy && setConfirm(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full border border-myland-mist flex items-center justify-center text-myland-slate"
              aria-label="Cancel"
            >
              <HiX />
            </button>
            <h3 className="font-display font-semibold text-lg text-myland-ink pr-8">Send these gallery changes for approval?</h3>
            <p className="text-sm text-myland-slate mt-2">
              The public About page will not change until {adminName(approverId)} approves. They will get an email to review this request.
            </p>
            <div className="mt-4 rounded-2xl bg-myland-cream px-4 py-3">
              <p className="font-display font-semibold text-sm text-myland-ink">About gallery</p>
              <p className="text-xs text-myland-slate mt-1">
                {draft.length} photo{draft.length === 1 ? '' : 's'} · send to {adminName(approverId)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 mt-5">
              <button
                type="button"
                disabled={Boolean(busy) || !approverId}
                onClick={sendForApproval}
                className="inline-flex items-center justify-center rounded-full bg-myland-ink text-white font-display font-semibold text-xs px-5 py-2.5 disabled:opacity-50"
              >
                {busy === 'save' ? 'Sending…' : 'Yes, send to approval'}
              </button>
              <button type="button" disabled={Boolean(busy)} onClick={() => setConfirm(false)} className="btn-ghost !py-2 !px-4 !text-xs">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
