import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineStar,
  HiOutlineBookOpen,
  HiOutlineOfficeBuilding,
  HiOutlineUsers,
  HiOutlineChatAlt2,
  HiOutlineLocationMarker,
  HiHeart,
  HiChevronDown,
  HiChevronUp,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineDuplicate,
  HiOutlineTrash,
} from 'react-icons/hi';
import { fetchReviews } from '../api/reviews.js';
import { fetchBlogs } from '../api/blogs.js';
import { fetchUsers } from '../api/users.js';
import { fetchProjects } from '../api/projects.js';
import { fetchLandUpdates } from '../api/landUpdates.js';
import { deleteInquiry, fetchInquiries } from '../api/inquiries.js';
import { fetchHeartSummary } from '../api/favorites.js';
import { clearSubscribers, deleteSubscriber, fetchSubscribers } from '../api/newsletter.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSiteSettings } from '../context/SiteSettingsContext.jsx';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_STYLES = {
  new: 'bg-myland-red/10 text-myland-red',
  in_progress: 'bg-amber-50 text-amber-700',
  closed: 'bg-myland-mist text-myland-slate',
};

const STATUS_LABELS = {
  new: 'New',
  in_progress: 'In progress',
  closed: 'Closed',
};

const CONTACT_VISIBLE_ROWS = 10;
const CONTACT_ROW_PX = 58;
const CONTACT_HEAD_PX = 42;

