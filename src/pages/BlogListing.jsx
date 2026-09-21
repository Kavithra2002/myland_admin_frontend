import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineStar,
  HiOutlineTrash,
  HiStar,
  HiX,
} from 'react-icons/hi';
import {
  createBlog,
  deleteBlog,
  fetchBlogs,
  placeBlog,
  reorderBlog,
  reviewBlog,
  submitBlogChange,
  updateBlog,
} from '../api/blogs.js';
import { fetchAdmins } from '../api/users.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSiteSettings } from '../context/SiteSettingsContext.jsx';
import WarmImage from '../components/WarmImage.jsx';

const TOPICS = ['Site visits', 'Titles', 'Districts', 'Loans', 'Investment', 'Journal', 'Guides'];
const LAYOUTS = [
  { id: 'auto', label: 'Auto' },
  { id: 'image-left', label: 'Image left' },
  { id: 'image-right', label: 'Image right' },
];

const SECTIONS = [
  {
    id: 'cover',
    label: 'Cover story',
    hint: 'The journal hero at the top of the public Blog page. One post only.',
  },
  {
    id: 'features',
    label: 'Field notes',
    hint: 'The two large feature cards under Field notes. A third move pushes the last one to The index.',
  },
  {
    id: 'index',
    label: 'The index',
    hint: 'The numbered list at the bottom of the Blog page.',
  },
];

const EMPTY_FORM = {
  title: '',
  slug: '',
  topic: 'Site visits',
  excerpt: '',
  body: '',
  imageUrl: '',
  readTime: '',
  layout: 'auto',
  published: true,
  publishedAt: '',
  placement: 'index',
};

const inputClass =
  'w-full bg-myland-cream border border-transparent rounded-xl px-4 py-3 text-sm text-myland-ink placeholder:text-myland-slate/50 outline-none focus:bg-white focus:border-myland-gold/50';

const CONFIRM_BTN_INK =
  'inline-flex items-center justify-center rounded-full bg-myland-ink text-white font-display font-semibold text-xs px-5 py-2.5 disabled:opacity-50';
const CONFIRM_BTN_RED =
  'inline-flex items-center justify-center rounded-full bg-myland-red text-white font-display font-semibold text-xs px-5 py-2.5 hover:bg-myland-redDark disabled:opacity-50';
const CONFIRM_BTN_GREEN =
  'inline-flex items-center justify-center rounded-full bg-emerald-600 text-white font-display font-semibold text-xs px-5 py-2.5 hover:bg-emerald-700 disabled:opacity-50';

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function toDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function formFromBlog(blog) {
  const pending =
    blog.pendingPayload &&
    (blog.pendingAction === 'update' || blog.pendingAction === 'create')
      ? blog.pendingPayload
      : null;
  const source = pending ? { ...blog, ...pending } : blog;
  return {
    title: source.title || '',
    slug: source.slug || '',
    topic: source.topic || 'Journal',
    excerpt: source.excerpt || '',
    body: source.body || '',
    imageUrl: source.imageUrl || source.image || '',
    readTime: source.readTime || '',
    layout: source.layout || 'auto',
    published: blog.published !== false,
    publishedAt: toDateInput(source.publishedAt || blog.publishedAt),
    placement: source.placement || blog.placement || 'index',
  };
}

function sectionLabel(id) {
  return SECTIONS.find((item) => item.id === id)?.label || id;
}

function moveHint(blog, placement) {
  if (placement === 'cover') {
    return 'This post becomes the Cover story (the journal hero). If another post is already Cover story, it moves to Field notes.';
  }
  if (placement === 'features') {
    return 'This post becomes one of the two Field notes cards. If Field notes already has two, the last one moves to The index.';
  }
  if (blog.placement === 'cover') {
    return 'This post moves to The index (the numbered list). Cover story will be empty until you move another post there.';
  }
  return 'This post moves to The index (the numbered list at the bottom of the public Blog page).';
}

