import { useEffect, useMemo, useState } from 'react';
import {
  HiArrowDown,
  HiArrowUp,
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
  updateBlog,
} from '../api/blogs.js';

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
  return {
    title: blog.title || '',
    slug: blog.slug || '',
    topic: blog.topic || 'Journal',
    excerpt: blog.excerpt || '',
    body: blog.body || '',
    imageUrl: blog.imageUrl || blog.image || '',
    readTime: blog.readTime || '',
    layout: blog.layout || 'auto',
    published: blog.published !== false,
    publishedAt: toDateInput(blog.publishedAt),
    placement: blog.placement || 'index',
  };
}

function sectionLabel(id) {
  return SECTIONS.find((item) => item.id === id)?.label || id;
}

export default function BlogListing() {
  const [blogs, setBlogs] = useState([]);
  const [filter, setFilter] = useState('cover');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    const items = await fetchBlogs();
    setBlogs(items);
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
    return active.filter((item) => (item.placement || 'index') === filter);
  }, [active, deleted, filter]);

  const counts = useMemo(
    () => ({
      cover: active.filter((item) => item.placement === 'cover').length,
      features: active.filter((item) => item.placement === 'features').length,
      index: active.filter((item) => item.placement === 'index').length,
      deleted: deleted.length,
    }),
    [active, deleted]
  );

  const currentSection = SECTIONS.find((item) => item.id === filter);

  const openNew = () => {
    const placement = filter === 'deleted' ? 'index' : filter;
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
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'title' && !slugTouched) next.slug = slugify(value);
      return next;
    });
  };

  const save = async (event) => {
    event.preventDefault();
    setBusy('save');
    setError('');
    setNotice('');
    const payload = {
      ...form,
      featured: form.placement === 'cover',
      publishedAt: form.publishedAt || undefined,
      readTime: form.readTime || undefined,
    };
    try {
      if (editing === 'new') {
        await createBlog(payload);
        setNotice(`Blog added to ${sectionLabel(form.placement)}.`);
      } else {
        await updateBlog(editing, payload);
        setNotice('Blog updated.');
      }
      await load();
      closeForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const moveTo = async (id, placement) => {
    setBusy(id + placement);
    setError('');
    setNotice('');
    try {
      const items = await placeBlog(id, placement);
      setBlogs(items);
      setNotice(`Moved to ${sectionLabel(placement)}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const runDelete = async () => {
    if (!confirm) return;
    const blog = confirm;
    setBusy(blog.id + 'delete');
    setError('');
    setNotice('');
    try {
      await deleteBlog(blog.id);
      setNotice('Blog marked deleted. It stays in the database.');
      setConfirm(null);
      if (editing === blog.id) closeForm();
      await load();
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

  const shift = async (id, direction) => {
    setBusy(id + direction);
    setError('');
    try {
      const items = await reorderBlog(id, direction);
      setBlogs(items);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl3 p-5 md:p-6 shadow-card border border-myland-mist/80">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <p className="text-sm text-myland-slate max-w-2xl">
            These three sections match the public Blog page: Cover story (hero), Field notes (two
            large cards), and The index (the numbered list). Move a post between sections, edit it,
            or mark it deleted — the row stays in the database.
          </p>
          {editing == null && filter !== 'deleted' && (
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

      {editing != null && (
        <form
          onSubmit={save}
          className="bg-white rounded-xl3 p-5 md:p-6 shadow-card border border-myland-mist/80 space-y-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display font-semibold text-lg text-myland-ink">
                {editing === 'new' ? 'Add blog' : 'Edit blog'}
              </h2>
              <p className="text-sm text-myland-slate mt-1">
                Choose which section of the public Blog page this post belongs to.
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
              placeholder="https://images.unsplash.com/..."
              required={editing === 'new'}
            />
          </Field>
          {form.imageUrl && (
            <div className="h-40 rounded-xl2 overflow-hidden bg-myland-cream">
              <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
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

          <label className="inline-flex items-center gap-2 text-sm text-myland-ink">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setField('published', e.target.checked)}
            />
            Published on the public site
          </label>

          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy === 'save'} className="btn-primary !py-2.5 !px-5 !text-xs">
              {busy === 'save' ? 'Saving…' : editing === 'new' ? 'Add blog' : 'Save changes'}
            </button>
            <button type="button" onClick={closeForm} className="btn-ghost !py-2.5 !px-5 !text-xs">
              Cancel
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-4">
        {visible.map((blog, index) => (
          <li
            key={blog.id}
            className="bg-white rounded-xl3 p-4 md:p-5 shadow-card border border-myland-mist/80"
          >
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-44 h-32 rounded-xl2 overflow-hidden bg-myland-cream shrink-0">
                <img src={blog.image} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {blog.placement === 'cover' && blog.status !== 'deleted' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-display font-semibold uppercase tracking-wide rounded-full px-2.5 py-1 bg-myland-gold/15 text-myland-gold">
                      <HiStar /> Cover story
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-display font-semibold uppercase tracking-wide rounded-full px-2.5 py-1 ${
                      blog.status === 'deleted'
                        ? 'bg-myland-mist text-myland-slate'
                        : blog.published
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {blog.status === 'deleted' ? 'Deleted' : blog.published ? 'Published' : 'Draft'}
                  </span>
                  <span className="text-[10px] font-display font-semibold uppercase tracking-wide text-myland-red">
                    {blog.topic}
                  </span>
                  <span className="text-xs text-myland-slate">{blog.date}</span>
                </div>
                <h2 className="font-display font-semibold text-myland-ink">{blog.title}</h2>
                <p className="text-sm text-myland-slate mt-1 line-clamp-2">{blog.excerpt}</p>
                <p className="text-xs text-myland-slate mt-2">
                  {sectionLabel(blog.placement)} · {blog.readTime} · /blog/{blog.slug}
                </p>
              </div>
              <div className="flex md:flex-col flex-wrap gap-2 shrink-0">
                {blog.status !== 'deleted' && (
                  <>
                    <button
                      type="button"
                      disabled={busy.startsWith(blog.id) || index === 0}
                      onClick={() => shift(blog.id, 'up')}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-myland-mist bg-white text-myland-ink font-display font-semibold text-xs px-3 py-2 hover:border-myland-ink/30 disabled:opacity-40"
                    >
                      <HiArrowUp /> Up
                    </button>
                    <button
                      type="button"
                      disabled={busy.startsWith(blog.id) || index === visible.length - 1}
                      onClick={() => shift(blog.id, 'down')}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-myland-mist bg-white text-myland-ink font-display font-semibold text-xs px-3 py-2 hover:border-myland-ink/30 disabled:opacity-40"
                    >
                      <HiArrowDown /> Down
                    </button>
                    {SECTIONS.filter((item) => item.id !== blog.placement).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        disabled={busy.startsWith(blog.id)}
                        onClick={() => moveTo(blog.id, item.id)}
                        className="inline-flex items-center justify-center rounded-full border border-myland-mist bg-white text-myland-ink font-display font-semibold text-xs px-3 py-2 hover:border-myland-ink/30 disabled:opacity-50"
                      >
                        Move to {item.label}
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
                      disabled={busy.startsWith(blog.id)}
                      onClick={() => setConfirm(blog)}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-myland-mist bg-white text-myland-red font-display font-semibold text-xs px-3 py-2 hover:border-myland-red disabled:opacity-50"
                    >
                      <HiOutlineTrash /> Delete
                    </button>
                  </>
                )}
                {blog.status === 'deleted' && (
                  <button
                    type="button"
                    disabled={busy.startsWith(blog.id)}
                    onClick={() => restore(blog)}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 text-white font-display font-semibold text-xs px-3 py-2 disabled:opacity-50"
                  >
                    Restore
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {!loading && visible.length === 0 && (
        <div className="bg-white rounded-xl3 p-10 text-center shadow-card border border-myland-mist/80">
          <HiOutlineStar className="text-3xl text-myland-gold mx-auto mb-3" />
          <p className="font-display font-semibold text-myland-ink">No blogs in this view</p>
          <p className="text-sm text-myland-slate mt-2">
            {filter === 'deleted'
              ? 'Deleted posts stay in the database and appear here.'
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
            onClick={() => !busy.startsWith(confirm.id) && setConfirm(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="blog-delete-title"
            className="relative w-full max-w-md bg-white rounded-xl3 p-6 shadow-card"
          >
            <button
              type="button"
              onClick={() => !busy.startsWith(confirm.id) && setConfirm(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full border border-myland-mist flex items-center justify-center text-myland-slate"
              aria-label="Cancel"
            >
              <HiX />
            </button>
            <h3 id="blog-delete-title" className="font-display font-semibold text-lg text-myland-ink pr-8">
              Delete this blog?
            </h3>
            <p className="text-sm text-myland-slate mt-2">
              The row stays in the database with status deleted. It is hidden from the public Blog
              page. You can still see it under Deleted.
            </p>
            <div className="mt-4 rounded-2xl bg-myland-cream px-4 py-3">
              <p className="font-display font-semibold text-sm text-myland-ink">{confirm.title}</p>
              <p className="text-xs text-myland-red mt-0.5">{sectionLabel(confirm.placement)}</p>
              <p className="text-sm text-myland-slate mt-2 line-clamp-3">{confirm.excerpt}</p>
            </div>
            <div className="flex flex-wrap gap-2 mt-5">
              <button
                type="button"
                disabled={busy.startsWith(confirm.id)}
                onClick={runDelete}
                className="inline-flex items-center justify-center rounded-full bg-myland-red text-white font-display font-semibold text-xs px-5 py-2.5 hover:bg-myland-redDark disabled:opacity-50"
              >
                {busy.startsWith(confirm.id) ? 'Working…' : 'Yes, delete'}
              </button>
              <button
                type="button"
                disabled={busy.startsWith(confirm.id)}
                onClick={() => setConfirm(null)}
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
