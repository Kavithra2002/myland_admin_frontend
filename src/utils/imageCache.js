const warmed = new Set();

function canUseDom() {
  return typeof document !== 'undefined';
}

export function injectPreload(src, { fetchPriority = 'high' } = {}) {
  if (!src || !canUseDom()) return;
  const existing = document.head.querySelector(`link[rel="preload"][as="image"][href="${src}"]`);
  if (existing) return;
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = src;
  if (fetchPriority) link.fetchPriority = fetchPriority;
  document.head.appendChild(link);
}

export function preloadImage(src, { fetchPriority = 'auto' } = {}) {
  if (!src) return Promise.resolve('');
  if (warmed.has(src)) return Promise.resolve(src);
  if (!canUseDom()) return Promise.resolve(src);

  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    if (fetchPriority) img.fetchPriority = fetchPriority;
    const done = () => {
      warmed.add(src);
      resolve(src);
    };
    img.onload = () => {
      if (typeof img.decode === 'function') {
        img.decode().then(done).catch(done);
        return;
      }
      done();
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

export function preloadImages(urls, options) {
  return Promise.all((urls || []).filter(Boolean).map((url) => preloadImage(url, options)));
}

export function warmCriticalImages(urls) {
  (urls || []).filter(Boolean).forEach((src, index) => {
    const fetchPriority = index === 0 ? 'high' : 'low';
    injectPreload(src, { fetchPriority });
    preloadImage(src, { fetchPriority });
  });
}

export function markWarmed(src) {
  if (src) warmed.add(src);
}

export function isWarmed(src) {
  return Boolean(src) && warmed.has(src);
}
