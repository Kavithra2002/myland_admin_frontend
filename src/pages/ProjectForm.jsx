import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  HiArrowLeft,
  HiOutlinePhotograph,
  HiOutlinePlus,
  HiOutlineTrash,
  HiX,
} from 'react-icons/hi';
import {
  fetchProject,
  submitProjectChange,
  uploadProjectMedia,
} from '../api/projects.js';
import { fetchAdmins } from '../api/users.js';
import { useAuth } from '../context/AuthContext.jsx';
import WarmImage from '../components/WarmImage.jsx';
import {
  formatDisplayPrice,
  isDirectVideo,
  mapEmbedUrl,
  mediaSrc,
  priceUnitFromText,
} from '../utils/projectMedia.js';

const DISTRICTS = ['Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Galle', 'Matara', 'Kurunegala'];
const PROPERTY_TYPES = ['Land', 'House', 'Commercial', 'Mixed-use'];
const MAP_PLACES = [
  'Balummahara, Gampaha, Sri Lanka',
  'Divulapitiya, Gampaha, Sri Lanka',
  'Kirindivela, Gampaha, Sri Lanka',
  'Meerigama, Gampaha, Sri Lanka',
  'Dompe, Gampaha, Sri Lanka',
  'Kiribathgoda, Gampaha, Sri Lanka',
  'Kadawatha, Gampaha, Sri Lanka',
];

const inputClass =
  'w-full bg-myland-cream border border-transparent rounded-xl px-4 py-3 text-sm text-myland-ink placeholder:text-myland-slate/50 outline-none focus:bg-white focus:border-myland-gold/50';

const EMPTY = {
  title: '',
  slug: '',
  location: '',
  district: 'Gampaha',
  listingType: 'Residential Lands',
  country: 'Sri Lanka',
  propertyType: 'Land',
  phase: 'Ongoing',
  status: 'For Sale',
  hotOffer: false,
  price: '',
  priceFrom: '',
  priceUnit: 'land',
  landArea: '',
  excerpt: '',
  overview: '',
  description: [''],
  imageUrl: '',
  gallery: [],
  plotPlanUrl: '',
  videoUrl: '',
  mapQuery: '',
  showOnProjects: true,
  published: true,
};

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function districtFromLocation(location) {
  return DISTRICTS.find((item) => String(location).toLowerCase().includes(item.toLowerCase())) || '';
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-display font-semibold uppercase tracking-wide text-myland-slate mb-1.5">
        {label}
      </span>
      {children}
      {hint ? <span className="block text-[11px] text-myland-slate mt-1.5 leading-relaxed">{hint}</span> : null}
    </label>
  );
}

