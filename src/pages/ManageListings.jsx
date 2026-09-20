import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlinePencil, HiOutlinePlus, HiOutlineTrash, HiX } from 'react-icons/hi';
import { fetchProjects, reviewProject, submitProjectChange } from '../api/projects.js';
import { fetchAdmins } from '../api/users.js';
import { useAuth } from '../context/AuthContext.jsx';
import AboutGalleryEditor from '../components/AboutGalleryEditor.jsx';

const STATUS_STYLES = {
  'For Sale': 'bg-myland-red/10 text-myland-red',
  Sold: 'bg-myland-mist text-myland-slate',
  Completed: 'bg-amber-50 text-amber-800',
};

const inputClass =
  'w-full bg-myland-cream border border-transparent rounded-xl px-4 py-3 text-sm text-myland-ink outline-none focus:bg-white focus:border-myland-gold/50';

function approvalBadge(item) {
  if (item.rowStatus === 'deleted') return { label: 'Deleted', className: 'bg-myland-mist text-myland-slate' };
  if (item.approvalStatus === 'pending') return { label: 'Pending', className: 'bg-amber-50 text-amber-700' };
  if (item.approvalStatus === 'declined') return { label: 'Declined', className: 'bg-myland-red/10 text-myland-red' };
  return { label: 'Approved', className: 'bg-emerald-50 text-emerald-700' };
}

function pendingActionLabel(action) {
  if (action === 'create') return 'New listing';
  if (action === 'delete') return 'Delete request';
  if (action === 'update') return 'Update request';
  return '';
}