function approvalBadge(blog) {
  if (blog.status === 'deleted') return { label: 'Deleted', className: 'bg-myland-mist text-myland-slate' };
  if (blog.approvalStatus === 'pending') return { label: 'Pending', className: 'bg-amber-50 text-amber-700' };
  if (blog.approvalStatus === 'declined') return { label: 'Declined', className: 'bg-myland-red/10 text-myland-red' };
  return { label: 'Approved', className: 'bg-emerald-50 text-emerald-700' };
}

function pendingActionLabel(action) {
  if (action === 'create') return 'New post';
  if (action === 'delete') return 'Delete request';
  if (action === 'move') return 'Move request';
  if (action === 'update') return 'Update request';
  return '';
}

function confirmCopy(confirm) {
  if (confirm.type === 'submit') {
    return {
      title: confirm.action === 'create' ? 'Send this post for approval?' : 'Send these changes for approval?',
      body: 'The public Blog page will not change until the selected admin approves it.',
      action: 'Yes, send to approval',
      actionClass: CONFIRM_BTN_INK,
    };
  }
  if (confirm.type === 'submit-delete') {
    return {
      title: 'Send this delete for approval?',
      body: 'The live post stays on the public site until an admin approves the deletion.',
      action: 'Yes, send delete request',
      actionClass: CONFIRM_BTN_RED,
    };
  }
  if (confirm.type === 'submit-move') {
    return {
      title: `Send move to ${sectionLabel(confirm.placement)}?`,
      body: `${moveHint(confirm.blog, confirm.placement)} This stays pending until an admin approves it.`,
      action: 'Yes, send move request',
      actionClass: CONFIRM_BTN_INK,
    };
  }
  if (confirm.type === 'add') {
    return {
      title: 'Add this blog?',
      body: `It will be published in ${sectionLabel(confirm.blog.placement)} on the public Blog page.`,
      action: 'Yes, add blog',
      actionClass: CONFIRM_BTN_INK,
    };
  }
  if (confirm.type === 'save') {
    return {
      title: 'Save these changes?',
      body: 'The public Blog page will show the updated post.',
      action: 'Yes, save changes',
      actionClass: CONFIRM_BTN_INK,
    };
  }
  if (confirm.type === 'approve') {
    return {
      title: 'Approve this request?',
      body: 'The requested change will go live on the public Blog page. You can add an optional note for the author.',
      action: 'Yes, approve',
      actionClass: CONFIRM_BTN_GREEN,
    };
  }
  if (confirm.type === 'decline') {
    return {
      title: 'Decline this request?',
      body: 'The public Blog page stays as it is. Add a message so the author knows what to fix.',
      action: 'Yes, decline',
      actionClass: CONFIRM_BTN_RED,
    };
  }
  if (confirm.type === 'shift') {
    const goingUp = confirm.direction === 'up';
    return {
      title: goingUp ? 'Move this post up?' : 'Move this post down?',
      body: `This changes the order in ${sectionLabel(confirm.blog.placement)}.`,
      action: goingUp ? 'Yes, move up' : 'Yes, move down',
      actionClass: CONFIRM_BTN_INK,
    };
  }
  if (confirm.type === 'move') {
    return {
      title: `Move to ${sectionLabel(confirm.placement)}?`,
      body: moveHint(confirm.blog, confirm.placement),
      action: `Yes, move to ${sectionLabel(confirm.placement)}`,
      actionClass: CONFIRM_BTN_INK,
    };
  }
  return {
    title: 'Delete this blog?',
    body: 'The row stays in the database with status deleted. It is hidden from the public Blog page. You can still see it under Deleted.',
    action: 'Yes, delete',
    actionClass: CONFIRM_BTN_RED,
  };
}

