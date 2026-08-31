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
import { createBlog, deleteBlog, fetchBlogs, reorderBlog, updateBlog } from '../api/blogs.js';

const TOPICS = ['Site visits', 'Titles', 'Districts', 'Loans', 'Investment', 'Journal', 'Guides'];
const LAYOUTS = [
  { id: 'auto', label: 'Auto' },
  { id: 'image-left', label: 'Image left' },
  { id: 'image-right', label: 'Image right' },
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
  featured: false,
  published: true,
  publishedAt: '',
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
    featured: Boolean(blog.featured),
    published: blog.published !== false,
    publishedAt: toDateInput(blog.publishedAt),
  };
}

export default function BlogListing() {
  const [blogs, setBlogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const items = await fetchBlogs();
    setBlogs(items);
  };

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    if (filter === 'published') return blogs.filter((item) => item.published);
    if (filter === 'drafts') return blogs.filter((item) => !item.published);
    if (filter === 'featured') return blogs.filter((item) => item.featured);
    return blogs;
  }, [blogs, filter]);

  const counts = useMemo(
    () => ({
      all: blogs.length,
      published: blogs.filter((item) => item.published).length,
      drafts: blogs.filter((item) => !item.published).length,
      featured: blogs.filter((item) => item.featured).length,
    }),
    [blogs]
  );

  const openNew = () => {
    setEditing('new');
    setForm(EMPTY_FORM);
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
      publishedAt: form.publishedAt || undefined,
      readTime: form.readTime || undefined,
    };
    try {
      if (editing === 'new') {
        await createBlog(payload);
        setNotice('Blog published to the top of the client journal.');
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

  const act = async (id, action) => {
    setBusy(id + action);
    setError('');
    setNotice('');
    try {
      if (action === 'delete') {
        if (!window.confirm('Delete this blog post? It will disappear from the public site.')) return;
        await deleteBlog(id);
        setNotice('Blog deleted.');
        if (editing === id) closeForm();
        await load();
      } else if (action === 'up' || action === 'down') {
        const items = await reorderBlog(id, action);
        setBlogs(items);
      }
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
            New posts go to the top of the public Blog page. Mark one as the cover story, then edit
            copy, image, layout, and order for the rest of the journal.
          </p>
          {editing == null && (
            <button type="button" onClick={openNew} className="btn-primary !py-2.5 !px-4 !text-xs shrink-0">
              <HiOutlinePlus className="text-base" /> Add blog
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-5">
          {[
            { id: 'all', label: 'All' },
            { id: 'published', label: 'Published' },
            { id: 'drafts', label: 'Drafts' },
            { id: 'featured', label: 'Cover story' },
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
              {item.label} ({counts[item.id]})
            </button>
          ))}
        </div>
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
                Title, excerpt, and body appear on the client journal. Layout controls the large
                field-note cards.
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

          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-myland-ink">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setField('featured', e.target.checked)}
              />
              Cover story (top of client blog)
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-myland-ink">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setField('published', e.target.checked)}
              />
              Published on the public site
            </label>
          </div>

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
                  {blog.featured && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-display font-semibold uppercase tracking-wide rounded-full px-2.5 py-1 bg-myland-gold/15 text-myland-gold">
                      <HiStar /> Cover
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-display font-semibold uppercase tracking-wide rounded-full px-2.5 py-1 ${
                      blog.published ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {blog.published ? 'Published' : 'Draft'}
                  </span>
                  <span className="text-[10px] font-display font-semibold uppercase tracking-wide text-myland-red">
                    {blog.topic}
                  </span>
                  <span className="text-xs text-myland-slate">{blog.date}</span>
                </div>
                <h2 className="font-display font-semibold text-myland-ink">{blog.title}</h2>
                <p className="text-sm text-myland-slate mt-1 line-clamp-2">{blog.excerpt}</p>
                <p className="text-xs text-myland-slate mt-2">
                  Layout: {blog.layout} · {blog.readTime} · /blog/{blog.slug}
                </p>
              </div>
              <div className="flex md:flex-col flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  disabled={filter !== 'all' || busy.startsWith(blog.id) || index === 0}
                  onClick={() => act(blog.id, 'up')}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-myland-mist bg-white text-myland-ink font-display font-semibold text-xs px-3 py-2 hover:border-myland-ink/30 disabled:opacity-40"
                >
                  <HiArrowUp /> Up
                </button>
                <button
                  type="button"
                  disabled={filter !== 'all' || busy.startsWith(blog.id) || index === visible.length - 1}
                  onClick={() => act(blog.id, 'down')}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-myland-mist bg-white text-myland-ink font-display font-semibold text-xs px-3 py-2 hover:border-myland-ink/30 disabled:opacity-40"
                >
                  <HiArrowDown /> Down
                </button>
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
                  onClick={() => act(blog.id, 'delete')}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-myland-mist bg-white text-myland-red font-display font-semibold text-xs px-3 py-2 hover:border-myland-red disabled:opacity-50"
                >
                  <HiOutlineTrash /> Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {!loading && visible.length === 0 && (
        <div className="bg-white rounded-xl3 p-10 text-center shadow-card border border-myland-mist/80">
          <HiOutlineStar className="text-3xl text-myland-gold mx-auto mb-3" />
          <p className="font-display font-semibold text-myland-ink">No blogs in this view</p>
          <p className="text-sm text-myland-slate mt-2">Add a post to show it on the public Blog page.</p>
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