export default function ManageListings() {
  const { user, isAdmin } = useAuth();
  const [projects, setProjects] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [confirm, setConfirm] = useState(null);

  const defaultApproverId = String(admins[0]?.userId || '');

  const load = async () => {
    const items = await fetchProjects({ all: true });
    const STATUS_ORDER = { 'For Sale': 0, Sold: 1, Completed: 2 };
    setProjects(
      items.sort((a, b) => {
        const pending = Number(b.approvalStatus === 'pending') - Number(a.approvalStatus === 'pending');
        if (pending !== 0) return pending;
        const status = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
        if (status !== 0) return status;
        return String(a.title || '').localeCompare(String(b.title || ''));
      })
    );
  };

  useEffect(() => {
    Promise.all([load(), isAdmin ? Promise.resolve([]) : fetchAdmins()])
      .then(([, nextAdmins]) => {
        if (Array.isArray(nextAdmins)) setAdmins(nextAdmins);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  const visible = useMemo(() => {
    const active = projects.filter((item) => item.rowStatus !== 'deleted');
    if (filter === 'pending') return active.filter((item) => item.approvalStatus === 'pending');
    if (filter === 'declined') return active.filter((item) => item.approvalStatus === 'declined');
    return active.filter((item) => item.published || item.approvalStatus === 'approved');
  }, [projects, filter]);

  const counts = useMemo(
    () => ({
      all: projects.filter(
        (item) => item.rowStatus !== 'deleted' && (item.published || item.approvalStatus === 'approved')
      ).length,
      pending: projects.filter((item) => item.approvalStatus === 'pending').length,
      declined: projects.filter((item) => item.approvalStatus === 'declined').length,
    }),
    [projects]
  );

  const adminName = (id) => {
    const match = admins.find((item) => String(item.userId) === String(id));
    return match?.name || 'the selected admin';
  };

  const closeConfirm = () => {
    if (busy) return;
    setConfirm(null);
  };

  const runConfirm = async () => {
    if (!confirm) return;
    if (confirm.type === 'submit-delete' && !confirm.approverId) {
      setError('Please select an admin.');
      return;
    }
    if (confirm.type === 'decline' && String(confirm.message || '').trim().length < 3) {
      setError('Please add a decline message.');
      return;
    }
    setBusy(confirm.project.id);
    setError('');
    setNotice('');
    try {
      if (confirm.type === 'submit-delete') {
        await submitProjectChange({
          action: 'delete',
          projectId: confirm.project.id,
          approverId: Number(confirm.approverId),
        });
        setNotice(`Delete request sent to ${adminName(confirm.approverId)}.`);
      } else {
        await reviewProject(confirm.project.id, {
          status: confirm.type === 'approve' ? 'approved' : 'declined',
          message: confirm.message || '',
        });
        setNotice(confirm.type === 'approve' ? 'Listing request approved.' : 'Listing request declined.');
      }
      setConfirm(null);
      await load();
    } catch (err) {
      setError(err.message);
      setConfirm(null);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-6">
      <AboutGalleryEditor />

      <div className="bg-white rounded-xl3 shadow-card border border-myland-mist/80 overflow-hidden">
        <div className="px-6 py-5 border-b border-myland-mist flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="font-display font-semibold text-lg text-myland-ink">Project listings</h2>
            <p className="text-sm text-myland-slate mt-1 max-w-2xl">
              {isAdmin
                ? 'Admins cannot add or edit listings. Review current projects here and approve or decline staff requests.'
                : 'Add or edit a listing, then send it to an admin for approval. The public site does not change until it is approved.'}
            </p>
          </div>
          {!isAdmin && (
            <Link to="/listings/new" className="btn-primary !py-2 !px-4 !text-xs shrink-0">
              <HiOutlinePlus className="text-base" /> Add project
            </Link>
          )}
        </div>

        <div className="px-6 py-4 flex flex-wrap gap-2">
          {[
            { id: 'all', label: `Current listings (${counts.all})` },
            { id: 'pending', label: `Pending (${counts.pending})` },
            { id: 'declined', label: `Declined (${counts.declined})` },
          ].map((item) => (
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
              {item.label}
            </button>
          ))}
        </div>

        {error ? <p className="px-6 pb-2 text-sm text-myland-red">{error}</p> : null}
        {notice ? <p className="px-6 pb-2 text-sm text-emerald-700">{notice}</p> : null}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-myland-cream text-myland-slate font-display text-xs uppercase tracking-wide">
              <tr>
                <th className="px-6 py-3 font-semibold">Project</th>
                <th className="px-6 py-3 font-semibold">Location</th>
                <th className="px-6 py-3 font-semibold">Listing</th>
                <th className="px-6 py-3 font-semibold">Approval</th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => {
                const approval = approvalBadge(item);
                const displayTitle = item.pendingPayload?.title || item.title;
                return (
                  <tr key={item.id} className="border-t border-myland-mist align-top">
                    <td className="px-6 py-4">
                      <p className="font-display font-semibold text-myland-ink">{displayTitle}</p>
                      <p className="text-xs text-myland-slate mt-0.5">/{item.slug}</p>
                      {item.pendingAction && item.pendingAction !== 'none' && item.approvalStatus !== 'approved' && (
                        <p className="text-[11px] text-myland-slate mt-1">{pendingActionLabel(item.pendingAction)}</p>
                      )}
                      {item.approvalStatus !== 'approved' && (item.requestedByName || item.approverName || item.approvalMessage) && (
                        <div className="mt-2 text-[11px] text-myland-slate space-y-0.5">
                          {item.requestedByName ? (
                            <p>
                              Requested by <span className="font-semibold text-myland-ink">{item.requestedByName}</span>
                            </p>
                          ) : null}
                          {item.approverName ? (
                            <p>
                              Sent to <span className="font-semibold text-myland-ink">{item.approverName}</span>
                              {String(item.approverId) === String(user?.userId) ? ' (you)' : ''}
                            </p>
                          ) : null}
                          {item.approvalMessage ? (
                            <p>
                              Admin message: <span className="text-myland-ink">{item.approvalMessage}</span>
                            </p>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-myland-slate">{item.location}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full text-[10px] font-display font-semibold uppercase tracking-wide px-2.5 py-1 ${
                          STATUS_STYLES[item.status] || 'bg-myland-mist text-myland-slate'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full text-[10px] font-display font-semibold uppercase tracking-wide px-2.5 py-1 ${approval.className}`}
                      >
                        {approval.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end flex-wrap gap-2">
                        {isAdmin && item.approvalStatus === 'pending' && item.rowStatus !== 'deleted' && (
                          <>
                            <button
                              type="button"
                              disabled={Boolean(busy)}
                              onClick={() => setConfirm({ type: 'approve', project: item, message: '' })}
                              className="inline-flex items-center rounded-full bg-emerald-600 text-white text-[10px] font-display font-semibold uppercase px-3 h-9 hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={Boolean(busy)}
                              onClick={() => setConfirm({ type: 'decline', project: item, message: '' })}
                              className="inline-flex items-center rounded-full border border-myland-mist bg-white text-myland-red text-[10px] font-display font-semibold uppercase px-3 h-9 hover:border-myland-red disabled:opacity-50"
                            >
                              Decline
                            </button>
                          </>
                        )}
                        {!isAdmin && item.rowStatus !== 'deleted' && (
                          <>
                            <Link
                              to={`/listings/${item.id}/edit`}
                              className="inline-flex items-center gap-1.5 rounded-full border border-myland-mist px-3 h-9 text-xs font-display font-semibold text-myland-ink hover:border-myland-gold"
                            >
                              <HiOutlinePencil />
                              Edit
                            </Link>
                            <button
                              type="button"
                              disabled={item.approvalStatus === 'pending' || Boolean(busy)}
                              onClick={() =>
                                setConfirm({
                                  type: 'submit-delete',
                                  project: item,
                                  approverId: String(item.approverId || defaultApproverId),
                                })
                              }
                              className="w-9 h-9 rounded-full border border-myland-mist flex items-center justify-center text-myland-slate hover:text-myland-red hover:border-myland-red/40 disabled:opacity-40"
                              aria-label={`Request delete ${item.title}`}
                            >
                              <HiOutlineTrash />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <p className="font-display font-semibold text-myland-ink">
                      {filter === 'pending' ? 'No pending listing requests' : 'No projects found'}
                    </p>
                    <p className="text-sm text-myland-slate mt-1">
                      {filter === 'pending'
                        ? 'Staff listing changes will appear here for you to approve or decline.'
                        : 'Current website listings will appear in this table.'}
                    </p>
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-sm text-myland-slate text-center">
                    Loading listings…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={closeConfirm}>
          <div
            className="bg-white rounded-xl3 p-6 w-full max-w-md shadow-soft relative"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeConfirm}
              className="absolute top-4 right-4 w-8 h-8 rounded-full border border-myland-mist flex items-center justify-center text-myland-slate"
              aria-label="Cancel"
            >
              <HiX />
            </button>
            <h3 className="font-display font-semibold text-lg text-myland-ink pr-8">
              {confirm.type === 'approve'
                ? 'Approve this listing request?'
                : confirm.type === 'decline'
                  ? 'Decline this listing request?'
                  : 'Send this delete for approval?'}
            </h3>
            <p className="text-sm text-myland-slate mt-2">
              {confirm.type === 'approve'
                ? 'The public project page will use these changes after you approve. The staff user will get an email that it was approved.'
                : confirm.type === 'decline'
                  ? 'The live listing stays as it is. The author will get an email and can edit and send it again.'
                  : 'The live listing stays on the website until an admin approves the deletion. They will get an email to review this request.'}
            </p>
            <div className="mt-4 rounded-2xl bg-myland-cream px-4 py-3">
              <p className="font-display font-semibold text-sm text-myland-ink">
                {confirm.project.pendingPayload?.title || confirm.project.title}
              </p>
              <p className="text-xs text-myland-slate mt-1">{confirm.project.location}</p>
            </div>
            {confirm.type === 'submit-delete' && (
              <label className="block mt-4">
                <span className="block text-xs font-display font-semibold text-myland-ink mb-2">Send to admin</span>
                <select
                  className={inputClass}
                  value={confirm.approverId || ''}
                  onChange={(event) => setConfirm((current) => ({ ...current, approverId: event.target.value }))}
                >
                  <option value="">Select an admin</option>
                  {admins.map((admin) => (
                    <option key={admin.userId} value={admin.userId}>
                      {admin.name} · {admin.email}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {(confirm.type === 'approve' || confirm.type === 'decline') && (
              <label className="block mt-4">
                <span className="block text-xs font-display font-semibold text-myland-ink mb-2">
                  {confirm.type === 'decline' ? 'Decline message' : 'Note for the author (optional)'}
                </span>
                <textarea
                  className={`${inputClass} min-h-[88px] resize-y`}
                  value={confirm.message || ''}
                  onChange={(event) => setConfirm((current) => ({ ...current, message: event.target.value }))}
                  placeholder={
                    confirm.type === 'decline'
                      ? 'Tell the author what to change before they resend.'
                      : 'Optional note that the author will see.'
                  }
                />
              </label>
            )}
            <div className="flex flex-wrap gap-2 mt-5">
              <button
                type="button"
                disabled={
                  Boolean(busy) ||
                  (confirm.type === 'submit-delete' && !confirm.approverId) ||
                  (confirm.type === 'decline' && String(confirm.message || '').trim().length < 3)
                }
                onClick={runConfirm}
                className={
                  confirm.type === 'approve'
                    ? 'inline-flex items-center justify-center rounded-full bg-emerald-600 text-white font-display font-semibold text-xs px-5 py-2.5 disabled:opacity-50'
                    : 'inline-flex items-center justify-center rounded-full bg-myland-red text-white font-display font-semibold text-xs px-5 py-2.5 disabled:opacity-50'
                }
              >
                {busy ? 'Working…' : confirm.type === 'approve' ? 'Yes, approve' : confirm.type === 'decline' ? 'Yes, decline' : 'Yes, send delete request'}
              </button>
              <button type="button" disabled={Boolean(busy)} onClick={closeConfirm} className="btn-ghost !py-2 !px-4 !text-xs">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