function Pills({ value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-display font-semibold uppercase tracking-[0.14em] transition-colors ${
              selected ? option.activeClass : 'bg-myland-cream text-myland-slate border border-myland-mist'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function MapPlacePicker({ value, onChange }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 3) {
      setResults([]);
      return undefined;
    }
    const handle = window.setTimeout(async () => {
      const local = MAP_PLACES.filter((place) => place.toLowerCase().includes(text.toLowerCase())).slice(0, 5);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=lk&q=${encodeURIComponent(text)}`
        );
        const data = await res.json();
        const remote = (Array.isArray(data) ? data : []).map((item) => item.display_name).filter(Boolean);
        setResults([...new Set([...local, ...remote])].slice(0, 8));
      } catch {
        setResults(local);
      }
    }, 400);
    return () => window.clearTimeout(handle);
  }, [query]);

  const choose = (place) => {
    setQuery(place);
    onChange(place);
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          className={inputClass}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            onChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search a town or paste a place name"
        />
        {open && results.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-myland-mist bg-white shadow-card">
            {results.map((place) => (
              <li key={place}>
                <button
                  type="button"
                  onClick={() => choose(place)}
                  className="w-full text-left px-4 py-2.5 text-sm text-myland-ink hover:bg-myland-cream"
                >
                  {place}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="relative w-full overflow-hidden rounded-xl2 bg-myland-mist min-h-[140px] h-40">
        <iframe
          title="Project map preview"
          src={mapEmbedUrl(query || 'Sri Lanka')}
          className="absolute inset-0 w-full h-full border-0 grayscale-[20%] contrast-[1.05]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
}

function formFromProject(project) {
  const pending =
    project.pendingPayload && (project.pendingAction === 'update' || project.pendingAction === 'create')
      ? project.pendingPayload
      : null;
  const source = pending ? { ...project, ...pending } : project;
  const cover = source.image || source.imageUrl || '';
  const gallery = Array.isArray(source.gallery) ? source.gallery : [];
  return {
    title: source.title || '',
    slug: source.slug || '',
    location: source.location || '',
    district: source.district || 'Gampaha',
    listingType: source.listingType || 'Residential Lands',
    country: source.country || 'Sri Lanka',
    propertyType: source.propertyType || 'Land',
    phase: source.phase || 'Ongoing',
    status: source.status || 'For Sale',
    hotOffer: (source.badges || []).includes('Hot Offer') || Boolean(source.hotOffer),
    price: source.price || '',
    priceFrom: source.priceFrom != null ? String(source.priceFrom) : '',
    priceUnit: priceUnitFromText(source.price),
    landArea: source.landArea || '',
    excerpt: source.excerpt || '',
    overview: source.overview || '',
    description: source.description?.length ? source.description : [''],
    imageUrl: cover,
    gallery: gallery.filter((src) => src && src !== cover),
    plotPlanUrl: source.plotPlan || source.plotPlanUrl || '',
    videoUrl: source.videoUrl || '',
    mapQuery: source.mapQuery || '',
    showOnProjects: source.showOnProjects !== false,
    published: source.published !== false,
  };
}

export default function ProjectForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [mapTouched, setMapTouched] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [admins, setAdmins] = useState([]);
  const [confirm, setConfirm] = useState(false);
  const [approverId, setApproverId] = useState('');

  useEffect(() => {
    fetchAdmins()
      .then((items) => {
        setAdmins(items);
        setApproverId(String(items[0]?.userId || ''));
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!isEdit) return undefined;
    let live = true;
    fetchProject(id)
      .then((project) => {
        if (!live) return;
        setForm(formFromProject(project));
        setSlugTouched(true);
        setMapTouched(Boolean(project.mapQuery));
      })
      .catch((err) => {
        if (live) setError(err.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [id, isEdit]);

  const setField = (key, value) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'title' && !slugTouched) next.slug = slugify(value);
      if (key === 'location') {
        const district = districtFromLocation(value);
        if (district) next.district = district;
        if (!mapTouched) next.mapQuery = value;
      }
      if (key === 'status') next.phase = value === 'Completed' ? 'Completed' : 'Ongoing';
      if (key === 'priceFrom' || key === 'priceUnit') {
        next.price = formatDisplayPrice(next.priceFrom, next.priceUnit);
      }
      return next;
    });
  };

  const payload = useMemo(() => {
    const price = formatDisplayPrice(form.priceFrom, form.priceUnit) || form.price;
    const excerpt = form.excerpt.trim() || form.overview.trim().slice(0, 160);
    return {
      ...form,
      slug: form.slug || slugify(form.title),
      price,
      priceFrom: form.priceFrom === '' ? null : Number(form.priceFrom),
      excerpt,
      description: form.description.map((item) => item.trim()).filter(Boolean),
      imageUrl: form.imageUrl,
      image: form.imageUrl,
      gallery: [form.imageUrl, ...form.gallery].filter(Boolean),
      plotPlan: form.plotPlanUrl,
    };
  }, [form]);

  const uploadFiles = async (files, kind) => {
    setBusy(`upload-${kind}`);
    setError('');
    try {
      const urls = await uploadProjectMedia(files);
      if (!urls.length) return;
      setForm((current) => {
        if (kind === 'cover') return { ...current, imageUrl: urls[0] };
        if (kind === 'plan') return { ...current, plotPlanUrl: urls[0] };
        if (kind === 'video') return { ...current, videoUrl: urls[0] };
        return { ...current, gallery: [...current.gallery, ...urls] };
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const save = async (event) => {
    event.preventDefault();
    if (!isEdit && !form.imageUrl) {
      setError('Please add a main image.');
      return;
    }
    if (form.status === 'For Sale' && !form.priceFrom) {
      setError('Please enter the starting price.');
      return;
    }
    if (!payload.description.length) {
      setError('Please add at least one description point.');
      return;
    }
    if (!admins.length) {
      setError('No admins are available to approve this change.');
      return;
    }
    setError('');
    setConfirm(true);
  };

  const sendForApproval = async () => {
    if (!approverId) {
      setError('Please select an admin.');
      return;
    }
    setBusy('save');
    setError('');
    try {
      await submitProjectChange({
        action: isEdit ? 'update' : 'create',
        projectId: isEdit ? id : undefined,
        approverId: Number(approverId),
        payload,
      });
      navigate('/listings');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const propertyTypes = PROPERTY_TYPES.includes(form.propertyType)
    ? PROPERTY_TYPES
    : [form.propertyType, ...PROPERTY_TYPES];

  if (isAdmin) {
    return <Navigate to="/listings" replace />;
  }

  if (loading) {
    return <p className="text-sm text-myland-slate">Loading project…</p>;
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Link to="/listings" className="inline-flex items-center gap-2 text-sm font-display font-semibold text-myland-slate hover:text-myland-ink">
          <HiArrowLeft />
          Back to listings
        </Link>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate('/listings')} className="btn-ghost !py-2 !px-4 !text-xs">
            Cancel
          </button>
          <button type="submit" disabled={Boolean(busy)} className="btn-primary !py-2 !px-5 !text-xs">
            Send for approval
          </button>
        </div>
      </div>

      <p className="text-sm text-myland-slate">
        Saving sends this {isEdit ? 'update' : 'new listing'} to an admin. The public project page stays as it is until they approve it.
      </p>

      {error ? <p className="text-sm text-myland-red">{error}</p> : null}

      <div className="max-w-3xl space-y-5">
        <section className="bg-white rounded-xl3 p-5 md:p-6 shadow-card border border-myland-mist/80">
            <div className="mb-5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-myland-red font-semibold">Component 1</p>
              <h2 className="font-display font-semibold text-lg text-myland-ink mt-1">Header</h2>
            </div>
            <div className="space-y-4">
              <Field label="Heading">
                <input
                  className={inputClass}
                  value={form.title}
                  onChange={(event) => setField('title', event.target.value)}
                  placeholder="Field Breeze – Divulapitiya"
                  required
                />
              </Field>
              <div>
                <p className="text-xs font-display font-semibold uppercase tracking-wide text-myland-slate mb-1.5">Status</p>
                <Pills
                  value={form.status}
                  onChange={(value) => setField('status', value)}
                  options={[
                    { value: 'For Sale', label: 'For Sale', activeClass: 'bg-myland-ink text-white' },
                    { value: 'Completed', label: 'Completed', activeClass: 'bg-myland-gold text-white' },
                    { value: 'Sold', label: 'Sold', activeClass: 'bg-myland-slate text-white' },
                  ]}
                />
              </div>
              <div>
                <p className="text-xs font-display font-semibold uppercase tracking-wide text-myland-slate mb-1.5">Offer</p>
                <Pills
                  value={form.hotOffer}
                  onChange={(value) => setField('hotOffer', value)}
                  options={[
                    { value: true, label: 'Hot Offer', activeClass: 'bg-myland-red text-white' },
                    { value: false, label: 'No offer', activeClass: 'bg-myland-ink text-white' },
                  ]}
                />
              </div>
              <Field label="Location text">
                <input
                  className={inputClass}
                  value={form.location}
                  onChange={(event) => setField('location', event.target.value)}
                  placeholder="Divulapitiya, Gampaha"
                  required
                />
              </Field>
              <Field label="Starting price">
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="1"
                  value={form.priceFrom}
                  onChange={(event) => setField('priceFrom', event.target.value)}
                  placeholder="1800000"
                  required
                />
              </Field>
              <Pills
                value={form.priceUnit}
                onChange={(value) => setField('priceUnit', value)}
                options={[
                  { value: 'land', label: 'Full Land', activeClass: 'bg-myland-red text-white' },
                  { value: 'perch', label: 'Per perch', activeClass: 'bg-myland-red text-white' },
                ]}
              />
              {form.price ? (
                <p className="font-display font-semibold text-sm text-myland-red">{form.price}</p>
              ) : (
                <p className="text-[11px] text-myland-slate">Header price appears after you enter an amount.</p>
              )}
            </div>
          </section>

          <section className="bg-white rounded-xl3 p-5 md:p-6 shadow-card border border-myland-mist/80 space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-myland-red font-semibold">Component 2</p>
              <h2 className="font-display font-semibold text-lg text-myland-ink mt-1">Gallery</h2>
            </div>
            <div>
              <p className="text-xs font-display font-semibold uppercase tracking-wide text-myland-slate mb-2">Main image</p>
              {form.imageUrl ? (
                <div className="relative rounded-xl overflow-hidden h-44 bg-myland-mist">
                  <WarmImage src={mediaSrc(form.imageUrl)} alt="" className="w-full h-full object-cover" wrapperClassName="absolute inset-0" />
                  <button
                    type="button"
                    onClick={() => setField('imageUrl', '')}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white text-myland-ink flex items-center justify-center"
                    aria-label="Remove main image"
                  >
                    <HiX />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 h-44 rounded-xl border border-dashed border-myland-mist bg-myland-cream text-sm text-myland-slate cursor-pointer hover:border-myland-gold">
                  <HiOutlinePhotograph className="text-2xl" />
                  {busy === 'upload-cover' ? 'Uploading…' : isEdit ? 'Upload a new main image' : 'Upload main image'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => uploadFiles(event.target.files, 'cover')}
                  />
                </label>
              )}
            </div>
            <div>
              <p className="text-xs font-display font-semibold uppercase tracking-wide text-myland-slate mb-2">Image list</p>
              <div className="flex flex-wrap gap-2">
                {form.gallery.map((src, index) => (
                  <div key={`${src}-${index}`} className="relative w-20 h-20 rounded-xl overflow-hidden bg-myland-mist">
                    <WarmImage src={mediaSrc(src)} alt="" className="w-full h-full object-cover" wrapperClassName="absolute inset-0" />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          gallery: current.gallery.filter((_, itemIndex) => itemIndex !== index),
                        }))
                      }
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white text-myland-ink flex items-center justify-center"
                      aria-label="Remove photo"
                    >
                      <HiX className="text-xs" />
                    </button>
                  </div>
                ))}
                <label className="w-20 h-20 rounded-xl border border-dashed border-myland-mist bg-myland-cream flex items-center justify-center cursor-pointer hover:border-myland-gold text-myland-slate">
                  <HiOutlinePlus />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) => uploadFiles(event.target.files, 'gallery')}
                  />
                </label>
              </div>
            </div>
            <div>
              <p className="text-xs font-display font-semibold uppercase tracking-wide text-myland-slate mb-2">Plot image</p>
              {form.plotPlanUrl ? (
                <div className="relative rounded-xl overflow-hidden h-44 bg-myland-mist">
                  <WarmImage src={mediaSrc(form.plotPlanUrl)} alt="" className="w-full h-full object-cover" wrapperClassName="absolute inset-0" />
                  <button
                    type="button"
                    onClick={() => setField('plotPlanUrl', '')}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white text-myland-ink flex items-center justify-center"
                    aria-label="Remove plot image"
                  >
                    <HiX />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 h-44 rounded-xl border border-dashed border-myland-mist bg-myland-cream text-sm text-myland-slate cursor-pointer hover:border-myland-gold">
                  <HiOutlinePhotograph className="text-2xl" />
                  {busy === 'upload-plan' ? 'Uploading…' : 'Upload plot image'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => uploadFiles(event.target.files, 'plan')}
                  />
                </label>
              )}
            </div>
          </section>

          <section className="bg-white rounded-xl3 p-5 md:p-6 shadow-card border border-myland-mist/80 space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-myland-red font-semibold">Component 3</p>
              <h2 className="font-display font-semibold text-lg text-myland-ink mt-1">Overview</h2>
            </div>
            <Field label="Property snapshot">
              <textarea
                className={`${inputClass} min-h-[88px] resize-y`}
                value={form.overview}
                onChange={(event) => setField('overview', event.target.value)}
                placeholder="A ready-to-build land project in Divulapitiya with road frontage, three-phase electricity, and an easy reservation path."
                required
              />
            </Field>
            <Field label="Property type">
              <select
                className={inputClass}
                value={form.propertyType}
                onChange={(event) => setField('propertyType', event.target.value)}
              >
                {propertyTypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
            <div>
              <p className="text-xs font-display font-semibold uppercase tracking-wide text-myland-slate mb-2">
                Description list
              </p>
              <div className="space-y-2">
                {form.description.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      className={inputClass}
                      value={item}
                      onChange={(event) =>
                        setForm((current) => {
                          const description = [...current.description];
                          description[index] = event.target.value;
                          return { ...current, description };
                        })
                      }
                      placeholder="Near Divulapitiya town"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          description: current.description.filter((_, itemIndex) => itemIndex !== index),
                        }))
                      }
                      className="w-11 h-11 rounded-xl border border-myland-mist text-myland-slate hover:text-myland-red"
                      aria-label="Remove point"
                    >
                      <HiOutlineTrash className="mx-auto" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, description: [...current.description, ''] }))}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-display font-semibold text-myland-red"
              >
                <HiOutlinePlus /> Add point
              </button>
            </div>
          </section>

          <section className="bg-white rounded-xl3 p-5 md:p-6 shadow-card border border-myland-mist/80">
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-myland-red font-semibold">Component 4</p>
              <h2 className="font-display font-semibold text-lg text-myland-ink mt-1">Address and video</h2>
            </div>
            <div className="space-y-5">
              <div>
                <p className="text-xs font-display font-semibold uppercase tracking-wide text-myland-slate mb-1.5">
                  Map location
                </p>
                <MapPlacePicker
                  value={form.mapQuery}
                  onChange={(value) => {
                    setMapTouched(true);
                    setField('mapQuery', value);
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setMapTouched(true);
                    setField('mapQuery', form.location ? `${form.location}, Sri Lanka` : 'Sri Lanka');
                  }}
                  className="mt-2 text-xs font-display font-semibold text-myland-red"
                >
                  Use location text on the map
                </button>
              </div>
              <div>
                <p className="text-xs font-display font-semibold uppercase tracking-wide text-myland-slate mb-1.5">Video</p>
                <p className="text-[11px] text-myland-slate mb-3">Paste a URL or upload a video file.</p>
                <input
                  className={inputClass}
                  value={isDirectVideo(form.videoUrl) ? '' : form.videoUrl}
                  onChange={(event) => setField('videoUrl', event.target.value)}
                  placeholder="https://www.youtube.com/watch?v=…"
                  disabled={isDirectVideo(form.videoUrl)}
                />
                <div className="mt-3">
                  {isDirectVideo(form.videoUrl) ? (
                    <div className="relative overflow-hidden rounded-xl bg-myland-ink">
                      <video src={form.videoUrl} controls className="w-full max-h-48" />
                      <button
                        type="button"
                        onClick={() => setField('videoUrl', '')}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white text-myland-ink flex items-center justify-center"
                        aria-label="Remove video"
                      >
                        <HiX />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 h-36 rounded-xl border border-dashed border-myland-mist bg-myland-cream text-sm text-myland-slate cursor-pointer hover:border-myland-gold">
                      {busy === 'upload-video' ? 'Uploading…' : 'Upload a video file'}
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/ogg,.mp4,.webm,.mov,.m4v"
                        className="hidden"
                        onChange={(event) => uploadFiles(event.target.files, 'video')}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </section>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => !busy && setConfirm(false)}>
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
            <h3 className="font-display font-semibold text-lg text-myland-ink pr-8">
              {isEdit ? 'Send these changes for approval?' : 'Send this project for approval?'}
            </h3>
            <p className="text-sm text-myland-slate mt-2">
              The public project page will not change until the selected admin approves it. They will get an email to review this request.
            </p>
            <div className="mt-4 rounded-2xl bg-myland-cream px-4 py-3">
              <p className="font-display font-semibold text-sm text-myland-ink">{form.title || 'Untitled project'}</p>
              <p className="text-xs text-myland-slate mt-1">{form.location}</p>
            </div>
            <label className="block mt-4">
              <span className="block text-xs font-display font-semibold text-myland-ink mb-2">Send to admin</span>
              <select
                className={inputClass}
                value={approverId}
                onChange={(event) => setApproverId(event.target.value)}
              >
                <option value="">Select an admin</option>
                {admins.map((admin) => (
                  <option key={admin.userId} value={admin.userId}>
                    {admin.name} · {admin.email}
                  </option>
                ))}
              </select>
            </label>
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
    </form>
  );
}