function confirmBusyKey(confirm) {
  if (!confirm) return '';
  if (confirm.type === 'add' || confirm.type === 'save' || confirm.type === 'submit') return 'save';
  if (confirm.type === 'approve' || confirm.type === 'decline') return confirm.blog.id + confirm.type;
  if (confirm.type === 'shift') return confirm.blog.id + confirm.direction;
  if (confirm.type === 'move' || confirm.type === 'submit-move') {
    return confirm.blog.id + (confirm.placement || 'move');
  }
  return confirm.blog.id + confirm.type;
}

function needsAdminPicker(type) {
  return type === 'submit' || type === 'submit-delete' || type === 'submit-move';
}

export default function BlogListing() {
  const { isAdmin, user } = useAuth();
  const { blogPageEnabled, loading: settingsLoading } = useSiteSettings();
  const [blogs, setBlogs] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [filter, setFilter] = useState('cover');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [imageBroken, setImageBroken] = useState(false);

  const load = async () => {
    const items = await fetchBlogs();
    setBlogs(items);
    try {
      const adminList = await fetchAdmins();
      setAdmins(adminList);
    } catch (err) {
      setAdmins([]);
      throw err;
    }
  };

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const active = useMemo(() => blogs.filter((item) => item.status !== 'deleted'), [blogs]);
  const deleted = useMemo(() => blogs.filter((item) => item.status === 'deleted'), [blogs]);

  const visible = useMemo(() => {
    if (filter === 'deleted') return deleted;
    if (filter === 'pending') return active.filter((item) => item.approvalStatus === 'pending');
    if (filter === 'declined') return active.filter((item) => item.approvalStatus === 'declined');
    return active.filter((item) => (item.placement || 'index') === filter);
  }, [active, deleted, filter]);

  const counts = useMemo(
    () => ({
      cover: active.filter((item) => item.placement === 'cover').length,
      features: active.filter((item) => item.placement === 'features').length,
      index: active.filter((item) => item.placement === 'index').length,
      pending: active.filter((item) => item.approvalStatus === 'pending').length,
      declined: active.filter((item) => item.approvalStatus === 'declined').length,
      deleted: deleted.length,
    }),
    [active, deleted]
  );

  const currentSection = SECTIONS.find((item) => item.id === filter);
  const defaultApproverId = String(admins[0]?.userId || '');

  const openNew = () => {
    const placement = SECTIONS.some((item) => item.id === filter) ? filter : 'index';
    setEditing('new');
    setForm({ ...EMPTY_FORM, placement });
    setSlugTouched(false);
    setError('');
    setNotice('');
  };

  const openEdit = (blog) => {
    setEditing(blog.id);
    setForm(formFromBlog(blog));
    setSlugTouched(true);
    setImageBroken(false);
    setError('');
    setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeForm = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSlugTouched(false);
  };

  const setField = (key, value) => {
    if (key === 'imageUrl') setImageBroken(false);
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'title' && !slugTouched) next.slug = slugify(value);
      return next;
    });
  };

  const requestSave = (event) => {
    event.preventDefault();
    if (isAdmin) {
      setConfirm({
        type: editing === 'new' ? 'add' : 'save',
        blog: {
          id: editing === 'new' ? 'new' : editing,
          title: form.title,
          excerpt: form.excerpt,
          placement: form.placement,
        },
      });
      return;
    }
    if (!admins.length) {
      setError('No admins are available to approve this change.');
      return;
    }
    setConfirm({
      type: 'submit',
      action: editing === 'new' ? 'create' : 'update',
      blog: {
        id: editing === 'new' ? 'new' : editing,
        title: form.title,
        excerpt: form.excerpt,
        placement: form.placement,
      },
      approverId: defaultApproverId,
    });
  };

  const persistForm = async () => {
    const payload = {
      ...form,
      featured: form.placement === 'cover',
      publishedAt: form.publishedAt || undefined,
      readTime: form.readTime || undefined,
      published: form.published,
    };
    if (editing === 'new') {
      await createBlog(payload);
      setNotice(`Blog added to ${sectionLabel(form.placement)}.`);
    } else {
      await updateBlog(editing, payload);
      setNotice('Blog updated.');
    }
    await load();
    closeForm();
  };

  const persistSubmit = async (nextConfirm) => {
    const approverId = Number(nextConfirm.approverId);
    if (nextConfirm.type === 'submit-delete') {
      await submitBlogChange({
        action: 'delete',
        blogId: nextConfirm.blog.id,
        approverId,
      });
      setNotice(`Delete request sent to ${adminName(approverId)}.`);
      await load();
      return;
    }
    if (nextConfirm.type === 'submit-move') {
      await submitBlogChange({
        action: 'move',
        blogId: nextConfirm.blog.id,
        approverId,
        payload: { placement: nextConfirm.placement },
      });
      setNotice(`Move request sent to ${adminName(approverId)}.`);
      await load();
      return;
    }
    const payload = {
      ...form,
      featured: form.placement === 'cover',
      publishedAt: form.publishedAt || undefined,
      readTime: form.readTime || undefined,
    };
    await submitBlogChange({
      action: nextConfirm.action,
      blogId: nextConfirm.action === 'create' ? undefined : editing,
      approverId,
      payload,
    });
    setNotice(`Sent to ${adminName(approverId)} for approval.`);
    await load();
    closeForm();
  };

  const adminName = (id) => {
    const match = admins.find((item) => String(item.userId) === String(id));
    return match?.name || 'the selected admin';
  };

  const confirmBusy = Boolean(confirm && busy === confirmBusyKey(confirm));
  const copy = confirm ? confirmCopy(confirm) : null;

  const closeConfirm = () => {
    if (confirmBusy) return;
    setConfirm(null);
  };

  const runConfirm = async () => {
    if (!confirm) return;
    if (needsAdminPicker(confirm.type) && !confirm.approverId) {
      setError('Please select an admin.');
      return;
    }
    if (confirm.type === 'decline' && String(confirm.message || '').trim().length < 3) {
      setError('Please add a decline message.');
      return;
    }
    const { type, blog, placement, direction } = confirm;
    setBusy(confirmBusyKey(confirm));
    setError('');
    setNotice('');
    try {
      if (type === 'submit' || type === 'submit-delete' || type === 'submit-move') {
        await persistSubmit(confirm);
      } else if (type === 'add' || type === 'save') {
        await persistForm();
      } else if (type === 'approve' || type === 'decline') {
        await reviewBlog(blog.id, {
          status: type === 'approve' ? 'approved' : 'declined',
          message: confirm.message || '',
        });
        setNotice(type === 'approve' ? 'Request approved.' : 'Request declined.');
        await load();
      } else if (type === 'move') {
        const items = await placeBlog(blog.id, placement);
        setBlogs(items);
        setNotice(`Moved to ${sectionLabel(placement)}.`);
      } else if (type === 'shift') {
        const items = await reorderBlog(blog.id, direction);
        setBlogs(items);
        setNotice(direction === 'up' ? 'Moved up in this section.' : 'Moved down in this section.');
      } else {
        await deleteBlog(blog.id);
        setNotice('Blog marked deleted. It stays in the database.');
        if (editing === blog.id) closeForm();
        await load();
      }
      setConfirm(null);
    } catch (err) {
      setError(err.message);
      setConfirm(null);
    } finally {
      setBusy('');
    }
  };

  const restore = async (blog) => {
    setBusy(blog.id + 'restore');
    setError('');
    setNotice('');
    try {
      await updateBlog(blog.id, { status: 'active', published: true, placement: 'index' });
      setNotice('Blog restored to The index. Move it if you want it in Cover story or Field notes.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const openUserRequest = (type, blog, extra = {}) => {
    if (!admins.length) {
      setError('No admins are available to approve this change.');
      return;
    }
    setConfirm({
      type,
      blog,
      approverId: String(blog.approverId || defaultApproverId),
      ...extra,
    });
  };

  if (isAdmin && !settingsLoading && !blogPageEnabled) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl3 p-5 md:p-6 shadow-card border border-myland-mist/80">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <p className="text-sm text-myland-slate max-w-2xl">
            {isAdmin
              ? 'Admins only approve or decline staff requests. Content design, additions, moves, and deletions are done by staff and then sent here for a decision.'
              : 'Design, add, and request deletions here. Those changes stay off the public Blog page until you send them to an admin for approval. You will see the status as approved, pending, or declined.'}
          </p>
          {!isAdmin && editing == null && filter !== 'deleted' && (
            <button type="button" onClick={openNew} className="btn-primary !py-2.5 !px-4 !text-xs shrink-0">
              <HiOutlinePlus className="text-base" /> Add blog
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-5">
          {SECTIONS.map((item) => (
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
          <button
            type="button"
            onClick={() => setFilter('pending')}
            className={`rounded-full px-4 py-2 text-xs font-display font-semibold transition-colors ${
              filter === 'pending'
                ? 'bg-myland-red text-white'
                : 'bg-myland-cream text-myland-slate hover:text-myland-ink'
            }`}
          >
            Pending ({counts.pending})
          </button>
          <button
            type="button"
            onClick={() => setFilter('declined')}
            className={`rounded-full px-4 py-2 text-xs font-display font-semibold transition-colors ${
              filter === 'declined'
                ? 'bg-myland-red text-white'
                : 'bg-myland-cream text-myland-slate hover:text-myland-ink'
            }`}
          >
            Declined ({counts.declined})
          </button>
          <button
            type="button"
            onClick={() => setFilter('deleted')}
            className={`rounded-full px-4 py-2 text-xs font-display font-semibold transition-colors ${
              filter === 'deleted'
                ? 'bg-myland-red text-white'
                : 'bg-myland-cream text-myland-slate hover:text-myland-ink'
            }`}
          >
            Deleted ({counts.deleted})
          </button>
        </div>
        {currentSection && (
          <p className="text-xs text-myland-slate mt-4">{currentSection.hint}</p>
        )}
      </div>

      {error && <p className="text-myland-red text-sm">{error}</p>}
      {notice && <p className="text-emerald-700 text-sm">{notice}</p>}

      {editing != null && !isAdmin && (
        <form
          onSubmit={requestSave}
          className="bg-white rounded-xl3 p-5 md:p-6 shadow-card border border-myland-mist/80 space-y-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display font-semibold text-lg text-myland-ink">
                {editing === 'new' ? 'Add blog' : 'Edit blog'}
              </h2>
              <p className="text-sm text-myland-slate mt-1">
                {isAdmin
                  ? 'Choose which section of the public Blog page this post belongs to.'
                  : 'Design the post, then send it to an admin. The public page will not update until they approve it.'}
              </p>
            </div>
            <button
              type="button"
              onClick={closeForm}
              className="w-9 h-9 rounded-full border border-myland-mist flex items-center justify-center text-myland-slate hover:text-myland-ink"
              aria-label="Close form"
            >
              <HiX />
            </button>
          </div>

          <div>
            <p className="text-xs font-display font-semibold text-myland-ink mb-2">Blog section</p>
            <div className="flex flex-wrap gap-2">
              {SECTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setField('placement', item.id)}
                  className={`rounded-full px-4 py-2 text-xs font-display font-semibold ${
                    form.placement === item.id
                      ? 'bg-myland-ink text-white'
                      : 'bg-myland-cream text-myland-slate'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Field label="Title">
              <input
                className={inputClass}
                value={form.title}
                onChange={(e) => setField('title', e.target.value)}
                placeholder="Finding your slice of paradise"
                required
              />
            </Field>
            <Field label="URL slug">
              <input
                className={inputClass}
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setField('slug', slugify(e.target.value));
                }}
                placeholder="slice-of-paradise"
              />
            </Field>
            <Field label="Topic">
              <select
                className={inputClass}
                value={TOPICS.includes(form.topic) ? form.topic : '__custom'}
                onChange={(e) => {
                  if (e.target.value === '__custom') setField('topic', '');
                  else setField('topic', e.target.value);
                }}
              >
                {TOPICS.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
                <option value="__custom">Custom topic…</option>
              </select>
            </Field>
            {!TOPICS.includes(form.topic) && (
              <Field label="Custom topic">
                <input
                  className={inputClass}
                  value={form.topic}
                  onChange={(e) => setField('topic', e.target.value)}
                  placeholder="Journal"
                />
              </Field>
            )}
            <Field label="Read time">
              <input
                className={inputClass}
                value={form.readTime}
                onChange={(e) => setField('readTime', e.target.value)}
                placeholder="3 min read (auto if blank)"
              />
            </Field>
            <Field label="Publish date">
              <input
                type="date"
                className={inputClass}
                value={form.publishedAt}
                onChange={(e) => setField('publishedAt', e.target.value)}
              />
            </Field>
          </div>

          <Field label="Cover image URL">
            <input
              className={inputClass}
              value={form.imageUrl}
              onChange={(e) => setField('imageUrl', e.target.value)}
              placeholder="https://images.unsplash.com/photo-..."
              required={editing === 'new'}
            />
            <p className="text-xs text-myland-slate mt-2">
              Use a direct image file URL (usually starts with{' '}
              <span className="font-semibold text-myland-ink">images.unsplash.com</span> or ends in
              .jpg / .png / .webp). A photo page like unsplash.com/photos/... is a webpage, so the
              thumbnail will stay broken.
            </p>
          </Field>
          {form.imageUrl && (
            <div className="h-40 rounded-xl2 overflow-hidden bg-myland-cream relative">
              {imageBroken ? (
                <div className="absolute inset-0 flex items-center justify-center px-4 text-center">
                  <p className="text-sm text-myland-red">
                    This URL is not a usable image file. Right-click the photo → Copy image
                    address, or paste a link from images.unsplash.com.
                  </p>
                </div>
              ) : (
                <WarmImage
                  src={form.imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={() => setImageBroken(true)}
                />
              )}
            </div>
          )}

          <Field label="Excerpt">
            <textarea
              className={`${inputClass} min-h-[88px] resize-y`}
              value={form.excerpt}
              onChange={(e) => setField('excerpt', e.target.value)}
              placeholder="Short summary shown on the blog listing."
              required
            />
          </Field>
          <Field label="Article body">
            <textarea
              className={`${inputClass} min-h-[180px] resize-y`}
              value={form.body}
              onChange={(e) => setField('body', e.target.value)}
              placeholder="Full article. Separate paragraphs with a blank line."
            />
          </Field>

          <div>
            <p className="text-xs font-display font-semibold text-myland-ink mb-2">Listing layout</p>
            <div className="flex flex-wrap gap-2">
              {LAYOUTS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setField('layout', item.id)}
                  className={`rounded-full px-4 py-2 text-xs font-display font-semibold ${
                    form.layout === item.id
                      ? 'bg-myland-ink text-white'
                      : 'bg-myland-cream text-myland-slate'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {isAdmin ? (
            <label className="inline-flex items-center gap-2 text-sm text-myland-ink">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setField('published', e.target.checked)}
              />
              Published on the public site
            </label>
          ) : (
            <p className="text-sm text-myland-slate">
              This post will stay pending until the admin you select approves it.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy === 'save'} className="btn-primary !py-2.5 !px-5 !text-xs">
              {busy === 'save'
                ? 'Saving…'
                : isAdmin
                  ? editing === 'new'
                    ? 'Add blog'
                    : 'Save changes'
                  : 'Send to approval'}
            </button>
            <button type="button" onClick={closeForm} className="btn-ghost !py-2.5 !px-5 !text-xs">
              Cancel
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-4">
        {visible.map((blog) => {
          const badge = approvalBadge(blog);
          const proposedPlacement = blog.pendingPayload?.placement;
          return (
            <li
              key={blog.id}
              className="bg-white rounded-xl3 p-4 md:p-5 shadow-card border border-myland-mist/80"
            >
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-44 h-32 rounded-xl2 overflow-hidden bg-myland-cream shrink-0">
                  <WarmImage src={blog.image} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {blog.placement === 'cover' && blog.status !== 'deleted' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-display font-semibold uppercase tracking-wide rounded-full px-2.5 py-1 bg-myland-gold/15 text-myland-gold">
                        <HiStar /> Cover story
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-display font-semibold uppercase tracking-wide rounded-full px-2.5 py-1 ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    {blog.pendingAction && blog.pendingAction !== 'none' && blog.approvalStatus !== 'approved' && (
                      <span className="text-[10px] font-display font-semibold uppercase tracking-wide rounded-full px-2.5 py-1 bg-myland-cream text-myland-slate">
                        {pendingActionLabel(blog.pendingAction)}
                      </span>
                    )}
                    <span className="text-[10px] font-display font-semibold uppercase tracking-wide text-myland-red">
                      {blog.topic}
                    </span>
                    <span className="text-xs text-myland-slate">{blog.date}</span>
                  </div>
                  <h2 className="font-display font-semibold text-myland-ink">
                    {blog.pendingPayload?.title || blog.title}
                  </h2>
                  <p className="text-sm text-myland-slate mt-1 line-clamp-2">
                    {blog.pendingPayload?.excerpt || blog.excerpt}
                  </p>
                  <p className="text-xs text-myland-slate mt-2">
                    {sectionLabel(blog.placement)}
                    {proposedPlacement && proposedPlacement !== blog.placement
                      ? ` → ${sectionLabel(proposedPlacement)}`
                      : ''}{' '}
                    · {blog.readTime} · /blog/{blog.slug}
                  </p>
                  {(blog.approverName || blog.requestedByName || blog.approvalMessage) && (
                    <div className="mt-3 rounded-2xl bg-myland-cream px-4 py-3 text-xs text-myland-slate space-y-1">
                      {blog.requestedByName && (
                        <p>
                          Requested by{' '}
                          <span className="font-semibold text-myland-ink">{blog.requestedByName}</span>
                        </p>
                      )}
                      {blog.approverName && (
                        <p>
                          Sent to{' '}
                          <span className="font-semibold text-myland-ink">{blog.approverName}</span>
                          {String(blog.approverId) === String(user?.userId) ? ' (you)' : ''}
                        </p>
                      )}
                      {blog.approvalMessage && (
                        <p>
                          Admin message:{' '}
                          <span className="text-myland-ink">{blog.approvalMessage}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex md:flex-col flex-wrap gap-2 shrink-0">
                  {isAdmin && blog.status !== 'deleted' && blog.approvalStatus === 'pending' && (
                    <>
                      <button
                        type="button"
                        disabled={busy.startsWith(blog.id)}
                        onClick={() => setConfirm({ type: 'approve', blog, message: '' })}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 text-white font-display font-semibold text-xs px-3 py-2 hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <HiStar /> Approve
                      </button>
                      <button
                        type="button"
                        disabled={busy.startsWith(blog.id)}
                        onClick={() => setConfirm({ type: 'decline', blog, message: '' })}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-myland-mist bg-white text-myland-red font-display font-semibold text-xs px-3 py-2 hover:border-myland-red disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </>
                  )}
                  {!isAdmin && blog.status !== 'deleted' && (
                    <>
                      {SECTIONS.filter((item) => item.id !== blog.placement).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          disabled={busy.startsWith(blog.id) || blog.approvalStatus === 'pending'}
                          onClick={() =>
                            openUserRequest('submit-move', blog, { placement: item.id })
                          }
                          className="inline-flex items-center justify-center rounded-full border border-myland-mist bg-white text-myland-ink font-display font-semibold text-xs px-3 py-2 hover:border-myland-ink/30 disabled:opacity-50"
                        >
                          Request {item.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => openEdit(blog)}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-myland-ink text-white font-display font-semibold text-xs px-3 py-2"
                      >
                        <HiOutlinePencil /> Edit
                      </button>
                      <button
                        type="button"
                        disabled={busy.startsWith(blog.id) || blog.approvalStatus === 'pending'}
                        onClick={() => openUserRequest('submit-delete', blog)}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-myland-mist bg-white text-myland-red font-display font-semibold text-xs px-3 py-2 hover:border-myland-red disabled:opacity-50"
                      >
                        <HiOutlineTrash /> Request delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {!loading && visible.length === 0 && (
        <div className="bg-white rounded-xl3 p-10 text-center shadow-card border border-myland-mist/80">
          <HiOutlineStar className="text-3xl text-myland-gold mx-auto mb-3" />
          <p className="font-display font-semibold text-myland-ink">No blogs in this view</p>
          <p className="text-sm text-myland-slate mt-2">
            {filter === 'deleted'
              ? 'Deleted posts stay in the database and appear here.'
              : filter === 'pending'
                ? 'When staff send a change to an admin, it appears here until it is approved or declined.'
                : filter === 'declined'
                  ? 'Declined requests appear here with the admin message.'
                  : 'Add a post or move one into this section.'}
          </p>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-myland-ink/40"
            aria-label="Cancel"
            onClick={closeConfirm}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="blog-confirm-title"
            className="relative w-full max-w-md bg-white rounded-xl3 p-6 shadow-card"
          >
            <button
              type="button"
              onClick={closeConfirm}
              className="absolute top-4 right-4 w-8 h-8 rounded-full border border-myland-mist flex items-center justify-center text-myland-slate"
              aria-label="Cancel"
            >
              <HiX />
            </button>
            <h3 id="blog-confirm-title" className="font-display font-semibold text-lg text-myland-ink pr-8">
              {copy.title}
            </h3>
            <p className="text-sm text-myland-slate mt-2">{copy.body}</p>
            <div className="mt-4 rounded-2xl bg-myland-cream px-4 py-3">
              <p className="font-display font-semibold text-sm text-myland-ink">{confirm.blog.title}</p>
              <p className="text-xs text-myland-red mt-0.5">
                {sectionLabel(confirm.blog.placement)}
                {confirm.type === 'move' || confirm.type === 'submit-move'
                  ? ` → ${sectionLabel(confirm.placement)}`
                  : ''}
                {confirm.type === 'shift' ? (confirm.direction === 'up' ? ' · move up' : ' · move down') : ''}
              </p>
              <p className="text-sm text-myland-slate mt-2 line-clamp-3">{confirm.blog.excerpt}</p>
            </div>
            {needsAdminPicker(confirm.type) && (
              <label className="block mt-4">
                <span className="block text-xs font-display font-semibold text-myland-ink mb-2">
                  Send to admin
                </span>
                <select
                  className={inputClass}
                  value={confirm.approverId || ''}
                  onChange={(e) =>
                    setConfirm((current) => ({ ...current, approverId: e.target.value }))
                  }
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
                  onChange={(e) =>
                    setConfirm((current) => ({ ...current, message: e.target.value }))
                  }
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
                  confirmBusy ||
                  (needsAdminPicker(confirm.type) && !confirm.approverId) ||
                  (confirm.type === 'decline' && String(confirm.message || '').trim().length < 3)
                }
                onClick={runConfirm}
                className={copy.actionClass}
              >
                {confirmBusy ? 'Working…' : copy.action}
              </button>
              <button
                type="button"
                disabled={confirmBusy}
                onClick={closeConfirm}
                className="btn-ghost !py-2.5 !px-5 !text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-display font-semibold text-myland-ink tracking-wide mb-2">
        {label}
      </span>
      {children}
    </label>
  );
}
