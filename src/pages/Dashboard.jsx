import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineStar,
  HiOutlineBookOpen,
  HiOutlineOfficeBuilding,
  HiOutlineUsers,
  HiOutlineChatAlt2,
  HiOutlineLocationMarker,
  HiArrowRight,
} from 'react-icons/hi';
import { fetchReviews } from '../api/reviews.js';
import { fetchBlogs } from '../api/blogs.js';
import { fetchUsers } from '../api/users.js';
import { fetchProjects } from '../api/projects.js';
import { fetchMailStatus, sendTestMailRequest } from '../api/auth.js';
import { fetchLandUpdates } from '../api/landUpdates.js';
import StarRating from '../components/StarRating.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Dashboard() {
  const { isAdmin, user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [staffCount, setStaffCount] = useState(null);
  const [listingCount, setListingCount] = useState(null);
  const [pendingListings, setPendingListings] = useState(0);
  const [landUpdateCount, setLandUpdateCount] = useState(null);
  const [newLandUpdates, setNewLandUpdates] = useState(0);
  const [mail, setMail] = useState(null);
  const [mailNotice, setMailNotice] = useState('');
  const [mailBusy, setMailBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const jobs = [fetchReviews(), fetchBlogs(), fetchProjects({ all: true }), fetchMailStatus(), fetchLandUpdates()];
    if (isAdmin) jobs.push(fetchUsers('active'));
    Promise.all(jobs)
      .then(([nextReviews, nextBlogs, nextProjects, nextMail, nextLandUpdates, nextUsers]) => {
        setReviews(nextReviews);
        setBlogs(nextBlogs);
        setMail(nextMail);
        const listings = (nextProjects || []).filter((item) => item.rowStatus !== 'deleted');
        setListingCount(listings.length);
        setPendingListings(listings.filter((item) => item.approvalStatus === 'pending').length);
        const updates = nextLandUpdates || [];
        setLandUpdateCount(updates.length);
        setNewLandUpdates(updates.filter((item) => item.status === 'new').length);
        if (Array.isArray(nextUsers)) setStaffCount(nextUsers.length);
      })
      .catch((err) => setError(err.message));
  }, [isAdmin]);

  const pending = reviews.filter((item) => item.status === 'pending').length;
  const approved = reviews.filter((item) => item.status === 'approved').length;
  const recent = reviews.slice(0, 4);
  const pendingBlogs = blogs.filter((item) => item.approvalStatus === 'pending').length;
  const publishedBlogs = blogs.filter((item) => item.published && item.status !== 'deleted').length;

  return (
    <div className="space-y-8">
      {mail && (
        <div
          className={`rounded-xl3 px-5 py-4 text-sm border ${
            mail.canSend
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
              : 'bg-amber-50 border-amber-100 text-amber-800'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              {mail.canSend ? (
                <p>Approval emails are on{mail.from ? ` and send from ${mail.from}` : ''}.</p>
              ) : (
                <p>
                  Approval emails are not connected yet. Set SMTP in the backend .env, then send a test mail.
                </p>
              )}
              {mailNotice ? <p className="mt-2">{mailNotice}</p> : null}
            </div>
            <button
              type="button"
              disabled={mailBusy}
              onClick={async () => {
                setMailBusy(true);
                setMailNotice('');
                try {
                  await sendTestMailRequest();
                  setMailNotice(`Test mail sent to ${user?.email || 'your Gmail'}. Check the inbox.`);
                } catch (err) {
                  setMailNotice(err.message);
                } finally {
                  setMailBusy(false);
                }
              }}
              className="shrink-0 inline-flex items-center justify-center rounded-full bg-white text-myland-ink font-display font-semibold text-xs px-4 py-2 border border-current/10 disabled:opacity-50"
            >
              {mailBusy ? 'Sending…' : 'Send test mail'}
            </button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Link
          to="/reviews"
          className="bg-white rounded-xl3 p-5 shadow-card border border-myland-mist/80 hover:border-myland-red/40 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="w-10 h-10 rounded-full bg-myland-red/10 text-myland-red flex items-center justify-center">
              <HiOutlineStar className="text-lg" />
            </span>
            <span className="text-[11px] font-display font-semibold uppercase tracking-wide text-myland-red">
              Needs action
            </span>
          </div>
          <p className="font-display font-bold text-3xl text-myland-ink">{pending}</p>
          <p className="text-sm text-myland-slate mt-1">Pending reviews</p>
        </Link>
        <Link
          to="/blogs"
          className="bg-white rounded-xl3 p-5 shadow-card border border-myland-mist/80 hover:border-myland-red/40 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="w-10 h-10 rounded-full bg-myland-cream text-myland-ink flex items-center justify-center">
              <HiOutlineBookOpen className="text-lg" />
            </span>
            <span className="text-[11px] font-display font-semibold uppercase tracking-wide text-myland-slate">
              Journal
            </span>
          </div>
          <p className="font-display font-bold text-3xl text-myland-ink">{publishedBlogs}</p>
          <p className="text-sm text-myland-slate mt-1">
            Published blogs{pendingBlogs ? ` · ${pendingBlogs} pending` : ''}
          </p>
        </Link>
        {isAdmin && (
          <Link
            to="/users"
            className="bg-white rounded-xl3 p-5 shadow-card border border-myland-mist/80 hover:border-myland-red/40 transition-colors"
          >
            <span className="w-10 h-10 rounded-full bg-myland-cream text-myland-ink flex items-center justify-center mb-4">
              <HiOutlineUsers className="text-lg" />
            </span>
            <p className="font-display font-bold text-3xl text-myland-ink">{staffCount ?? '—'}</p>
            <p className="text-sm text-myland-slate mt-1">Active staff users</p>
          </Link>
        )}
        <Link
          to="/listings"
          className="bg-white rounded-xl3 p-5 shadow-card border border-myland-mist/80 hover:border-myland-red/40 transition-colors"
        >
          <span className="w-10 h-10 rounded-full bg-myland-cream text-myland-ink flex items-center justify-center mb-4">
            <HiOutlineOfficeBuilding className="text-lg" />
          </span>
          <p className="font-display font-bold text-3xl text-myland-ink">{listingCount ?? '—'}</p>
          <p className="text-sm text-myland-slate mt-1">
            Project listings{pendingListings ? ` · ${pendingListings} pending` : ''}
          </p>
        </Link>
        <Link
          to="/property-updates"
          className="bg-white rounded-xl3 p-5 shadow-card border border-myland-mist/80 hover:border-myland-red/40 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="w-10 h-10 rounded-full bg-myland-cream text-myland-ink flex items-center justify-center">
              <HiOutlineLocationMarker className="text-lg" />
            </span>
            {newLandUpdates ? (
              <span className="text-[11px] font-display font-semibold uppercase tracking-wide text-myland-red">
                New
              </span>
            ) : null}
          </div>
          <p className="font-display font-bold text-3xl text-myland-ink">{landUpdateCount ?? '—'}</p>
          <p className="text-sm text-myland-slate mt-1">
            Property updates{newLandUpdates ? ` · ${newLandUpdates} new` : ''}
          </p>
        </Link>
        {!isAdmin && (
          <div className="bg-white rounded-xl3 p-5 shadow-card border border-myland-mist/80">
            <span className="w-10 h-10 rounded-full bg-myland-cream text-myland-ink flex items-center justify-center mb-4">
              <HiOutlineChatAlt2 className="text-lg" />
            </span>
            <p className="font-display font-bold text-3xl text-myland-ink">4</p>
            <p className="text-sm text-myland-slate mt-1">Open inquiries</p>
          </div>
        )}
      </div>

      <section className="bg-white rounded-xl3 p-6 shadow-card border border-myland-mist/80">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="font-display font-semibold text-lg text-myland-ink">Latest reviews</h2>
            <p className="text-sm text-myland-slate mt-1">
              {approved} approved · {pending} waiting in Review Authorizer
            </p>
          </div>
          <Link to="/reviews" className="btn-primary !py-2 !px-4 !text-xs">
            Open authorizer <HiArrowRight />
          </Link>
        </div>
        {error && <p className="text-myland-red text-sm">{error}</p>}
        <ul className="divide-y divide-myland-mist">
          {recent.map((review) => (
            <li key={review.id} className="py-4 flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-sm text-myland-ink">{review.name}</p>
                <p className="text-xs text-myland-slate mt-0.5">{review.projectTitle}</p>
                <p className="text-sm text-myland-slate mt-2 line-clamp-2">{review.message}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StarRating value={review.rating} />
                <StatusBadge status={review.status} />
              </div>
            </li>
          ))}
          {recent.length === 0 && !error && (
            <li className="py-8 text-sm text-myland-slate text-center">No reviews yet.</li>
          )}
        </ul>
      </section>
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