function SubscriberRow({ item, onCopy, copied, onClear, clearing }) {
  return (
    <li className="flex items-center gap-2 h-[52px] shrink-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-myland-ink truncate" title={item.email}>
          {item.email}
        </p>
        <p className="text-[11px] text-myland-slate truncate">{formatDate(item.createdAt)}</p>
      </div>
      <button
        type="button"
        disabled={clearing}
        onClick={(event) => {
          event.stopPropagation();
          onCopy(item);
        }}
        className="inline-flex items-center gap-1 rounded-full border border-myland-mist px-3 py-1.5 text-[11px] font-display font-semibold text-myland-ink shrink-0 hover:border-myland-red/40 disabled:opacity-40"
      >
        <HiOutlineDuplicate className="text-sm" />
        {copied ? 'Copied' : 'Copy'}
      </button>
      <button
        type="button"
        disabled={clearing}
        onClick={(event) => {
          event.stopPropagation();
          onClear(item);
        }}
        className="inline-flex items-center gap-1 rounded-full border border-myland-mist px-3 py-1.5 text-[11px] font-display font-semibold text-myland-red shrink-0 hover:border-myland-red disabled:opacity-40"
      >
        <HiOutlineTrash className="text-sm" />
        Clear
      </button>
    </li>
  );
}

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const { blogPageEnabled, setBlogPageEnabled } = useSiteSettings();
  const [blogToggleBusy, setBlogToggleBusy] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [staffCount, setStaffCount] = useState(null);
  const [listingCount, setListingCount] = useState(null);
  const [pendingListings, setPendingListings] = useState(0);
  const [landUpdateCount, setLandUpdateCount] = useState(null);
  const [newLandUpdates, setNewLandUpdates] = useState(0);
  const [inquiryCount, setInquiryCount] = useState(null);
  const [newInquiries, setNewInquiries] = useState(0);
  const [contactMessages, setContactMessages] = useState([]);
  const [hearts, setHearts] = useState({ total: 0, projects: [] });
  const [heartsOpen, setHeartsOpen] = useState(false);
  const [subscribers, setSubscribers] = useState([]);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [emailBusy, setEmailBusy] = useState('');
  const [confirmClear, setConfirmClear] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [messageBusy, setMessageBusy] = useState(false);
  const [emailsOpen, setEmailsOpen] = useState(false);
  const [error, setError] = useState('');
  const heartsRef = useRef(null);
  const emailsRef = useRef(null);
  const messagesRef = useRef(null);

  useEffect(() => {
    const jobs = [
      fetchReviews(),
      fetchBlogs(),
      fetchProjects({ all: true }),
      fetchLandUpdates(),
      fetchInquiries(),
    ];
    if (isAdmin) jobs.push(fetchUsers('active'));
    Promise.all(jobs)
      .then(([nextReviews, nextBlogs, nextProjects, nextLandUpdates, nextInquiries, nextUsers]) => {
        setReviews(nextReviews);
        setBlogs(nextBlogs);
        const listings = (nextProjects || []).filter((item) => item.rowStatus !== 'deleted');
        setListingCount(listings.length);
        setPendingListings(listings.filter((item) => item.approvalStatus === 'pending').length);
        const updates = nextLandUpdates || [];
        setLandUpdateCount(updates.length);
        setNewLandUpdates(updates.filter((item) => item.status === 'new').length);
        const inquiries = nextInquiries || [];
        const active = inquiries.filter((item) => item.status !== 'deleted');
        setInquiryCount(active.length);
        setNewInquiries(active.filter((item) => item.status === 'new').length);
        setContactMessages(
          active.filter((item) => item.source === 'contact' || (!item.projectSlug && !item.projectTitle))
        );
        if (Array.isArray(nextUsers)) setStaffCount(nextUsers.length);
      })
      .catch((err) => setError(err.message));
    fetchHeartSummary()
      .then((nextHearts) => {
        setHearts({
          total: nextHearts?.total || 0,
          projects: nextHearts?.projects || [],
        });
      })
      .catch(() => {});
    fetchSubscribers()
      .then(setSubscribers)
      .catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    if (!heartsOpen && !emailsOpen) return undefined;
    const onPointerDown = (event) => {
      if (!heartsRef.current?.contains(event.target)) setHeartsOpen(false);
      if (!emailsRef.current?.contains(event.target)) setEmailsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [heartsOpen, emailsOpen]);

  const copyAllEmails = async () => {
    const list = subscribers.map((item) => item.email).filter(Boolean);
    if (!list.length) return;
    try {
      await navigator.clipboard.writeText(list.join(', '));
      setCopiedId(null);
      setCopiedAll(true);
      window.setTimeout(() => setCopiedAll(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const copyEmail = async (subscriber) => {
    if (!subscriber?.email) return;
    try {
      await navigator.clipboard.writeText(subscriber.email);
      setCopiedAll(false);
      setCopiedId(subscriber.id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === subscriber.id ? null : current));
      }, 1800);
    } catch {
      /* ignore */
    }
  };

  const removeSubscriber = async (item) => {
    if (!item?.id || emailBusy) return;
    setEmailBusy(item.id);
    try {
      await deleteSubscriber(item.id);
      setSubscribers((prev) => {
        const next = prev.filter((row) => row.id !== item.id);
        if (next.length <= 1) setEmailsOpen(false);
        return next;
      });
      if (copiedId === item.id) setCopiedId(null);
      setConfirmClear(null);
    } catch (err) {
      setError(err.message || 'Could not clear email');
      setConfirmClear(null);
    } finally {
      setEmailBusy('');
    }
  };

  const removeAllSubscribers = async () => {
    if (emailBusy || !subscribers.length) return;
    setEmailBusy('all');
    try {
      await clearSubscribers();
      setSubscribers([]);
      setCopiedAll(false);
      setCopiedId(null);
      setEmailsOpen(false);
      setConfirmClear(null);
    } catch (err) {
      setError(err.message || 'Could not clear emails');
      setConfirmClear(null);
    } finally {
      setEmailBusy('');
    }
  };

  const removeContactMessage = async (item) => {
    if (!item?.id || messageBusy) return;
    setMessageBusy(true);
    setError('');
    try {
      await deleteInquiry(item.id);
      setContactMessages((prev) => prev.filter((row) => row.id !== item.id));
      setInquiryCount((count) => (typeof count === 'number' ? Math.max(0, count - 1) : count));
      if (item.status === 'new') {
        setNewInquiries((count) => Math.max(0, count - 1));
      }
      setConfirmDelete(null);
    } catch (err) {
      setError(err.message || 'Could not delete message');
      setConfirmDelete(null);
    } finally {
      setMessageBusy(false);
    }
  };

  const scrollContactMessages = (direction) => {
    messagesRef.current?.scrollBy({
      top: direction * CONTACT_ROW_PX * 3,
      behavior: 'smooth',
    });
  };

  const pending = reviews.filter((item) => item.status === 'pending').length;
  const pendingBlogs = blogs.filter((item) => item.approvalStatus === 'pending').length;
  const publishedBlogs = blogs.filter((item) => item.published && item.status !== 'deleted').length;

  const toggleBlogPage = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isAdmin || blogToggleBusy) return;
    setBlogToggleBusy(true);
    setError('');
    try {
      await setBlogPageEnabled(!blogPageEnabled);
    } catch (err) {
      setError(err.message || 'Could not update blog page availability');
    } finally {
      setBlogToggleBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-start overflow-visible">
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
        {isAdmin ? (
        <section
          className={`bg-white rounded-xl3 p-5 shadow-card border transition-colors ${
            blogPageEnabled
              ? 'border-myland-mist/80 hover:border-myland-red/40'
              : 'border-myland-mist/80'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            {blogPageEnabled ? (
              <Link
                to="/blogs"
                className="w-10 h-10 rounded-full bg-myland-cream text-myland-ink flex items-center justify-center"
                aria-label="Open blog listing"
              >
                <HiOutlineBookOpen className="text-lg" />
              </Link>
            ) : (
              <span className="w-10 h-10 rounded-full bg-myland-cream text-myland-ink flex items-center justify-center">
                <HiOutlineBookOpen className="text-lg" />
              </span>
            )}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-display font-semibold uppercase tracking-wide text-myland-slate">
                {blogPageEnabled ? 'On' : 'Off'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={blogPageEnabled}
                aria-label={blogPageEnabled ? 'Turn blog page off' : 'Turn blog page on'}
                disabled={blogToggleBusy}
                onClick={toggleBlogPage}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                  blogPageEnabled ? 'bg-myland-red' : 'bg-myland-ink/20'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    blogPageEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
          {blogPageEnabled ? (
            <Link to="/blogs" className="block">
              <p className="font-display font-bold text-3xl text-myland-ink">{publishedBlogs}</p>
              <p className="text-sm text-myland-slate mt-1">
                Published blogs{pendingBlogs ? ` · ${pendingBlogs} pending` : ''}
              </p>
            </Link>
          ) : (
            <div>
              <p className="font-display font-bold text-3xl text-myland-ink">{publishedBlogs}</p>
              <p className="text-sm text-myland-slate mt-1">Published blogs · page hidden</p>
            </div>
          )}
        </section>
        ) : (
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
        )}
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
        <Link
          to="/inquiries"
          className="bg-white rounded-xl3 p-5 shadow-card border border-myland-mist/80 hover:border-myland-red/40 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="w-10 h-10 rounded-full bg-myland-cream text-myland-ink flex items-center justify-center">
              <HiOutlineChatAlt2 className="text-lg" />
            </span>
            {newInquiries ? (
              <span className="text-[11px] font-display font-semibold uppercase tracking-wide text-myland-red">
                New
              </span>
            ) : null}
          </div>
          <p className="font-display font-bold text-3xl text-myland-ink">{inquiryCount ?? '—'}</p>
          <p className="text-sm text-myland-slate mt-1">
            Inquiries{newInquiries ? ` · ${newInquiries} new` : ''}
          </p>
        </Link>
        <section
          ref={heartsRef}
          className={`relative bg-white rounded-xl3 shadow-card border border-myland-mist/80 ${
            heartsOpen ? 'z-30' : 'z-10'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setEmailsOpen(false);
              setHeartsOpen((open) => !open);
            }}
            className="w-full p-5 text-left"
            aria-expanded={heartsOpen}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="w-10 h-10 rounded-full bg-myland-red/10 text-myland-red flex items-center justify-center">
                <HiHeart className="text-lg" />
              </span>
              <HiChevronDown
                className={`text-myland-slate text-lg transition-transform ${heartsOpen ? 'rotate-180' : ''}`}
              />
            </div>
            <p className="font-display font-bold text-3xl text-myland-ink">{hearts.total}</p>
            <p className="text-sm text-myland-slate mt-1">
              Hearts
              {hearts.projects.length
                ? ` · ${hearts.projects.length} project${hearts.projects.length === 1 ? '' : 's'}`
                : ''}
            </p>
          </button>
          {heartsOpen ? (
            <div className="absolute left-0 top-[calc(100%-0.35rem)] z-40 w-72 max-w-[calc(100vw-3rem)] rounded-xl3 bg-white shadow-card border border-myland-mist/80 overflow-hidden">
              {hearts.projects.length === 0 ? (
                <p className="text-xs text-myland-slate px-5 py-4">No hearts yet.</p>
              ) : (
                <ul className="px-5 divide-y divide-myland-mist overflow-y-auto overscroll-contain" style={{ maxHeight: 44 * 5 }}>
                  {hearts.projects.map((item) => (
                    <li
                      key={item.slug}
                      className="flex items-center justify-between gap-3 h-11 text-sm"
                    >
                      <span className="text-myland-ink truncate" title={item.title}>
                        {item.title}
                      </span>
                      <span className="inline-flex items-center gap-1 font-display font-semibold text-myland-red tabular-nums shrink-0">
                        <HiHeart className="text-xs" />
                        {item.hearts}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </section>

        <section
          ref={emailsRef}
          className={`relative sm:col-span-2 ${emailsOpen ? 'z-30' : 'z-10'}`}
        >
          <div
            className={`bg-white px-5 pt-5 border border-myland-mist/80 shadow-card ${
              emailsOpen ? 'border-b-0 pb-1' : 'rounded-xl3 pb-5 min-h-[148px]'
            }`}
            style={
              emailsOpen
                ? { borderTopLeftRadius: '1.75rem', borderTopRightRadius: '1.75rem', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }
                : undefined
            }
          >
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setHeartsOpen(false);
                  setEmailsOpen((open) => !open);
                }}
                className="min-w-0 text-left"
                aria-expanded={emailsOpen}
              >
                <p className="font-display font-semibold text-sm text-myland-ink">Plot alert emails</p>
                <p className="text-xs text-myland-slate mt-0.5">
                  {subscribers.length
                    ? `${subscribers.length} subscribed from the homepage`
                    : 'Emails from the homepage subscribe form'}
                </p>
              </button>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={copyAllEmails}
                  disabled={!subscribers.length || Boolean(emailBusy)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-myland-mist px-3 py-1.5 text-[11px] font-display font-semibold text-myland-ink disabled:opacity-40 hover:border-myland-red/40"
                >
                  <HiOutlineDuplicate className="text-sm" />
                  {copiedAll ? 'Copied' : 'Copy all'}
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setConfirmClear('all');
                  }}
                  disabled={!subscribers.length || Boolean(emailBusy)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-myland-mist px-3 py-1.5 text-[11px] font-display font-semibold text-myland-red disabled:opacity-40 hover:border-myland-red"
                >
                  <HiOutlineTrash className="text-sm" />
                  Clear all
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHeartsOpen(false);
                    setEmailsOpen((open) => !open);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-myland-mist pl-2.5 pr-2 h-8 text-myland-ink"
                  aria-label={emailsOpen ? 'Hide emails' : 'Show emails'}
                >
                  {!emailsOpen && subscribers.length > 1 ? (
                    <span className="text-[11px] font-display font-semibold text-myland-slate">
                      +{subscribers.length - 1}
                    </span>
                  ) : null}
                  <HiChevronDown className={`text-lg transition-transform ${emailsOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
            {subscribers.length === 0 ? (
              <p className="text-sm text-myland-slate mt-5">No emails yet.</p>
            ) : (
              <ul className="mt-2">
                <SubscriberRow
                  key={subscribers[0].id}
                  item={subscribers[0]}
                  onCopy={copyEmail}
                  copied={copiedId === subscribers[0].id}
                  onClear={setConfirmClear}
                  clearing={emailBusy === subscribers[0].id || emailBusy === 'all'}
                />
              </ul>
            )}
          </div>
          {emailsOpen ? (
            <div
              className="absolute left-0 right-0 top-full z-40 bg-white border-x border-b border-myland-mist/80 overflow-hidden"
              style={{
                borderBottomLeftRadius: '1.75rem',
                borderBottomRightRadius: '1.75rem',
                boxShadow: '0 4px 24px -4px rgba(26, 29, 31, 0.08)',
              }}
            >
              {subscribers.length <= 1 ? (
                <p className="text-sm text-myland-slate px-5 py-3">No more emails.</p>
              ) : (
                <ul
                  className="px-5 pb-2 border-t border-myland-mist divide-y divide-myland-mist overflow-y-auto overscroll-contain"
                  style={{ maxHeight: 52 * 5 }}
                >
                  {subscribers.slice(1).map((item) => (
                    <SubscriberRow
                      key={item.id}
                      item={item}
                      onCopy={copyEmail}
                      copied={copiedId === item.id}
                      onClear={setConfirmClear}
                      clearing={emailBusy === item.id || emailBusy === 'all'}
                    />
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </section>
      </div>

      {error && <p className="text-myland-red text-sm">{error}</p>}

      <section className="bg-white rounded-xl3 p-6 shadow-card border border-myland-mist/80">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display font-semibold text-lg text-myland-ink">Contact messages</h2>
            <p className="text-sm text-myland-slate mt-1">
              Visitors who sent a message from the website contact form
              {contactMessages.length ? ` · ${contactMessages.length} total` : ''}
            </p>
          </div>
          {contactMessages.length > CONTACT_VISIBLE_ROWS ? (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => scrollContactMessages(-1)}
                className="w-8 h-8 rounded-full border border-myland-mist text-myland-ink flex items-center justify-center hover:border-myland-red/40"
                aria-label="Scroll up"
              >
                <HiChevronUp className="text-lg" />
              </button>
              <button
                type="button"
                onClick={() => scrollContactMessages(1)}
                className="w-8 h-8 rounded-full border border-myland-mist text-myland-ink flex items-center justify-center hover:border-myland-red/40"
                aria-label="Scroll down"
              >
                <HiChevronDown className="text-lg" />
              </button>
            </div>
          ) : null}
        </div>

        <div
          ref={messagesRef}
          className={`-mx-2 ${
            contactMessages.length > CONTACT_VISIBLE_ROWS
              ? 'overflow-auto overscroll-contain'
              : 'overflow-x-auto'
          }`}
          style={
            contactMessages.length > CONTACT_VISIBLE_ROWS
              ? { maxHeight: CONTACT_HEAD_PX + CONTACT_ROW_PX * CONTACT_VISIBLE_ROWS }
              : undefined
          }
        >
          <table className="w-full min-w-[720px] text-left">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="text-[11px] uppercase tracking-wide text-myland-slate font-display font-semibold border-b border-myland-mist">
                <th className="py-3 px-2 font-semibold">Name</th>
                <th className="py-3 px-2 font-semibold">Phone</th>
                <th className="py-3 px-2 font-semibold">Email</th>
                <th className="py-3 px-2 font-semibold">Message</th>
                <th className="py-3 px-2 font-semibold">Sent</th>
                <th className="py-3 px-2 font-semibold">Status</th>
                <th className="py-3 px-2 font-semibold"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-myland-mist">
              {contactMessages.map((item) => (
                <tr key={item.id} className="h-[58px]">
                  <td className="px-2">
                    <p className="font-display font-semibold text-sm text-myland-ink truncate">
                      {item.name || '—'}
                    </p>
                  </td>
                  <td className="px-2 text-sm text-myland-ink whitespace-nowrap">
                    {item.phone ? (
                      <a href={`tel:${item.phone}`} className="inline-flex items-center gap-1.5 hover:text-myland-red">
                        <HiOutlinePhone className="text-myland-red shrink-0" />
                        {item.phone}
                      </a>
                    ) : (
                      <span className="text-myland-slate">—</span>
                    )}
                  </td>
                  <td className="px-2 text-sm text-myland-ink">
                    {item.email ? (
                      <a href={`mailto:${item.email}`} className="inline-flex items-center gap-1.5 hover:text-myland-red truncate max-w-[220px]">
                        <HiOutlineMail className="text-myland-red shrink-0" />
                        {item.email}
                      </a>
                    ) : (
                      <span className="text-myland-slate">—</span>
                    )}
                  </td>
                  <td className="px-2 text-sm text-myland-slate max-w-xs">
                    <p className="truncate">{item.message || '—'}</p>
                  </td>
                  <td className="px-2 text-xs text-myland-slate whitespace-nowrap">
                    {formatDate(item.createdAt)}
                  </td>
                  <td className="px-2">
                    <span
                      className={`text-[10px] font-display font-semibold uppercase tracking-wide rounded-full px-2.5 py-1 ${
                        STATUS_STYLES[item.status] || 'bg-myland-mist text-myland-slate'
                      }`}
                    >
                      {STATUS_LABELS[item.status] || item.status}
                    </span>
                  </td>
                  <td className="px-2">
                    <button
                      type="button"
                      disabled={messageBusy}
                      onClick={() => setConfirmDelete(item)}
                      className="inline-flex items-center gap-1 rounded-full border border-myland-mist px-3 py-1.5 text-[11px] font-display font-semibold text-myland-red shrink-0 hover:border-myland-red disabled:opacity-40"
                    >
                      <HiOutlineTrash className="text-sm" />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {contactMessages.length === 0 && !error && (
                <tr>
                  <td colSpan={7} className="py-10 text-sm text-myland-slate text-center">
                    No contact form messages yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {confirmClear ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-myland-ink/40"
            aria-label="Cancel"
            onClick={() => !emailBusy && setConfirmClear(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-emails-title"
            className="relative w-full max-w-md bg-white rounded-xl3 p-6 shadow-card"
          >
            <h3 id="clear-emails-title" className="font-display font-semibold text-lg text-myland-ink">
              {confirmClear === 'all' ? 'Clear all plot alert emails?' : 'Clear this email?'}
            </h3>
            <p className="text-sm text-myland-slate mt-2">
              {confirmClear === 'all'
                ? `This removes all ${subscribers.length} subscribed emails from the list.`
                : 'This removes the address from the plot alert list.'}
            </p>
            {confirmClear !== 'all' ? (
              <div className="mt-4 rounded-2xl bg-myland-cream px-4 py-3">
                <p className="font-display font-semibold text-sm text-myland-ink break-all">
                  {confirmClear.email}
                </p>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2 mt-5">
              <button
                type="button"
                disabled={Boolean(emailBusy)}
                onClick={() =>
                  confirmClear === 'all' ? removeAllSubscribers() : removeSubscriber(confirmClear)
                }
                className="inline-flex items-center justify-center rounded-full bg-myland-red text-white font-display font-semibold text-xs px-5 py-2.5 hover:bg-myland-redDark disabled:opacity-50"
              >
                {emailBusy ? 'Clearing…' : confirmClear === 'all' ? 'Yes, clear all' : 'Yes, clear'}
              </button>
              <button
                type="button"
                disabled={Boolean(emailBusy)}
                onClick={() => setConfirmClear(null)}
                className="btn-ghost !py-2.5 !px-5 !text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {confirmDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-myland-ink/40"
            aria-label="Cancel"
            onClick={() => !messageBusy && setConfirmDelete(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-message-title"
            className="relative w-full max-w-md bg-white rounded-xl3 p-6 shadow-card"
          >
            <h3 id="delete-message-title" className="font-display font-semibold text-lg text-myland-ink">
              Delete this contact message?
            </h3>
            <p className="text-sm text-myland-slate mt-2">
              This removes the message from the dashboard contact list.
            </p>
            <div className="mt-4 rounded-2xl bg-myland-cream px-4 py-3">
              <p className="font-display font-semibold text-sm text-myland-ink">
                {confirmDelete.name || 'Website visitor'}
              </p>
              <p className="text-xs text-myland-slate mt-1 break-all">
                {confirmDelete.email || confirmDelete.phone || 'No contact details'}
              </p>
              {confirmDelete.message ? (
                <p className="text-sm text-myland-slate mt-2 line-clamp-3">{confirmDelete.message}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 mt-5">
              <button
                type="button"
                disabled={messageBusy}
                onClick={() => removeContactMessage(confirmDelete)}
                className="inline-flex items-center justify-center rounded-full bg-myland-red text-white font-display font-semibold text-xs px-5 py-2.5 hover:bg-myland-redDark disabled:opacity-50"
              >
                {messageBusy ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button
                type="button"
                disabled={messageBusy}
                onClick={() => setConfirmDelete(null)}
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
