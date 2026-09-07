import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineStar,
  HiOutlineBookOpen,
  HiOutlineOfficeBuilding,
  HiOutlineUsers,
  HiOutlineChatAlt2,
  HiArrowRight,
} from 'react-icons/hi';
import { fetchReviews } from '../api/reviews.js';
import { fetchBlogs } from '../api/blogs.js';
import { fetchUsers } from '../api/users.js';
import StarRating from '../components/StarRating.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const SAMPLE_STATS = [
  { label: 'Active listings', value: '10', icon: HiOutlineOfficeBuilding },
  { label: 'Open inquiries', value: '4', icon: HiOutlineChatAlt2 },
];

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [staffCount, setStaffCount] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const jobs = [fetchReviews(), fetchBlogs()];
    if (isAdmin) jobs.push(fetchUsers('active'));
    Promise.all(jobs)
      .then(([nextReviews, nextBlogs, nextUsers]) => {
        setReviews(nextReviews);
        setBlogs(nextBlogs);
        if (Array.isArray(nextUsers)) setStaffCount(nextUsers.length);
      })
      .catch((err) => setError(err.message));
  }, [isAdmin]);

  const pending = reviews.filter((item) => item.status === 'pending').length;
  const approved = reviews.filter((item) => item.status === 'approved').length;
  const recent = reviews.slice(0, 4);
  const pendingBlogs = blogs.filter((item) => item.status !== 'deleted' && !item.published).length;
  const publishedBlogs = blogs.filter((item) => item.published && item.status !== 'deleted').length;

  return (
    <div className="space-y-8">
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
        {SAMPLE_STATS.slice(0, isAdmin ? 1 : 2).map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl3 p-5 shadow-card border border-myland-mist/80">
              <span className="w-10 h-10 rounded-full bg-myland-cream text-myland-ink flex items-center justify-center mb-4">
                <Icon className="text-lg" />
              </span>
              <p className="font-display font-bold text-3xl text-myland-ink">{stat.value}</p>
              <p className="text-sm text-myland-slate mt-1">{stat.label}</p>
            </div>
          );
        })}
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
