import { useEffect, useMemo, useState } from 'react';
import {
  HiChevronDown,
  HiChevronLeft,
  HiChevronRight,
  HiOutlineCalendar,
  HiOutlineCurrencyDollar,
  HiOutlineHeart,
  HiOutlineLocationMarker,
  HiOutlineOfficeBuilding,
  HiOutlinePhotograph,
  HiOutlineShare,
  HiPlay,
} from 'react-icons/hi';
import logo from '../assets/myland-logo.png';
import WarmImage from './WarmImage.jsx';
import { isDirectVideo, mapEmbedUrl, mediaSrc, youtubeEmbedId } from '../utils/projectMedia.js';

const BADGE_STYLES = {
  'Hot Offer': 'bg-myland-red text-white',
  'For Sale': 'bg-myland-ink text-white',
  Sold: 'bg-myland-slate text-white',
  Completed: 'bg-myland-gold text-white',
};

const PAYMENT_OPTIONS = [
  {
    title: 'Outright cash payment',
    body: 'Settle the full amount at once to receive attractive discounts up to 5 percent.',
    Icon: HiOutlineCurrencyDollar,
  },
  {
    title: 'MyLand easy payment scheme',
    body: 'Pay 40% within 30 days of reservation, then settle the rest in monthly instalments for up to 18 months.',
    Icon: HiOutlineCalendar,
  },
  {
    title: 'Bank loan scheme',
    body: 'Pay 40% within 30 days after reservation as we prepare the documents needed to apply from any government or private bank in Sri Lanka.',
    Icon: HiOutlineOfficeBuilding,
  },
];

const TABS = [
  { id: 'preview-description', label: 'Description' },
  { id: 'preview-address', label: 'Address' },
  { id: 'preview-video', label: 'Video' },
  { id: 'preview-similar', label: 'Similar Listings' },
];

function formatStartingPrice(priceFrom) {
  const n = Number(priceFrom);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    const shown = Number.isInteger(m) ? String(m) : m.toFixed(1).replace(/\.0$/, '');
    return `LKR ${shown}M`;
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    const shown = Number.isInteger(k) ? String(k) : k.toFixed(1).replace(/\.0$/, '');
    return `LKR ${shown}K`;
  }
  return `LKR ${n.toLocaleString('en-LK')}`;
}

function previewGallery(form) {
  const photos = [form.imageUrl, ...(form.gallery || [])].filter(Boolean).map(mediaSrc);
  const unique = [...new Set(photos)];
  const plan = form.plotPlanUrl ? mediaSrc(form.plotPlanUrl) : '';
  if (!plan) return unique;
  const without = unique.filter((src) => src !== plan);
  return [...without.slice(0, 7), plan];
}

export default function ProjectPagePreview({ form, badges }) {
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab] = useState('preview-description');
  const gallery = useMemo(() => previewGallery(form), [form.imageUrl, form.gallery, form.plotPlanUrl]);
  const plotPlanIndex = form.plotPlanUrl ? gallery.lastIndexOf(mediaSrc(form.plotPlanUrl)) : -1;
  const current = gallery[activeImage] || form.imageUrl;
  const title = form.title || 'Project title';
  const location = form.location || 'Location';
  const price = form.price || 'Display price';
  const starting = formatStartingPrice(form.priceFrom);
  const highlights = (form.description || []).map((item) => item.trim()).filter(Boolean);
  const mapQuery = form.mapQuery || form.location || 'Sri Lanka';

  useEffect(() => {
    setActiveImage(0);
  }, [gallery.length, form.imageUrl]);

  const go = (dir) => {
    if (!gallery.length) return;
    setActiveImage((i) => (i + dir + gallery.length) % gallery.length);
  };

  return (
    <div className="bg-myland-cream text-myland-ink">
      <div className="bg-white border-b border-myland-mist">
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-3">
          <img src={logo} alt="MyLand" className="h-9 w-auto" fetchPriority="high" decoding="async" />
          <nav className="hidden sm:flex items-center gap-1 text-sm font-display font-semibold">
            <span className="px-3 py-1.5 text-myland-ink">Home</span>
            <span className="px-3 py-1.5 text-myland-ink">About</span>
            <span className="px-3 py-1.5 text-myland-red">Projects</span>
            <span className="px-3 py-1.5 text-myland-ink">Blog</span>
            <span className="px-3 py-1.5 text-myland-ink">Contact</span>
          </nav>
          <span className="hidden md:inline-flex rounded-full bg-myland-red text-white text-[11px] font-display font-semibold px-4 py-2">
            Available Properties
          </span>
        </div>
      </div>

      <section className="pt-8 pb-6 px-4 md:px-6">
        <nav className="flex flex-wrap items-center gap-2 text-xs font-medium text-myland-slate mb-5">
          <span>Home</span>
          <span>/</span>
          <span>Projects</span>
          <span>/</span>
          <span className="text-myland-red">{title}</span>
        </nav>

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <h1 className="font-display font-bold text-2xl md:text-3xl lg:text-[2.4rem] text-myland-ink leading-tight">
              {title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {badges.map((badge) => (
                <span
                  key={badge}
                  className={`text-[10px] font-display font-semibold uppercase tracking-[0.14em] px-3 py-1.5 rounded-full ${
                    BADGE_STYLES[badge] || 'bg-myland-mist text-myland-ink'
                  }`}
                >
                  {badge}
                </span>
              ))}
            </div>
            <p className="flex items-center gap-1.5 text-sm text-myland-slate mt-3">
              <HiOutlineLocationMarker className="text-myland-gold" />
              {location}
            </p>
          </div>

          <div className="flex items-center gap-3 lg:flex-col lg:items-end">
            <div className="flex items-center gap-2">
              <span className="w-11 h-11 rounded-full border border-myland-mist bg-white flex items-center justify-center">
                <HiOutlineHeart className="text-myland-ink text-lg" />
              </span>
              <span className="w-11 h-11 rounded-full border border-myland-mist bg-white flex items-center justify-center">
                <HiOutlineShare className="text-myland-ink text-lg" />
              </span>
            </div>
            <p className="font-display font-semibold text-myland-red text-right">{price}</p>
          </div>
        </div>
      </section>

      <section className="pb-6 px-4 md:px-6">
        <div className="relative rounded-xl3 overflow-hidden bg-myland-mist shadow-soft">
          {current ? (
            <WarmImage
              src={mediaSrc(current)}
              alt={title}
              priority
              lazy={false}
              className="w-full h-[240px] sm:h-[320px] md:h-[380px] object-cover"
              wrapperClassName="block w-full h-[240px] sm:h-[320px] md:h-[380px]"
            />
          ) : (
            <div className="w-full h-[240px] sm:h-[320px] md:h-[380px] bg-myland-mist flex items-center justify-center text-sm text-myland-slate">
              Cover photo appears here
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent pointer-events-none" />
          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-myland-red/90 text-white flex items-center justify-center"
            aria-label="Previous image"
          >
            <HiChevronLeft className="text-2xl" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-myland-red/90 text-white flex items-center justify-center"
            aria-label="Next image"
          >
            <HiChevronRight className="text-2xl" />
          </button>
          <span className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/90 text-myland-ink flex items-center justify-center">
            <HiOutlinePhotograph className="text-xl" />
          </span>
        </div>

        {gallery.length > 0 && (
          <div className="mt-3 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {gallery.map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                onClick={() => setActiveImage(i)}
                className={`relative overflow-hidden rounded-xl h-14 sm:h-16 ${
                  i === activeImage ? 'ring-2 ring-myland-red ring-offset-2' : 'opacity-75'
                }`}
              >
                <WarmImage src={mediaSrc(src)} alt="" className="w-full h-full object-cover" />
                {i === plotPlanIndex && (
                  <span className="absolute inset-x-0 bottom-0 bg-myland-ink/80 text-white text-[8px] font-display font-semibold uppercase tracking-wider py-0.5">
                    Plot plan
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-y border-myland-mist">
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar px-2">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  document.getElementById(tab.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`relative shrink-0 px-4 py-3 text-sm font-display font-semibold ${
                  active ? 'text-myland-red' : 'text-myland-slate'
                }`}
              >
                {tab.label}
                {active && <span className="absolute left-4 right-4 bottom-0 h-0.5 bg-myland-red rounded-full" />}
              </button>
            );
          })}
        </nav>
      </div>

      <section className="py-8 px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-8 flex flex-col gap-6">
            <article id="preview-description" className="scroll-mt-16 bg-white rounded-xl3 p-6 sm:p-8 shadow-card">
              <p className="text-myland-red font-semibold tracking-[0.2em] text-xs uppercase mb-3">Overview</p>
              <h2 className="font-display font-semibold text-xl text-myland-ink mb-3">Property snapshot</h2>
              <p className="text-sm text-myland-slate leading-relaxed">
                {form.overview || 'The overview paragraph appears here.'}
              </p>
              <p className="mt-4 text-sm text-myland-ink">
                <span className="text-myland-slate">Property Type:</span> {form.propertyType || 'Land'}
              </p>
              <h3 className="font-display font-semibold text-xl text-myland-ink mt-8 mb-5">Description</h3>
              <ul className="space-y-2.5">
                {(highlights.length ? highlights : ['Description highlights appear here']).map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-myland-slate leading-relaxed">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-myland-red shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="bg-white rounded-xl3 p-6 sm:p-8 shadow-card">
              <h2 className="font-display font-bold text-xl text-myland-ink mb-6">Our payment options</h2>
              <p className="text-[11px] text-myland-slate mb-4">Site design — this block is not edited from Add Project.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PAYMENT_OPTIONS.map(({ title: payTitle, body, Icon }) => (
                  <article key={payTitle} className="rounded-xl2 p-5 bg-myland-cream">
                    <div className="w-12 h-12 rounded-full bg-myland-red/10 flex items-center justify-center mb-4">
                      <Icon className="text-myland-red text-xl" />
                    </div>
                    <h3 className="font-display font-semibold text-myland-ink text-base mb-2">{payTitle}</h3>
                    <p className="text-sm text-myland-slate leading-relaxed">{body}</p>
                  </article>
                ))}
              </div>
            </article>
          </div>

          <aside className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white rounded-xl3 p-6 sm:p-7 shadow-card border border-myland-mist/80">
              <p className="text-[11px] font-display font-semibold uppercase tracking-[0.16em] text-myland-slate">
                Starting Price
              </p>
              <p className="mt-2 font-display font-bold text-3xl text-myland-ink">{starting || price}</p>
              {starting && form.price && <p className="mt-1 text-xs text-myland-slate">{form.price}</p>}
              <div className="flex overflow-hidden rounded-xl shadow-card border border-myland-red mt-6">
                <span className="flex-1 bg-myland-red text-white font-display font-bold tracking-[0.12em] uppercase text-sm py-3.5 px-4 text-center">
                  Book now
                </span>
                <span className="w-12 bg-white text-myland-red flex items-center justify-center border-l border-myland-red">
                  <HiChevronDown className="text-2xl" />
                </span>
              </div>
            </div>

            <article
              id="preview-address"
              className="scroll-mt-16 bg-white rounded-xl3 p-6 sm:p-8 shadow-card flex flex-col flex-1 min-h-[280px]"
            >
              <h2 className="font-display font-semibold text-xl text-myland-ink mb-5">Address</h2>
              <p className="text-sm text-myland-slate mb-1">
                <span className="font-display font-semibold text-myland-ink">Country:</span> {form.country || 'Sri Lanka'}
              </p>
              <p className="text-sm text-myland-slate mb-5">{location}</p>
              <div className="relative w-full flex-1 min-h-[180px] overflow-hidden rounded-xl2 bg-myland-mist">
                <iframe
                  title={`${title} map`}
                  src={mapEmbedUrl(mapQuery)}
                  className="absolute inset-0 w-full h-full border-0 grayscale-[20%] contrast-[1.05]"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </article>
          </aside>
        </div>

        <article id="preview-video" className="scroll-mt-16 mt-6 lg:mt-10 bg-white rounded-xl3 p-6 sm:p-8 shadow-card">
          <h2 className="font-display font-semibold text-xl text-myland-ink mb-5">Video</h2>
          <div className="relative overflow-hidden rounded-xl2 bg-myland-mist aspect-video">
            {isDirectVideo(form.videoUrl) ? (
              <video src={mediaSrc(form.videoUrl)} controls className="w-full h-full object-cover" />
            ) : youtubeEmbedId(form.videoUrl) ? (
              <iframe
                title={`${title} walkthrough`}
                src={`https://www.youtube.com/embed/${youtubeEmbedId(form.videoUrl)}`}
                className="absolute inset-0 w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <>
                {form.imageUrl ? (
                  <WarmImage
                    src={mediaSrc(form.imageUrl)}
                    alt={`${title} video`}
                    className="w-full h-full object-cover opacity-80"
                    wrapperClassName="absolute inset-0"
                  />
                ) : (
                  <div className="w-full h-full bg-myland-mist" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                <p className="absolute top-4 left-4 right-4 text-white font-display font-semibold">{title} walkthrough</p>
                <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="w-16 h-16 rounded-full bg-myland-red text-white flex items-center justify-center">
                    <HiPlay className="text-3xl ml-1" />
                  </span>
                </span>
              </>
            )}
          </div>
        </article>
      </section>

      <section id="preview-similar" className="scroll-mt-16 px-4 md:px-6 pb-10">
        <p className="text-myland-red font-semibold tracking-[0.2em] text-xs uppercase mb-3">Keep exploring</p>
        <h2 className="font-display font-bold text-2xl text-myland-ink mb-3">Similar Listings</h2>
        <p className="text-sm text-myland-slate">
          This row is filled automatically from other published projects. It is not set in this form.
        </p>
      </section>
    </div>
  );
}
